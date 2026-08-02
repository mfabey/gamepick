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

// POST — gövdeli istekler için (ör. doğal dil arama). AI çağrıları yavaş
// olabildiğinden zaman aşımı çağrı başına ayarlanabilir.
export async function apiPost(path, body = {}, { timeout = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status} — ${path}`);
      err.status = res.status;
      // Sunucu bir hata KODU döndürdüyse taşı — üst katman kullanıcıya
      // gösterebilsin. Kodsuz mesajlar teşhisi imkânsız hâle getiriyordu.
      if (data?.code) err.code = data.code;
      throw err;
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Zaman aşımı — ${path}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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
