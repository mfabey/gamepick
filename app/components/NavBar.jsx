'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_LINKS = [
  { href: '/',        label: 'Anasayfa' },
  { href: '/games',   label: 'Oyunlar'  },
  { href: '/dlc',     label: 'DLC'      },
  { href: '/library', label: 'Kütüphane' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, steamUser, logout, steamLogout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();

  const handleLogout = () => { logout(); router.push('/'); };

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  // "Şu an incelenen oyun" rozeti — detay sayfası CustomEvent ile bildirir
  const [viewing, setViewing] = useState(null);
  useEffect(() => {
    const onView = (e) => setViewing(e.detail);
    window.addEventListener('gamepick:viewing', onView);
    return () => window.removeEventListener('gamepick:viewing', onView);
  }, []);
  // Sayfa değişince (oyun sayfasından çıkınca) rozet kaybolsun
  useEffect(() => {
    if (!pathname.startsWith('/game/')) setViewing(null);
  }, [pathname]);

  // İlk ziyaret ipucu — alt barın ne işe yaradığını tanıtır
  const [hintOpen, setHintOpen] = useState(false);
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem('gp_bar_hint_seen')) {
        const t = setTimeout(() => setHintOpen(true), 1100);
        return () => clearTimeout(t);
      }
    } catch (e) {}
  }, []);
  // Açılınca birkaç saniye sonra kendiliğinden kapanır
  useEffect(() => {
    if (!hintOpen) return;
    const t = setTimeout(() => dismissHint(), 5000);
    return () => clearTimeout(t);
  }, [hintOpen]);
  const dismissHint = () => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('gp_bar_hint_seen', '1'); } catch (e) {}
    setHintOpen(false);
  };

  // Kayan turuncu pill göstergesi
  const navRef = useRef(null);
  const [pill, setPill] = useState({ width: 0, top: 0, height: 0, transform: 'translateX(0)', opacity: 0 });
  useEffect(() => {
    const place = () => {
      const nav = navRef.current;
      if (!nav) return;
      const tabs = nav.querySelectorAll('[data-tab]');
      const idx = NAV_LINKS.findIndex(l => isActive(l.href));
      const el = idx >= 0 ? tabs[idx] : null;
      if (!el) { setPill(p => ({ ...p, opacity: 0 })); return; }
      setPill({ opacity: 1, width: el.offsetWidth, top: el.offsetTop, height: el.offsetHeight, transform: `translateX(${el.offsetLeft}px)` });
    };
    place();
    const t = setTimeout(place, 0);
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    if (typeof window !== 'undefined') window.addEventListener('resize', place);
    return () => { clearTimeout(t); if (typeof window !== 'undefined') window.removeEventListener('resize', place); };
  }, [pathname]);

  return (
    <>
      {/* ── Üst bar: ortalı logo + sağda tema & hesap ── */}
      <header className="main-header">
        <div className="header-container">
          {/* Logo */}
          <Link href="/" className="header-logo">
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px var(--accent-bg)',
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="3"/>
                <path d="M6 12h4M8 10v4"/>
                <circle cx="15.5" cy="11" r="1" fill="#fff" stroke="none"/>
                <circle cx="18" cy="13.5" r="1" fill="#fff" stroke="none"/>
              </svg>
            </span>
            <span className="header-logo-text">GamePick</span>
          </Link>

          {/* Sağ: tema + hesap */}
          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}>
              {!mounted ? <div style={{ width: 18, height: 18 }} />
                : theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                )}
            </button>

            {steamUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/library" className="steam-user-badge">
                  {steamUser.avatar
                    ? <img src={steamUser.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2f73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{steamUser.name?.slice(0, 1).toUpperCase()}</span>}
                  <span className="steam-user-name">{steamUser.name?.slice(0, 14)}{steamUser.name?.length > 14 ? '…' : ''}</span>
                </Link>
                <button onClick={steamLogout} className="logout-btn">Çıkış</button>
              </div>
            ) : user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/profile" className="email-user-badge">
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{user.name?.slice(0, 1).toUpperCase()}</span>
                  <span className="email-user-name">{user.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn">Çıkış</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link href="/login" className="login-btn">Giriş Yap</Link>
                <Link href="/signup" className="signup-btn">Üye Ol</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Alt cam sekme çubuğu ── */}
      {/* İlk ziyaret ipucu: salt görsel — alt bara dikkat çeken ışık + oklar */}
      {hintOpen && (
        <>
          <div onClick={dismissHint} style={{
            position: 'fixed', inset: 0, zIndex: 199, cursor: 'pointer',
            background: 'radial-gradient(60% 220px at 50% 100%, rgba(36,29,20,0) 0%, rgba(36,29,20,0.42) 70%)',
          }} />
          <div style={{
            position: 'fixed', left: '50%', bottom: 112, zIndex: 201, transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none',
          }}>
            <svg width="40" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55, animation: 'navHintArrow 1.4s ease-in-out infinite' }}><path d="M6 9l6 6 6-6"/></svg>
            <svg width="48" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'navHintArrow 1.4s ease-in-out 0.18s infinite', filter: 'drop-shadow(0 4px 10px var(--accent-bg))' }}><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </>
      )}

      <nav ref={navRef} className="bottom-nav-bar" style={{
        zIndex: hintOpen ? 201 : 200,
        animation: hintOpen
          ? 'navBarIn 0.85s cubic-bezier(0.16,1,0.3,1) both, navBarAttract 1.5s ease-in-out 0.9s 2, navBarRing 1.6s ease-out 1s 2'
          : 'navBarIn 0.85s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <div aria-hidden className="nav-sliding-pill" style={{
          top: pill.top, height: pill.height, width: pill.width,
          transform: pill.transform, opacity: pill.opacity,
        }} />
        {NAV_LINKS.map(l => {
          const active = isActive(l.href);
          return (
            <Link key={l.href} href={l.href} data-tab="t"
              className={`bottom-nav-link ${active ? 'active' : ''}`}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              style={{
                textShadow: active ? '0 1px 2px rgba(74,52,28,0.25)' : 'none',
              }}>{l.label}</Link>
          );
        })}

        {/* Şu an incelenen oyun rozeti */}
        <div className="viewing-badge" style={{
          maxWidth: viewing ? 260 : 0,
          opacity: viewing ? 1 : 0,
          transform: viewing ? 'translateX(0)' : 'translateX(-12px)',
          marginLeft: viewing ? 2 : 0,
          paddingRight: viewing ? 8 : 0,
        }}>
          <span style={{ width: 1, height: 24, background: 'var(--border-hover)', margin: '0 3px', flexShrink: 0 }} />
          <span style={{
            position: 'relative', width: 30, height: 30, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            background: 'var(--bg-input)', boxShadow: '0 2px 6px rgba(74,52,28,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}>
            {viewing?.image
              ? <img src={viewing.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14, color: 'var(--text-3)' }}>{viewing?.name?.slice(0, 1)}</span>}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>İnceleniyor</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewing?.name}</span>
          </span>
        </div>
      </nav>
    </>
  );
}
