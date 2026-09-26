'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LOGO_DARK_SRC, LOGO_LIGHT_SRC } from '../lib/logo';

// Siteye ilk girişte TÜM EKRANI kaplayan açılış: logo büyür → küçülür → site açılır.
// Oturum başına bir kez, kullanıcı etkileşimi gerektirmez.
export default function IntroSplash() {
  const [show, setShow] = useState(false);
  const { theme, mounted } = useTheme();

  useEffect(() => {
    try {
      if (sessionStorage.getItem('gr_intro_seen')) return;
      sessionStorage.setItem('gr_intro_seen', '1');
    } catch (e) {}
    setShow(true);
    document.documentElement.style.overflow = 'hidden';
    const t = setTimeout(() => {
      setShow(false);
      document.documentElement.style.overflow = '';
    }, 2400);
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (!show) return null;

  const logoSrc = mounted && theme === 'light' ? LOGO_LIGHT_SRC : LOGO_DARK_SRC;

  return (
    <div
      aria-hidden
      className="gr-intro-veil"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 2147483000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: mounted && theme === 'light' ? '#f4f5f8' : '#080a0d',
        pointerEvents: 'none',
        margin: 0,
        gap: 16,
      }}
    >
      <img
        src={logoSrc}
        alt=""
        width={130}
        height={130}
        className="gr-intro-mark"
        style={{
          display: 'block',
          width: 130,
          height: 130,
          filter: 'drop-shadow(0 12px 48px rgba(232,36,43,0.5))',
        }}
      />
      <span
        className="gr-intro-text"
        style={{
          fontFamily: 'var(--font-heading, sans-serif)',
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          color: mounted && theme === 'light' ? '#14161a' : '#ffffff',
          opacity: 0,
        }}
      >
        Gamerisen
      </span>
      <style>{`
        .gr-intro-veil { animation: grIntroVeil 2.4s cubic-bezier(.5,0,.2,1) forwards; }
        .gr-intro-mark { animation: grIntroMark 2.3s cubic-bezier(.34,1.32,.5,1) forwards; }
        .gr-intro-text { animation: grIntroText 2.3s cubic-bezier(.34,1.2,.5,1) forwards; }
        @keyframes grIntroMark {
          0%   { transform: scale(.30); opacity: 0; }
          18%  { opacity: 1; }
          46%  { transform: scale(1.15); opacity: 1; }
          72%  { transform: scale(.92); opacity: 1; }
          100% { transform: scale(.92); opacity: 0; }
        }
        @keyframes grIntroText {
          0%, 15% { transform: translateY(10px); opacity: 0; }
          35%, 72% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-4px); opacity: 0; }
        }
        @keyframes grIntroVeil {
          0%, 75% { opacity: 1; }
          100%    { opacity: 0; visibility: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gr-intro-veil, .gr-intro-mark, .gr-intro-text { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
