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
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
        }}>
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            height: 60,
            gap: 8,
          }}>
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginRight: 'auto',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.3px',
              color: '#1a1a1a',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#DC2626' }}>
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 12h4M8 10v4"/>
                <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
              </svg>
              GamePick
            </Link>

            <nav style={{ display: 'flex', gap: 4 }}>
              <Link href="/" className="nav-link">Keşfet</Link>
              <Link href="/profile" className="nav-link">Profilim</Link>
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
