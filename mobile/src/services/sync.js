// ─────────────────────────────────────────────────────────────────────────────
// Hesap senkronu — zevk profili ve takip listesini sunucuyla eşitler.
//
// Akış: cihazdaki veriyi gönder → sunucu BİRLEŞTİRİR → birleşmiş hâli geri al
// → yerele uygula. Böylece hiçbir tarafta veri kaybı olmaz.
// ─────────────────────────────────────────────────────────────────────────────
import { getValidToken } from './session';
import { pushUserData } from '../api/account';
import { getProfile, mergeRemoteTaste } from './tasteProfile';
import { loadCollections, syncPayload, applyMergedCollections } from './collectionsStore';

let running = false;
let lastRun = 0;
const MIN_GAP = 30 * 1000;   // gereksiz sık senkronu engelle

/**
 * @param wishlist  cihazdaki takip listesi
 * @param applyWishlist  birleşmiş listeyi yerele yazan geri çağrı
 */
export async function syncAccountData(wishlist = [], applyWishlist) {
  if (running || Date.now() - lastRun < MIN_GAP) return false;
  const token = await getValidToken();
  if (!token) return false;            // oturum yok → sessizce geç

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
