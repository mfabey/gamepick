// ─────────────────────────────────────────────────────────────────────────────
// Sosyal uçlar. Yazan her uç oturum ister; OKUMA uçlarının bir kısmı istemez.
// Token yönetimi çağıranda değil, burada: getValidToken tazeleme dahil hallediyor.
//
// İki yol var:
//   authed()  → jeton ŞART. Yoksa istek atılmadan NO_SESSION.
//   openRead()→ jeton VARSA gönderilir, yoksa gönderilmez. Herkese açık okuma
//               uçları için. Jeton gidince sunucu kişisel bayrakları da
//               dolduruyor ("beğendim", "benim listem"); gitmeyince genel
//               görünüm dönüyor.
// ─────────────────────────────────────────────────────────────────────────────
import { API_BASE } from './client';
import { getValidToken } from '../services/session';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...(body ? { 'Content-Type': 'application/json' } : null),
    },
    ...(body ? { body: JSON.stringify(body) } : null),
  });

  let data = null;
  try { data = await res.json(); } catch { /* gövdesiz yanıt */ }

  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
      status: res.status,
      code: data?.error || null,
    });
  }
  return data;
}

async function authed(path, opts = {}) {
  const token = await getValidToken();
  if (!token) throw Object.assign(new Error('NO_SESSION'), { code: 'NO_SESSION' });
  return request(path, { ...opts, token });
}

/** Hesapsız da okunabilen uçlar. Jeton varsa yine gönderilir. */
async function openRead(path) {
  const token = await getValidToken().catch(() => null);
  return request(path, { token: token || undefined });
}

// ── Kimlik ──────────────────────────────────────────────────────────────────
export const getMyProfile      = ()      => authed('/api/social/username');
export const checkUsername     = (name)  => authed(`/api/social/username?check=${encodeURIComponent(name)}`);
// `bio` UNDEFINED BIRAKILABİLİR: sunucu alan gelmezse mevcut biyografiyi
// KORUYOR, boş dize gelirse SİLİYOR. Kullanıcı adı kurulum akışı bio
// göndermiyor; yalnız profil düzenleme ekranı gönderiyor.
export const setUsername       = (username, displayName, bio) =>
  authed('/api/social/username', { method: 'POST', body: { username, displayName, bio } });

// ── Arama ───────────────────────────────────────────────────────────────────
export const searchUsers       = (q)     => authed(`/api/social/search?q=${encodeURIComponent(q)}`);

// ── Arkadaşlık ──────────────────────────────────────────────────────────────
export const getFriends        = ()      => authed('/api/social/friend');
export const friendAction      = (targetUid, action) =>
  authed('/api/social/friend', { method: 'POST', body: { targetUid, action } });

// ── Aktivite ────────────────────────────────────────────────────────────────
export const getActivity       = (limit = 40) => authed(`/api/social/activity?limit=${limit}`);

/**
 * Aktivite bildirimi — ateşle-unut.
 * Sosyal profili olmayan / oturumsuz kullanıcıda sessizce düşer; çağıran
 * tarafın try/catch ile uğraşmasına gerek kalmasın diye burada yutuluyor.
 */
export function reportActivity(item) {
  return authed('/api/social/activity', { method: 'POST', body: item }).catch(() => null);
}

// ── Engelleme ───────────────────────────────────────────────────────────────
export const getBlocked        = ()      => authed('/api/social/block');
export const blockUser         = (targetUid) =>
  authed('/api/social/block', { method: 'POST', body: { targetUid, action: 'block' } });
export const unblockUser       = (targetUid) =>
  authed('/api/social/block', { method: 'POST', body: { targetUid, action: 'unblock' } });

// ── Raporlama ───────────────────────────────────────────────────────────────
export const reportContent     = ({ targetType, targetId, reason, note }) =>
  authed('/api/social/report', { method: 'POST', body: { targetType, targetId, reason, note } });

// ── Topluluk listeleri ──────────────────────────────────────────────────────
// Topluluk listeleri hesapsız da okunur (yayınlama/beğenme jetonlu kalır).
export const fetchListFeed   = (sort = 'popular', page = 1) =>
  openRead(`/api/social/lists?sort=${sort}&page=${page}`);
