// ─────────────────────────────────────────────────────────────────────────────
// Mobil oturum doğrulama.
// Web httpOnly cookie kullanıyor; mobil uygulamalar cookie ile sağlıklı
// çalışmadığı için Authorization: Bearer <idToken> başlığı kullanır.
//
// Token'ı Firebase'in accounts:lookup ucuyla doğruluyoruz — geçersiz, süresi
// dolmuş veya iptal edilmiş token'lar burada elenir.
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

/**
 * İstekteki Bearer token'ı doğrular.
 * @returns {Promise<{uid, email, emailVerified, name}|null>} geçersizse null
 */
export async function verifyMobileToken(request) {
  const auth = request.headers.get('authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!idToken) return null;

  // Firebase yapılandırılmamışsa (yerel geliştirme) doğrulama yapılamaz
  if (!FIREBASE_API_KEY) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.users?.[0];
    if (!u?.localId) return null;

    return {
      uid: u.localId,
      email: u.email || '',
      emailVerified: !!u.emailVerified,
      name: u.displayName || (u.email || '').split('@')[0],
    };
  } catch {
    return null;
  }
}
