'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { lang } = useLanguage();
  const [step,            setStep]            = useState(1); // 1: Email, 2: Verification Code, 3: New Password, 4: Success
  const [email,           setEmail]           = useState('');
  const [generatedCode,   setGeneratedCode]   = useState('');
  const [userCode,        setUserCode]        = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [loading,         setLoading]         = useState(false);
  const [codeSentNotify,  setCodeSentNotify]  = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    
    // gp_users kontrolü
    const users = JSON.parse(localStorage.getItem('gp_users') || '[]');
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!found) {
      setError(lang === 'tr' ? 'Bu e-posta adresine kayıtlı bir hesap bulunamadı.' : 'No account found registered with this email address.');
      return;
    }

    setLoading(true);
    // Simüle ağ gecikmesi
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setCodeSentNotify(true);
      setStep(2);
      setLoading(false);
    }, 800);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError('');
    
    if (userCode === generatedCode) {
      setStep(3);
    } else {
      setError(lang === 'tr' ? 'Doğrulama kodu hatalı. Lütfen tekrar deneyin.' : 'Incorrect verification code. Please try again.');
    }
  };

  const handleResendCode = () => {
    setError('');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCodeSentNotify(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(lang === 'tr' ? 'Yeni şifre en az 6 karakter olmalı.' : 'New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = resetPassword(email, password);
      if (result.ok) {
        setSuccess(lang === 'tr' ? 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' : 'Your password has been reset successfully. You can now log in with your new password.');
        setStep(4);
      } else {
        setError(result.error || (lang === 'tr' ? 'Şifre sıfırlanırken bir hata oluştu.' : 'An error occurred while resetting your password.'));
      }
      setLoading(false);
    }, 800);
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
        
        {/* Mock E-Posta Gönderim Bildirimi */}
        {codeSentNotify && step !== 4 && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--text)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{lang === 'tr' ? '[MOCK E-POSTA SİMÜLASYONU]' : '[MOCK EMAIL SIMULATION]'}</span>
            </div>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>
              {lang === 'tr' ? 'Kayıtlı e-posta adresinize sıfırlama kodu gönderildi!' : 'A reset code has been sent to your registered email!'}
            </p>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Doğrulama Kodu:' : 'Verification Code:'}</span>
              <strong style={{
                fontSize: 16,
                letterSpacing: 2,
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'monospace'
              }}>{generatedCode}</strong>
            </div>
          </div>
        )}

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
            {step === 1 && (lang === 'tr' ? 'Hesabınızı kurtarmak için e-posta adresinizi girin' : 'Enter your email address to recover your account')}
            {step === 2 && (lang === 'tr' ? 'E-postanıza gönderilen 6 haneli kodu girin' : 'Enter the 6-digit code sent to your email')}
            {step === 3 && (lang === 'tr' ? 'Hesabınız için yeni ve güvenli bir şifre belirleyin' : 'Set a new, secure password for your account')}
            {step === 4 && (lang === 'tr' ? 'İşlem başarıyla tamamlandı' : 'Process completed successfully')}
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

          {success && (
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
                  : (lang === 'tr' ? 'Doğrulama Kodu Gönder →' : 'Send Verification Code →')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link href="/login" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
                  {lang === 'tr' ? '← Giriş Ekranına Dön' : '← Back to Login'}
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Kod Doğrulama */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Doğrulama Kodu' : 'Verification Code'}
                </label>
                <input
                  type="text" required maxLength={6} value={userCode} onChange={e => setUserCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" style={{ ...fieldStyle, letterSpacing: 6, textAlign: 'center', fontSize: 18, fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%', padding: '12px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {lang === 'tr' ? 'Kodu Doğrula →' : 'Verify Code →'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                <button
                  type="button" onClick={() => setStep(1)}
                  style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}
                >
                  {lang === 'tr' ? '← E-postayı Değiştir' : '← Change Email'}
                </button>
                <button
                  type="button" onClick={handleResendCode}
                  style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {lang === 'tr' ? 'Kodu Tekrar Gönder' : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Yeni Şifre */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni Şifre' : 'New Password'}
                </label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'tr' ? 'En az 6 karakter' : 'At least 6 characters'} style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni Şifreyi Onayla' : 'Confirm New Password'}
                </label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={lang === 'tr' ? 'Şifreyi tekrar girin' : 'Re-enter password'} style={fieldStyle}
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
                {loading 
                  ? (lang === 'tr' ? 'Şifre Güncelleniyor...' : 'Updating Password...') 
                  : (lang === 'tr' ? 'Şifreyi Güncelle ve Tamamla' : 'Update Password & Complete')}
              </button>
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
                  ? 'Hesap şifreniz başarıyla değiştirilmiştir. Artık yeni şifrenizle giriş yapabilirsiniz.' 
                  : 'Your account password has been changed successfully. You can now log in with your new password.'}
              </p>
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
