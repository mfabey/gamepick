import { NextResponse } from 'next/server';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';
import { guard, penalize } from '../../../lib/rate-guard';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { actionType, oobCode, newPassword } = await request.json();

    if (!oobCode) {
      return NextResponse.json({ error: 'İşlem kodu (oobCode) gereklidir.' }, { status: 400 });
    }

    // KOD TÜKETEN UCUN KAPISI. Bu uç sınırsızdı: middleware'in 60/dk'sı
    // dışında tavan yoktu, yani IP başına 86.400 Firebase denemesi/gün.
    //
    // KOD SUNULDUKTAN SONRA sayıyoruz: gövdesiz/kodsuz istek Firebase'e
    // gitmiyor, dolayısıyla bütçeyi de tüketmemeli. Onları middleware
    // karşılıyor.
    const kapi = await guard(request, 'codeVerify', { code: oobCode });
    if (kapi) return kapi;

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Simulating mock action.');
      return NextResponse.json({ ok: true, mock: true });
    }

    if (actionType === 'verifyEmail') {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        // Kod eksenini burada artırıyoruz — `guard` yalnızca BAKTI.
        // Süresi dolmuş kod da başarısızlık sayılıyor: zaten kullanılamaz
        // durumda ve saldırgan ikisini yanıttan ayırt edemiyor.
        await penalize(request, 'codeVerify', { code: oobCode });
        return NextResponse.json(
          { error: 'VERIFY_FAILED', message: 'E-posta doğrulama tamamlanamadı. Bağlantının süresi dolmuş olabilir.' },
          { status: res.status }
        );
      }

      return NextResponse.json({ ok: true });
    } 
    
    if (actionType === 'resetPassword') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' }, { status: 400 });
      }

      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode, newPassword }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        await penalize(request, 'codeVerify', { code: oobCode });

        // ── TEK MESAJ ─────────────────────────────────────────────────────
        // Öncesinde üç ayrı yanıt vardı: "süresi dolmuş" (EXPIRED_OOB_CODE),
        // "geçersiz" (INVALID_OOB_CODE) ve diğerlerinde HAM FIREBASE KODU.
        //
        // 1) SÜRESİ DOLMUŞ / GEÇERSİZ AYRIMI BİLGİ SIZDIRIYORDU: ayrım,
        //    elindeki kodun BİR ZAMANLAR GEÇERLİ olduğunu söylüyor. Kullanıcı
        //    açısından ise iki durumda yapılacak iş AYNI — yeni bağlantı
        //    istemek. Yani ayrım saldırgana bilgi veriyor, kullanıcıya yön
        //    vermiyordu.
        //
        // 2) HAM KOD İSTEMCİYE GİDİYORDU: son dal `errMsg`'i doğrudan
        //    basıyordu. `api-error.js` tam bunun için yazılmış (ham Firebase
        //    kodları kullanıcı için anlamsız, dışarıdan bakan için bilgi);
        //    bu uç o taramada gözden kaçmış. Kod artık yalnız loga gidiyor.
        //
        // DURUM 400'E SABİT: yukarı akışın durum kodunu geçirmek de bir
        // ayrım kanalıydı.
        //
        // `yukariAkisHatasi` KULLANILMIYOR: o `{error:'UPSTREAM_ERROR'}`
        // döndürüyor ve bu projedeki istemciler `data.message`'ı değil
        // `data.error`'ı ekrana basıyor — kullanıcı "UPSTREAM_ERROR" görürdü.
        // (Bu, kod tabanında ayrıca düzeltilmesi gereken bir kusur.)
        console.error('auth/action: yukarı akış kodu =', data?.error?.message || '(kod yok)');
        return NextResponse.json(
          { error: 'Bağlantı geçersiz ya da süresi dolmuş. Lütfen yeni bir bağlantı isteyin.' },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi.' }, { status: 400 });

  } catch (err) {
    console.error('Auth Action API Error:', err.message);
    return sunucuHatasi(err, 'auth/action');
  }
}
