import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { loadSession, getAccount, subscribeSession } from '../services/session';
import {
  fetchConnections, putSteamConnection, putXboxConnection,
  removeSteamConnection, removeXboxConnection,
} from '../api/connections';
import { scopedKey, ownerReady, subscribeOwner, registerScopedStore } from '../services/owner';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_BASE } from '../api/client';

// Tarayıcı auth oturumlarının düzgün tamamlanması için
WebBrowser.maybeCompleteAuthSession();

// Taban adlar — gerçek anahtarlar sahibe göre türetilir (owner.js).
// Steam/Xbox bağlantısı hesabın kendisi değil, hesaba TAKILAN bir bağlantı:
// kapsamsız kaldığında B, A'nın Steam kütüphanesini ve gamertag'ini görüyordu.
const STEAM_KEY = 'gr_steam_accounts';   // AsyncStorage (hassas değil)
const XBOX_KEY  = 'gr_xbox_session';     // SecureStore (refreshToken içerir)

// Silme için kayıt; yeniden yükleme React tarafında (subscribeOwner).
registerScopedStore({ keys: [STEAM_KEY] });
registerScopedStore({ keys: [XBOX_KEY], secure: true });

const AuthContext = createContext(null);

// base64 → UTF-8 (Türkçe karakter güvenli)
function b64DecodeUtf8(b64) {
  try {
    // eslint-disable-next-line no-undef
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    // eslint-disable-next-line no-undef
    return atob(b64);
  }
}

