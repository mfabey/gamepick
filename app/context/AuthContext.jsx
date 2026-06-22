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
  const [user,       setUser]       = useState(null);      // Site hesabı (e-posta/şifre)
  const [steamUser,  setSteamUser]  = useState(null);      // Steam oturumu
  const [xboxUser,   setXboxUser]   = useState(null);      // Xbox oturumu
  const [ownedGames, setOwnedGames] = useState(new Set()); // Normalize edilmiş kütüphane isimleri
  const [xboxOwnedGames, setXboxOwnedGames] = useState(new Set()); // Xbox'ta sahip olunan oyunlar
  const [gamePassGames,   setGamePassGames]   = useState(new Set());   // Game Pass oyunları
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    // Site auth, Steam, and Xbox auth parallel fetch
    Promise.all([
      fetch('/api/auth/user-me').then(r => r.json()).catch(() => ({ user: null })),
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({ user: null })),
      fetch('/api/auth/xbox/me').then(r => r.json()).catch(() => ({ user: null })),
    ]).then(([userData, steamData, xboxData]) => {
      if (userData.user)  setUser(userData.user);
      
      // Use Redis-persisted connections if available, otherwise fallback to cookies
      if (userData.steamUser) setSteamUser(userData.steamUser);
      else if (steamData.user) setSteamUser(steamData.user);
      
      if (userData.xboxUser)  setXboxUser(userData.xboxUser);
      else if (xboxData.user)  setXboxUser(xboxData.user);
    }).catch(err => {
      console.error('Initial auth fetch error:', err);
    }).finally(() => setReady(true));
  }, []);

  // Steam kullanıcısı oturumu açınca kütüphane adlarını arka planda çek
  useEffect(() => {
    if (!steamUser) { setOwnedGames(new Set()); return; }
    fetch('/api/oyun')
      .then(r => r.json())
      .then(d => {
        if (d.games) {
          setOwnedGames(new Set(d.games.map(g => normalizeName(g.name))));
        }
      })
      .catch(() => {});
  }, [steamUser]);

  // Xbox kullanıcısı oturumu açınca kütüphane adlarını arka planda çek
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
          const gp = [];
          const owned = [];
          d.games.forEach(g => {
            if (g.isGamePass) {
              gp.push(normalizeName(g.name));
            } else {
              owned.push(normalizeName(g.name));
            }
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
      if (!res.ok || !data.ok) {
        return { error: data.error || 'Kayıt başarısız.' };
      }
      return { ok: true, mock: data.mock };
    } catch (err) {
      return { error: err.message };
    }
  };

  const login = async ({ email, password }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { error: data.error || 'Giriş başarısız.' };
      }
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  const logout = () => {
    fetch('/api/auth/user-logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  };

  const resetPassword = async (email) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { error: data.error || 'Şifre sıfırlama işlemi başarısız.' };
      }
      return { ok: true, mock: data.mock };
    } catch (err) {
      return { error: err.message };
    }
  };

  // ── Steam işlemleri ──────────────────────────────────────────────────────
  const steamLogout = () => {
    setSteamUser(null);
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
      user, steamUser, xboxUser, ownedGames, xboxOwnedGames, gamePassGames, 
      ready, signup, login, logout, steamLogout, xboxLogout, resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
