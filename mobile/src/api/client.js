import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// API TABANI
// Mobil uygulama, mevcut Next.js (Vercel) backend'inizin API route'larını tüketir.
// Bu değeri app.json → expo.extra.apiBase içinden ayarlayın.
//
//  • Production:  "https://alan-adiniz.vercel.app"
//  • Yerel test:  "http://192.168.X.X:3000"  (bilgisayarınızın LAN IP'si — "localhost"
//                 telefonda çalışmaz; `ipconfig` ile IP'yi öğrenin ve 3000 portunu açın)
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE =
  Constants.expoConfig?.extra?.apiBase ||
  'https://REPLACE-WITH-YOUR-VERCEL-DOMAIN.vercel.app';

export async function apiGet(path, params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json();
}
