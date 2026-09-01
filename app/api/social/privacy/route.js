import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { getPrivacy, setPrivacy } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Sosyal gizlilik ayarları — Guideline 5.1.2 gereği kullanıcı kendi verisinin
// paylaşımını denetleyebilmeli.
//
//   shareActivity  → arkadaşlarım aktivitemi görsün mü
//   discoverable   → kullanıcı adımla bulunabileyim mi
//   showPresence   → çevrimiçi durumum görünsün mü
//   privateProfile → profil içeriğimi (koleksiyon/inceleme/gönderi) yalnız
//                    arkadaşlarım görsün mü
//
// shareActivity kapatılınca yeni aktivite HİÇ YAZILMAZ (social-store).
// privateProfile'ın kapısı `/api/social/profile` içinde; anahtarın kendisi
// setPrivacy'nin beyaz listesinde (gövde doğrudan yazılmıyor).
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();
  return NextResponse.json({ privacy: await getPrivacy(user.uid) });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  try {
    const privacy = await setPrivacy(user.uid, body);
    return NextResponse.json({ ok: true, privacy });
  } catch {
    return NextResponse.json({ error: 'WRITE_FAILED' }, { status: 500 });
  }
}
