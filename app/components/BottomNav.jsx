'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Anasayfa',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'}
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Oyunlar',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'}
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 12h4M8 10v4"/>
        <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
        <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: '/dlc',
    label: 'DLC',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'}
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    href: '/library',
    label: 'Kütüphane',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'}
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const activeIdx = NAV_ITEMS.findIndex(item =>
    item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href)
  );

  const indicatorLeft = activeIdx >= 0 ? `calc(${activeIdx} * 25% + 12.5% - 20px)` : '0';

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 76,
        background: 'var(--bg)',
        borderTop: '2px solid var(--border)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Kayan kırmızı indikatör */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: indicatorLeft,
          width: 40,
          height: 3,
          borderRadius: '0 0 3px 3px',
          background: 'var(--accent)',
          boxShadow: '0 0 12px var(--accent-glow)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        {NAV_ITEMS.map((item, i) => {
          const active = i === activeIdx;
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 5,
              color: active ? 'var(--accent)' : 'var(--text-3)',
              textDecoration: 'none',
              transition: 'color 0.2s',
              position: 'relative',
            }}>
              <div style={{
                transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                transform: active ? 'scale(1.18) translateY(-2px)' : 'scale(1) translateY(0)',
              }}>
                {item.icon(active)}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: active ? 700 : 400,
                letterSpacing: 0.2,
                transition: 'font-weight 0.15s, color 0.2s',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav yüksekliği kadar padding spacer */}
      <div style={{ height: 76 }} />
    </>
  );
}
