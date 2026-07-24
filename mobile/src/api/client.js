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

export async function apiGet(path, params = {}, { timeout = 12000 } = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;

  // Askıda kalan istekleri kes (sonsuz "yükleniyor" ekranını önler)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Zaman aşımı — ${path}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
