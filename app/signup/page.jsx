'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return; }
    setLoading(true);
    const result = signup({ name, email, password });
    if (result.ok) {
      router.push('/library');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const fieldStyle = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid var(--border)', borderRadius: 8,
    fontSize: 14, color: 'var(--text)', outline: 'none',
    background: 'var(--bg-card)',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--hero-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>GamePick'e Üye Ol</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>Zaten hesabın var mı?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Giriş Yap</Link>
          </p>
        </div>

        {/* Avantajlar */}
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {['Steam, Epic ve Xbox kütüphaneni tek ekranda gör', 'Fiyat alarmı ile en ucuz fiyatı yakala', 'AI ile ruh haline göre oyun önerisi al'].map(t => (
            <p key={t} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {t}
            </p>
          ))}
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

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>İsim</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Adın Soyadın" style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>E-posta</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ornek@mail.com" style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Şifre</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="En az 6 karakter" style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
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
              {loading ? 'Kaydediliyor...' : 'Ücretsiz Kayıt Ol →'}
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 14 }}>
              Kayıt olarak Kullanım Şartlarını kabul etmiş olursunuz.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
