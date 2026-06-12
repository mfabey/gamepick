'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, steamUser, logout, steamLogout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sayfa değiştiğinde mobil menüyü otomatik kapat
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const active = (path) =>
    pathname === path ? 'nav-link active' : 'nav-link';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0,
      background: 'var(--bg)',
      backdropFilter: 'blur(12px)',
      zIndex: 100,
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', height: 60, gap: 8,
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginRight: 16, fontWeight: 700, fontSize: 17,
          letterSpacing: '-0.3px', color: 'var(--text)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 12h4M8 10v4"/>
            <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
            <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
          </svg>
          GamePick
        </Link>

        {/* Ana navigasyon (Masaüstü) */}
        <nav className="desktop-only" style={{ display: 'flex', gap: 2, marginRight: 'auto' }}>
          <Link href="/"         className={active('/')}>Anasayfa</Link>
          <Link href="/games"    className={active('/games')}>Oyunlar</Link>
          <Link href="/dlc"      className={active('/dlc')}>DLC</Link>
          <Link href="/library"  className={active('/library')}>Kütüphane</Link>
        </nav>

        {/* Sağ taraf (Tema + Butonlar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {/* Tema Değiştirici */}
          <button onClick={toggleTheme} style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s',
          }} title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}>
            {!mounted ? (
              <div style={{ width: 18, height: 18 }} />
            ) : theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>

          {/* Masaüstü Auth Butonları */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Steam kullanıcısı */}
            {steamUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/library" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(26,159,255,0.1)', border: '1px solid rgba(26,159,255,0.3)',
                  fontSize: 13, fontWeight: 600, color: '#1a9fff', textDecoration: 'none',
                }}>
                  {steamUser.avatar ? (
                    <img src={steamUser.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a9fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {steamUser.name?.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {steamUser.name?.slice(0, 16)}{steamUser.name?.length > 16 ? '…' : ''}
                </Link>
                <button onClick={steamLogout} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-3)', cursor: 'pointer',
                }}>
                  Çıkış
                </button>
              </div>
            )}

            {/* Site hesabı */}
            {user && !steamUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/profile" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                  fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {user.name?.slice(0, 1).toUpperCase()}
                  </span>
                  {user.name?.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-3)', cursor: 'pointer',
                }}>
                  Çıkış
                </button>
              </div>
            ) : !steamUser && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link href="/login" className="nav-link">Giriş Yap</Link>
                <Link href="/signup" style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, background: 'var(--accent)', color: '#fff',
                  display: 'inline-block',
                }}>
                  Üye Ol
                </Link>
              </div>
            )}
          </div>

          {/* Mobil Hamburger Butonu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-only"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobil Açılır Menü Çekmecesi (Drawer) */}
      {mobileMenuOpen && (
        <div className="mobile-drawer mobile-only">
          <Link href="/" className={`${active('/') === 'nav-link active' ? 'mobile-nav-link active' : 'mobile-nav-link'}`}>
            <span>Anasayfa</span>
            <span>→</span>
          </Link>
          <Link href="/games" className={`${active('/games') === 'nav-link active' ? 'mobile-nav-link active' : 'mobile-nav-link'}`}>
            <span>Oyunlar</span>
            <span>→</span>
          </Link>
          <Link href="/dlc" className={`${active('/dlc') === 'nav-link active' ? 'mobile-nav-link active' : 'mobile-nav-link'}`}>
            <span>DLC</span>
            <span>→</span>
          </Link>
          <Link href="/library" className={`${active('/library') === 'nav-link active' ? 'mobile-nav-link active' : 'mobile-nav-link'}`}>
            <span>Kütüphane</span>
            <span>→</span>
          </Link>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

          {steamUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(26,159,255,0.06)', border: '1px solid rgba(26,159,255,0.2)',
                color: '#1a9fff', fontWeight: 600, fontSize: 14,
              }}>
                {steamUser.avatar && (
                  <img src={steamUser.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{steamUser.name}</span>
              </div>
              <button onClick={steamLogout} className="btn btn-ghost" style={{ padding: '12px', fontSize: 14, borderRadius: 10 }}>
                Steam Çıkışı Yap
              </button>
            </div>
          ) : user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                color: 'var(--accent)', fontWeight: 600, fontSize: 14,
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {user.name?.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '12px', fontSize: 14, borderRadius: 10 }}>
                Çıkış Yap
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/login" className="btn btn-ghost" style={{ padding: '12px', fontSize: 14, borderRadius: 10, textAlign: 'center' }}>
                Giriş Yap
              </Link>
              <Link href="/signup" className="btn btn-red" style={{ padding: '12px', fontSize: 14, borderRadius: 10, textAlign: 'center' }}>
                Üye Ol
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
