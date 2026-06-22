'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, steamUser, xboxUser, logout, steamLogout } = useAuth();
  const { theme, mounted } = useTheme();
  const { lang, changeLanguage, t } = useLanguage();

  const hideBottomBar = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

  const NAV_LINKS = [
    { href: '/',        label: t('nav.home') },
    { href: '/games',   label: t('nav.games') },
    { href: '/news',    label: t('nav.news') },
    { href: '/dlc',     label: t('nav.dlc') },
    { href: '/library', label: t('nav.library') },
  ];

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
  }, [pathname, lang]);

  return (
    <>
      {/* ── Üst bar: ortalı logo + sağda tema & hesap ── */}
      <header className="nav-header">
        <div className="nav-container">
          {/* Sol: Dil seçimi */}
          <div className="nav-lang-selector" style={{
            marginRight: 'auto',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            padding: '2px',
            gap: 2,
            fontSize: 12,
            fontWeight: 600,
            zIndex: 10,
          }}>
            <button
              onClick={() => changeLanguage('tr')}
              style={{
                padding: '4px 8px',
                borderRadius: 7,
                border: 'none',
                background: lang === 'tr' ? 'var(--accent)' : 'transparent',
                color: lang === 'tr' ? '#fff' : 'var(--text-3)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              TR
            </button>
            <button
              onClick={() => changeLanguage('en')}
              style={{
                padding: '4px 8px',
                borderRadius: 7,
                border: 'none',
                background: lang === 'en' ? 'var(--accent)' : 'transparent',
                color: lang === 'en' ? '#fff' : 'var(--text-3)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              EN
            </button>
          </div>

          {/* Ortalı logo */}
          <Link href="/" className="nav-logo">
            <span className="nav-logo-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="3"/>
                <path d="M6 12h4M8 10v4"/>
                <circle cx="15.5" cy="11" r="1" fill="#fff" stroke="none"/>
                <circle cx="18" cy="13.5" r="1" fill="#fff" stroke="none"/>
              </svg>
            </span>
            <span className="nav-logo-text">GamePick</span>
          </Link>

          {/* Sağ: destek + tema + hesap */}
          <div className="nav-right-group">
            {/* Desktop Destek Linki */}
            <Link href="/support" className="nav-support-link-desktop" style={{
              padding: '8px 14px', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
              color: pathname.startsWith('/support') ? 'var(--accent)' : 'var(--text-2)',
              transition: 'color 0.15s',
            }}>{t('nav.support')}</Link>
            
            {/* Mobil Destek İkonu */}
            <Link href="/support" className="nav-support-icon-mobile" style={{ display: 'none' }} title={t('nav.support')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </Link>


            {user ? (
              <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/profile" className="nav-user-badge" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                }}>
                  {steamUser?.avatar ? (
                    <img src={steamUser.avatar} className="nav-user-avatar" alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span className="nav-user-avatar" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="nav-user-text">{(user.name || user.email || 'User').split(' ')[0]}</span>
                  {/* Small Steam/Xbox status dots inside the badge */}
                  <div style={{ display: 'flex', gap: 4, marginLeft: 2 }}>
                    {steamUser && (
                      <span title="Steam Connected" style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a9fff', border: '1px solid var(--bg-card)' }} />
                    )}
                    {xboxUser && (
                      <span title="Xbox Connected" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', border: '1px solid var(--bg-card)' }} />
                    )}
                  </div>
                </Link>
                <button onClick={handleLogout} className="nav-logout-btn" style={{ padding: '6px 12px', borderRadius: 9, fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}>{t('nav.logout')}</button>
              </div>
            ) : steamUser ? (
              <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/library" className="nav-user-badge" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 9,
                  background: 'rgba(47,115,232,0.1)', border: '1px solid rgba(47,115,232,0.3)',
                  fontSize: 13, fontWeight: 600, color: '#2f73e8',
                }}>
                  {steamUser.avatar
                    ? <img src={steamUser.avatar} className="nav-user-avatar" alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span className="nav-user-avatar" style={{ width: 22, height: 22, borderRadius: '50%', background: '#2f73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{steamUser.name?.slice(0, 1).toUpperCase()}</span>}
                  <span className="nav-user-text">{steamUser.name?.slice(0, 14)}{steamUser.name?.length > 14 ? '…' : ''}</span>
                </Link>
                <button onClick={steamLogout} className="nav-logout-btn" style={{ padding: '5px 10px', borderRadius: 9, fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}>{t('nav.logout')}</button>
              </div>
            ) : (
              <div className="nav-auth-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link href="/login" className="nav-login-btn" style={{ padding: '8px 14px', fontSize: 14, fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  <span className="desktop-only">{t('nav.login')}</span>
                  <span className="mobile-only">{lang === 'tr' ? 'Giriş' : 'Login'}</span>
                </Link>
                <Link href="/signup" className="nav-signup-btn" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 6px 18px var(--accent-bg)' }}>
                  <span className="desktop-only">{t('nav.signup')}</span>
                  <span className="mobile-only">{lang === 'tr' ? 'Kayıt' : 'Join'}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Alt cam sekme çubuğu ── */}
      {/* İlk ziyaret ipucu: salt görsel — alt bara dikkat çeken ışık + oklar */}
      {!hideBottomBar && hintOpen && (
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

      {!hideBottomBar && (
        <>
          {/* Mobil için Üstte Yüzen Şu An İnceleniyor Rozeti */}
          {viewing && (
            <div className="mobile-only" style={{
              position: 'fixed',
              left: '50%',
              bottom: 82, // Alt bar 12px + ~52px yükseklik = ~64px civarında biter. 82px idealdir.
              zIndex: hintOpen ? 201 : 200,
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 95%, transparent), color-mix(in srgb, var(--bg-card) 85%, transparent))',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)',
              borderRadius: 20,
              padding: '6px 12px 6px 6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
              animation: 'navBarIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
            }}>
              <span style={{
                position: 'relative', width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'var(--bg-input)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}>
                {viewing.image
                  ? <img src={viewing.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 12, color: 'var(--text-3)' }}>{viewing.name?.slice(0, 1)}</span>}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>{t('nav.viewing')}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewing.name}</span>
              </div>
            </div>
          )}

          <nav ref={navRef} className="bottom-nav" style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 28, zIndex: hintOpen ? 201 : 200,
            display: 'flex', gap: 6,
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 72%, transparent), color-mix(in srgb, var(--bg-card) 58%, transparent))',
            backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)',
            borderRadius: 999, padding: 11,
            boxShadow: '0 2px 6px rgba(74,52,28,0.10), 0 12px 28px rgba(74,52,28,0.16), 0 32px 64px rgba(74,52,28,0.20), inset 0 1px 0 color-mix(in srgb, var(--bg-card) 90%, white), inset 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent)',
            animation: hintOpen
              ? 'navBarIn 0.85s cubic-bezier(0.16,1,0.3,1) both, navBarAttract 1.5s ease-in-out 0.9s 2, navBarRing 1.6s ease-out 1s 2'
              : 'navBarIn 0.85s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            <div aria-hidden style={{
              position: 'absolute', left: 0, top: pill.top, height: pill.height, width: pill.width,
              transform: pill.transform, opacity: pill.opacity,
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 88%, white), var(--accent))',
              borderRadius: 999,
              boxShadow: '0 4px 14px var(--accent-bg), 0 1px 3px rgba(74,52,28,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'transform 0.55s cubic-bezier(0.22,1,0.32,1), width 0.55s cubic-bezier(0.22,1,0.32,1)',
              zIndex: 0, pointerEvents: 'none',
            }} />
            {NAV_LINKS.map(l => {
              const active = isActive(l.href);
              return (
                <Link key={l.href} href={l.href} data-tab="t"
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  className="bottom-nav-link"
                  style={{
                    color: active ? '#fff' : 'var(--text-2)',
                    textShadow: active ? '0 1px 2px rgba(74,52,28,0.25)' : 'none',
                  }}>{l.label}</Link>
              );
            })}

            {/* Şu an incelenen oyun rozeti (Masaüstü) */}
            <div className="bottom-nav-viewing desktop-only" style={{
              display: 'flex', alignItems: 'center', gap: 9, position: 'relative', zIndex: 1, overflow: 'hidden',
              maxWidth: viewing ? 260 : 0,
              opacity: viewing ? 1 : 0,
              transform: viewing ? 'translateX(0)' : 'translateX(-12px)',
              marginLeft: viewing ? 2 : 0,
              paddingRight: viewing ? 8 : 0,
              transition: 'max-width 0.55s cubic-bezier(0.22,1,0.32,1), opacity 0.4s ease, transform 0.55s cubic-bezier(0.22,1,0.32,1), margin-left 0.55s, padding-right 0.55s',
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
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t('nav.viewing')}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewing?.name}</span>
              </span>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
