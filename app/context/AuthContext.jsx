'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);   // Site hesabı (e-posta/şifre)
  const [steamUser, setSteamUser] = useState(null);   // Steam oturumu
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    // Site auth — localStorage
    try {
      const stored = localStorage.getItem('gp_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}

    // Steam auth — httpOnly cookie okunur, /api/auth/me üzerinden
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setSteamUser(d.user); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // ── Site hesabı işlemleri ────────────────────────────────────────────────
  const signup = ({ name, email, password }) => {
    const users = JSON.parse(localStorage.getItem('gp_users') || '[]');
    if (users.find(u => u.email === email)) {
      return { error: 'Bu e-posta zaten kayıtlı.' };
    }
    const newUser = { id: Date.now().toString(), name, email, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('gp_users', JSON.stringify(users));
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem('gp_user', JSON.stringify(safeUser));
    setUser(safeUser);
    return { ok: true };
  };

  const login = ({ email, password }) => {
    const users = JSON.parse(localStorage.getItem('gp_users') || '[]');
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { error: 'E-posta veya şifre hatalı.' };
    const { password: _, ...safeUser } = found;
    localStorage.setItem('gp_user', JSON.stringify(safeUser));
    setUser(safeUser);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem('gp_user');
    setUser(null);
  };

  const resetPassword = (email, newPassword) => {
    const users = JSON.parse(localStorage.getItem('gp_users') || '[]');
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return { error: 'Bu e-posta adresine kayıtlı bir hesap bulunamadı.' };
    }
    users[userIndex].password = newPassword;
    localStorage.setItem('gp_users', JSON.stringify(users));
    return { ok: true };
  };

  // ── Steam işlemleri ──────────────────────────────────────────────────────
  const steamLogout = () => {
    setSteamUser(null);
    // Sunucu tarafı cookie'yi de temizle
    window.location.href = '/api/auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, steamUser, ready, signup, login, logout, steamLogout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
