import { NextResponse } from 'next/server';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// GİRDİ ŞEMALARI — paylaşılan doğrulama katmanı.
//
// Şemalar BİLEREK route dosyalarının dışında: aynı alanın iki uçta farklı
// sınırlara kayması bu projede zaten olmuştu (`num` bazı uçlarda kırpılıyor,
// bazılarında hiç kırpılmıyordu). Tek dosyada durunca sınırlar karşılaştırılabilir.
//
// KAPSAM: buradaki şemalar, denetimde AÇIK BULUNAN uçlar için. Sosyal yazma
// uçları (posts/lists/reviews/chat) zaten `validateFreeText` ile sınırlı ve
// `social/report` izin listesi kullanıyor — onlar çalışıyor, dokunulmadı.
// Yeni uç yazarken şemayı buraya ekle, route'a değil.
//
// `z.object()` bilinmeyen anahtarları DÜŞÜRÜYOR (Zod varsayılanı): istemcinin
// gönderdiği fazladan alan sessizce elenir, aşağı akışa sızmaz.
// ─────────────────────────────────────────────────────────────────────────────

// ── Ortak parçalar ──────────────────────────────────────────────────────────

/** Sayfalama. Negatif ve devasa değerler burada kesiliyor. */
export const sayfa = z.coerce.number().int().min(1).max(500).default(1);
export const adet = z.coerce.number().int().min(1).max(100).default(24);

/**
 * Steam appid. Üst sınır bilinçli olarak bol: Steam appid'leri artıyor.
 * Amaç gerçekçi bir tavan değil, `-1` / `1e308` / `NaN` gibi değerleri kesmek.
 */
export const appId = z.coerce.number().int().min(1).max(100_000_000);

export const dil = z.enum(['tr', 'en']).default('tr');

// ── LLM uçları ──────────────────────────────────────────────────────────────
//
// UZUNLUK SINIRI BURADA FATURA MESELESİ. Hız sınırı istek SAYISINI kesiyor
// ama BOYUTUNU kesmiyordu: saatte 30 istek × sınırsız metin hâlâ istediği
// kadar büyük bir jeton faturası demek. Alanların tamamı doğrudan LLM istemine
// giriyor (recommend'de şablon dizgesine gömülüyor), yani sınır hem maliyet
// hem istem enjeksiyonu yüzeyi için gerekli.

export const aiChatBody = z.object({
  message: z.string().trim().min(1, 'Mesaj boş olamaz').max(2000),
  session_id: z.string().max(64).optional(),
  // Profil serbest bir nesneydi ve `hardware.gpu` doğrudan isteme giriyordu.
  profile: z.object({
    hardware: z.object({ gpu: z.string().max(80).optional() }).optional(),
    liked_genres: z.array(z.string().max(40)).max(30).optional(),
  }).optional(),
  // Geçmiş zaten son 6 kayda kırpılıyordu ama HER KAYDIN METNİ sınırsızdı
  // (yalnız asistan yanıtları 350'ye kesiliyordu, kullanıcı mesajları değil).
  history: z.array(z.object({
    role: z.string().max(20).optional(),
    text: z.string().max(2000).optional(),
    content: z.string().max(2000).optional(),
  })).max(20).optional(),
});

export const recommendBody = z.object({
  mode: z.enum(['summary', 'moods']).optional(),
  gameTitle: z.string().max(200).optional(),
  genres: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  moods: z.string().max(200).optional(),
});

export const aiGameQuery = z.object({
  appid: appId,
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(''),
  lang: dil,
});

export const smartSearchBody = z.object({
  query: z.string().trim().min(1, 'query gerekli').max(500),
  lang: dil,
  // Yanıta teşhis bloğu ekliyor (route sonundaki `debug` alanı).
  debug: z.coerce.boolean().optional(),
});

// ── Katalog / sayfalama ─────────────────────────────────────────────────────
//
// `page` ve `num` `parseInt` ile okunup HİÇ kırpılmıyordu: `num=100000`
// yukarı akıştan devasa bir sayfa istiyor, `page=-5` ise RAWG'a geçersiz
// sorgu gönderiyordu. Diğer uçlar (epic, for-you, game-news) zaten
// `Math.min` ile kırpıyordu — tutarsızlık buradaydı.

export const listeQuery = z.object({
  page: sayfa,
  num: adet,
});

// ── Redis anahtarına giren kimlikler ────────────────────────────────────────
//
// `social/report`, `report_dupe:{uid}:{targetType}:{targetId}` anahtarını
// SET NX ile YAZIYOR ve `targetId` istekten geliyordu — uzunluk sınırı yoktu.
// Enjeksiyon değil (Upstash REST komutları JSON dizisi olarak gönderiyor,
// araya sıkıştırılacak bir sorgu metni yok) ama gerçek bir kaynak sorunu:
// megabaytlık anahtar adları yaratılabiliyordu.
//
// Karakter kümesi de daraltıldı: bu kimlikler ya sunucunun ürettiği
// `l_…`/`p_…` biçiminde ya da bir uid. Glob metakarakterleri (`*`, `?`, `[`)
// bu değerlerde hiç görünmemeli — bugün desenler sabit olduğu için sömürü
// yolu yok, ama anahtar malzemesini dar tutmak ileriye dönük ucuz sigorta.
export const kaynakKimligi = z.string().trim().min(1).max(128).regex(
  /^[A-Za-z0-9_:.-]+$/,
  'Geçersiz kimlik biçimi',
);

export const reportBody = z.object({
  targetType: z.string().trim().max(32),
  targetId: kaynakKimligi,
  reason: z.string().trim().max(64),
  note: z.string().max(500).default(''),
});

// ── Doğrulama yardımcıları ──────────────────────────────────────────────────

/** Zod hatasını "alan: mesaj" biçiminde okunur listeye çevirir. */
function alanHatalari(error) {
  return (error?.issues || []).map((i) => ({
    alan: i.path.join('.') || '(gövde)',
    hata: i.message,
  }));
}

function gecersiz(error) {
  return NextResponse.json(
    { error: 'INVALID_INPUT', fields: alanHatalari(error) },
    { status: 400 },
  );
}

/**
 * Gövdeyi şemaya göre ayrıştırır.
 * @returns {{ok:true, data:object} | {ok:false, response:NextResponse}}
 *
 * Bozuk JSON de geçersiz girdi sayılıyor: `catch {}` ile boş nesneye düşmek,
 * eksik alanları "tanımsız" gösterip hatayı aşağı akışa taşıyordu.
 */
export async function parseBody(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json(
      { error: 'INVALID_INPUT', fields: [{ alan: '(gövde)', hata: 'Geçerli JSON değil' }] },
      { status: 400 },
    ) };
  }
  const r = schema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false, response: gecersiz(r.error) };
}

/** Sorgu dizesini şemaya göre ayrıştırır (tüm değerler dizge gelir → coerce). */
export function parseQuery(request, schema) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const r = schema.safeParse(params);
  return r.success ? { ok: true, data: r.data } : { ok: false, response: gecersiz(r.error) };
}
