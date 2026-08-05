// ─────────────────────────────────────────────────────────────────────────────
// Hesap oturumu — token'lar SecureStore'da (Steam/Xbox oturumuyla aynı güvenli depo).
//
// idToken ~1 saatte dolar. getValidToken() süre dolmadan önce refreshToken ile
// sessizce yeniler; kullanıcı tekrar giriş yapmak zorunda kalmaz.
// ─────────────────────────────────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';
import { loginAccount, refreshSession, appleSignIn } from '../api/account';
import { bindOwner, ownerKeyFor, wipeOwnerData } from './owner';

const KEY = 'gr_account_session';
const SKEW_MS = 5 * 60 * 1000;   // süre dolmadan 5 dk önce yenile

let session = null;              // { user, idToken, refreshToken, expiresAt }
let loaded = false;
let refreshing = null;           // eşzamanlı yenileme isteklerini tekille
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

// Kalıcı depoların sahibi buradan sürülür — oturumun kime ait olduğunu bilen
// tek yer burası. bindOwner aynı sahip için tekrar çağrıldığında hiçbir şey
// yapmaz, o yüzden jeton yenilemesi depoları boşuna sarsmaz.
async function persist(s) {
  session = s;
  try {
    if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(KEY);
  } catch { /* depo yazılamadıysa bellekte devam */ }
  await bindOwner(s?.user?.uid || null);
  emit();
}

// Eşzamanlı çağrılar tekilleniyor: depolar ownerReady()'yi bekliyor ve iki
// paralel yükleme sahibi iki kez bağlardı.
let loadPromise = null;

export async function loadSession() {
  if (loaded) return session;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) session = JSON.parse(raw);
      } catch { /* bozuk kayıt → oturumsuz başla */ }
      loaded = true;
      // Oturum yoksa da çağrılmalı: sahip 'anon' olarak çözülmeden depolar
      // okumaya başlayamaz.
      await bindOwner(session?.user?.uid || null);
      emit();
      return session;
    })();
  }
  return loadPromise;
}

// loadSession ÖNCE bekleniyor: diskten yükleme hâlâ uçuşuyorken giriş
// yapılırsa, geç gelen yükleme bindOwner(null) diyip sahibi 'anon'a geri
// çevirir ve yeni oturumun verisi yanlış kovaya düşer.
export async function signIn(email, password) {
  await loadSession();
  const r = await loginAccount({ email, password });
  await persist({
    user: { ...r.user, provider: 'password' },
    idToken: r.idToken,
    refreshToken: r.refreshToken,
    expiresAt: Date.now() + (r.expiresIn || 3600) * 1000,
  });
  return r.user;
}

// Sign in with Apple — persist() aynı, yalnızca kaynak farklı.
// account.provider === 'apple' olur → delete-account ekranı şifre yerine
// Apple ile yeniden doğrulama isteyecek.
export async function signInWithApple(identityToken, fullName) {
  await loadSession();
  const r = await appleSignIn({ identityToken, fullName });
  await persist({
    user: r.user,
    idToken: r.idToken,
    refreshToken: r.refreshToken,
    expiresAt: Date.now() + (r.expiresIn || 3600) * 1000,
  });
  return r.user;
}

/**
 * Çıkış — sıra kritik.
 *
 * 1. SON SENKRON: bu oturumda yapılan değişiklikler sunucuya ancak burada
 *    ulaşır. syncAccountData yalnızca açılışta ve oturum değişiminde koşuyor;
 *    akıtmadan silersek "koleksiyon yap → hemen çık" verisi kaybolur.
 * 2. Oturumu kapat: persist(null) sahibi 'anon'a çevirir, depolar önce eski
 *    kovaya yazılır sonra yenisinden yüklenir.
 * 3. Yerel kopyayı sil: sunucuda duruyor, tekrar girişte geri geliyor. Ortak
 *    cihazda bir sonraki kullanıcının A'nın koleksiyonlarını görmesi bundan
 *    daha kötü.
 *
 * sync dinamik import ile geliyor — sync.js zaten bu modülü import ediyor,
 * statik olsa döngü olurdu.
 *
 * @param wishlist  akıtılacak takip listesi (ekrandan gelir; hesapsız çalışan
 *                  uygulamada tek kaynağı React durumu)
 */
export async function signOut(wishlist) {
  const owner = session?.user?.uid ? ownerKeyFor(session.user.uid) : null;

  // Liste verilmediyse akıtma yok. delete-account.jsx da buradan geçiyor ve
  // silinmiş bir hesap için sunucuya veri göndermenin anlamı yok.
  if (owner && Array.isArray(wishlist)) {
    try {
      const { syncAccountData, resetSyncThrottle } = await import('./sync');
      resetSyncThrottle();                          // 30 sn kısıtlayıcısı son senkronu yutmasın
      await syncAccountData(wishlist);
    } catch { /* ağ yoksa çıkış yine de tamamlanmalı */ }
  }

  await persist(null);
  if (owner) await wipeOwnerData(owner);
}

/**
 * Geçerli bir idToken döndürür; gerekiyorsa yeniler.
 * Yenileme başarısız olursa (token iptal edilmiş) oturumu kapatır ve null döner.
 */
export async function getValidToken() {
  if (!loaded) await loadSession();
  if (!session?.idToken) return null;

  if (Date.now() < session.expiresAt - SKEW_MS) return session.idToken;

  // Aynı anda birden fazla istek yenileme tetiklemesin
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await refreshSession(session.refreshToken);
        await persist({
          ...session,
          idToken: r.idToken,
          refreshToken: r.refreshToken || session.refreshToken,
          expiresAt: Date.now() + (r.expiresIn || 3600) * 1000,
        });
        return r.idToken;
      } catch {
        // refreshToken geçersiz → oturumu kapat. Yerel kopya da gitmeli:
        // jetonu iptal edilmiş hesabın verisi cihazda kalıp bir sonraki
        // kullanıcıya görünmemeli. Akıtma yok — geçerli jeton yok.
        const owner = session?.user?.uid ? ownerKeyFor(session.user.uid) : null;
        await persist(null);
        if (owner) await wipeOwnerData(owner);
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export function getSession() { return session; }
export function getAccount() { return session?.user || null; }
export function subscribeSession(cb) { listeners.add(cb); return () => listeners.delete(cb); }
