// ─────────────────────────────────────────────────────────────────────────────
// KİMLİK POSTASI ŞABLONLARI — doğrulama ve şifre sıfırlama, TR/EN
//
// ── NEDEN TABLO ────────────────────────────────────────────────────────────
// Posta istemcileri tarayıcı değil. Outlook masaüstü hâlâ Word'ün render
// motorunu kullanıyor; flexbox, grid ve `max-width` orada çalışmıyor. Tablo
// bu ortamda "eski moda" değil, ÇALIŞAN tek yerleşim.
//
// ── NEDEN SATIR İÇİ STİL ───────────────────────────────────────────────────
// `<style>` bloğu Gmail'de büyük ölçüde ayıklanıyor. Bütün biçim özniteliğe
// yazılı olmak zorunda.
//
// ── GÖRSEL OLMADAN DA OKUNMALI ─────────────────────────────────────────────
// Gmail görselleri kullanıcı izin verene kadar engelliyor. Bu yüzden logo
// yalnızca SÜS: marka adı METİN olarak da yazıyor ve düğme bir görsel değil,
// arkaplanı renkli bir tablo hücresi ("bulletproof button"). Görseller
// engellenmiş bir kutuda posta hâlâ tam anlaşılıyor.
//
// ── DÜZ METİN SÜRÜMÜ ZORUNLU ───────────────────────────────────────────────
// Yalnızca HTML gönderen postalar spam puanlamasında cezalanıyor. Her şablon
// kendi düz metnini de üretiyor.
//
// ── BAĞLANTI İKİ KEZ ───────────────────────────────────────────────────────
// Hem düğmede hem altında düz adres olarak. Kimi kurumsal istemci düğmeyi
// ya da köprüyü ayıklıyor; adres görünür durursa kullanıcı kopyalayabiliyor.
// ─────────────────────────────────────────────────────────────────────────────

const MARKA = '#cc1216';          // --accent (açık tema) ile aynı
const ZEMIN = '#f4f2ee';
const KART = '#ffffff';
const METIN = '#241d14';          // --text (açık tema)
const SOLUK = '#6b6459';
const KENAR = '#e6e1d8';

const LOGO = 'https://www.gamerisen.com/logo.png';
const SITE = 'https://www.gamerisen.com';

/**
 * Ortak kabuk. İçeriği marka çerçevesine oturtur.
 *
 * KOYU TEMA BİLEREK YOK: posta istemcilerinin koyu tema dönüşümü tutarsız
 * (kimi renkleri ters çevirir, kimi yalnızca zemini). Açık tasarım her
 * istemcide tahmin edilebilir çıkıyor; karanlık modda çeviren istemci de
 * okunabilir bir sonuç üretiyor.
 */
function kabuk({ baslik, govdeHtml }) {
  return `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${baslik}</title></head>
<body style="margin:0;padding:0;background:${ZEMIN};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ZEMIN};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">

        <tr><td align="center" style="padding-bottom:20px;">
          <img src="${LOGO}" width="44" height="44" alt="" style="display:block;border:0;margin-bottom:10px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:${METIN};letter-spacing:-0.2px;">Gamerisen</div>
        </td></tr>

        <tr><td style="background:${KART};border:1px solid ${KENAR};border-radius:14px;padding:28px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${govdeHtml}
        </td></tr>

        <tr><td align="center" style="padding-top:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${SOLUK};">
          <a href="${SITE}" style="color:${SOLUK};text-decoration:none;">gamerisen.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Kurşun geçirmez düğme — görsel değil, renkli tablo hücresi. */
function dugme(baglanti, etiket) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;">
    <tr><td align="center" bgcolor="${MARKA}" style="border-radius:10px;">
      <a href="${baglanti}" style="display:inline-block;padding:13px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${etiket}</a>
    </td></tr>
  </table>`;
}

const p = (icerik, renk = METIN, boyut = 15) =>
  `<p style="margin:0 0 14px;font-size:${boyut}px;line-height:1.6;color:${renk};">${icerik}</p>`;

const yedekBaglanti = (baglanti, etiket) =>
  `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:${SOLUK};">${etiket}<br>
   <a href="${baglanti}" style="color:${MARKA};word-break:break-all;">${baglanti}</a></p>`;

// ── DOĞRULAMA ───────────────────────────────────────────────────────────────