// Deep link URL'inden ?data=<base64 json> çöz
function decodePayload(url) {
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(q);
    const data = params.get('data');
    if (!data) return null;
    return JSON.parse(b64DecodeUtf8(decodeURIComponent(data)));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [steamAccounts, setSteamAccounts] = useState([]);
  const [xbox, setXbox] = useState(null);   // { xuid, gamertag, avatar, refreshToken }
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Sahip değişimini izle → bağlantılar yeni hesabın kovasından okunsun
  const [ownerTick, setOwnerTick] = useState(0);
  useEffect(() => subscribeOwner(() => setOwnerTick(n => n + 1)), []);

  // Açılışta ve her hesap değişiminde kalıcı bağlantıları yükle.
  // Bulunamayınca durumu SIFIRLAMAK şart: yalnızca "varsa yaz" deseydik
  // önceki hesabın Steam listesi ekranda asılı kalırdı.
  useEffect(() => {
    let alive = true;
    (async () => {
      await ownerReady();
      let steam = [];
      let xb = null;
      try {
        const s = await AsyncStorage.getItem(scopedKey(STEAM_KEY));
        if (s) steam = JSON.parse(s) || [];
      } catch {}
      try {
        const x = await SecureStore.getItemAsync(scopedKey(XBOX_KEY));
        if (x) xb = JSON.parse(x);
      } catch {}
      if (!alive) return;
      setSteamAccounts(steam);
      setXbox(xb);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [ownerTick]);

  const persistSteam = useCallback(async (list) => {
    setSteamAccounts(list);
    try { await AsyncStorage.setItem(scopedKey(STEAM_KEY), JSON.stringify(list)); } catch {}
  }, []);

  const persistXbox = useCallback(async (session) => {
    setXbox(session);
    try {
      if (session) await SecureStore.setItemAsync(scopedKey(XBOX_KEY), JSON.stringify(session));
      else await SecureStore.deleteItemAsync(scopedKey(XBOX_KEY));
    } catch {}
  }, []);

  // ── Mağaza bağlama ön koşulu ──
  // Bağlantı artık Gamerisen HESABINA yazılıyor, cihaza değil. Hesap yoksa
  // yazacak bir yer yok: bağlantı ilk oturum kapanışında ya da cihaz
  // değişiminde sessizce kaybolurdu.
  //
  // Kapı BURADA, çağıranlarda değil. Arayüzde de kilit var (profil ve
  // kütüphane ekranları) ama tek başına yeterli değil — yeni bir ekran
  // eklendiğinde yine atlanabilirdi. Nitekim kilidi ilk koyduğumuzda
  // kütüphane ekranı kapıyı atlatıyordu.
  const requireAccount = useCallback(() => {
    if (getAccount()) return null;
    return { ok: false, error: 'ACCOUNT_REQUIRED' };
  }, []);

  // ── Steam girişi ──
  const loginSteam = useCallback(async () => {
    const gate = requireAccount();
    if (gate) return gate;
    if (busy) return { ok: false };
    setBusy(true);
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${API_BASE}/api/auth/steam?mobile=1&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const payload = decodePayload(result.url);
        if (payload?.platform === 'steam' && payload.account?.steamId) {
          const list = [...steamAccounts];
          const idx = list.findIndex(a => a.steamId === payload.account.steamId);
          // ÖNCE SUNUCUYA, sonra yerele.
          //
          // Eskiden tersiydi ve yazma `.catch(() => {})` ile sessizdi. Sunucu
          // okuması OTORİTE olduğu için sonuç şuydu: yazma başarısız olunca
          // bağlantı ekranda görünüyor, uygulama yeniden açılınca sunucudan
          // boş liste gelip yereli de siliyordu. Kullanıcı "bağladım ama yok"
          // diyordu — çünkü gerçekten yoktu.
          //
          // Sunucunun döndürdüğü liste doğrudan yazılıyor: tek doğruluk
          // kaynağı, yerelde ayrı bir birleştirme mantığı yok.
          try {
            const r = await putSteamConnection(payload.account);
            await persistSteam(Array.isArray(r?.steamAccounts) ? r.steamAccounts : list);
            return { ok: true };
          } catch (e) {
            // Bağlanamadıysa YEREL DE YAZILMIYOR — hayalet durum bırakmaktansa
            // açıkça başarısız olmak doğru.
            return { ok: false, error: e?.code === 'STEAM_LIMIT' ? 'STEAM_LIMIT' : 'SYNC_FAILED' };
          }
        }
        if (payload?.error) return { ok: false, error: payload.error };
      }
      return { ok: false, cancelled: result.type !== 'success' };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      setBusy(false);
    }
  }, [busy, steamAccounts, persistSteam]);

  // ── Xbox girişi ──
  const loginXbox = useCallback(async () => {
    const gate = requireAccount();
    if (gate) return gate;
    if (busy) return { ok: false };
    setBusy(true);
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${API_BASE}/api/auth/xbox?mobile=1&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const payload = decodePayload(result.url);
        if (payload?.platform === 'xbox' && payload.session?.xuid) {
          // Steam ile aynı sıra: önce sunucu, sonra cihaz.
          // refreshToken GÖNDERİLMEZ — kütüphane çekimi için gereken gizli
          // bilgi yalnızca SecureStore'da kalıyor, o yüzden yerele TAM oturum
          // yazılıyor, sunucuya yalnızca kimlik alanları gidiyor.
          try {
            await putXboxConnection(payload.session);
            await persistXbox(payload.session);
            return { ok: true };
          } catch {
            return { ok: false, error: 'SYNC_FAILED' };
          }
        }
        if (payload?.error) return { ok: false, error: payload.error };
      }
      return { ok: false, cancelled: result.type !== 'success' };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      setBusy(false);
    }
  }, [busy, persistXbox]);

  const logoutSteam = useCallback(async (steamId) => {
    const nextList = steamAccounts.filter(a => a.steamId !== steamId);
    setSteamAccounts(nextList);
    try {
      await removeSteamConnection(steamId);
    } catch {}
    await persistSteam(nextList);
  }, [steamAccounts, persistSteam]);

  const logoutXbox = useCallback(async () => {
    setXbox(null);
    try {
      await removeXboxConnection();
    } catch {}
    await persistXbox(null);
  }, [persistXbox]);

  // ── Hesap oturumu (e-posta/şifre) ──────────────────────────────────────────
  // Steam/Xbox "bağlantı"dır; bu ise kullanıcının kimliği. İkisi bağımsız.
  const [account, setAccount] = useState(null);
  useEffect(() => {
    loadSession().then(() => setAccount(getAccount()));
    return subscribeSession(() => setAccount(getAccount()));
  }, []);

  // ── Hesaptaki bağlantıları çek ──
  // İSTENEN DAVRANIŞIN ÖZÜ BURASI: kullanıcı hangi cihazdan girerse girsin,
  // Steam/Xbox bağlantısı hesabıyla birlikte geliyor.
  //
  // Sunucu OTORİTE kabul ediliyor, birleştirme yapılmıyor: bağlama artık hesap
  // zorunlu olduğu için sunucuda olmayan bir bağlantının meşru kaynağı yok.
  // Birleştirseydik, başka cihazda koparılan hesap buradaki yerel kopyadan
  // geri dirilir ve kullanıcı onu bir daha silemezdi.
  //
  // Xbox'ta refreshToken sunucuda TUTULMUYOR (kasıtlı). O yüzden yalnızca
  // cihazda oturum yoksa sunucudaki kayıt yazılır — varsa yerel olan korunur,
  // aksi hâlde kütüphane çekimi için gereken belirteci kaybederdik.
  // ownerReady() BEKLENMEK ZORUNDA ve ownerTick bağımlılıkta olmalı.
  //
  // Yoksa yarış oluşuyor: bu efekt `account` değişince başlıyor ama depo
  // kapsaması (owner) henüz bağlanmamış olabiliyor. Ağ hızlı dönerse
  // persistSteam sunucudan geleni ESKİ sahibin kovasına yazıyor; hemen
  // ardından yerel yükleme efekti yeni (boş) kovayı okuyup üzerine yazıyor
  // ve sunucudan gelen bağlantılar kayboluyor.
  //
  // Bekleyince sıra garanti: önce kova bağlanır, sonra ağ turu tamamlanır ve
  // yetkili olan sunucu verisi en son yazılır.
  useEffect(() => {
    if (!account) return;
    let alive = true;
    (async () => {
      await ownerReady();
      if (!alive) return;
      try {
        const r = await fetchConnections();
        if (!alive) return;
        if (Array.isArray(r?.steamAccounts)) persistSteam(r.steamAccounts);
        if (r?.xbox) {
          let localSession = null;
          try {
            const x = await SecureStore.getItemAsync(scopedKey(XBOX_KEY));
            if (x) localSession = JSON.parse(x);
          } catch {}
          const mergedXbox = {
            ...r.xbox,
            refreshToken: r.xbox.refreshToken || localSession?.refreshToken || null,
          };
          persistXbox(mergedXbox);
        } else if (r && r.xbox === null) {
          persistXbox(null);
        }
      } catch { /* ağ yoksa yereldekiyle devam */ }
    })();
    return () => { alive = false; };
    // xbox bilerek dışarıda: her değişimde yeniden çekmek gereksiz tur olurdu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ownerTick, persistSteam, persistXbox]);

  const value = useMemo(
    () => ({
      steamAccounts, xbox, ready, busy, loginSteam, loginXbox, logoutSteam, logoutXbox,
      account, isSignedIn: !!account,
    }),
    [steamAccounts, xbox, ready, busy, loginSteam, loginXbox, logoutSteam, logoutXbox, account]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
