'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const active = (path) =>
    pathname === path ? 'nav-link active' : 'nav-link';

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header style={{
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      position: 'sticky', top: 0,
      background: 'rgba(255,255,255,0.95)',
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
          letterSpacing: '-0.3px', color: '#1a1a1a',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" style={{ color: '#DC2626' }}>
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

        {/* Sağ taraf — auth */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/profile" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 8,
              background: '#FEF2F2', border: '1px solid #FECACA',
              fontSize: 13, fontWeight: 600, color: '#DC2626',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#DC2626', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {user.name?.slice(0, 1).toUpperCase()}
              </span>
              {user.name?.split(' ')[0]}
            </Link>
            <button onClick={handleLogout} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              background: 'none', border: '1px solid #e5e5e5',
              color: '#999', cursor: 'pointer',
            }}>
              Çıkış
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" className="nav-link">Giriş Yap</Link>
            <Link href="/signup" style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13,
              fontWeight: 600, background: '#DC2626', color: '#fff',
              display: 'inline-block',
            }}>
              Üye Ol
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
