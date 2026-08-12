import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { isGifConfigured } from '../../../lib/gif-provider';

// ─────────────────────────────────────────────────────────────────────────────
// GIF arama — SUNUCU VEKİLİ.
//
// ŞU AN KAPALI. Tenor API'si 30 Haziran 2026'da kapatıldı (duyuru 13 Ocak
// 2026, yeni anahtar kaydı o gün durdu). Sağlayıcı kararı verilmedi;
// adaylar GIPHY (üretim anahtarı başvuru + ücret) ve KLIPY (ücretsiz ama
// filigran + reklam modeli).
//
// GÖÇ İKİ DOSYA: buranın içi (uç adresi + yanıt eşlemesi) ve sohbet
// ucundaki alan adı listesi. Seçici, gönderim, baloncuk çizimi ve depolama
// sağlayıcıdan bağımsız.
//
// ANAHTAR ADI SAĞLAYICIDAN BAĞIMSIZ (`GIF_API_KEY`): kodda ölü bir şirket
// adı taşımanın anlamı yok ve sağlayıcı değişince tekrar yeniden
// adlandırmak gerekmesin.
//
// NEDEN VEKİL: API anahtarı istemciye konsaydı uygulama paketinden çıkarılırdı.
// Anahtar burada kalıyor; istemci yalnızca arama metnini gönderiyor.
//
// İÇERİK SÜZGECİ SABİT: `contentfilter=high` istemciden gelmiyor, burada
// yazılı. İstemci parametresi olsaydı kullanıcı süzgeci kapatabilirdi.
//
// GIF'LER BİZİM DEPOMUZA İNMİYOR. Tenor'un CDN'inde kalıyorlar; Blob maliyeti,
// Vision moderasyonu ve boyut sınırı bu yolda hiç devreye girmiyor.
//
// TENOR ATIF İSTİYOR ("Powered by Tenor") — seçicinin altında gösteriliyor.
// ─────────────────────────────────────────────────────────────────────────────

const TENOR = 'https://tenor.googleapis.com/v2';
const TIMEOUT_MS = 6000;
const LIMIT = 24;

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!isGifConfigured()) {
    return NextResponse.json({ error: 'GIFS_DISABLED' }, { status: 503 });
  }

  // Arama kutusuna her harfte istek gitmesin diye istemci geciktiriyor;
  // buradaki sınır ikinci savunma.
  const rl = await rateLimit(`rl:gif:${user.uid}`, 300, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get('q') || '').trim().slice(0, 60);
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'tr';

  // Arama boşsa öne çıkanlar — seçici açılır açılmaz dolu görünsün.
  const path = q ? '/search' : '/featured';
  const qs = new URLSearchParams({
    key: process.env.GIF_API_KEY,
    limit: String(LIMIT),
    contentfilter: 'high',
    media_filter: 'tinygif,gif',
    locale: lang === 'tr' ? 'tr_TR' : 'en_US',
    client_key: 'gamerisen',
  });
  if (q) qs.set('q', q);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${TENOR}${path}?${qs}`, { signal: ctrl.signal });
    if (!res.ok) return NextResponse.json({ error: 'TENOR_ERROR' }, { status: 503 });

    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    // Yalnızca gerekli alanlar dönüyor. Tenor'un tam yanıtı büyük ve
    // istemcinin ihtiyacı olmayan onlarca alan taşıyor.
    return NextResponse.json({
      gifs: results.map((r) => {
        const full = r?.media_formats?.gif;
        const tiny = r?.media_formats?.tinygif;
        return {
          id: String(r?.id || ''),
          url: full?.url || tiny?.url || null,
          preview: tiny?.url || full?.url || null,
          w: full?.dims?.[0] || tiny?.dims?.[0] || 0,
          h: full?.dims?.[1] || tiny?.dims?.[1] || 0,
        };
      }).filter((g) => g.url && g.preview),
    });
  } catch {
    return NextResponse.json({ error: 'TENOR_ERROR' }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }
}