export const fetchList       = (id) => openRead(`/api/social/lists?id=${encodeURIComponent(id)}`);
export const fetchUserLists  = (owner) => authed(`/api/social/lists?owner=${encodeURIComponent(owner)}`);
export const publishList     = ({ id, title, description, emoji, games }) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'publish', id, title, description, emoji, games } });
export const deletePublicList = (id) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'delete', id } });
export const toggleListLike  = (id) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'like', id } });

// ── Avatar ───────────────────────────────────────────────────────────────────
export const setAvatar = (presetId) =>
  authed('/api/social/avatar', { method: 'POST', body: { avatar: presetId } });

// ── Avatar fotoğrafı ────────────────────────────────────────────────────────
// FormData ile gidiyor, JSON değil: dosya gövdesi base64'e çevrilseydi ~%33
// şişerdi ve Vercel'in gövde sınırına daha erken çarpardık.
//
// Content-Type ELLE VERİLMİYOR: fetch, FormData için boundary'yi kendisi
// üretmek zorunda. Elle 'multipart/form-data' yazmak boundary'yi düşürüyor ve
// sunucu gövdeyi çözemiyor.
export async function uploadAvatarPhoto(uri, mime = 'image/jpeg') {
  const token = await getValidToken();
  if (!token) throw Object.assign(new Error('NO_SESSION'), { code: 'NO_SESSION' });

  const form = new FormData();
  form.append('file', { uri, name: `avatar.${mime === 'image/png' ? 'png' : 'jpg'}`, type: mime });

  const res = await fetch(`${API_BASE}/api/social/avatar/photo`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: form,
  });
  let data = null;
  try { data = await res.json(); } catch { /* gövdesiz yanıt */ }
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
      status: res.status, code: data?.error || null,
    });
  }
  return data;
}

// ── Gizlilik ────────────────────────────────────────────────────────────────
export const getPrivacy        = ()      => authed('/api/social/privacy');
export const setPrivacy        = (patch) => authed('/api/social/privacy', { method: 'POST', body: patch });

// ── Steam grafiği ───────────────────────────────────────────────────────────
// Steam arkadaşları + kütüphane kesişimi. Arkadaşın Gamerisen'i kurmuş olması
// GEREKMİYOR — grafiği Steam'den ödünç alıyoruz.
//
// Yavaş bir uç: soğuk önbellekte arkadaş başına bir Steam çağrısı var.
// authed() varsayılanında zaman aşımı yok, o yüzden çağıran tarafta bekleme
// durumu göstermek şart.
export const getSteamFriends   = ()      => authed('/api/social/steam-friends');

// Arkadaşların son iki haftada oynadıkları — oyun bazında toplanmış.
// getSteamFriends'in AKSİNE hızlı: veri zaten önbellekteki kütüphane
// kayıtlarının içinde, sunucu ayrıca sonucu 30 dk saklıyor.
// Steam bağlı değilse hata değil, boş liste döner (anasayfa şeridi çizilmez).
export const getFriendActivity = ()      => authed('/api/social/friend-activity');

// Oyun kartları. `lang` KART GÖRSELİNE gömülüyor — paylaşıldıktan sonra
// değiştirilemediği için istek anında doğru dili göndermek şart.
export const getGameCards      = (lang = 'tr') =>
  authed(`/api/social/game-cards?lang=${lang === 'en' ? 'en' : 'tr'}`);

/**
 * Paylaşım anında imzalı kart adresi üretir — şehir etiketi buradan geçiyor.
 * Saat/sıra değerleri SUNUCUDA yeniden hesaplanıyor; istemci yalnızca hangi
 * oyun ve (isterse) hangi şehir olduğunu söylüyor.
 */
export const getCardUrl = (appid, city, lang = 'tr') =>
  authed('/api/social/card-url', {
    method: 'POST',
    body: { appid, city: city || '', lang: lang === 'en' ? 'en' : 'tr' },
  });

// ── Push (mesaj bildirimleri) ───────────────────────────────────────────────
// İstek listesi fiyat uyarılarından AYRI tutuluyor: kullanıcı fiyat uyarısı
// istemeden mesaj bildirimi isteyebilir, tersi de geçerli.
export const registerDmPush   = (token) =>
  authed('/api/social/push-token', { method: 'POST', body: { token } });
export const unregisterDmPush = (token) =>
  authed('/api/social/push-token', { method: 'DELETE', body: { token } });

