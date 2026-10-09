'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

function encodePayload(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return btoa(JSON.stringify(obj));
  }
}

function GoogleMobileAuthContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect_uri') || '';
  const redirectUri = rawRedirect || 'gamerisen://auth';

  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [error, setError] = useState('');
  const btnContainerRef = useRef(null);

  const handleCredential = useCallback(
    (res) => {
      const idToken = res?.credential;
      if (!idToken) {
        setError('Google kimlik bilgisi alınamadı.');
        return;
      }

      setRedirecting(true);
      setError('');

      const payload = encodePayload({ platform: 'google', idToken });
      const sep = redirectUri.includes('?') ? '&' : '?';
      const finalUrl = `${redirectUri}${sep}data=${encodeURIComponent(payload)}`;

      setTargetUrl(finalUrl);

      // ASWebAuthenticationSession / Custom Tabs yakalaması için hemen yönlendir
      try {
        window.location.replace(finalUrl);
      } catch {
        window.location.href = finalUrl;
      }
    },
    [redirectUri]
  );

  useEffect(() => {
    let isMounted = true;

    loadSdk()
      .then((google) => {
        if (!isMounted || !btnContainerRef.current) return;

        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
          ux_mode: 'popup',
          auto_select: true,
        });

        google.accounts.id.renderButton(btnContainerRef.current, {
          type: 'standard',
          shape: 'pill',
          theme: 'outline',
          text: 'continue_with',
          size: 'large',
          width: 290,
        });

        // One Tap istemini otomatik tetikle
        google.accounts.id.prompt();
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        setError('Google SDK yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        console.error('Google mobile SDK load error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [handleCredential]);

  const handleCancel = () => {
    const payload = encodePayload({ platform: 'google', cancelled: true });
    const sep = redirectUri.includes('?') ? '&' : '?';
    const cancelUrl = `${redirectUri}${sep}data=${encodeURIComponent(payload)}`;
    window.location.replace(cancelUrl);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        backgroundColor: '#0A0A0B',
        color: '#F5F5F7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#1C1C1E',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Gamerisen Brand Logo */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #BC0C0C, #F34545)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 20px rgba(243, 69, 69, 0.3)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 12h4M8 10v4" />
            <circle cx="15" cy="11" r="1" fill="#fff" stroke="none" />
            <circle cx="18" cy="13" r="1" fill="#fff" stroke="none" />
          </svg>
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          Gamerisen Mobil Giriş
        </h1>
        <p style={{ fontSize: 13.5, color: '#A1A1A6', margin: '0 0 28px', lineHeight: 1.5 }}>
          Uygulamanıza bağlanmak için Google hesabınızı doğrulayın.
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: 13,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {redirecting ? (
          <div style={{ padding: '20px 0' }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: '#30D158',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#30D158', margin: '0 0 14px' }}>
              Giriş Başarılı!
            </p>
            <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 20px' }}>
              Gamerisen uygulamasına yönlendiriliyorsunuz...
            </p>
            {targetUrl && (
              <a
                href={targetUrl}
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  borderRadius: 10,
                  background: '#F34545',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                Uygulamaya Dön
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {loading ? (
              <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, color: '#A1A1A6', fontSize: 13 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Google hazırlanıyor...
              </div>
            ) : null}

            {/* Google Identity Services Container */}
            <div
              ref={btnContainerRef}
              style={{
                minHeight: 44,
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            />

            <button
              onClick={handleCancel}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8E8E93',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 8,
                padding: '6px 12px',
              }}
            >
              Vazgeç ve Uygulamaya Dön
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function GoogleMobileAuthPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          Yükleniyor...
        </div>
      }
    >
      <GoogleMobileAuthContent />
    </Suspense>
  );
}
