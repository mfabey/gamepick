import { chatCapabilities } from './realtime';

// ─────────────────────────────────────────────────────────────────────────────
// KLIPY GIF istemcisi — CİHAZDAN DOĞRUDAN.
//
// NEDEN VEKİL SUNUCU YOK: KLIPY'nin Entegrasyon Şartları, isteklerin son
// kullanıcı istemcisinden gelmesini istiyor ve yazılı onay olmadan iş ortağı
// sunucusu üzerinden yönlendirmeyi yasaklıyor. Tenor'da vekil kurmuştuk
// (anahtarı pakette taşımamak için); KLIPY'de bu yol kapalı.
//
// ANAHTAR YİNE PAKETTE DEĞİL. Sunucu, kimliği doğrulanmış istemciye
// `chat/config` üzerinden veriyor. Kazanç: uygulama paketini açan biri
// anahtarı statik olarak çıkaramıyor ve anahtar değişince yeni build ya da
// OTA gerekmiyor.
//
// SINIR AÇIKÇA SÖYLENSİN: bu, anahtarı gizli tutmak DEĞİL. Trafiğini dinleyen
// kimliği doğrulanmış bir kullanıcı anahtarı görebilir. KLIPY'nin modeli
// zaten istemci taraflı; buna karşılık anahtarı anında döndürebiliyoruz.
//
// SONUÇLAR SÜZÜLMÜYOR, SIRALANMIYOR. Şartlar arama ve trend sonuçlarının
// geldiği sırada ve bileşimde gösterilmesini istiyor. Aşağıda yalnızca
// çizilemeyecek kayıt (adres yok) atlanıyor — editoryal bir eleme değil,
// çizim zorunluluğu.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://api.klipy.com/api/v1';
const TIMEOUT_MS = 6000;
const PER_PAGE = 24;

/**
 * Tek bir GIF kaydını çizilebilir hâle indirger.
 *
 * BOYUT SEÇİMİ: gönderim için `hd`, ızgara önizlemesi için `sm` (220 piksel).
 * Izgarada 24 tane tam boy GIF oynatmak hem veriyi hem pili bitirir.
 * Beklenen boyut yoksa bir alttakine düşülüyor — kayıt tamamen düşmesin.
 */
function pick(item) {
  const f = item?.file || {};
  const full = f.hd?.gif || f.md?.gif || f.sm?.gif || null;
  const small = f.sm?.gif || f.xs?.gif || full;
  if (!full?.url || !small?.url) return null;
  return {
    id: String(item.id ?? item.slug ?? full.url),
    url: full.url,
    preview: small.url,
    w: full.width || 0,
    h: full.height || 0,
  };
}

/**
 * GIF arar. Sorgu boşsa öne çıkanları döndürür — seçici boş açılmasın.
 *
 * @throws {Error} kod `GIFS_DISABLED` — sağlayıcı yapılandırılmamış
 */
export async function searchGifs(q, lang = 'tr') {
  const cfg = await chatCapabilities();
  if (!cfg.gifs || !cfg.gifKey) {
    throw Object.assign(new Error('GIFS_DISABLED'), { code: 'GIFS_DISABLED' });
  }

  const term = String(q || '').trim().slice(0, 60);
  const path = term ? 'search' : 'trending';

  const qs = new URLSearchParams({
    per_page: String(PER_PAGE),
    page: '1',
    // Tenor'la AYNI kelime dağarcığı; `high` doğrudan karşılık geliyor.
    content_filter: 'high',
    // Yalnızca GIF isteniyor: mp4/webm/webp/jpg varyantları yanıtı birkaç
    // kat büyütüyor ve hiçbirini kullanmıyoruz.
    format_filter: 'gif',
    locale: lang === 'en' ? 'us' : 'tr',
  });
  if (term) qs.set('q', term);

  // `customer_id` BİLEREK GÖNDERİLMİYOR. İsteğe bağlı bir alan ve kullanıcı
  // kimliğimizi üçüncü tarafa vermek, kalıcı bir tanımlayıcıyı dışarı
  // taşımak demek. Yalnızca "son kullanılanlar" özelliği için gerekli ve
  // onu kullanmıyoruz.

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/${cfg.gifKey}/gifs/${path}?${qs}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw Object.assign(new Error('GIF_ERROR'), { code: 'GIF_ERROR' });

    const json = await res.json();
    const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
    return { gifs: rows.map(pick).filter(Boolean) };
  } finally {
    clearTimeout(timer);
  }
}
