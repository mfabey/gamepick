'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const SDK_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '554716473983-pc6au7o7nquofb6k7b25ll7mge502pp8.apps.googleusercontent.com';

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.google?.accounts?.id) return resolve(window.google);

    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += 100;
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          resolve(window.google);
        } else if (elapsed >= 6000) {
          clearInterval(timer);
          reject(new Error('timeout'));
        }
      }, 100);
      return;
    }

    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error('sdk-load-failed'));
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton({ lang = 'tr', onError }) {
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const btnContainerRef = useRef(null);
  const onErrorRef = useRef(onError);
  const handleCredRef = useRef(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleCredential = useCallback(
    async (res) => {
      const idToken = res?.credential;
      if (!idToken) {
        onErrorRef.current?.(
          lang === 'tr'
            ? 'Google ile giriş yapılamadı (Kimlik doğrulaması alınamadı).'
            : 'Could not sign in with Google (Identity token not found).'
        );
        return;
      }
      setBusy(true);
      try {
        const r = await fetch('/api/auth/google-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, web: true }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.code || data?.error || 'google-failed');
        window.location.href = '/';
      } catch (e) {
        onErrorRef.current?.(
          lang === 'tr'
            ? `Google ile giriş yapılamadı: ${e?.message || 'Bilinmeyen Hata'}`
            : `Could not sign in with Google: ${e?.message || 'Unknown Error'}`
        );
        console.error('google-signin:', e?.message);
        setBusy(false);
      }
    },
    [lang]
  );

  useEffect(() => {
    handleCredRef.current = handleCredential;
  }, [handleCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let isMounted = true;

    loadSdk()
      .then((google) => {
        if (!isMounted || !btnContainerRef.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => handleCredRef.current?.(res),
          ux_mode: 'popup',
          auto_select: false,
        });

        btnContainerRef.current.innerHTML = '';

        const containerWidth = btnContainerRef.current.offsetWidth || 344;
        const buttonWidth = Math.min(Math.max(containerWidth, 200), 400);

        google.accounts.id.renderButton(btnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonWidth,
          locale: lang === 'tr' ? 'tr' : 'en',
        });

        setSdkReady(true);
      })
      .catch((err) => {
        console.error('Google SDK failed to load:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [lang]);

  return (
    <div style={{ width: '100%', marginTop: 10, position: 'relative' }}>
      {busy && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#1a73e8',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1a73e8"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>{lang === 'tr' ? 'Giriş yapılıyor...' : 'Signing in...'}</span>
        </div>
      )}

      <div
        ref={btnContainerRef}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 44,
          opacity: sdkReady ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
}
