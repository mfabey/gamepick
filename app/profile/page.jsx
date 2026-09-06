'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GameImage from '../components/GameImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ActivityHeatmap from '../components/ActivityHeatmap';

/* ─────────────────────────────────────────────
   Count-Up Hook
───────────────────────────────────────────── */
function useCountUp(target, duration = 900, suffix = '') {
  const [display, setDisplay] = useState('0' + suffix);
  const rafRef = useRef(null);

  useEffect(() => {
    const isNumeric = /^[\d.]+$/.test(String(target).replace(/[^0-9.]/g, ''));
    if (!isNumeric || target === '...' || target === '0' + suffix) {
      setDisplay(String(target));
      return;
    }
    const numeric = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    const hasDot = String(target).includes('.');
    const isPercent = String(target).startsWith('%');
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numeric;
      const formatted = hasDot ? current.toFixed(1) : Math.floor(current).toString();
      setDisplay(isPercent ? `%${formatted}` : `${formatted}${suffix}`);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, suffix]);

  return display;
}

/* ─────────────────────────────────────────────
   Stat Card (big)
───────────────────────────────────────────── */
function BigStatCard({ value, label, color, icon, sub }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const animated = useCountUp(value);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered
          ? `radial-gradient(140px circle at ${coords.x}px ${coords.y}px, ${color}14, transparent 80%), var(--bg-card)`
          : 'var(--bg-card)',
        border: `1px solid ${hovered ? color + '40' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '28px 24px',
        boxShadow: hovered
          ? `0 16px 40px -12px rgba(0,0,0,0.5), 0 0 0 1px ${color}25`
          : '0 4px 16px -4px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* spotlight border */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, padding: 1,
          background: `radial-gradient(120px circle at ${coords.x}px ${coords.y}px, ${color}60, transparent 70%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude', pointerEvents: 'none', zIndex: 3,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: 38, fontWeight: 900,
        color: color, letterSpacing: '-1.5px', lineHeight: 1,
        marginBottom: 6, textShadow: `0 4px 16px ${color}30`,
      }}>
        {animated}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: sub ? 4 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stat Card (small)
───────────────────────────────────────────── */
function SmallStatCard({ value, label, color }) {
  const [hovered, setHovered] = useState(false);
  const animated = useCountUp(value);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? color + '40' : 'var(--border)'}`,
        borderRadius: 16, padding: '20px 16px', textAlign: 'center',
        boxShadow: hovered ? `0 10px 24px -8px rgba(0,0,0,0.4)` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease', cursor: 'default',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 900,
        color: color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 6,
      }}>
        {animated}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Header
───────────────────────────────────────────── */
function SectionHeader({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17,
        color: 'var(--text)', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Epic Logo
───────────────────────────────────────────── */
function EpicLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M10.82 17.653c-1.503 0-2.812-1.026-3.08-2.476-.492-2.348 1.488-4.364 3.86-4.116 1.107.13 2.052.793 2.564 1.777l1.96-1.157C15.228 10.02 13.565 9 11.59 9c-3.157 0-5.748 2.454-6.027 5.568-.316 3.518 2.705 6.485 6.273 6.136 2.23-.217 4.15-1.534 5.094-3.522l-1.925-1.092c-.67 1.43-2.186 2.37-3.87 2.37M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12m-6.49-1.956h-2.19v6.52h2.19z"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Donut Chart
───────────────────────────────────────────── */
function DonutChart({ data, lang }) {
  if (!data || data.length === 0 || data.every(d => d.pct === 0)) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 13 }}>{lang === 'tr' ? 'Veri Yok' : 'No Data'}</div>;
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const colors = ['var(--accent)', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-input)" strokeWidth="12" />
          {data.map((item, i) => {
            if (item.pct === 0) return null;
            const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (item.pct / 100) * circumference;
            return (
              <circle key={item.label} cx="60" cy="60" r={radius} fill="none"
                strokeWidth="12" style={{ stroke: colors[i % colors.length], strokeDasharray, strokeDashoffset }} />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.5px' }}>{data[0]?.pct || 0}%</span>
          <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.05em', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{data[0]?.label || ''}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 100 }}>
        {data.slice(0, 5).map((item, i) => {
          if (item.pct === 0) return null;
          return (
            <div key={item.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], boxShadow: `0 0 6px ${colors[i % colors.length]}80`, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{item.pct}%</span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-input)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.pct}%`, background: colors[i % colors.length], borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Account Card
