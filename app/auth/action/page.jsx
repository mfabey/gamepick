'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

function AuthActionContent() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const mode = searchParams.get('mode'); // 'resetPassword' or 'verifyEmail'
  const oobCode = searchParams.get('oobCode');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // For Password Reset form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!mode || !oobCode) {
      setError(
        lang === 'tr'
          ? 'Geçersiz veya eksik parametreler. Lütfen e-postanızdaki bağlantıyı kontrol edin.'
          : 'Invalid or missing parameters. Please check the link in your email.'
      );
      setLoading(false);
      return;
    }

    // If it is verifyEmail, we perform the action automatically on load
    if (mode === 'verifyEmail') {
      verifyEmailAction();
    } else if (mode === 'resetPassword') {
      setLoading(false);
    } else {
      setError(
        lang === 'tr'
          ? 'Desteklenmeyen veya geçersiz işlem modu.'
          : 'Unsupported or invalid action mode.'
      );
      setLoading(false);
    }
  }, [mode, oobCode, lang]);

  const verifyEmailAction = async () => {
    try {
      const res = await fetch('/api/auth/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'verifyEmail', oobCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'tr' ? 'E-posta doğrulanırken bir hata oluştu.' : 'An error occurred while verifying your email.'));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(
        lang === 'tr'
          ? 'Şifre en az 6 karakter olmalıdır.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === 'tr'
          ? 'Şifreler eşleşmiyor.'
          : 'Passwords do not match.'
      );
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch('/api/auth/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'resetPassword', oobCode, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'tr' ? 'Şifre sıfırlanırken bir hata oluştu.' : 'An error occurred while resetting your password.'));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
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
            {mode === 'verifyEmail' 
              ? (lang === 'tr' ? 'E-posta Doğrulama' : 'Email Verification') 
              : mode === 'resetPassword'
              ? (lang === 'tr' ? 'Şifre Sıfırlama' : 'Reset Password')
              : (lang === 'tr' ? 'Hesap İşlemleri' : 'Account Actions')}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            {mode === 'verifyEmail' && (lang === 'tr' ? 'E-posta adresinizin doğrulama durumu' : 'Verification status of your email address')}
            {mode === 'resetPassword' && (lang === 'tr' ? 'Hesabınız için yeni bir şifre belirleyin' : 'Set a new password for your account')}
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px' }}>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="spinner" style={{
                width: 36, height: 36, border: '3.5px solid var(--border)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
                {lang === 'tr' ? 'İşlem yapılıyor, lütfen bekleyin...' : 'Processing, please wait...'}
              </p>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <p style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {lang === 'tr' ? 'Hata Oluştu' : 'Error Occurred'}
              </p>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                {error}
              </p>
              <Link href="/login" style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                textAlign: 'center'
              }}>
                {lang === 'tr' ? 'Giriş Ekranına Git' : 'Go to Login'}
              </Link>
            </div>
          )}

          {!loading && !error && success && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ color: '#22c55e', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                {mode === 'verifyEmail' 
                  ? (lang === 'tr' ? 'E-posta Başarıyla Doğrulandı!' : 'Email Successfully Verified!')
                  : (lang === 'tr' ? 'Şifre Başarıyla Değiştirildi!' : 'Password Successfully Changed!')}
              </p>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                {mode === 'verifyEmail'
                  ? (lang === 'tr' ? 'Hesabınız artık aktif. Sitemize giriş yapabilirsiniz.' : 'Your account is now active. You can log in to our site.')
                  : (lang === 'tr' ? 'Yeni şifreniz başarıyla kaydedildi. Yeni şifrenizle giriş yapabilirsiniz.' : 'Your new password has been saved. You can now log in with it.')}
              </p>
              <Link href="/login" style={{
                display: 'block', width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                textAlign: 'center'
              }}>
                {lang === 'tr' ? 'Giriş Yap →' : 'Log In →'}
              </Link>
            </div>
          )}

          {/* Password Reset Form */}
          {!loading && !error && !success && mode === 'resetPassword' && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni Şifre' : 'New Password'}
                </label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}
                </label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <button
                type="submit" disabled={formLoading}
                style={{
                  width: '100%', padding: '12px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: formLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {formLoading 
                  ? (lang === 'tr' ? 'Güncelleniyor...' : 'Updating...') 
                  : (lang === 'tr' ? 'Şifreyi Güncelle →' : 'Update Password →')}
              </button>
            </form>
          )}

        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--hero-bg)',
      }}>
        <div className="spinner" style={{
          width: 36, height: 36, border: '3.5px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}