export function dogrulamaPostasi(baglanti, dil = 'tr') {
  if (dil === 'en') {
    return {
      konu: 'Verify your Gamerisen account',
      html: kabuk({
        baslik: 'Verify your Gamerisen account',
        govdeHtml:
          p('<strong style="font-size:17px;">Your account is almost ready</strong>') +
          p('One step left — confirm your email address:') +
          dugme(baglanti, 'Verify my email') +
          p('After that you can connect your Steam and Xbox libraries, add friends, and get told when games on your wishlist go on sale.', SOLUK, 14) +
          p('This link expires shortly. If it does, you can request a new one from the app.', SOLUK, 13) +
          p('If you didn’t create this account, you can ignore this email — an unverified account can’t be used.', SOLUK, 13) +
          yedekBaglanti(baglanti, 'If the button doesn’t work, paste this into your browser:'),
      }),
      metin: [
        'Your Gamerisen account is almost ready.',
        '',
        'Confirm your email address:',
        baglanti,
        '',
        'This link expires shortly. If it does, request a new one from the app.',
        'If you didn’t create this account, you can ignore this email.',
        '',
        '— Gamerisen',
      ].join('\n'),
    };
  }

  return {
    konu: 'Gamerisen hesabını doğrula',
    html: kabuk({
      baslik: 'Gamerisen hesabını doğrula',
      govdeHtml:
        p('<strong style="font-size:17px;">Hesabın neredeyse hazır</strong>') +
        p('Tek eksik, e-posta adresini doğrulaman:') +
        dugme(baglanti, 'E-postamı doğrula') +
        p('Doğruladıktan sonra Steam ve Xbox kütüphaneni bağlayabilir, arkadaşlarını ekleyebilir ve takip listendeki oyunlar indirime girdiğinde haberin olur.', SOLUK, 14) +
        p('Bu bağlantı kısa süre içinde geçersiz olur; süresi dolarsa uygulamadan yenisini isteyebilirsin.', SOLUK, 13) +
        p('Bu hesabı sen açmadıysan bu postayı yok sayabilirsin — doğrulanmamış hesap kullanılamaz.', SOLUK, 13) +
        yedekBaglanti(baglanti, 'Düğme çalışmazsa bu adresi tarayıcına yapıştır:'),
    }),
    metin: [
      'Gamerisen hesabın neredeyse hazır.',
      '',
      'E-posta adresini doğrulamak için:',
      baglanti,
      '',
      'Bu bağlantı kısa süre içinde geçersiz olur; süresi dolarsa uygulamadan yenisini isteyebilirsin.',
      'Bu hesabı sen açmadıysan bu postayı yok sayabilirsin.',
      '',
      '— Gamerisen',
    ].join('\n'),
  };
}

// ── ŞİFRE SIFIRLAMA ─────────────────────────────────────────────────────────

export function sifreSifirlamaPostasi(baglanti, dil = 'tr') {
  if (dil === 'en') {
    return {
      konu: 'Reset your Gamerisen password',
      html: kabuk({
        baslik: 'Reset your Gamerisen password',
        govdeHtml:
          p('<strong style="font-size:17px;">Password reset</strong>') +
          p('We received a request to reset the password for your Gamerisen account.') +
          dugme(baglanti, 'Set a new password') +
          p('This link expires shortly.', SOLUK, 13) +
          p('If you didn’t ask for this, you don’t need to do anything — your password stays as it is and your account is safe.', SOLUK, 13) +
          yedekBaglanti(baglanti, 'If the button doesn’t work, paste this into your browser:'),
      }),
      metin: [
        'We received a request to reset your Gamerisen password.',
        '',
        'Set a new password:',
        baglanti,
        '',
        'This link expires shortly.',
        'If you didn’t ask for this, you don’t need to do anything.',
        '',
        '— Gamerisen',
      ].join('\n'),
    };
  }

  return {
    konu: 'Gamerisen şifreni sıfırla',
    html: kabuk({
      baslik: 'Gamerisen şifreni sıfırla',
      govdeHtml:
        p('<strong style="font-size:17px;">Şifre sıfırlama</strong>') +
        p('Gamerisen hesabın için şifre sıfırlama isteği aldık.') +
        dugme(baglanti, 'Yeni şifre belirle') +
        p('Bu bağlantı kısa süre içinde geçersiz olur.', SOLUK, 13) +
        p('Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok — şifren değişmez ve hesabın güvende kalır.', SOLUK, 13) +
        yedekBaglanti(baglanti, 'Düğme çalışmazsa bu adresi tarayıcına yapıştır:'),
    }),
    metin: [
      'Gamerisen hesabın için şifre sıfırlama isteği aldık.',
      '',
      'Yeni şifre belirlemek için:',
      baglanti,
      '',
      'Bu bağlantı kısa süre içinde geçersiz olur.',
      'Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok.',
      '',
      '— Gamerisen',
    ].join('\n'),
  };
}
