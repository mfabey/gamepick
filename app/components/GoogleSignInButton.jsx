'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const SDK_SRC   = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  || '554716473983-pc6au7o7nquofb6k7b25ll7mge502pp8.apps.googleusercontent.com';

// Script zaten yüklenmiş olabilir — polling ile window.google bekle
function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.google?.accounts?.id) return resolve(window.google);

    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      // Script var ama load eventi geçmiş olabilir — polling yap
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
    s.src = SDK_SRC; s.async = true;
    s.onload  = () => resolve(window.google);
    s.onerror = () => reject(new Error('sdk-load-failed'));
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton({ lang = 'tr', onError }) {
  const [busy, setBusy]   = useState(false); // sadece backend API çağrısında true
  const [hover, setHover] = useState(false);
  const hiddenRef         = useRef(null);
  const initializedRef    = useRef(false);
  const onErrorRef        = useRef(onError);
  const handleCredRef     = useRef(null);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const handleCredential = useCallback(async (res) => {
    const idToken = res?.credential;
    if (!idToken) {
      onErrorRef.current?.(lang === 'tr' ? 'Google ile giriş yapılamadı (Kimlik doğrulaması alınamadı).' : 'Could not sign in with Google (Identity token not found).');
      return;
    }
    setBusy(true);
    try {
      const r    = await fetch('/api/auth/google-signin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken, web: true }),
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
    } finally {
      setBusy(false);
    }
  }, [lang]);

  // Ref'te tut — GIS geri çağrısı stale closure'a takılmasın
  useEffect(() => { handleCredRef.current = handleCredential; }, [handleCredential]);

  // SDK'yı arka planda yükle ve gizli GIS butonunu oluştur
  useEffect(() => {
    if (!CLIENT_ID) return;
    loadSdk()
      .then((google) => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback:  (res) => handleCredRef.current?.(res),
          ux_mode:   'popup',
        });
        if (hiddenRef.current) {
          google.accounts.id.renderButton(hiddenRef.current, {
            type: 'standard', theme: 'outline', size: 'large', width: 1,
          });
        }
      })
      .catch(() => { /* sessizce hata — buton yine görünür kalır */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tıklamada busy state YOK — sadece credential gelince busy olur
  const handleClick = useCallback(async () => {
    if (busy) return;
    try {
      const google = await loadSdk();

      // SDK init edilmemişse şimdi yap
      if (!initializedRef.current) {
        initializedRef.current = true;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback:  (res) => handleCredRef.current?.(res),
          ux_mode:   'popup',
        });
      }

      // Gizli GIS butonuna proxy tıklama
      const gisBtn =
        hiddenRef.current?.querySelector('div[role="button"]') ||
        hiddenRef.current?.querySelector('button');

      if (gisBtn) {
        gisBtn.click();
      } else {
        // Fallback: One Tap prompt
        google.accounts.id.prompt((n) => {
          if (n.isNotDisplayed() || n.isSkippedMoment()) {
            onErrorRef.current?.(
              lang === 'tr'
                ? 'Google oturum açma penceresi açılamadı.'
                : 'Could not open Google sign-in popup.'
            );
          }
        });
      }
    } catch {
      onErrorRef.current?.(
        lang === 'tr' ? 'Google ile giriş yapılamadı.' : 'Could not sign in with Google.'
      );
    }
  }, [busy, lang]);

  return (
    <>
      {/* GIS'in render ettiği gizli buton (proxy) */}
      <div
        ref={hiddenRef}
        style={{
          position: 'absolute', left: -9999, top: -9999,
          width: 1, height: 1, overflow: 'hidden',
          opacity: 0, pointerEvents: 'none',
        }}
      />

      {/* Özel stillenmiş, her zaman görünen buton */}
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleClick}
        disabled={busy}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={lang === 'tr' ? 'Google ile giriş yap' : 'Sign in with Google'}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: hover ? '#f1f3f4' : '#fff',
          color: '#3c4043',
          border: '1px solid #dadce0',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Roboto, Arial, sans-serif',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          minHeight: 44,
          transition: 'background 0.15s',
          letterSpacing: 0.1,
        }}
      >
        {busy ? (
          /* Sadece credential işlenirken spinner */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true">
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : (
          /* Google renkli G logosu */
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        )}
        {busy
          ? (lang === 'tr' ? 'Giriş yapılıyor...' : 'Signing in...')
          : (lang === 'tr' ? 'Google ile giriş yap' : 'Sign in with Google')}
      </button>
    </>
  );
}
