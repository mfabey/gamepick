'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AppleSignInButton from '../components/AppleSignInButton';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function SignupPage() {
  const { signup } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,            setPassword]            = useState('');
  const [confirmPassword,     setConfirmPassword]     = useState('');
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error,               setError]               = useState('');
  const [loading,             setLoading]             = useState(false);
  const [captchaChecked,      setCaptchaChecked]      = useState(false);
  const [captchaToken,        setCaptchaToken]        = useState(null);
  const [registered,          setRegistered]          = useState(false);
  const [isMock,              setIsMock]              = useState(false);

  useEffect(() => {
    const renderCaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render) {
        try {
          const container = document.getElementById('recaptcha-container');
          if (container && container.innerHTML === '') {
            window.grecaptcha.render('recaptcha-container', {
              sitekey: process.env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY,
              callback: (token) => {
                setCaptchaChecked(true);
                setCaptchaToken(token);
              },
              'expired-callback': () => {
                setCaptchaChecked(false);
                setCaptchaToken(null);
              },
              'error-callback': () => {
                setCaptchaChecked(false);
                setCaptchaToken(null);
              },
              theme: 'dark'
            });
          }
        } catch (e) {
          console.warn('reCAPTCHA render error:', e);
        }
      }
    };

    window.onloadCallback = renderCaptcha;

    if (window.grecaptcha && window.grecaptcha.render) {
      renderCaptcha();
    }

    return () => {
      delete window.onloadCallback;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { 
      setError(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.'); 
      return; 
    }
    if (password !== confirmPassword) { 
      setError(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.'); 
      return; 
    }
    if (!captchaChecked || !captchaToken) { 
      setError(lang === 'tr' ? 'Lütfen robot olmadığınızı doğrulayın.' : 'Please verify that you are not a robot.'); 
      return; 
    }
    
    setLoading(true);
    const result = await signup({ name, email, password, captchaToken });
    if (result.ok) {
      setIsMock(!!result.mock);
      setRegistered(true);
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

  if (registered) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
        background: 'var(--hero-bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'tr' ? 'Kayıt Başarılı!' : 'Registration Successful!'}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
              {lang === 'tr' ? 'Lütfen e-posta adresinizi doğrulayın' : 'Please verify your email address'}
            </p>
          </div>

          <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              {lang === 'tr' 
                ? `${email} adresine bir doğrulama bağlantısı gönderildi. Lütfen gelen kutunuzu kontrol edin. E-postanızı doğruladıktan sonra giriş yapabilirsiniz.`
                : `A verification link has been sent to ${email}. Please check your inbox. You can log in after verifying your email.`}
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
                    ? 'Firebase API anahtarı ayarlanmadığı için gerçek bir e-posta gönderilmedi. Mock doğrulama talebi başarıyla simüle edildi.'
                    : 'Since Firebase API key is not configured, no real email was sent. The mock verification request was simulated successfully.'}
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
        </div>
      </div>
    );
  }

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
            {lang === 'tr' ? "Gamerisen'e Üye Ol" : 'Sign Up for Gamerisen'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            {lang === 'tr' ? 'Zaten hesabın var mı? ' : 'Already have an account? '}
            <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {lang === 'tr' ? 'Giriş Yap' : 'Log In'}
            </Link>
          </p>
        </div>

        {/* Avantajlar */}
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {(lang === 'tr'
            ? ['Steam, Epic ve Xbox kütüphaneni tek ekranda gör', 'Fiyat alarmı ile en ucuz fiyatı yakala', 'AI ile ruh haline göre oyun önerisi al']
            : ['See your Steam, Epic, and Xbox libraries in one screen', 'Catch the lowest price with price alerts', 'Get mood-based game recommendations with AI']
          ).map(t => (
            <p key={t} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {t}
            </p>
          ))}
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '28px' }}>
          {/* Apple ile giriş — Services ID tanımlı değilse kendini gizler */}
          <AppleSignInButton lang={lang} onError={setError} />
          {/* Google ile giriş — istemci kimliği tanımlı değilse kendini gizler */}
          <GoogleSignInButton lang={lang} onError={setError} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {lang === 'tr' ? 'veya' : 'or'}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {lang === 'tr' ? 'İsim' : 'Name'}
              </label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder={lang === 'tr' ? 'Sana nasıl hitap edelim?' : 'How should we address you?'} style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {lang === 'tr' ? 'E-posta' : 'Email'}
              </label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder={lang === 'tr' ? 'ornek@mail.com' : 'example@mail.com'} style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {lang === 'tr' ? 'Şifre' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'tr' ? 'En az 6 karakter' : 'At least 6 characters'} style={{ ...fieldStyle, paddingRight: '40px' }}
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

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                {lang === 'tr' ? 'Şifreyi Onayla' : 'Confirm Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={lang === 'tr' ? 'Şifrenizi tekrar girin' : 'Re-enter your password'} style={{ ...fieldStyle, paddingRight: '40px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0,
                  }}
                >
                  {showConfirmPassword ? (
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

            {/* Real Firebase reCAPTCHA Enterprise Container */}
            <div 
              id="recaptcha-container" 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: 18,
                minHeight: '78px'
              }}
            />

            <Script
              src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"
              strategy="afterInteractive"
            />

            <button
              type="submit" disabled={loading || !captchaChecked}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: (loading || !captchaChecked) ? 'not-allowed' : 'pointer',
                opacity: (loading || !captchaChecked) ? 0.6 : 1,
              }}
            >
              {loading 
                ? (lang === 'tr' ? 'Kaydediliyor...' : 'Registering...') 
                : (lang === 'tr' ? 'Ücretsiz Kayıt Ol →' : 'Sign Up for Free →')}
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 14 }}>
              {lang === 'tr' 
                ? 'Kayıt olarak Kullanım Şartlarını kabul etmiş olursunuz.' 
                : 'By registering, you accept our Terms of Service.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
