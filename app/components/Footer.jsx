'use client';

import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';

export default function Footer() {
  const { lang, t } = useLanguage();

  return (
    <footer style={{
      borderTop: '1px solid color-mix(in srgb, var(--text) 8%, transparent)',
      background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-card) 20%, transparent))',
      padding: '48px 24px 108px 24px', // Extra bottom padding for floating bottom tab bar
      color: 'var(--text-3)',
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        
        {/* Social Media Icons */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
          {/* Twitter / X */}
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--text-2)',
            transition: 'color 0.2s, transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>

          {/* Discord */}
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--text-2)',
            transition: 'color 0.2s, transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
          </a>

          {/* LinkedIn */}
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--text-2)',
            transition: 'color 0.2s, transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>

        {/* Links: Copyright & Legal */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 12px',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--text-3)',
          fontWeight: 500,
        }}>
          <span>© {new Date().getFullYear()} GamePick</span>
          <span style={{ opacity: 0.3 }}>|</span>
          <a href="https://partner.steamgames.com/" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--text-2)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            borderBottom: '1px solid transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
          >
            {t('footer.poweredBy')}
          </a>
          <span style={{ opacity: 0.3 }}>|</span>
          <Link href="/terms" style={{
            color: 'var(--text-2)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            borderBottom: '1px solid transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
          >
            {t('footer.terms')}
          </Link>
          <span style={{ opacity: 0.3 }}>|</span>
          <Link href="/privacy" style={{
            color: 'var(--text-2)',
            textDecoration: 'none',
            transition: 'color 0.2s',
            borderBottom: '1px solid transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
          >
            {t('footer.privacy')}
          </Link>
        </div>

        {/* Disclaimer */}
        <p style={{
          maxWidth: 600,
          margin: 0,
          lineHeight: 1.6,
          fontSize: 11.5,
          color: 'color-mix(in srgb, var(--text-3) 65%, transparent)',
        }}>
          {t('footer.disclaimer')}
        </p>

      </div>
    </footer>
  );
}
