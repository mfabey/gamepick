'use client';

import { useEffect, useState } from 'react';
import { LOGO_SRC } from '../lib/logo';

// Siteye ilk girişte logoyu büyütüp küçülten kısa açılış animasyonu.
// Oturum başına bir kez oynar (sessionStorage), kullanıcı etkileşimi gerektirmez.
export default function IntroSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('gr_intro_seen')) return;
      sessionStorage.setItem('gr_intro_seen', '1');
    } catch (e) {}
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div aria-hidden className="gr-intro-veil">
      <img src={LOGO_SRC} alt="" className="gr-intro-mark" width={150} height={150} />
      <style>{`
        .gr-intro-veil {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-body);
          pointer-events: none;
          animation: grIntroVeil 2.5s cubic-bezier(.5,0,.2,1) forwards;
        }
        .gr-intro-mark {
          display: block;
          filter: drop-shadow(0 12px 44px var(--accent-glow));
          animation: grIntroMark 2.4s cubic-bezier(.34,1.32,.5,1) forwards;
        }
        @keyframes grIntroMark {
          0%   { transform: scale(.32); opacity: 0; }
          16%  { opacity: 1; }
          44%  { transform: scale(1.3); opacity: 1; }
          70%  { transform: scale(.84); }
          100% { transform: scale(.84); opacity: 0; }
        }
        @keyframes grIntroVeil {
          0%, 72% { opacity: 1; }
          100%    { opacity: 0; visibility: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gr-intro-veil, .gr-intro-mark { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
