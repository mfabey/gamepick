'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gp_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, ready, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
