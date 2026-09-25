'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LOGO_SRC } from '../lib/logo';

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, steamUser, xboxUser, logout, steamLogout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const { lang, changeLanguage, t } = useLanguage();

  const hideBottomBar = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

  const NAV_LINKS = [
    {
      href: '/',
      label: t('nav.home'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      href: '/games',
      label: t('nav.games'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/>
        </svg>
      ),
    },
    {
      href: '/videos',
      label: t('nav.videos'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
      ),
    },
    {
      href: '/reviews',
      label: t('nav.community'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/>
        </svg>
      ),
    },
    {
      href: '/library',
      label: t('nav.library'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>
        </svg>
      ),
    },
  ];

  const handleLogout = async () => { await logout(); router.push('/'); };

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  // "Şu an incelenen oyun" rozeti — detay sayfası CustomEvent ile bildirir
  const [viewing, setViewing] = useState(null);
  useEffect(() => {
    const onView = (e) => setViewing(e.detail);
    window.addEventListener('gamerisen:viewing', onView);
    return () => window.removeEventListener('gamerisen:viewing', onView);
  }, []);
  // Sayfa değişince (oyun sayfasından çıkınca) rozet kaybolsun
  useEffect(() => {
    if (!pathname.startsWith('/game/')) setViewing(null);
  }, [pathname]);

  return (
    <>
      {/* ── Üst bar: ortalı logo + sağda tema & hesap ── */}
      <header className="nav-header">
        <div className="nav-container">
          {/* Sol: Dil seçimi ve Tema seçimi (sol grup) */}
          <div className="nav-left-group" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginRight: 'auto',
            zIndex: 10,
          }}>
            <div className="nav-lang-selector" style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '2px',
              gap: 2,
              fontSize: 12,
              fontWeight: 600,
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

            {/* Tema Toggle Butonu */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="nav-theme-btn nav-theme-btn-left"
                title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  border: '1.5px solid var(--border-hover)',
                  background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-2)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Ortalı logo */}
          <Link href="/" className="nav-logo">
            <img src={LOGO_SRC} alt="" className="nav-logo-img" width={36} height={36} style={{ display: 'block', filter: 'none' }} />
            <span className="nav-logo-text">Gamerisen</span>
          </Link>

          {/* Sağ: destek + tema + hesap */}
          <div className="nav-right-group">
            {/* Desktop Destek Linki */}
            <Link href="/support" className="nav-support-link-desktop" style={{
              padding: '8px 14px', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
              color: pathname.startsWith('/support') ? 'var(--accent)' : 'var(--text-2)',
              transition: 'color 0.15s',
            }}>{t('nav.support')}</Link>
            {/* Mobil Destek İkonu kaldırıldı (mobil görünümde sıkışıklığı önlemek için) */}

            {/* Tema Toggle Butonu (Masaüstü için sağda kalır, Mobilde gizlenir) */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="nav-theme-btn nav-theme-btn-right"
                title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                style={{
                  width: 34, height: 34, borderRadius: 9,
                  border: '1.5px solid var(--border-hover)',
                  background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-2)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            )}

            {user ? (
              <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {['batuta', 'test'].includes(String(user?.username || '').replace(/^@/, '').toLowerCase().trim()) && (
                  <Link
                    href="/admin"
                    className="desktop-only"
                    title="Geliştirici Paneli"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 9,
                      background: 'rgba(201,133,10,0.14)',
                      border: '1px solid rgba(201,133,10,0.4)',
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>⚡</span> Dev Panel
                  </Link>
                )}
                <Link href="/profile" className="nav-user-badge" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                }}>
                  {user.avatar ? (
                    <img src={user.avatar} className="nav-user-avatar" alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : steamUser?.avatar ? (
                    <img src={steamUser.avatar} className="nav-user-avatar" alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span className="nav-user-avatar" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {(user.username || user.displayName || user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="nav-user-text">{user.username ? `@${user.username}` : (user.displayName || user.name || user.email || 'User').split(' ')[0]}</span>
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
      {!hideBottomBar && (
        <>
          {/* Mobil için Üstte Yüzen Şu An İnceleniyor Rozeti */}
          {viewing && (
            <div className="mobile-only" style={{
              position: 'fixed',
              left: '50%',
              bottom: 88, // Alt bar 14px + ~60px yükseklik = ~74px civarında biter. 88px idealdir.
              zIndex: 200,
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

          <nav className="bottom-nav" aria-label={lang === 'tr' ? 'Ana menü' : 'Main navigation'}>
            {NAV_LINKS.map(l => {
              const active = isActive(l.href);
              return (
                <Link key={l.href} href={l.href} data-tab="t"
                  aria-current={active ? 'page' : undefined}
                  className={`bottom-nav-link ${active ? 'active' : ''}`}
                  style={{
                    color: active ? 'var(--text)' : 'var(--text-2)',
                    fontWeight: active ? 700 : 500,
                    textShadow: active ? '0 1px 6px rgba(0,0,0,0.35)' : 'none',
                  }}>
                  <span className="bottom-nav-icon mobile-only" aria-hidden="true">{l.icon}</span>
                  <span className="bottom-nav-label">{l.label}</span>
                </Link>
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
      </header>
    </>
  );
}
