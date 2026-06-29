import { NextResponse } from 'next/server';

const BATCH_SIZE = 100;

// Frankfurter'den USD→TRY kuru çek
async function getUsdToTry() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY', {
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return data.rates?.TRY || null;
  } catch {
    return null;
  }
}

// Sayıyı ₺ formatına çevir
function fmtTRY(n) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₺';
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
        if (!entry?.success) {
          // Steam bu oyun için veri döndürmedi (kaldırıldı / bölgede yok)
          priceMap[appid] = { unavailable: true };
          continue;
        }
        const d = entry.data;

        if (d.is_free || !d.price_overview) {
          // Ücretsiz oyun (price_overview yoksa Steam genelde ücretsiz demektir)
          priceMap[appid] = { isFree: true, current: 0, original: 0, discount: 0 };
          continue;
        }

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
          // usdToTry alınamazsa orijinal dolar formatını bırak
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
