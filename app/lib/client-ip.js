// ─────────────────────────────────────────────────────────────────────────────
// İSTEMCİ IP'Sİ — hız sınırı anahtarları için TEK KAYNAK.
//
// NEDEN TOPLANDI: bu mantık 11 yere kopyalanmıştı (middleware + 7 route +
// rate-guard) ve kopyalar ayrışmıştı — yalnız biri `x-real-ip`'ye düşüyordu.
// Birini düzeltmek diğerlerini düzeltmiyordu. `rate-limit-config.js` sayıları
// nasıl tek yerde topladıysa, bu da adresi öyle topluyor.
//
// ── SAHTECİLİK BURADA SORUN DEĞİL ───────────────────────────────────────────
// Vercel `x-forwarded-for`'u KENDİSİ yazıyor ve dış IP'leri iletmiyor; bunu
// açıkça IP spoofing'i engellemek için yapıyor. Yani istemcinin gönderdiği
// başlık uca ulaşmıyor ve `split(',')[0]` doğru değeri veriyor.
//
// `x-vercel-forwarded-for` yine de ÖNCE deneniyor, ama gerekçesi sahtecilik
// DEĞİL: Vercel'in önüne bir vekil (Cloudflare vb.) konursa `x-forwarded-for`
// o vekilinkiyle değişebilir, Vercel'in kendi başlığı değişmez. Bugün ikisi
// aynı; bu satır ileriye dönük.
//
// ── ASIL MESELE: IPv6 ───────────────────────────────────────────────────────
// Adres olduğu gibi anahtara girerse IPv6 istemcide hız sınırı YOK demektir.
// Ev tipi bir IPv6 tahsisi en az bir /64'tür: aynı bağlantıdaki saldırgan
// 2^64 (~1,8×10^19) farklı kaynak adresi kullanabilir, her biri ayrı kova.
//
// O yüzden IPv6 /64'e kırpılıyor — /64, tek bir abonenin LAN'ı olduğu
// garanti edilen en küçük birim. /56'ya kadar çıkmak (bazı ISS'ler aboneye
// /56 veriyor) değerlendirildi ve REDDEDİLDİ: /64'ü aboneler arasında bölen
// ISS pratikte yok, ama /56'yı bölen var — daha geniş kırpma masum
// kullanıcıları birbirine bağlardı.
//
// IPv4 DOKUNULMADAN geçiyor: mevcut sayaç anahtarları aynı kalsın. Yalnızca
// IPv6 anahtarları bir kez biçim değiştiriyor, o da zararsız (sayaç sıfırlanır).
// ─────────────────────────────────────────────────────────────────────────────

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** `[::1]:8080`, `1.2.3.4:5678` gibi biçimlerden portu/parantezi ayıklar. */
function portuAt(deger) {
  const v = deger.trim();
  if (!v) return '';

  // Köşeli parantezli IPv6: [2001:db8::1]:443
  if (v.startsWith('[')) {
    const kapanis = v.indexOf(']');
    return kapanis > 0 ? v.slice(1, kapanis) : v.slice(1);
  }

  // IPv4 + port: tek iki nokta var ve öncesi IPv4 gibi duruyor.
  // Çıplak IPv6'da iki noktadan çok var, o yüzden bu ayrım güvenli.
  const ilk = v.indexOf(':');
  if (ilk > 0 && v.indexOf(':', ilk + 1) === -1 && IPV4.test(v.slice(0, ilk))) {
    return v.slice(0, ilk);
  }

  return v;
}

/**
 * IPv6 adresini /64 önekine indirger.
 * @returns `2001:db8:85a3:8d3::/64` biçiminde dize, ayrıştırılamazsa null.
 */
function onek64(adres) {
  const parcalar = adres.split('::');
  if (parcalar.length > 2) return null;            // birden çok '::' geçersiz

  const bas = parcalar[0] ? parcalar[0].split(':') : [];
  const son = parcalar.length === 2 && parcalar[1] ? parcalar[1].split(':') : [];

  let gruplar;
  if (parcalar.length === 2) {
    // '::' sıkıştırmasını gerçek sıfır gruplarıyla aç.
    const eksik = 8 - bas.length - son.length;
    if (eksik < 0) return null;
    gruplar = [...bas, ...Array(eksik).fill('0'), ...son];
  } else {
    gruplar = bas;
  }
  if (gruplar.length !== 8) return null;

  // İlk 4 grup = ilk 64 bit. Her grup ondalık sıfırlardan arındırılıp
  // küçük harfe indiriliyor ki '2001:0db8:...' ile '2001:db8:...' aynı
  // kovaya düşsün.
  const onek = [];
  for (const g of gruplar.slice(0, 4)) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    onek.push(parseInt(g, 16).toString(16));
  }
  return `${onek.join(':')}::/64`;
}

/** Ham adres dizesini sayaç anahtarına uygun biçime çevirir. */
export function normalizeIp(ham) {
  const v = portuAt(String(ham || ''));
  if (!v) return '';

  // IPv4 → olduğu gibi.
  if (IPV4.test(v)) return v;

  if (v.includes(':')) {
    // IPv4-eşlemeli IPv6: ::ffff:192.0.2.1 → IPv4 kovasına düşsün, aksi
    // hâlde aynı istemci iki ayrı kovadan geçerdi.
    if (v.includes('.')) {
      const kuyruk = v.slice(v.lastIndexOf(':') + 1);
      if (IPV4.test(kuyruk)) return kuyruk;
    }
    const onek = onek64(v);
    if (onek) return onek;
  }

  // Tanınmayan biçim: olduğu gibi kullan. Sınırı düşürmektense bilinmeyen
  // dizeyi kova yapmak daha güvenli — en kötü ihtimalle fazla sıkı olur.
  return v;
}

/**
 * İsteğin istemci IP'si (hız sınırı anahtarı için normalize edilmiş).
 * Hiçbir başlık yoksa `'unknown'` — tek ortak kova, sınırsız değil.
 */
export function clientIp(request) {
  const ham = request.headers.get('x-vercel-forwarded-for')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || '';
  return normalizeIp(ham.split(',')[0]) || 'unknown';
}
