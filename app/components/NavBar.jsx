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

  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

  const handleLogout = () => { logout(); router.push('/'); };

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

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
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto', padding: '0 32px',
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', position: 'relative',
        }}>
          {/* Ortalı logo */}
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            color: 'var(--text)',
          }}>
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
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 21,
              letterSpacing: '-0.5px', color: 'var(--text)',
            }}>GamePick</span>
          </Link>

          {/* Sağ: tema + hesap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 9,
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)', cursor: 'pointer',
            }}>
              {!mounted ? <div style={{ width: 18, height: 18 }} />
                : theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                )}
            </button>

            {steamUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/library" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 9,
                  background: 'rgba(47,115,232,0.1)', border: '1px solid rgba(47,115,232,0.3)',
                  fontSize: 13, fontWeight: 600, color: '#2f73e8',
                }}>
                  {steamUser.avatar
                    ? <img src={steamUser.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2f73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{steamUser.name?.slice(0, 1).toUpperCase()}</span>}
                  {steamUser.name?.slice(0, 14)}{steamUser.name?.length > 14 ? '…' : ''}
                </Link>
                <button onClick={steamLogout} style={{ padding: '5px 10px', borderRadius: 9, fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}>Çıkış</button>
              </div>
            ) : user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/profile" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{user.name?.slice(0, 1).toUpperCase()}</span>
                  {user.name?.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} style={{ padding: '6px 12px', borderRadius: 9, fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}>Çıkış</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link href="/login" style={{ padding: '8px 14px', fontSize: 14, fontWeight: 500, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Giriş Yap</Link>
                <Link href="/signup" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 6px 18px var(--accent-bg)' }}>Üye Ol</Link>
              </div>
            )}
          </div>
        </div>
      </header>      {!isAuthPage && (
        <nav ref={navRef} className="bottom-nav-bar" style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24, zIndex: 200,
          display: 'flex', gap: 5,
          background: 'color-mix(in srgb, var(--bg-card) 62%, transparent)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 999, padding: 9,
          boxShadow: '0 18px 48px rgba(74,52,28,0.24), inset 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent)',
          animation: 'navBarIn 0.8s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <div aria-hidden style={{
            position: 'absolute', left: 0, top: pill.top, height: pill.height, width: pill.width,
            transform: pill.transform, opacity: pill.opacity,
            background: 'var(--accent)', borderRadius: 999, boxShadow: '0 6px 18px var(--accent-bg)',
            transition: 'transform 0.55s cubic-bezier(0.22,1,0.32,1), width 0.55s cubic-bezier(0.22,1,0.32,1)',
            zIndex: 0, pointerEvents: 'none',
          }} />
          {NAV_LINKS.map(l => {
            const active = isActive(l.href);
            return (
              <Link key={l.href} href={l.href} data-tab="t"
                className="bottom-nav-link"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                style={{
                  position: 'relative', zIndex: 1,
                  padding: '13px 27px', borderRadius: 999,
                  fontSize: 15.5, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap',
                  color: active ? '#fff' : 'var(--text-2)',
                  transition: 'transform 0.18s cubic-bezier(0.2,0.8,0.3,1), color 0.4s ease',
                }}>{l.label}</Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
