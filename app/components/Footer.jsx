'use client';

import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';

export default function Footer() {
  const { lang, t } = useLanguage();
  const tr = lang === 'tr';
  const year = new Date().getFullYear();

  const linkStyle = {
    fontSize: 14,
    color: 'var(--text-2)',
    textDecoration: 'none',
    transition: 'color 0.18s',
    width: 'fit-content',
  };
  const onEnter = (e) => { e.currentTarget.style.color = 'var(--accent)'; };
  const onLeave = (e) => { e.currentTarget.style.color = 'var(--text-2)'; };

  const colHead = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
    marginBottom: 14,
  };

  const social = (href, label, path) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-card)',
        border: '1px solid color-mix(in srgb, var(--text) 10%, transparent)',
        color: 'var(--text-2)',
        transition: 'color 0.2s, transform 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 45%, transparent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text) 10%, transparent)'; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">{path}</svg>
    </a>
  );

  return (
    <footer
      className="gr-footer"
      style={{
        borderTop: '1px solid color-mix(in srgb, var(--text) 8%, transparent)',
        background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-card) 28%, transparent))',
        color: 'var(--text-3)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Üst: 4 sütun ── */}
      <div
        className="gr-footer-grid"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '52px 24px 30px',
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1.7fr) 1fr 1fr 1fr',
          gap: 38,
        }}
      >
        {/* Marka */}
        <div>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 14, width: 'fit-content' }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="3" />
                <path d="M6 12h4M8 10v4" />
                <circle cx="15.5" cy="11" r="1" fill="#fff" stroke="none" />
                <circle cx="18" cy="13.5" r="1" fill="#fff" stroke="none" />
              </svg>
            </span>
            <span style={{ fontFamily: 'var(--font-heading, var(--font-body))', fontWeight: 700, fontSize: 19, letterSpacing: '-0.5px', color: 'var(--text)' }}>Gamerisen</span>
          </Link>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: 300, margin: '0 0 16px' }}>
            {tr
              ? '500.000+ oyunu keşfet; Steam, Epic, GOG ve Xbox fiyatlarını tek ekranda karşılaştır.'
              : 'Discover 500,000+ games and compare Steam, Epic, GOG and Xbox prices on one screen.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {social('https://x.com/gamerisen', 'X', <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />)}
            {social('https://discord.gg/nsmrWT7Bat', 'Discord', <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />)}
            {social('https://www.instagram.com/gamerisen/', 'Instagram', <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />)}
          </div>
        </div>

        {/* Keşfet */}
        <div>
          <div style={colHead}>{tr ? 'Keşfet' : 'Explore'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Link href="/games" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{tr ? 'Oyunlar' : 'Games'}</Link>
            <Link href="/news" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{tr ? 'Haberler' : 'News'}</Link>
          </div>
        </div>

        {/* Destek */}
        <div>
          <div style={colHead}>{tr ? 'Destek' : 'Support'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Link href="/support" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{tr ? 'Yardım Merkezi' : 'Help Center'}</Link>
            <Link href="/library" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{tr ? 'Kütüphane' : 'Library'}</Link>
            <Link href="/profile" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{tr ? 'Profil' : 'Profile'}</Link>
          </div>
        </div>

        {/* Yasal */}
        <div>
          <div style={colHead}>{tr ? 'Yasal' : 'Legal'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Link href="/terms" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{t('footer.terms')}</Link>
            <Link href="/privacy" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{t('footer.privacy')}</Link>
            <a href="https://partner.steamgames.com/" target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{t('footer.poweredBy')}</a>
          </div>
        </div>
      </div>

      {/* ── Alt: telif + uyarı ── */}
      <div
        className="gr-footer-bottom"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '20px 24px 108px', // alt yüzen tab bar için ekstra boşluk
          borderTop: '1px solid color-mix(in srgb, var(--text) 8%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>© {year} Gamerisen</span>
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: 'color-mix(in srgb, var(--text-3) 70%, transparent)', maxWidth: 560 }}>
          {t('footer.disclaimer')}
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          .gr-footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 30px 24px !important;
          }
        }
        @media (max-width: 520px) {
          .gr-footer-grid {
            grid-template-columns: 1fr !important;
          }
          .gr-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
}
