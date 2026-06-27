'use client';

import { useEffect, useState } from 'react';
import { LOGO_SRC } from '../lib/logo';

// Siteye ilk girişte TÜM EKRANI kaplayan açılış: logo büyür → küçülür → site açılır.
// Oturum başına bir kez, kullanıcı etkileşimi gerektirmez.
export default function IntroSplash() {
  const [show, setShow] = useState(false);

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
    }, 2500);
    return () => { clearTimeout(t); document.documentElement.style.overflow = ''; };
  }, []);

  if (!show) return null;

  // Konumlandırma INLINE — globals.css'teki "body > *" kuralının ezmesini engeller (tam ekran garanti).
  return (
    <div
      aria-hidden
      className="gr-intro-veil"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100dvh',
        zIndex: 2147483000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080a0d',
        pointerEvents: 'none',
        margin: 0,
      }}
    >
      <img
        src={LOGO_SRC}
        alt=""
        width={160}
        height={160}
        className="gr-intro-mark"
        style={{ display: 'block', width: 160, height: 160, filter: 'drop-shadow(0 12px 48px rgba(232,36,43,0.5))' }}
      />
      <style>{`
        .gr-intro-veil { animation: grIntroVeil 2.5s cubic-bezier(.5,0,.2,1) forwards; }
        .gr-intro-mark { animation: grIntroMark 2.4s cubic-bezier(.34,1.32,.5,1) forwards; }
        @keyframes grIntroMark {
          0%   { transform: scale(.30); opacity: 0; }
          18%  { opacity: 1; }
          46%  { transform: scale(1.35); opacity: 1; }
          72%  { transform: scale(.82); opacity: 1; }
          100% { transform: scale(.82); opacity: 0; }
        }
        @keyframes grIntroVeil {
          0%, 74% { opacity: 1; }
          100%    { opacity: 0; visibility: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gr-intro-veil, .gr-intro-mark { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
