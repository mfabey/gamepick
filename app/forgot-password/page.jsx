'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { lang } = useLanguage();
  const [step,            setStep]            = useState(1); // 1: Email, 4: Success
  const [email,           setEmail]           = useState('');
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [loading,         setLoading]         = useState(false);
  const [isMock,          setIsMock]          = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await resetPassword(email);
    if (result.ok) {
      setIsMock(!!result.mock);
      setSuccess(
        lang === 'tr'
          ? 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!'
          : 'A password reset link has been sent to your email!'
      );
      setStep(4);
    } else {
      setError(result.error || (lang === 'tr' ? 'Şifre sıfırlanırken bir hata oluştu.' : 'An error occurred while resetting your password.'));
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            {lang === 'tr' ? 'Şifremi Sıfırla' : 'Reset Password'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            {step === 1 
              ? (lang === 'tr' ? 'Hesabınızı kurtarmak için e-posta adresinizi girin' : 'Enter your email address to recover your account')
              : (lang === 'tr' ? 'İşlem başarıyla tamamlandı' : 'Process completed successfully')}
          </p>
        </div>

        {/* Form Kartı */}
        <div className="card" style={{ padding: '28px' }}>
          
          {error && (
            <div style={{
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: 'var(--accent)',
            }}>
              {error}
            </div>
          )}

          {success && step !== 4 && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#22c55e',
            }}>
              {success}
            </div>
          )}

          {/* STEP 1: E-posta Girişi */}
          {step === 1 && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'E-posta Adresi' : 'Email Address'}
                </label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={lang === 'tr' ? 'ornek@mail.com' : 'example@mail.com'} style={fieldStyle}
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {loading 
                  ? (lang === 'tr' ? 'Gönderiliyor...' : 'Sending...') 
                  : (lang === 'tr' ? 'Sıfırlama Bağlantısı Gönder →' : 'Send Reset Link →')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link href="/login" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
                  {lang === 'tr' ? '← Giriş Ekranına Dön' : '← Back to Login'}
                </Link>
              </div>
            </form>
          )}

          {/* STEP 4: Başarılı Sıfırlama */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                {lang === 'tr' 
                  ? 'Şifre sıfırlama bağlantısı e-posta adresinize gönderilmiştir. Lütfen e-postanızı kontrol edin.' 
                  : 'A password reset link has been sent to your email address. Please check your inbox.'}
              </p>
              {isMock && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1.5px solid rgba(234, 179, 8, 0.4)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: 'var(--text)',
                  textAlign: 'left',
                }}>
                  <strong style={{ color: '#eab308', display: 'block', marginBottom: 4 }}>
                    {lang === 'tr' ? '[MOCK SİMÜLASYONU]' : '[MOCK SIMULATION]'}
                  </strong>
                  <p style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>
                    {lang === 'tr' 
                      ? 'Firebase API anahtarı ayarlanmadığı için gerçek bir e-posta gönderilmedi. Mock şifre sıfırlama talebi başarıyla simüle edildi.'
                      : 'Since Firebase API key is not configured, no real email was sent. The mock password reset request was simulated successfully.'}
                  </p>
                </div>
              )}
              <Link href="/login" style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                textAlign: 'center'
              }}>
                {lang === 'tr' ? 'Giriş Yap Ekranına Git →' : 'Go to Login Screen →'}
              </Link>
            </div>
          )}

        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
