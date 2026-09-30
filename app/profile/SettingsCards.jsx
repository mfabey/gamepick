'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function ChangePasswordCard({ changePassword, lang }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) { setError(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.'); return; }
    if (newPassword.length < 6) { setError(lang === 'tr' ? 'Yeni şifre en az 6 karakter olmalıdır.' : 'New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.'); return; }
    setLoading(true);
    const res = await changePassword({ currentPassword, newPassword });
    setLoading(false);
    if (res.ok) {
      setSuccess(res.mock
        ? (lang === 'tr' ? 'Şifre başarıyla değiştirildi (Simülasyon Modu).' : 'Password successfully changed (Simulation Mode).')
        : (lang === 'tr' ? 'Şifreniz başarıyla değiştirildi!' : 'Your password has been successfully changed!'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else { setError(res.error); }
  };

  const eyeBtnStyle = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 };

  const EyeIcon = ({ show }) => show ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="profile-panel profile-security-card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        {lang === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>{error}</div>}
        {success && <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green)' }}>{success}</div>}
        {[
          { label: lang === 'tr' ? 'Mevcut Şifre' : 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
          { label: lang === 'tr' ? 'Yeni Şifre' : 'New Password', val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
          { label: lang === 'tr' ? 'Yeni Şifre Tekrar' : 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
        ].map(({ label, val, set, show, toggle }) => (
          <div key={label}>
            <label htmlFor={'profile-password-' + label.replaceAll(' ', '-')} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input id={'profile-password-' + label.replaceAll(' ', '-')} type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} placeholder="••••••••"
                disabled={loading} className="premium-glass-input" />
              <button type="button" onClick={toggle} style={eyeBtnStyle} aria-label={(show ? (lang === 'tr' ? 'Gizle: ' : 'Hide: ') : (lang === 'tr' ? 'Göster: ' : 'Show: ')) + label}><EyeIcon show={show} /></button>
            </div>
          </div>
        ))}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s', boxShadow: '0 4px 14px var(--accent-glow)', marginTop: 4,
        }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px var(--accent-glow)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px var(--accent-glow)'; }}
        >
          {loading ? (lang === 'tr' ? 'Güncelleniyor...' : 'Updating...') : (lang === 'tr' ? 'Şifreyi Güncelle' : 'Update Password')}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Delete Account Card
───────────────────────────────────────────── */
export function DeleteAccountCard({ deleteAccount, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleDelete = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await deleteAccount(password);
    setLoading(false);
    if (res.ok) {
      try { localStorage.removeItem('gamerisen_wishlist'); localStorage.removeItem('gamepick_wishlist'); sessionStorage.clear(); } catch {}
      window.location.href = '/';
    } else { setError(res.error || (lang === 'tr' ? 'Hesap silinirken bir hata oluştu.' : 'An error occurred while deleting your account.')); }
  };

  const handleClose = () => { setIsOpen(false); setStage(1); setPassword(''); setError(''); };

  return (
    <div className="profile-panel profile-security-card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
        {lang === 'tr' ? 'Tehlikeli Bölge' : 'Danger Zone'}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18, lineHeight: 1.5 }}>
        {lang === 'tr' ? 'Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.' : 'Permanently delete your account and all associated data. This action is irreversible.'}
      </p>
      <button onClick={() => setIsOpen(true)} style={{
        width: '100%', padding: '11px', background: 'transparent', color: '#ef4444',
        border: '1.5px solid #ef4444', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
      >
        {lang === 'tr' ? 'Hesabımı Sil' : 'Delete My Account'}
      </button>

      {isOpen && mounted && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 400, padding: 32, background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 20, boxShadow: '0 28px 70px rgba(0,0,0,0.55)', position: 'relative', animation: 'fadeIn 0.22s ease' }}>
            {stage === 1 ? (
              <div>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', color: 'var(--text)', marginBottom: 12 }}>{lang === 'tr' ? 'Emin misiniz?' : 'Are you sure?'}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, textAlign: 'center', marginBottom: 24 }}>
                  {lang === 'tr' ? 'Bu işlem hesabınızı, bağlı kütüphanelerinizi ve istek listenizi kalıcı olarak silecektir.' : 'This action will permanently delete your account, connected libraries, and wishlist.'}
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={handleClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  >{lang === 'tr' ? 'Vazgeç' : 'Cancel'}</button>
                  <button onClick={() => setStage(2)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(239,68,68,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.3)'; }}
                  >{lang === 'tr' ? 'Devam Et' : 'Continue'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDelete}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>{lang === 'tr' ? 'Şifrenizi Girin' : 'Enter Password'}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', marginBottom: 20 }}>
                  {lang === 'tr' ? 'Hesap silme işlemini onaylamak için lütfen şifrenizi girin.' : 'Please enter your password to confirm account deletion.'}
                </p>
                {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ef4444' }}>{error}</div>}
                <div style={{ marginBottom: 24, position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="premium-glass-input" disabled={loading} autoFocus />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }} tabIndex="-1">
                    {showPassword
                      ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={handleClose} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  >{lang === 'tr' ? 'İptal' : 'Cancel'}</button>
                  <button type="submit" disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.18s', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
                    {loading ? (lang === 'tr' ? 'Siliniyor...' : 'Deleting...') : (lang === 'tr' ? 'Hesabı Sil' : 'Delete')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
