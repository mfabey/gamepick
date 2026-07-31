// ─────────────────────────────────────────────────────────────────────────────
// Hesap oturumu — token'lar SecureStore'da (Steam/Xbox oturumuyla aynı güvenli depo).
//
// idToken ~1 saatte dolar. getValidToken() süre dolmadan önce refreshToken ile
// sessizce yeniler; kullanıcı tekrar giriş yapmak zorunda kalmaz.
// ─────────────────────────────────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';
import { loginAccount, refreshSession, appleSignIn } from '../api/account';

const KEY = 'gr_account_session';
const SKEW_MS = 5 * 60 * 1000;   // süre dolmadan 5 dk önce yenile

let session = null;              // { user, idToken, refreshToken, expiresAt }
let loaded = false;
let refreshing = null;           // eşzamanlı yenileme isteklerini tekille
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

async function persist(s) {
  session = s;
  try {
    if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(KEY);
  } catch { /* depo yazılamadıysa bellekte devam */ }
  emit();
}

export async function loadSession() {
  if (loaded) return session;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) session = JSON.parse(raw);
  } catch { /* bozuk kayıt → oturumsuz başla */ }
  loaded = true;
  emit();
  return session;
}

export async function signIn(email, password) {
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
  const r = await appleSignIn({ identityToken, fullName });
  await persist({
    user: r.user,
    idToken: r.idToken,
    refreshToken: r.refreshToken,
    expiresAt: Date.now() + (r.expiresIn || 3600) * 1000,
  });
  return r.user;
}

export async function signOut() {
  await persist(null);
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
        await persist(null);      // refreshToken geçersiz → oturumu kapat
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
