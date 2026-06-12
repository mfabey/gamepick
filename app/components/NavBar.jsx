'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, steamUser, logout, steamLogout } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();

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

        {/* Ana navigasyon */}
        <nav style={{ display: 'flex', gap: 2, marginRight: 'auto' }}>
          <Link href="/"         className={active('/')}>Anasayfa</Link>
          <Link href="/games"    className={active('/games')}>Oyunlar</Link>
          <Link href="/dlc"      className={active('/dlc')}>DLC</Link>
          <Link href="/library"  className={active('/library')}>Kütüphane</Link>
        </nav>

        {/* Tema Değiştirici ve Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      </div>
    </header>
  );
}