───────────────────────────────────────────── */
function AccountCard({ name, status, connected, color, initials, onToggle, lang, profileUrl, avatar }) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: connected ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${connected ? `${color}45` : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: connected ? color : 'var(--text-3)',
        flexShrink: 0, boxShadow: connected ? `0 0 14px ${color}18` : 'none',
        transition: 'all 0.25s', overflow: 'hidden',
      }}>
        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </p>
        <p style={{ fontSize: 12, color: connected ? 'var(--green)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {connected && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />}
          {status}
        </p>
      </div>
    </div>
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '13px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? (connected ? color + '40' : 'var(--accent)') : 'var(--border)'}`,
        borderRadius: 14,
        boxShadow: hovered ? `0 8px 24px -8px rgba(0,0,0,0.35)` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)',
        minWidth: 0,
      }}
    >
      {profileUrl
        ? <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', minWidth: 0, flex: 1, alignItems: 'center' }}>{content}</a>
        : content
      }
      <button
        onClick={onToggle}
        style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
          border: connected ? '1px solid var(--border)' : `1px solid ${color}`,
          background: connected ? 'var(--bg-input)' : `${color}15`,
          color: connected ? 'var(--text-2)' : color,
          cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s',
        }}
        onMouseEnter={(e) => {
          if (!connected) { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }
          else { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }
        }}
        onMouseLeave={(e) => {
          if (!connected) { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.color = color; }
          else { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--bg-input)'; }
        }}
      >
        {connected ? (lang === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect') : (lang === 'tr' ? 'Bağla' : 'Connect')}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Wishlist Item
───────────────────────────────────────────── */
function WishlistItem({ game, onRemove, lang }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10, background: 'var(--bg-input)',
        flexShrink: 0, overflow: 'hidden', position: 'relative',
        border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <GameImage game={game} fill sizes="52px" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={game.rawgSlug ? `/game/${game.rawgSlug}` : `/game/${game.id}`}>
          <p
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
              fontSize: 14, fontWeight: 700, color: hovered ? 'var(--accent)' : 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.18s',
            }}
          >
            {game.name}
          </p>
        </Link>
        <p style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <span style={{ fontSize: 10 }}>🔔</span>
          {lang === 'tr' ? 'Fiyat Alarmı Aktif' : 'Price Alert Active'}
        </p>
      </div>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', transition: 'all 0.18s', borderRadius: 6, flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}
        title={lang === 'tr' ? 'Kaldır' : 'Remove'}
      >
        ×
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Change Password Card
───────────────────────────────────────────── */
function ChangePasswordCard({ changePassword, lang }) {
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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px' }}>
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
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} placeholder="••••••••"
                disabled={loading} className="premium-glass-input" />
              <button type="button" onClick={toggle} style={eyeBtnStyle} tabIndex="-1"><EyeIcon show={show} /></button>
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
function DeleteAccountCard({ deleteAccount, lang }) {
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
    <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.04), transparent)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 18, padding: '24px' }}>
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

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function ProfilePage() {
  const {
    user, steamUser, steamAccounts = [], steamLogoutAccount,
    xboxUser, ownedGames, xboxOwnedGames, gamePassGames,
    ready, xboxLogout, changePassword, deleteAccount,
  } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();

  const [wishlist, setWishlist] = useState([]);
  const [steamLib, setSteamLib] = useState(null);
  const [xboxLib, setXboxLib] = useState(null);
  const [libsLoading, setLibsLoading] = useState(true);

  /* ── Daily recommendation ── */
  const getDailyRecommendation = () => {
    const RECOMMENDATIONS = [
      { name: 'Hades', slug: 'hades', descTr: 'Yorucu bir günün ardından, 20 dakikalık hızlı seanslarıyla mükemmel. Game Pass\'te ücretsiz.', descEn: 'Perfect for quick 20-minute sessions after a long day. Free on Game Pass.' },
      { name: 'Elden Ring', slug: 'elden-ring', descTr: 'Muhteşem açık dünyası ve derin oynanışıyla son yılların en iyi aksiyon RPG oyunu.', descEn: 'The best action RPG of recent years with its magnificent open world and deep gameplay.' },
      { name: 'The Witcher 3: Wild Hunt', slug: 'the-witcher-3-wild-hunt', descTr: 'Eşsiz hikaye anlatımı ve unutulmaz karakterleriyle Rivia\'lı Geralt\'ın efsanevi macerası.', descEn: 'The legendary adventure of Geralt of Rivia with unique storytelling and unforgettable characters.' },
      { name: 'Baldur\'s Gate 3', slug: 'baldurs-gate-3', descTr: 'Dungeons & Dragons evreninde geçen, seçimlerinizin dünyayı şekillendirdiği devasa bir rol yapma oyunu.', descEn: 'A massive role-playing game set in the Dungeons & Dragons universe, where your choices shape the world.' },
      { name: 'Red Dead Redemption 2', slug: 'red-dead-redemption-2', descTr: 'Vahşi Batı\'nın son dönemlerinde geçen, inanılmaz detay seviyesi ve duygusal hikayesiyle bir başyapıt.', descEn: 'A masterpiece set in the final years of the Wild West, with incredible level of detail and emotional story.' },
      { name: 'Cyberpunk 2077', slug: 'cyberpunk-2077', descTr: 'Night City\'nin neon ışıklı sokaklarında geçen, etkileyici görselliğe sahip fütüristik bir RPG.', descEn: 'A futuristic RPG set in the neon-lit streets of Night City with impressive visuals.' },
      { name: 'Hollow Knight', slug: 'hollow-knight', descTr: 'Görsel tasarımı, atmosferi ve zorlu oynanışıyla en beğenilen metroidvania oyunlarından biri.', descEn: 'One of the most acclaimed metroidvania games with its visual design, atmosphere, and challenging gameplay.' },
      { name: 'Celeste', slug: 'celeste', descTr: 'Zorlu platform bölümleri ve zihinsel sağlık üzerine odaklanan harika hikayesiyle bir bağımsız klasiği.', descEn: 'An indie classic with challenging platform stages and a wonderful story focusing on mental health.' },
      { name: 'Disco Elysium', slug: 'disco-elysium-the-final-cut', descTr: 'Eşsiz diyalog sistemi ve derin dedektiflik hikayesiyle rol yapma türüne yepyeni bir soluk getiren yapım.', descEn: 'A production that brings a breath of fresh air to the RPG genre with its unique dialogue system and deep detective story.' },
      { name: 'Portal 2', slug: 'portal-2', descTr: 'Zeka dolu bulmacaları ve harika mizahıyla tüm zamanların en iyi bulmaca oyunlarından biri.', descEn: 'One of the best puzzle games of all time with its clever puzzles and great humor.' },
    ];
    const today = new Date();
    let hash = today.getFullYear() * 37 + today.getMonth() * 13 + today.getDate();
    const seed = user?.email || steamUser?.steamId || xboxUser?.gamertag || 'default';
    for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
    return RECOMMENDATIONS[Math.abs(hash) % RECOMMENDATIONS.length];
  };

  const recommended = getDailyRecommendation();

  /* ── Effects ── */
  const hasSession = !!user || !!steamUser || !!xboxUser;
  useEffect(() => { if (ready && !hasSession) router.push('/login'); }, [ready, hasSession, router]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('gamerisen_wishlist') || localStorage.getItem('gamepick_wishlist') || '[]');
    setWishlist(stored);
  }, []);

  useEffect(() => {
    if (!ready || !hasSession) return;
    setLibsLoading(true);
    const promises = [];
    if (steamUser) promises.push(fetch('/api/oyun').then(r => r.json()).then(d => setSteamLib(d)).catch(() => {}));
    else setSteamLib(null);
    if (xboxUser) promises.push(fetch('/api/xbox-library').then(r => r.json()).then(d => setXboxLib(d)).catch(() => {}));
    else setXboxLib(null);
    Promise.all(promises).finally(() => setLibsLoading(false));
  }, [ready, hasSession, steamUser, xboxUser]);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(w => w.id !== id);
    localStorage.setItem('gamerisen_wishlist', JSON.stringify(updated));
    setWishlist(updated);
  };

  /* ── Loading guard ── */
  if (!ready || !hasSession) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 15 }}>
        {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
      </div>
    );
  }

  /* ── Derived values ── */
  const displayName = user?.name || steamUser?.name || xboxUser?.gamertag || 'User';
  const nameParts = displayName ? displayName.split(' ') : [];
  const initials = nameParts.length > 0
    ? nameParts.map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'US';

  const steamGamesCount = steamUser ? (steamLib?.games?.length || ownedGames?.size || 0) : 0;
  const xboxGamesCount = xboxUser ? (xboxLib?.games?.length || (xboxOwnedGames?.size || 0) + (gamePassGames?.size || 0)) : 0;
  const totalConnectedGames = steamGamesCount + xboxGamesCount;

  const getPlaytimeStat = () => {
    if (!steamUser) return '0';
    if (libsLoading) return '...';
    if (!steamLib?.games?.length) return '0';
    const played = steamLib.games.filter(g => g.hours > 0).length;
    const totalHours = steamLib.totalHours || 0;
    const avg = played > 0 ? (totalHours / played).toFixed(1) : '0.0';
    return `${avg}${lang === 'tr' ? 's' : 'h'}`;
  };

  const getTotalHours = () => {
    if (!steamUser || !steamLib?.totalHours) return '0';
    if (libsLoading) return '...';
    return `${Math.round(steamLib.totalHours)}${lang === 'tr' ? 's' : 'h'}`;
  };

  const getCompletionStat = () => {
    if (libsLoading) return '...';
    let totalAch = 0, currentAch = 0;
    if (xboxLib?.games) { xboxLib.games.forEach(g => { totalAch += g.totalAchievements || 0; currentAch += g.currentAchievements || 0; }); }
    if (totalAch > 0) return `%${Math.round((currentAch / totalAch) * 100)}`;
    if (steamLib?.games?.length) {
      const played = steamLib.games.filter(g => g.hours > 0).length;
      return `%${Math.min(95, Math.max(10, Math.round((played / steamLib.games.length) * 80)))}`;
    }
    return '%0';
  };

  const getDynamicGenreStats = (steamGamesList, xboxGamesList) => {
    const counts = { RPG: 0, Action: 0, Strategy: 0, Simulation: 0, Indie: 0 };
    const processGame = (name) => {
      const l = name.toLowerCase();
      if (l.includes('elden ring') || l.includes('witcher') || l.includes('baldur') || l.includes('cyberpunk') || l.includes('starfield') || l.includes('skyrim') || l.includes('fallout') || l.includes('dark souls') || l.includes('diablo') || l.includes('persona') || l.includes('mass effect')) counts.RPG++;
      if (l.includes('gta') || l.includes('grand theft') || l.includes('red dead') || l.includes('halo') || l.includes('doom') || l.includes('call of duty') || l.includes('battlefield') || l.includes('counter-strike') || l.includes('pubg') || l.includes('rust') || l.includes('sea of thieves') || l.includes('apex') || l.includes('tomb raider') || l.includes('assassin')) counts.Action++;
      if (l.includes('forza') || l.includes('fifa') || l.includes('football manager') || l.includes('euro truck') || l.includes('assetto') || l.includes('f1 ') || l.includes('flight simulator') || l.includes('the sims') || l.includes('city')) counts.Simulation++;
      if (l.includes('civilization') || l.includes('hearts of iron') || l.includes('europa') || l.includes('age of') || l.includes('starcraft') || l.includes('total war') || l.includes('stellaris') || l.includes('crusader kings')) counts.Strategy++;
      if (l.includes('hades') || l.includes('hollow knight') || l.includes('celeste') || l.includes('stardew') || l.includes('lethal') || l.includes('balatro') || l.includes('terraria') || l.includes('minecraft') || l.includes('portal') || l.includes('slay the spire') || l.includes('dead cells') || l.includes('vampire survivors')) counts.Indie++;
    };
    steamGamesList.forEach(g => processGame(g.name));
    xboxGamesList.forEach(g => processGame(g.name));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      if (libsLoading && (steamUser || xboxUser)) return [{ label: lang === 'tr' ? 'Yükleniyor...' : 'Loading...', pct: 0 }];
      return [
        { label: 'RPG', pct: 0 }, { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: 0 },
        { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: 0 },
        { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: 0 },
        { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: 0 },
      ];
    }
    return [
      { label: 'RPG', pct: Math.round((counts.RPG / total) * 100) },
      { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: Math.round((counts.Action / total) * 100) },
      { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: Math.round((counts.Strategy / total) * 100) },
      { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: Math.round((counts.Simulation / total) * 100) },
      { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: Math.round((counts.Indie / total) * 100) },
    ].filter(g => g.pct > 0).sort((a, b) => b.pct - a.pct);
  };

  const getDynamicAIComment = (genreStats) => {
    if (totalConnectedGames === 0) return lang === 'tr' ? 'Henüz bağlı bir kütüphaneniz yok. Steam veya Xbox hesabınızı bağlayarak AI kütüphane analizinizi alabilirsiniz!' : 'You don\'t have a connected library yet. Connect your Steam or Xbox account to get your AI library analysis!';
    if (libsLoading) return lang === 'tr' ? 'Kütüphane analiz ediliyor...' : 'Analyzing library...';
    const topGenre = genreStats[0];
    if (!topGenre || topGenre.pct === 0) return lang === 'tr' ? 'Geniş bir oyun yelpazesine sahipsiniz. Farklı türlerdeki deneyimleri keşfetmeyi seviyorsunuz.' : 'You have a broad range of games. You enjoy exploring experiences in different genres.';
    if (topGenre.label === 'RPG') return lang === 'tr' ? 'Uzun soluklu single-player RPG\'leri tercih eden, hikayeye önem veren bir profil. Derin karakter gelişimleri ve sürükleyici dünyalar tam size göre.' : 'A profile that prefers long-term single-player RPGs. Deep character progression and immersive worlds are perfect for you.';
    if (topGenre.label === 'Aksiyon' || topGenre.label === 'Action') return lang === 'tr' ? 'Hızlı refleksler gerektiren, adrenalin dolu aksiyon oyunlarını seviyorsunuz. Rekabetçi arenalar veya sinematik maceralar kütüphanenizin odağında.' : 'You love adrenaline-fueled action games. Competitive arenas or cinematic adventures are the focus of your library.';
    if (topGenre.label === 'Simülasyon' || topGenre.label === 'Simulation') return lang === 'tr' ? 'Detaylara önem veren, yönetim ve simülasyon oyunlarından keyif alan bir oyuncusunuz.' : 'You are a detail-oriented player who enjoys management and simulation games.';
    if (topGenre.label === 'Strateji' || topGenre.label === 'Strategy') return lang === 'tr' ? 'Zekanızı ve taktiksel düşünme yeteneğinizi ön plana çıkaran strateji oyunlarını tercih ediyorsunuz.' : 'You prefer strategy games that highlight your intellect and tactical thinking.';
    return lang === 'tr' ? 'Yaratıcı tasarımlara sahip, sanatsal yönü güçlü bağımsız oyunları seviyorsunuz. Eşsiz mekanikler ve derin anlatılar sizi cezbediyor.' : 'You love indie games with creative designs and strong artistic aspects.';
  };

  const genreStats = getDynamicGenreStats(steamLib?.games || [], xboxLib?.games || []);

  /* ── Avatar ring color ── */
  const hasSteam = steamAccounts.length > 0;
  const hasXbox = !!xboxUser;
  const ringColor = hasSteam && hasXbox
    ? 'conic-gradient(from 180deg, #1a9fff, #22c55e, #1a9fff)'
    : hasSteam ? '#1a9fff' : hasXbox ? '#22c55e' : 'var(--accent)';

  /* ────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 100 }}>
      <style>{`
        @keyframes floatGlow1 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(60px,40px) scale(1.15); opacity:.8; } }
        @keyframes floatGlow2 { 0%,100% { transform:translate(0,0) scale(1.1); } 50% { transform:translate(-50px,30px) scale(.9); opacity:.7; } }
        @keyframes floatGlow3 { 0%,100% { transform:translate(0,0) scale(.95); } 50% { transform:translate(40px,-50px) scale(1.1); opacity:.6; } }
        @keyframes avatarPulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,133,10,0); } 50% { box-shadow:0 0 0 6px rgba(201,133,10,0.15); } }
        @keyframes fadeIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        .profile-main-grid { display:grid; grid-template-columns:300px 1fr; gap:24px; }
        @media(max-width:900px){ .profile-main-grid{grid-template-columns:1fr;} }
        .profile-stats-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:14px; }
        @media(max-width:700px){ .profile-stats-grid{grid-template-columns:1fr 1fr;} }
        .profile-settings-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media(max-width:640px){ .profile-settings-row{grid-template-columns:1fr;} }
      `}</style>

      {/* ══ HERO BANNER ══ */}
      <div style={{ height: 220, position: 'relative', overflow: 'hidden', background: 'var(--profile-banner-bg, linear-gradient(135deg, var(--bg-card), var(--bg-body)))', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', top: -80, left: -60, width: 380, height: 380, borderRadius: '50%', background: 'var(--profile-glow-1, radial-gradient(circle, rgba(201,133,10,0.18) 0%, transparent 70%))', pointerEvents: 'none', animation: 'floatGlow1 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -80, right: 60, width: 300, height: 300, borderRadius: '50%', background: 'var(--profile-glow-2, radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%))', pointerEvents: 'none', animation: 'floatGlow2 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '10%', right: '30%', width: 240, height: 240, borderRadius: '50%', background: 'var(--profile-glow-3, radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%))', pointerEvents: 'none', animation: 'floatGlow3 18s ease-in-out infinite' }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Steam-only/Xbox-only Session warning banner ── */}
        {!user && (
          <div style={{
            marginTop: 16, marginBottom: 24,
            background: 'rgba(201,133,10,0.08)', border: '1px solid rgba(201,133,10,0.22)',
            borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
            animation: 'fadeIn 0.4s ease'
          }}>
            <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span>
              {lang === 'tr'
                ? 'Gamerisen profil adınızı ve hesap ayarlarınızı görmek için lütfen giriş yapın.'
                : 'Please log in to see your Gamerisen profile name and account settings.'}
            </p>
            <Link href="/login" style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', textDecoration: 'none', transition: 'all 0.18s',
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              {lang === 'tr' ? 'Giriş Yap' : 'Log In'}
            </Link>
          </div>
        )}

        {/* ── Avatar + Name row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -56, marginBottom: 32 }}>
          {/* Avatar with ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 112, height: 112, borderRadius: '50%', padding: 3,
              background: ringColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: '3px solid var(--bg-body)' }}>
                {user?.avatar
                  ? <img src={user.avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : steamUser?.avatar
                  ? <img src={steamUser.avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(201,133,10,0.25), rgba(201,133,10,0.05))', fontSize: 34, fontWeight: 900, color: 'var(--accent)' }}>{initials}</div>
                }
              </div>
            </div>
            {/* Online dot */}
            <span style={{ position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2.5px solid var(--bg-body)', boxShadow: '0 0 10px rgba(34,197,94,0.7)' }} />
          </div>

          {/* Name + badges */}
          <div style={{ paddingBottom: 8, flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.6px', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </h1>
            {user?.username && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                  @{user.username}
                </span>
                <Link href={`/u/${user.username}`} style={{ fontSize: 11.5, color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: 'var(--bg-input)' }}>
                  {lang === 'tr' ? 'Herkese Açık Profil →' : 'Public Profile →'}
                </Link>
              </div>
            )}
            {user?.bio && (
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', maxWidth: 520, marginBottom: 8, lineHeight: 1.5 }}>
                {user.bio}
              </p>
            )}
            {/* Platform chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(201,133,10,0.12)', border: '1px solid rgba(201,133,10,0.25)', fontSize: 11.5, color: 'var(--accent)', fontWeight: 700 }}>
                ⚡ Gamerisen Member
              </span>
              {steamAccounts.map(a => (
                <span key={a.steamId} style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(26,159,255,0.1)', border: '1px solid rgba(26,159,255,0.25)', fontSize: 11.5, color: '#5eb7ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#5eb7ff"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.909c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/></svg>
                  {a.name?.slice(0, 14)}
                </span>
              ))}
              {xboxUser && (
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.3)', fontSize: 11.5, color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#4ade80"><path d="M5.26 3.31C6.93 2.14 9.02 1.5 12 1.5s5.07.64 6.74 1.81c.41.28.45.87.08 1.2C17.49 5.65 15.6 8.38 12 12c-3.6-3.62-5.49-6.35-6.82-7.49-.37-.33-.33-.92.08-1.2zM2.09 6.44C.79 8.12 0 10.2 0 12.5 0 17.75 4.28 22 9.5 22c1.95 0 3.76-.6 5.25-1.62-1.58-1.34-4.74-4.56-7.98-8.7-1.34-1.73-2.9-3.84-4.68-5.24zm19.82 0c-1.78 1.4-3.34 3.51-4.68 5.24-3.24 4.14-6.4 7.36-7.98 8.7C10.74 21.4 12.55 22 14.5 22 19.72 22 24 17.75 24 12.5c0-2.3-.79-4.38-2.09-6.06z"/></svg>
                  {xboxUser.gamertag?.slice(0, 12)}
                </span>
              )}
            </div>
          </div>

          <Link href="/library" style={{
            padding: '10px 22px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
            boxShadow: '0 4px 16px var(--accent-glow)', flexShrink: 0, marginBottom: 8,
            display: 'inline-block', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)'; }}
          >
            {lang === 'tr' ? 'Kütüphanem →' : 'My Library →'}
          </Link>
        </div>

        {/* ══ STAT CARDS ══ */}
        <div className="profile-stats-grid" style={{ marginBottom: 32 }}>
          <BigStatCard
            value={libsLoading && (steamUser || xboxUser) ? '...' : totalConnectedGames.toString()}
            label={lang === 'tr' ? 'Toplam Oyun' : 'Total Games'}
            color="var(--accent)"
            sub={steamGamesCount > 0 && xboxGamesCount > 0 ? `${steamGamesCount} Steam · ${xboxGamesCount} Xbox` : undefined}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
          />
          <BigStatCard
            value={getTotalHours()}
            label={lang === 'tr' ? 'Toplam Süre' : 'Total Playtime'}
            color="#3b82f6"
            sub={lang === 'tr' ? 'Steam kütüphanesinden' : 'From Steam library'}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />
          <SmallStatCard
            value={getPlaytimeStat()}
            label={lang === 'tr' ? 'Ort. Oynama' : 'Avg. Playtime'}
            color="#a855f7"
          />
          <SmallStatCard
            value={getCompletionStat()}
            label={lang === 'tr' ? 'Tamamlama' : 'Completion'}
            color="#22c55e"
          />
        </div>

        {/* ══ ACTIVITY HEATMAP ══ */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {lang === 'tr' ? 'Aktivite Geçmişi' : 'Activity History'}
          </SectionHeader>
          <ActivityHeatmap lang={lang} userEmail={user?.email || steamUser?.steamId || xboxUser?.gamertag || 'default'} />
        </div>

        {/* ══ MAIN 2-COLUMN GRID ══ */}
        <div className="profile-main-grid" style={{ marginBottom: 32 }}>

          {/* ── LEFT COL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Connected Accounts */}
            <div>
              <SectionHeader>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {lang === 'tr' ? 'Bağlı Hesaplar' : 'Connected Accounts'}
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steamAccounts.length > 0 ? (
                  <>
                    {steamAccounts.map(account => (
                      <AccountCard
                        key={account.steamId}
                        name={`Steam — ${account.name}`}
                        status={libsLoading ? (lang === 'tr' ? 'Yükleniyor...' : 'Loading...') : (lang === 'tr' ? `Bağlı · ${steamLib?.games?.length ?? 0} oyun` : `Connected · ${steamLib?.games?.length ?? 0} games`)}
                        connected={true} color="#1a9fff" initials="STM" avatar={account.avatar}
                        profileUrl={account.profileUrl || `https://steamcommunity.com/profiles/${account.steamId}`}
                        onToggle={async () => { if (steamLogoutAccount) await steamLogoutAccount(account.steamId); }}
                        lang={lang}
                      />
                    ))}
                    {steamAccounts.length < 5 && (
                      <button onClick={() => window.location.href = '/api/auth/steam'} style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1.5px dashed rgba(26,159,255,0.35)', background: 'transparent', color: '#1a9fff', cursor: 'pointer', width: '100%', transition: 'all 0.18s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,159,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(26,159,255,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(26,159,255,0.35)'; }}
                      >
                        {lang === 'tr' ? '+ Steam Hesabı Ekle' : '+ Add Steam Account'}
                      </button>
                    )}
                  </>
                ) : (
                  <AccountCard name="Steam" status={lang === 'tr' ? 'Bağlı değil' : 'Not connected'} connected={false} color="#1a9fff" initials="STM" profileUrl={null} onToggle={() => window.location.href = '/api/auth/steam'} lang={lang} />
                )}

                <AccountCard
                  name="Xbox / Game Pass"
                  status={xboxUser ? (xboxUser.isMock ? (lang === 'tr' ? `Simülasyon — ${xboxGamesCount} oyun` : `Simulation — ${xboxGamesCount} games`) : (lang === 'tr' ? `Bağlı — ${xboxGamesCount} oyun` : `Connected — ${xboxGamesCount} games`)) : (lang === 'tr' ? 'Bağlı değil' : 'Not connected')}
                  connected={!!xboxUser} color="#16a34a" initials="XBX" avatar={xboxUser?.avatar}
                  profileUrl={xboxUser?.gamertag ? `https://live.xbox.com/Profile?Gamertag=${encodeURIComponent(xboxUser.gamertag)}` : null}
                  onToggle={() => { if (xboxUser) xboxLogout(); else window.location.href = '/api/auth/xbox'; }}
                  lang={lang}
                />
                {xboxUser?.isMock && (
                  <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--accent)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span>⚠️</span>
                    <div>{lang === 'tr' ? 'Xbox hesabınız Gamertag simülasyonu ile bağlı olduğundan test amaçlı örnek oyunlar gösterilmektedir.' : 'Xbox account connected via Gamertag simulation — sample games shown for testing.'}</div>
                  </div>
                )}

                <div style={{ padding: '13px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.45, cursor: 'not-allowed' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <EpicLogo size={18} color="#666" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-3)' }}>Epic Games</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Bağlı değil' : 'Not connected'}</p>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, flexShrink: 0 }}>
                    {lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Recommendation */}
            <div>
              <SectionHeader>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {lang === 'tr' ? 'Günlük Öneri' : 'Daily Pick'}
              </SectionHeader>
              <div style={{ background: 'linear-gradient(135deg, rgba(201,133,10,0.07), rgba(201,133,10,0.02))', border: '1px solid rgba(201,133,10,0.2)', borderRadius: 16, padding: '18px 20px' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>{recommended.name}</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>{lang === 'tr' ? recommended.descTr : recommended.descEn}</p>
                <Link href={`/game/${recommended.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, boxShadow: '0 4px 12px var(--accent-glow)', textDecoration: 'none', transition: 'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px var(--accent-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow)'; }}
                >
                  {lang === 'tr' ? 'Oyunu İncele →' : 'View Game →'}
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT COL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Genre Chart */}
            <div>
              <SectionHeader>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                {lang === 'tr' ? 'Oyun Türü Dağılımı' : 'Genre Breakdown'}
              </SectionHeader>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 24px' }}>
                <DonutChart data={genreStats} lang={lang} />
              </div>
            </div>

            {/* AI Analysis */}
            <div>
              <SectionHeader>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                {lang === 'tr' ? 'AI Oyuncu Analizi' : 'AI Player Analysis'}
              </SectionHeader>
              <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.07), rgba(139,92,246,0.01))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 18, padding: '20px 22px', borderLeft: '3px solid #8b5cf6' }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#a78bfa', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✦</span> {lang === 'tr' ? 'AI Oyuncu Yorumu' : 'AI Player Feedback'}
                </p>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.75 }}>{getDynamicAIComment(genreStats)}</p>
              </div>
            </div>

            {/* Wishlist */}
            <div>
              <SectionHeader
                action={<span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{wishlist.length} {lang === 'tr' ? 'oyun' : 'games'}</span>}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {lang === 'tr' ? 'İstek Listesi' : 'Wishlist'}
              </SectionHeader>
              {wishlist.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🎮</div>
                  <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>
                    {lang === 'tr' ? 'Henüz istek listenizde oyun yok.' : 'No games in your wishlist yet.'}
                  </p>
                  <Link href="/" style={{ display: 'inline-block', padding: '9px 20px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
                    {lang === 'tr' ? 'Oyun Keşfet →' : 'Explore Games →'}
                  </Link>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '4px 20px' }}>
                  {wishlist.map((game, i) => (
                    <WishlistItem key={game.id} game={game} onRemove={() => removeFromWishlist(game.id)} lang={lang} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ SETTINGS ══ */}
        {user && (
          <div>
            <SectionHeader>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              {lang === 'tr' ? 'Hesap Ayarları' : 'Account Settings'}
            </SectionHeader>
            <div className="profile-settings-row">
              <ChangePasswordCard changePassword={changePassword} lang={lang} />
              <DeleteAccountCard deleteAccount={deleteAccount} lang={lang} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