// ── Herkese açık profil ─────────────────────────────────────────────────────
// TEK ÇAĞRI hem başlığı hem sekme sayfasını getiriyor: profil açılışında
// sayaçların içerikten sonra gelmesi (iki tur) kabul edilmedi.
//
// PARAMETRESİZ = KENDİ PROFİLİM. Kendi sekmemde kullanıcı adı bilinmiyor,
// sunucu jetondan çözüyor.
//
// `openRead`: profil okumak hesap istemiyor (inceleme akışıyla aynı gerekçe —
// Guideline 5.1.1(v)). Jeton varsa gönderiliyor; arkadaşlık durumu ve engel
// süzgeci ancak o zaman hesaplanabiliyor.
export const getUserProfile = ({ username, uid, tab, offset = 0 } = {}) => {
  const q = new URLSearchParams();
  if (username) q.set('username', username);
  else if (uid) q.set('uid', uid);
  if (tab) { q.set('tab', tab); q.set('offset', String(offset)); }
  const qs = q.toString();
  return openRead('/api/social/profile' + (qs ? `?${qs}` : ''));
};

// ── Doğrulanmış incelemeler ────────────────────────────────────────────────
// SAAT İSTEMCİDEN GÖNDERİLMİYOR: sunucu Steam kütüphanesinden okuyor.
// Özelliğin tüm değeri buradan geliyor.
// OKUMA HESAPSIZ: sunucu 401'i kaldırdı (bkz. app/api/social/reviews).
// Oyun sayfasını hesapsız bir ziyaretçi de açabiliyor ve incelemeleri
// görebilmeli; jeton varsa `mine` ve doğrulanmış saat de dolduruluyor.
export const getGameReviews = (appid) =>
  openRead('/api/social/reviews?appid=' + encodeURIComponent(appid));

export const writeReview = (appid, text, recommended) =>
  authed('/api/social/reviews', { method: 'POST', body: { appid, text, recommended } });

// Genel akış veya kendi incelemelerim.
// Genel akış hesapsız da okunur; "benimkiler" doğal olarak oturum ister.
// offset İKİ YOLDA DA GEÇİYOR: sunucu hem `mine` hem genel akış için
// sayfalıyor (listUserReviews / listRecentReviews), istemci geçmezse akış
// 20'de biterdi.
export const getReviewFeed = (mine = false, offset = 0) =>
  mine
    ? authed(`/api/social/reviews/feed?mine=1&offset=${offset}`)
    : openRead(`/api/social/reviews/feed?offset=${offset}`);

// Yazabileceğim oyunlar — sayfanın boş görünmemesini sağlayan liste.
export const getEligibleGames = () => authed('/api/social/reviews/eligible');

export const removeReview = (appid) =>
  authed('/api/social/reviews', { method: 'DELETE', body: { appid } });

// ── Tartışma gönderileri ────────────────────────────────────────────────────
// Okuma hesapsız (openRead), yazma jetonlu. Yanıt da bir gönderi: aynı uçtan
// `replyTo` ile yazılıyor, ayrı yazma yolu yok.
// `scope='friends'` → yalnız arkadaşların gönderileri (akışın ikinci sekmesi).
// Oturumsuzken sunucu BOŞ dönüyor, hata değil: sekme görünür kalıyor ve boş
// durum kayıt ekranına davet ediyor.
export const fetchPosts   = (offset = 0, scope = 'all') =>
  openRead(`/api/social/posts?offset=${offset}${scope === 'friends' ? '&scope=friends' : ''}`);
export const fetchPost    = (id) => openRead(`/api/social/posts/${encodeURIComponent(id)}`);
export const createPost   = ({ text, game, replyTo }) =>
  authed('/api/social/posts', { method: 'POST', body: { action: 'create', text, game, replyTo } });
export const deletePost   = (id) =>
  authed('/api/social/posts', { method: 'POST', body: { action: 'delete', id } });
export const togglePostLike = (id) =>
  authed('/api/social/posts', { method: 'POST', body: { action: 'like', id } });

// ── Sohbet ──────────────────────────────────────────────────────────────────
// Mesajlaşma YALNIZCA arkadaşlar arasında; sunucu NOT_FRIENDS ile reddediyor.
export const getChatList   = ()  => authed('/api/social/chat/list');
export const getChatConfig = ()  => authed('/api/social/chat/config');
/**
 * Sohbet geçmişi.
 * @param {number} [before] sayfalama — bu zamandan eski mesajlar
 * @param {number} [after]  yedek yoklama — yalnızca bu zamandan yeni mesajlar
 */
