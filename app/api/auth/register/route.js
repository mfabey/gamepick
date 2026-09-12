import { NextResponse } from 'next/server';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';
import { canUseAuthMock, authNotConfigured } from '../../../lib/auth-config';
import { guard, penalize } from '../../../lib/rate-guard';
import { sabitSureyeTamamla } from '../../../lib/constant-time';
import { validateUsername } from '../../../lib/content-filter';
import { claimUsername, uidForUsername } from '../../../lib/social-store';
import { kaydetPostaGonderimi } from '../../../lib/mail-metrics';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { name, email, password, username } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'E-posta, şifre ve isim zorunludur.' }, { status: 400 });
    }

    // Toplu sahte hesap üretimi + her kayıt bir doğrulama postası tetikliyor.
    // HESAP EKSENİ DE VAR ama yalnız başarısızlıkta artıyor: uç artık, adres
    // zaten kayıtlıysa o adrese sıfırlama postası gönderiyor ve bu tek kurban
    // adresine bombardıman yolu açıyor (bkz. rate-limit-config.js).
    const kapi = await guard(request, 'register', { account: email });
    if (kapi) return kapi;

    // PAROLA UZUNLUĞU FIREBASE'DEN ÖNCE, BİZDE.
    //
    // Aksi hâlde ayrı bir hesap sayımı kanalı açık kalıyordu: zayıf parola +
    // KAYITLI adres → Firebase EMAIL_EXISTS, zayıf parola + YENİ adres →
    // WEAK_PASSWORD. Yani mesajı nötrleştirmek yetmiyordu; saldırgan 3
    // karakterlik bir parola göndererek iki durumu yine ayırabiliyordu.
    // Kontrolü öne almak bu ayrımı Firebase'in eline bırakmıyor.
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 });
    }

    // ── Kullanıcı adı: sosyal özelliklerin kimlik temeli ────────────────────
    // Kullanıcıyı YARATMADAN ÖNCE doğrula; aksi hâlde geçersiz addan dolayı
    // hesap oluşup yarım kalırdı.
    const wantsUsername = typeof username === 'string' && username.trim().length > 0;
    if (wantsUsername) {
      const v = validateUsername(username.trim());
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

      const owner = await uidForUsername(username.trim());
      if (owner) return NextResponse.json({ error: 'TAKEN' }, { status: 409 });
    }

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY && !canUseAuthMock()) return authNotConfigured();
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock registration.');
      return NextResponse.json({
        ok: true,
        mock: true,
        user: { uid: 'mock_' + Date.now(), name, email }
      });
    }

    // SABİT SÜRE TABANI BURADAN BAŞLIYOR (bkz. constant-time.js).
    // Girdi doğrulaması, hız sınırı ve kullanıcı adı kontrolü DIŞARIDA:
    // onların yanıtları (400/409/429) adresin kayıtlı olup olmadığından
    // bağımsız, geciktirmenin faydası yok.
    const sureBaslangic = Date.now();

    // 1. Sign Up User in Firebase Auth
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        }),
      }
    );

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      const errMsg = signUpData?.error?.message;

      // ── HESAP SAYIMINA KAPALI ────────────────────────────────────────────
      // Eskiden burada 'Bu e-posta adresi zaten kayıtlı.' dönüyordu — yani
      // herkes, istediği adresin bu sitede kayıtlı olup olmadığını TEK
      // İSTEKLE öğrenebiliyordu. `auth/reset-password` bu ayrımı zaten doğru
      // yapıyordu; tutarsızlık buradaydı.
      //
      // ARTIK: hiçbir şey oluşturulmuyor, BAŞARIYLA BİREBİR AYNI gövde
      // dönüyor, ve adrese Firebase'in PASSWORD_RESET postası gidiyor.
      //
      // KULLANICI YİNE DOĞRU YÖNLENDİRİLİYOR: adresin gerçek sahibi postayı
      // alıyor ve "zaten hesabım varmış, parolamı sıfırlayıp gireyim" diyor.
      // Saldırgan ise hiçbir şey öğrenmiyor — ne gövdeden, ne süreden.
      //
      // NEDEN PAROLA SIFIRLAMA POSTASI: Firebase yalnızca kendi hazır
      // şablonlarını gönderebiliyor. "Bu adresle kayıt denendi" diye özel bir
      // şablon göndermek ayrı bir posta altyapısı gerektirirdi. Sıfırlama
      // postası, bu durumda alınması anlamlı olan tek hazır şablon.
      //
      // AÇTIĞI VEKTÖR AYNI YERDE KAPATILDI: bu, kayıt ucunu tek kurban
      // adresine bombardıman aracına çevirebilirdi. `register` artık hesap
      // eksenine sahip ve sayaç TAM BURADA artıyor (`penalize`).
      if (errMsg === 'EMAIL_EXISTS') {
        await penalize(request, 'register', { account: email });

        // Gönderim başarısız olsa bile yanıt DEĞİŞMİYOR: hata dönmek,
        // kapatılan ayrımı geri açardı.
        try {
          const sifirlamaRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
            },
          );
          if (sifirlamaRes.ok) await kaydetPostaGonderimi('registerExisting');
          else console.error('register: mevcut adrese sıfırlama postası gönderilemedi');
        } catch (e) {
          console.error('register: sıfırlama postası hatası:', e?.message || e);
        }

        await sabitSureyeTamamla(sureBaslangic, 'auth/register');
        return NextResponse.json({ ok: true, mock: false });
      }
      if (errMsg === 'WEAK_PASSWORD : Password should be at least 6 characters') {
        return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 });
      }
      return yukariAkisHatasi(signUpData?.error?.message, 'auth/register',
        'Kayıt tamamlanamadı. Lütfen tekrar deneyin.', 400);
    }

    const { localId, idToken } = signUpData;

    // 2. Set Display Name in Firebase Profile
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, displayName: name, returnSecureToken: true }),
      }
    );

    // 3. Send Verification Email
    const sendMailRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken,
        }),
      }
    );

    if (!sendMailRes.ok) {
      const sendMailData = await sendMailRes.json();
      console.error('Firebase sendOobCode Error:', sendMailData?.error?.message);
      // We still registered the user successfully, so we can proceed but warn
    } else {
      // Yalnızca gerçekten giden posta ölçülüyor (bkz. mail-metrics.js).
      await kaydetPostaGonderimi('register');
    }

    // ── Sosyal profili kur ──────────────────────────────────────────────────
    // DİKKAT: Burada eskiden doğrudan `user_profile:{uid}` anahtarına
    // { uid, name, email } yazılıyordu. O anahtar sosyal katmanın profil
    // anahtarıyla AYNI; sonuç olarak her kullanıcıda `username` alanı olmayan
    // bir profil oluşuyor, Arkadaşlar ekranındaki kurulum kapısı "profil var"
    // sanıp atlanıyor ve kullanıcı kalıcı olarak adsız kalıyordu.
    // Artık profil yalnızca claimUsername üzerinden, doğru şemayla yazılıyor.
    // Sonuç YANITA YANSIMIYOR (eskiden `usernameClaimed` olarak dönüyordu):
    // adres zaten kayıtlıysa kullanıcı adı hiç talep edilmiyor, dolayısıyla o
    // alan iki dalı ayırt etmeye yarardı. Başarısızlık loga düşüyor.
    if (wantsUsername) {
      const res = await claimUsername(localId, username.trim(), { displayName: name });
      if (!res.ok) {
        // Kontrol ile talep arasında biri adı kapmış olabilir. Hesap zaten
        // oluştu; kullanıcıyı hata ile geri çevirmek yerine adsız bırakıyoruz,
        // uygulamadaki kurulum kapısı devreye girer.
        console.warn('register: username claim failed', res.error);
      }
    }

    // 4. Return success response WITHOUT issuing session cookies
    //
    // GÖVDE, EMAIL_EXISTS DALIYLA BİREBİR AYNI OLMAK ZORUNDA. Eskiden burada
    // `user: { uid, name, email }` ve `usernameClaimed` da dönüyordu; ikisi de
    // adresin yeni olduğunu ele verirdi (var olan hesap için gerçek bir uid
    // üretilemez). İkisini de HİÇBİR İSTEMCİ OKUMUYORDU: web yalnız
    // `ok`/`mock`'a bakıyor, mobil yanıt gövdesini hiç açmıyor.
    await sabitSureyeTamamla(sureBaslangic, 'auth/register');
    return NextResponse.json({ ok: true, mock: false });

  } catch (err) {
    console.error('Register API Error:', err.message);
    return sunucuHatasi(err, 'auth/register');
  }
}
