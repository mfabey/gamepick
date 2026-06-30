import { NextResponse } from 'next/server';
import { getUsdToTry } from '../../lib/exchange';

const BATCH_SIZE = 100;

// Sayıyı ₺ formatına çevir
function fmtTRY(n) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
}

// Başlığı karşılaştırmak için temizle
function cleanTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[:\-–]/g, ' ')
    .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|edition|bundle|pack|collection|legacy|enhanced|remastered)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Steam Arama API'si üzerinden fiyat sorgulama fallback'i (Paket halinde satılan oyunlar için)
async function getPriceFromStoreSearch(name) {
  try {
    const cleanedName = cleanTitle(name);
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanedName)}&cc=tr&l=tr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const items = json.items || [];
    if (items.length === 0) return null;

    // En iyi eşleşeni bul
    const cleanSearchName = cleanTitle(name);
    const bestMatch = items.find(item => {
      const cleanItemName = cleanTitle(item.name);
      return cleanItemName.includes(cleanSearchName) || cleanSearchName.includes(cleanItemName);
    }) || items[0];

    if (bestMatch && bestMatch.price) {
      return {
        current: bestMatch.price.final / 100,
        original: bestMatch.price.initial / 100,
        discount: Math.round(((bestMatch.price.initial - bestMatch.price.final) / bestMatch.price.initial) * 100) || 0,
        currency: bestMatch.price.currency || 'USD',
      };
    }
  } catch {
    // Arama hatası durumunda sessizce geç
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appidsParam = searchParams.get('appids');
  if (!appidsParam) return NextResponse.json({ error: 'appids required' }, { status: 400 });

  const idList = [...new Set(appidsParam.split(',').map(s => s.trim()).filter(Boolean))];
  if (idList.length === 0) return NextResponse.json({});

  const priceMap = {};
  let usdToTry = null; // çekim oranı, ilk USD fiyatı görünce çekilir

  for (let i = 0; i < idList.length; i += BATCH_SIZE) {
    const batch = idList.slice(i, i + BATCH_SIZE);

    // Önce Türkiye fiyatını dene (steamCountry cookie + cc=tr)
    const url = `https://store.steampowered.com/api/appdetails?appids=${batch.join(',')}&cc=tr&l=turkish&filters=price_overview`;

    try {
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'tr-TR,tr;q=0.9',
          'Cookie': 'steamCountry=TR',        // Steam ülke zorlaması
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;

      const data = await res.json();

      for (const appid of batch) {
        const entry = data[appid];
        
        // 1. Steam veri döndürmediyse
        if (!entry?.success) {
          priceMap[appid] = { unavailable: true };
          continue;
        }
        
        const d = entry.data;

        // 2. Gerçekten ücretsiz oyun
        if (d.is_free) {
          priceMap[appid] = { isFree: true, current: 0, original: 0, discount: 0 };
          continue;
        }

        // 3. Ücretli ama price_overview yok (Paket/Bundle satılan oyunlar veya ücretsiz oyunlar)
        if (!d.price_overview) {
          // Detayları (isim ve ücretsiz durumunu) almak için filtre olmadan tekil istek at
          let gameName = d.name;
          let isFree = false;

          try {
            const singleRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&l=tr`, { signal: AbortSignal.timeout(5000) });
            if (singleRes.ok) {
              const singleJson = await singleRes.json();
              const singleData = singleJson?.[appid]?.data;
              if (singleData) {
                gameName = singleData.name;
                isFree = singleData.is_free === true;
              }
            }
          } catch {
            // Hata durumunda geç
          }

          // Eğer oyun aslında ücretsiz bir oyunsa
          if (isFree) {
            priceMap[appid] = { isFree: true, current: 0, original: 0, discount: 0 };
            continue;
          }

          if (gameName) {
            const fallbackPrice = await getPriceFromStoreSearch(gameName);
            if (fallbackPrice) {
              let current = fallbackPrice.current;
              let original = fallbackPrice.original;
              let currentFormatted = fallbackPrice.current === 0 ? 'Ücretsiz' : fmtTRY(current);
              let originalFormatted = fmtTRY(original);

              if (fallbackPrice.currency !== 'TRY') {
                if (!usdToTry) usdToTry = await getUsdToTry();
                if (usdToTry) {
                  current = current * usdToTry;
                  original = original * usdToTry;
                  currentFormatted = current === 0 ? 'Ücretsiz' : fmtTRY(current);
                  originalFormatted = fmtTRY(original);
                }
              }

              priceMap[appid] = {
                isFree: current === 0,
                current,
                original,
                discount: fallbackPrice.discount,
                currentFormatted,
                originalFormatted,
              };
              continue;
            }
          }

          // Arama da başarısız olduysa ücretsiz/bulunmuyor say
          priceMap[appid] = { isFree: true, current: 0, original: 0, discount: 0 };
          continue;
        }

        // 4. Standart fiyatı olan oyun
        const p = d.price_overview;
        let current  = p.final   / 100;
        let original = p.initial / 100;
        let currentFormatted  = p.final_formatted;
        let originalFormatted = p.initial_formatted;

        // Steam sunucu konumuna göre USD döndürdüyse → TRY'ye çevir
        if (p.currency && p.currency !== 'TRY') {
          if (!usdToTry) usdToTry = await getUsdToTry();
          if (usdToTry) {
            current  = current  * usdToTry;
            original = original * usdToTry;
            currentFormatted  = fmtTRY(current);
            originalFormatted = fmtTRY(original);
          }
        }

        priceMap[appid] = {
          isFree: false,
          current,
          original,
          discount: p.discount_percent,
          currentFormatted,
          originalFormatted,
        };
      }
    } catch {
      // Bu batch için timeout/network hatası — sonrakine geç
    }
  }

  return NextResponse.json(priceMap);
}
