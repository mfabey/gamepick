import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { loadSession, getAccount, subscribeSession } from '../services/session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_BASE } from '../api/client';

// Tarayıcı auth oturumlarının düzgün tamamlanması için
WebBrowser.maybeCompleteAuthSession();

const STEAM_KEY = 'gr_steam_accounts';   // AsyncStorage (hassas değil)
const XBOX_KEY  = 'gr_xbox_session';     // SecureStore (refreshToken içerir)

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

  // Açılışta kalıcı oturumları yükle
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(STEAM_KEY);
        if (s) setSteamAccounts(JSON.parse(s));
      } catch {}
      try {
        const x = await SecureStore.getItemAsync(XBOX_KEY);
        if (x) setXbox(JSON.parse(x));
      } catch {}
      setReady(true);
    })();
  }, []);

  const persistSteam = useCallback(async (list) => {
    setSteamAccounts(list);
    try { await AsyncStorage.setItem(STEAM_KEY, JSON.stringify(list)); } catch {}
  }, []);

  const persistXbox = useCallback(async (session) => {
    setXbox(session);
    try {
      if (session) await SecureStore.setItemAsync(XBOX_KEY, JSON.stringify(session));
      else await SecureStore.deleteItemAsync(XBOX_KEY);
    } catch {}
  }, []);

  // ── Steam girişi ──
  const loginSteam = useCallback(async () => {
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
          if (idx >= 0) list[idx] = payload.account;
          else if (list.length < 5) list.push(payload.account);
          await persistSteam(list);
          return { ok: true };
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
    if (busy) return { ok: false };
    setBusy(true);
    try {
      const redirectUri = Linking.createURL('auth');
      const authUrl = `${API_BASE}/api/auth/xbox?mobile=1&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const payload = decodePayload(result.url);
        if (payload?.platform === 'xbox' && payload.session?.xuid) {
          await persistXbox(payload.session);
          return { ok: true };
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
    await persistSteam(steamAccounts.filter(a => a.steamId !== steamId));
  }, [steamAccounts, persistSteam]);

  const logoutXbox = useCallback(async () => {
    await persistXbox(null);
  }, [persistXbox]);

  // ── Hesap oturumu (e-posta/şifre) ──────────────────────────────────────────
  // Steam/Xbox "bağlantı"dır; bu ise kullanıcının kimliği. İkisi bağımsız.
  const [account, setAccount] = useState(null);
  useEffect(() => {
    loadSession().then(() => setAccount(getAccount()));
    return subscribeSession(() => setAccount(getAccount()));
  }, []);

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