export const getChat       = (withUid, before, after) =>
  authed(`/api/social/chat?with=${encodeURIComponent(withUid)}`
    + (before ? `&before=${before}` : '')
    + (after ? `&after=${after}` : ''));
// GIF arama BURADA DEĞİL: sağlayıcının şartları isteğin son kullanıcı
// cihazından gelmesini istiyor, vekil sunucu yasak. Bkz. src/services/klipy.js

/**
 * Mesaj gönderir.
 * @param {object} [share] Reels paylaşımı — YALNIZCA `{ appid }`. Ad ve görsel
 *   sunucuda çözülüyor; istemciden gelen metin saklanmıyor.
 * @param {object} [gif] GIF — `{ url, w, h }`. Adres sunucuda alan adı
 *   listesine karşı doğrulanıyor; serbest URL kabul edilmiyor.
 * @param {string} [replyTo] Yanıtlanan mesajın KİMLİĞİ — kopyası değil.
 *   Alıntı sunucuda çözülüyor, böylece geri alınan mesaj alıntıda da
 *   geri alınmış görünüyor.
 */
export const sendChat      = (to, text, media, share, gif, replyTo) =>
  authed('/api/social/chat', { method: 'POST', body: { to, text, media, share, gif, replyTo } });

// Mesaj beğenisini açar/kapatır. Sunucu güncel listeyi döndürüyor —
// istemcinin kendi hesabını tutmasına gerek yok.
/**
 * Mesajı sabitler; `id` verilmezse sabitlemeyi kaldırır.
 * Konuşma başına tek sabit var ve iki taraf da değiştirebiliyor.
 */
export const pinChatMessage = (withUid, id) =>
  authed('/api/social/chat/pin', { method: 'POST', body: { with: withUid, id: id || '' } });

// `emoji` verilmezse sunucu kalbe düşüyor — çift dokunuşun karşılığı.
export const likeChatMessage = (withUid, id, emoji) =>
  authed('/api/social/chat/like', { method: 'POST', body: { with: withUid, id, emoji } });

// Mesajı geri alır. Sunucu YALNIZCA gönderenin kendi mesajını silmesine izin
// veriyor; başkasınınkinde NOT_OWNER döner.
export const deleteChatMessage = (withUid, id) =>
  authed('/api/social/chat', { method: 'DELETE', body: { with: withUid, id } });

// "Yazıyor" bildirimi. Hiçbir yere yazılmıyor, yalnızca kanala düşüyor;
// kaybolması zararsız olduğu için çağıran hatasını yutabilir.
export const sendTyping = (to) =>
  authed('/api/social/chat/typing', { method: 'POST', body: { to } });

// Çevrimiçi nabzı. Kendi durumumu tazeler ve istenirse karşı tarafınkini
// aynı turda döndürür — nabız ve okuma tek istekte birleşiyor.
export const pingPresence = (withUid) =>
  authed(`/api/social/presence${withUid ? `?with=${encodeURIComponent(withUid)}` : ''}`,
    { method: 'POST', body: {} });

/**
 * Sohbet görseli yükler.
 *
 * `authed` KULLANILMIYOR: o yardımcı gövdeyi JSON'a çeviriyor, burada
 * multipart gerekiyor. Content-Type ELLE YAZILMAMALI — fetch, FormData için
 * sınır (boundary) değerini kendi üretiyor ve elle yazılan başlık onu bozar.
 *
 * @param {string} to    alıcı uid
 * @param {string} uri   yerel dosya adresi (küçültülmüş olmalı)
 * @param {string} type  image/jpeg gibi
 */
export async function uploadChatMedia(to, uri, type = 'image/jpeg') {
  const token = await getValidToken();
  if (!token) throw Object.assign(new Error('NO_SESSION'), { code: 'NO_SESSION' });

  const EXT = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/quicktime': 'mov',
  };

  const form = new FormData();
  form.append('to', to);
  form.append('file', { uri, name: `dm.${EXT[type] || 'jpg'}`, type });

  const res = await fetch(`${API_BASE}/api/social/chat/media`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: form,
  });

  let data = null;
  try { data = await res.json(); } catch { /* gövdesiz yanıt */ }

  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
      status: res.status, code: data?.error || null,
    });
  }
  return data;
}
