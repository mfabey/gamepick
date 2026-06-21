'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = login({ email, password });
    if (result.ok) {
      router.push('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--hero-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d="M6 12h4M8 10v4"/>
              <circle cx="15" cy="11" r="1" fill="#fff" stroke="none"/>
              <circle cx="18" cy="13" r="1" fill="#fff" stroke="none"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            {lang === 'tr' ? "GamePick'e Giriş Yap" : 'Log In to GamePick'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            {lang === 'tr' ? 'Hesabın yok mu? ' : "Don't have an account? "}
            <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {lang === 'tr' ? 'Üye Ol' : 'Sign Up'}
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--accent)',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {lang === 'tr' ? 'E-posta' : 'Email'}
              </label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'tr' ? 'ornek@mail.com' : 'example@mail.com'}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid var(--border)', borderRadius: 8,
                  fontSize: 14, color: 'var(--text)', outline: 'none',
                  background: 'var(--bg-card)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                  {lang === 'tr' ? 'Şifre' : 'Password'}
                </label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                  {lang === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password?'}
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 40px 10px 14px',
                    border: '1.5px solid var(--border)', borderRadius: 8,
                    fontSize: 14, color: 'var(--text)', outline: 'none',
                    background: 'var(--bg-card)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0,
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading 
                ? (lang === 'tr' ? 'Giriş yapılıyor...' : 'Logging in...') 
                : (lang === 'tr' ? 'Giriş Yap' : 'Log In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
