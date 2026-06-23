'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// İsim normalleştirme — Steam vs RAWG isim farklılıklarını tolere eder
export function normalizeName(name) {
  return (name || '').toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[:''\-!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null);      // Site hesabı
  const [steamUser,      setSteamUser]      = useState(null);      // İlk Steam hesabı (geriye uyumluluk)
  const [steamAccounts,  setSteamAccounts]  = useState([]);        // Tüm Steam hesapları
  const [xboxUser,       setXboxUser]       = useState(null);      // Xbox oturumu
  const [ownedGames,     setOwnedGames]     = useState(new Set()); // İlk Steam hesabının oyunları
  const [xboxOwnedGames, setXboxOwnedGames] = useState(new Set());
  const [gamePassGames,  setGamePassGames]  = useState(new Set());
  const [ready,          setReady]          = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/user-me').then(r => r.json()).catch(() => ({ user: null })),
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({ user: null, accounts: [] })),
      fetch('/api/auth/xbox/me').then(r => r.json()).catch(() => ({ user: null })),
    ]).then(([userData, steamData, xboxData]) => {
      if (userData.user) setUser(userData.user);

      // Çoklu Steam hesapları
      const accounts = steamData.accounts || (steamData.user ? [steamData.user] : []);
      if (userData.steamUser && accounts.length === 0) {
        // Redis'ten gelen tek hesap (eski sistem)
        setSteamAccounts([userData.steamUser]);
        setSteamUser(userData.steamUser);
      } else if (accounts.length > 0) {
        setSteamAccounts(accounts);
        setSteamUser(accounts[0]);
      }

      if (userData.xboxUser) setXboxUser(userData.xboxUser);
      else if (xboxData.user) setXboxUser(xboxData.user);
    }).catch(err => {
      console.error('Initial auth fetch error:', err);
    }).finally(() => setReady(true));
  }, []);

  // İlk Steam hesabı değişince sahip olunan oyunları çek
  useEffect(() => {
    if (!steamUser) { setOwnedGames(new Set()); return; }
    fetch(`/api/oyun?steamId=${steamUser.steamId}`)
      .then(r => r.json())
      .then(d => {
        if (d.games) setOwnedGames(new Set(d.games.map(g => normalizeName(g.name))));
      })
      .catch(() => {});
  }, [steamUser]);

  // Xbox
  useEffect(() => {
    if (!xboxUser) {
      setXboxOwnedGames(new Set());
      setGamePassGames(new Set());
      return;
    }
    fetch('/api/xbox-library')
      .then(r => r.json())
      .then(d => {
        if (d.games) {
          const gp = [], owned = [];
          d.games.forEach(g => {
            if (g.isGamePass) gp.push(normalizeName(g.name));
            else owned.push(normalizeName(g.name));
          });
          setGamePassGames(new Set(gp));
          setXboxOwnedGames(new Set(owned));
        }
      })
      .catch(() => {});
  }, [xboxUser]);

  // ── Site hesabı işlemleri ────────────────────────────────────────────────
  const signup = async ({ name, email, password }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return { error: data.error || 'Kayıt başarısız.' };
      return { ok: true, mock: data.mock };
    } catch (err) { return { error: err.message }; }
  };

  const login = async ({ email, password }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return { error: data.error || 'Giriş başarısız.' };
      setUser(data.user);
      return { ok: true };
    } catch (err) { return { error: err.message }; }
  };

  const logout = () => {
    fetch('/api/auth/user-logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setSteamUser(null);
    setSteamAccounts([]);
    setXboxUser(null);
    setOwnedGames(new Set());
    setXboxOwnedGames(new Set());
    setGamePassGames(new Set());
  };

  const resetPassword = async (email) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return { error: data.error || 'Şifre sıfırlama başarısız.' };
      return { ok: true, mock: data.mock };
    } catch (err) { return { error: err.message }; }
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Şifre değiştirme başarısız.' };
      return { ok: true, mock: data.mock };
    } catch (err) { return { error: err.message }; }
  };

  const deleteAccount = async (password) => {
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Hesap silme başarısız.' };
      
      // Reset all auth states
      setUser(null);
      setSteamUser(null);
      setSteamAccounts([]);
      setXboxUser(null);
      setOwnedGames(new Set());
      setXboxOwnedGames(new Set());
      setGamePassGames(new Set());
      
      return { ok: true, mock: data.mock };
    } catch (err) { return { error: err.message }; }
  };

  // ── Steam işlemleri ──────────────────────────────────────────────────────

  // Belirli bir Steam hesabını çıkar
  const steamLogoutAccount = async (steamId) => {
    try {
      await fetch(`/api/auth/steam-remove?steamId=${steamId}`, { method: 'DELETE' });
    } catch {}
    const updated = steamAccounts.filter(a => a.steamId !== steamId);
    setSteamAccounts(updated);
    setSteamUser(updated[0] || null);
    if (updated.length === 0) setOwnedGames(new Set());
  };

  // Tüm Steam hesaplarını çıkar (eski davranış)
  const steamLogout = () => {
    setSteamUser(null);
    setSteamAccounts([]);
    setOwnedGames(new Set());
    window.location.href = '/api/auth/logout';
  };

  // ── Xbox işlemleri ───────────────────────────────────────────────────────
  const xboxLogout = () => {
    setXboxUser(null);
    window.location.href = '/api/auth/xbox/logout';
  };

  return (
    <AuthContext.Provider value={{
      user, steamUser, steamAccounts, xboxUser,
      ownedGames, xboxOwnedGames, gamePassGames,
      ready, signup, login, logout, steamLogout, steamLogoutAccount, xboxLogout,
      resetPassword, changePassword, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
