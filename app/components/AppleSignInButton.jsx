'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Web'de "Apple ile giriş yap".
//
// Mobilde native AppleAuthentication kullanılıyor; web'de Apple'ın kendi JS
// kütüphanesi (Sign in with Apple JS) gerekiyor.
//
// İKİ ÖNEMLİ FARK:
//  1. clientId burada **Services ID**'dir, uygulamanın bundle kimliği DEĞİL.
//     (Apple ClientConfigI dokümanı: "developer's client identifier".)
//  2. usePopup: true seçildi — bu sayede id_token doğrudan JS'e dönüyor ve
//     sunucu tarafında ayrı bir yönlendirme ucu yazmaya gerek kalmıyor.
//
// Dönen id_token, mobilin de kullandığı /api/auth/apple-signin ucuna gidiyor;
// orada Firebase'in accounts:signInWithIdp'siyle doğrulanıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';

const SDK_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const rawServicesId = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID || '';
const SERVICES_ID = (rawServicesId && rawServicesId.startsWith('com.')) 
  ? rawServicesId 
  : 'com.gamerisen.app.signin';

function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.AppleID?.auth) return resolve(window.AppleID);

    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AppleID));
      existing.addEventListener('error', () => reject(new Error('sdk-load-failed')));
      return;
    }

    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve(window.AppleID);
    s.onerror = () => reject(new Error('sdk-load-failed'));
    document.head.appendChild(s);
  });
}

export default function AppleSignInButton({ lang = 'tr', onError }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Services ID tanımlı değilse butonu hiç gösterme — tıklanınca
    // anlaşılmaz bir Apple hatası vermesindense hiç görünmesin.
    if (!SERVICES_ID) return;
    let alive = true;

    loadSdk()
      .then((AppleID) => {
        if (!alive) return;
        AppleID.auth.init({
          clientId: SERVICES_ID,
          scope: 'name email',
          redirectURI: window.location.origin + '/login',
          usePopup: true,
        });
        setReady(true);
      })
      .catch(() => { /* SDK yüklenemedi → buton gizli kalır */ });

    return () => { alive = false; };
  }, []);

  const signIn = useCallback(async () => {
    if (busy || !window.AppleID?.auth) return;
    setBusy(true);
    try {
      const res = await window.AppleID.auth.signIn();
      const identityToken = res?.authorization?.id_token;
      if (!identityToken) throw new Error('no-token');

      // Apple tam adı YALNIZCA ilk yetkilendirmede gönderiyor —
      // geldiğinde hemen iletilmeli, sonraki girişlerde gelmez.
      const n = res?.user?.name;
      const fullName = n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : '';

      const r = await fetch('/api/auth/apple-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken, fullName, web: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'apple-failed');

      window.location.href = '/';
    } catch (e) {
      // Kullanıcı popup'ı kapattıysa hata gösterme
      const code = e?.error || e?.message || '';
      if (code !== 'popup_closed_by_user' && code !== 'user_cancelled_authorize') {
        onError?.(lang === 'tr' ? 'Apple ile giriş yapılamadı.' : 'Could not sign in with Apple.');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, lang, onError]);

  if (!SERVICES_ID || !ready) return null;

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={busy}
      aria-label={lang === 'tr' ? 'Apple ile giriş yap' : 'Sign in with Apple'}
      style={{
        width: '100%', padding: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: '#fff', color: '#000',
        border: 'none', borderRadius: 8,
        fontSize: 14, fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.7 : 1,
        minHeight: 44,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      {lang === 'tr' ? 'Apple ile giriş yap' : 'Sign in with Apple'}
    </button>
  );
}
