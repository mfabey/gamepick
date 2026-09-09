// ─────────────────────────────────────────────────────────────────────────────
// Hesap senkronu — zevk profili ve takip listesini sunucuyla eşitler.
//
// Akış: cihazdaki veriyi gönder → sunucu BİRLEŞTİRİR → birleşmiş hâli geri al
// → yerele uygula. Böylece hiçbir tarafta veri kaybı olmaz.
// ─────────────────────────────────────────────────────────────────────────────
import { getValidToken, getAccount } from './session';
import { pushUserData } from '../api/account';
import { getProfile, mergeRemoteTaste } from './tasteProfile';
import { loadCollections, syncPayload, applyMergedCollections } from './collectionsStore';

let running = false;
let lastRun = 0;
let lastOwner = null;        // en son hangi hesap için koştu
const MIN_GAP = 30 * 1000;   // gereksiz sık senkronu engelle

/** Hesap değişimi ve çıkış öncesi akıtma kısıtlayıcıya takılmasın. */
export function resetSyncThrottle() { lastRun = 0; }

/**
 * @param wishlist  cihazdaki takip listesi
 * @param applyWishlist  birleşmiş listeyi yerele yazan geri çağrı
 * @param force  süre sınırına takılmadan zorla senkronize et
 */
export async function syncAccountData(wishlist = [], applyWishlist, force = false) {
  // Sahibi bilinmeyen veri senkron EDİLMEZ. Eski hâlde bu kontrol yoktu:
  // jeton kimindiyse cihazdaki veri onun hesabına yazılıyordu.
  const uid = getAccount()?.uid || null;
  if (!uid) return false;

  // Hesap değiştiyse kısıtlayıcı sıfırlanır — yoksa B'nin ilk senkronu,
  // A'nın 30 sn içindeki senkronu yüzünden atlanırdı.
  if (uid !== lastOwner || force) { lastRun = 0; lastOwner = uid; }

  if (running || (Date.now() - lastRun < MIN_GAP && !force)) return false;
  const token = await getValidToken();
  if (!token) return false;            // oturum yok → sessizce geç
  // getValidToken yenileme yapabilir; yenileme başarısızsa oturum kapanır.
  // Jetonu aldıktan sonra sahibin hâlâ aynı olduğunu doğrula.
  if (getAccount()?.uid !== uid) return false;

  running = true;
  try {
    const local = getProfile();
    // Koleksiyonlar diskten yüklenmeden gönderilirse sunucuya BOŞ liste gider
    // ve birleştirme yerelde henüz okunmamış kayıtları göremez.
    await loadCollections();
    const cols = syncPayload();

    const res = await pushUserData(token, {
      taste: { genres: local.genres || {}, events: local.events || 0 },
      wishlist,
      collections: cols.collections,
      deleted: cols.deleted,
    });

    // Yanıt beklenirken kullanıcı çıkmış ya da başka hesaba geçmiş olabilir.
    // Birleşmiş veri O ANKİ sahibe değil, isteği başlatan sahibe ait —
    // uygulamak tam da düzeltmeye çalıştığımız karışmayı üretirdi.
    if (getAccount()?.uid !== uid) return false;

    if (res?.taste?.genres) {
      await mergeRemoteTaste(res.taste.genres, res.taste.events);
    }
    if (Array.isArray(res?.wishlist) && typeof applyWishlist === 'function') {
      await applyWishlist(res.wishlist);
    }
    if (Array.isArray(res?.collections)) {
      await applyMergedCollections(res.collections, res.deleted);
    }
    lastRun = Date.now();
    return true;
  } catch {
    return false;                       // ağ hatası kullanıcıyı engellemesin
  } finally {
    running = false;
  }
}
