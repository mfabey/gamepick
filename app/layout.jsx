import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'GamePick — Doğru Oyun, Doğru Platform, En İyi Fiyat',
  description: 'Yapay zekanın hissiyat bazlı önerdiği oyunları; canlı fiyatlar ve abonelik durumlarıyla tek ekranda görün.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          background: 'rgba(13,13,13,0.92)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
        }}>
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            height: 60,
            gap: 8,
          }}>
            {/* Logo */}
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginRight: 'auto',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.3px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7B6EE8' }}>
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 12h4M8 10v4"/>
                <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
              </svg>
              GamePick
            </Link>

            {/* Nav links */}
            <nav style={{ display: 'flex', gap: 4 }}>
              <NavLink href="/">Keşfet</NavLink>
              <NavLink href="/profile">Profilim</NavLink>
            </nav>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href} style={{
      padding: '6px 14px',
      borderRadius: 8,
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      e.currentTarget.style.color = '#f0f0f0';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
    }}>
      {children}
    </Link>
  );
}
