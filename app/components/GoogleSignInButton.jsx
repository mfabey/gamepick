'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Web'de "Google ile giriş yap".
//
// Google Identity Services (GIS) kullanılıyor. `google.accounts.id` seçildi
// çünkü bize gereken şey bir **id_token**: Firebase'in signInWithIdp'si onu
// bekliyor. (`google.accounts.oauth2` erişim jetonu döndürür, işimize yaramaz.)
//
// Butonu Google'ın kendisi çiziyor (renderButton) — marka kılavuzu kendi
// çizdiğimiz bir butonu kabul etmiyor. Bu yüzden Apple butonundan farklı
// olarak burada bir kapsayıcı div'e ihtiyaç var.
//
// İstemci kimliği tanımlı değilse buton hiç görünmez; Apple butonundaki
// yaklaşımın aynısı — tıklanınca anlaşılmaz hata vermesindense hiç çıkmasın.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';

const SDK_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '554716473983-pc6au7o7nquofb6k7b25ll7mge502pp8.apps.googleusercontent.com';

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.google?.accounts?.id) return resolve(window.google);

    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('sdk-load-failed')));
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
  const holderRef = useRef(null);
  const [ready, setReady] = useState(false);

  // onError'ı ref'te tutuyoruz: GIS geri çağrısı bir kez kaydediliyor, üst
  // bileşen yeniden render olunca eski kapanışa takılı kalmasın.
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const handleCredential = useCallback(async (res) => {
    const idToken = res?.credential;
    if (!idToken) {
      onErrorRef.current?.(lang === 'tr' ? 'Google ile giriş yapılamadı.' : 'Could not sign in with Google.');
      return;
    }
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
        lang === 'tr' ? 'Google ile giriş yapılamadı.' : 'Could not sign in with Google.'
      );
      if (e?.message) console.error('google-signin:', e.message);
    }
  }, [lang]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let alive = true;

    loadSdk()
      .then((google) => {
        if (!alive || !holderRef.current) return;

        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
          ux_mode: 'popup',
        });

        // GIS `width`i piksel olarak istiyor; '100%' kabul etmiyor. Kapsayıcıyı
        // ölçüp Google'ın izin verdiği aralığa (200-400) sıkıştırıyoruz.
        const w = Math.min(400, Math.max(200, holderRef.current.offsetWidth || 320));
        google.accounts.id.renderButton(holderRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'center',
          locale: lang === 'tr' ? 'tr' : 'en',
          width: w,
        });

        setReady(true);
      })
      .catch(() => { /* SDK yüklenemedi → buton gizli kalır */ });

    return () => { alive = false; };
  }, [handleCredential, lang]);

  if (!CLIENT_ID) return null;

  return (
    <div
      ref={holderRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        // Boşluk BURADA duruyor, çağıran taraftaki sarmalayıcıda değil:
        // istemci kimliği yokken bileşen null döndüğü için boşluk da kalkıyor.
        marginTop: 10,
        minHeight: ready ? 'auto' : 0,
      }}
    />
  );
}
