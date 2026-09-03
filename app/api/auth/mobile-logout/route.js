import { NextResponse } from 'next/server';
import { verifyMobileToken, invalidateMobileToken } from '../../../lib/mobile-auth';
import { revokeUserTokens } from '../../../lib/firebase-admin';
import { guard } from '../../../lib/rate-guard';

// ─────────────────────────────────────────────────────────────────────────────
// MOBİL ÇIKIŞ — jetonu sunucuda iptal eder.
//
// NEDEN YENİ BİR UÇ: mobil çıkış TAMAMEN YERELDİ
// (mobile/src/services/session.js `signOut` → `persist(null)` yalnızca
// SecureStore kopyasını siliyor). Firebase yenileme jetonu süresiz ve
// döndürülmediği için, cihazdan silinen jeton başka bir yerde hâlâ
// geçerliydi: telefon çalınıp jeton çıkarıldıysa "çıkış yap" hiçbir işe
// yaramıyordu.
//
// KİMLİK ŞART: iptal edilecek uid, İSTEKTEN DEĞİL jetondan alınıyor. Aksi
// hâlde bu uç, başkasının oturumunu düşürmeye yarayan bir hizmet reddi
// aracına dönerdi.
//
// ÇIKIŞ HER HÂLÜKÂRDA BAŞARILI DÖNER. İstemci bu yanıta göre yerel oturumu
// siliyor; 500 dönmek kullanıcıyı çıkamaz hâle getirirdi. İptal edilemediyse
// loga düşüyor, kullanıcıya değil.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  // Jetonu olmayan da "çıkış" diyebilir — zaten yapacak bir şey yok.
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ ok: true, revoked: false });

  // Çıkış nadir; sınır dar tutulabilir. Amaç, geçerli jetonla tekrar tekrar
  // iptal çağırıp Admin kotasını yormayı engellemek.
  const kapi = await guard(request, 'tokenRefresh');
  if (kapi) return kapi;

  const revoked = await revokeUserTokens(user.uid);

  // Bu isteğin jetonunu doğrulama önbelleğinden de düş — aksi hâlde iptal
  // edilmiş jeton 60 sn boyunca geçerli görünmeye devam ederdi.
  invalidateMobileToken(request);

  return NextResponse.json({ ok: true, revoked });
}
