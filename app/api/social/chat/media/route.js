import { NextResponse } from 'next/server';
import { guard } from '../../../../lib/rate-guard';
import { put } from '@vercel/blob';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../../lib/social-store';
import { moderateMedia, isModerationConfigured } from '../../../../lib/media-moderation';

// ─────────────────────────────────────────────────────────────────────────────
// Sohbet görseli yükleme.
//
// VİDEO KISA TUTULUYOR, SEBEBİ PLATFORM SINIRI: Vercel sunucusuz işlevlerinde
// istek gövdesi 4,5 MB. Alternatif, Blob'a doğrudan istemci yüklemesi kurmaktı
// ama o yol içeriğin DENETİMDEN ÖNCE depoya inmesi demek. Bunun yerine video
// cihazda 15 saniye + orta kalite ile sınırlanıyor ve aynı hattan geçiyor:
// moderasyon-önce-depolama sırası, sihirli bayt kontrolü ve sahiplik koruması
// video için de aynen geçerli.
//
// MODERASYON YÜKLEMEDEN ÖNCE. Sırayı tersine çevirip "önce yükle, sonra denetle,
// gerekirse sil" demek, içeriğin bir süre erişilebilir kalması demek — o süre
// ne kadar kısa olursa olsun içerik yayınlanmış sayılır.
//
// URL GİZLİLİĞİ: Blob adresleri rastgele son ek alıyor, yani tahmin edilemez.
// Ama adres sızarsa içerik erişilebilir olur — bu "belirsizlikle güvenlik" ve
// gerçek bir erişim denetimi DEĞİL. Özel mesaj içeriği için sınırı bilerek
// kabul ediyoruz; imzalı/süreli adres gerekirse ayrıca kurulmalı.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BYTES = 4 * 1024 * 1024;   // Vercel gövde sınırının (4,5 MB) altında
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime',
]);

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov',
};

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Moderasyon bağlı değilse yükleme YOK. Sebebi media-moderation.js başında.
  if (!isModerationConfigured()) {
    return NextResponse.json({ error: 'MEDIA_DISABLED' }, { status: 503 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'STORAGE_DISABLED' }, { status: 503 });
  }

  // Yükleme pahalı: hem bant genişliği hem moderasyon çağrısı maliyetli.
  const rl = await rateLimit(`rl:dmmedia:${user.uid}`, 20, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  // GÜNLÜK TAVAN — Google Vision görüntü başına ücretli.
  // Saatlik sınır anlık patlamayı keser ama gün boyu sürdürülen bir akışı
  // bağlamaz; günlük sayaç ayrı anahtarda tutuluyor (rate-limit-config.js).
  const gunluk = await guard(request, 'visionModeration', { account: user.uid });
  if (gunluk) return gunluk;

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 }); }

  const other = String(form.get('to') || '');
  const file = form.get('file');

  if (!other || other === user.uid) {
    return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
  }
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
  }

  // Mesaj gönderimiyle AYNI kurallar: engel her durumda kazanır, arkadaş
  // olmayan yükleyemez.
  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other)) return NextResponse.json({ error: 'BLOCKED' }, { status: 403 });
  if (!(await areFriends(user.uid, other))) {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 403 });
  }

  const type = String(file.type || '');
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'UNSUPPORTED_TYPE' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();

  // Beyan edilen tür yeterli DEĞİL: istemci `type` alanını serbestçe yazabilir.
  // Sihirli baytlar dosyanın gerçekte ne olduğunu söylüyor.
  if (!magicMatches(bytes, type)) {
    return NextResponse.json({ error: 'TYPE_MISMATCH' }, { status: 415 });
  }

  const verdict = await moderateMedia(bytes, type);
  if (!verdict.ok) {
    // Video AYRI KOD: kullanıcıya "bu görsel gönderilemez" demek yanıltıcı
    // olurdu — video reddedilmiyor, henüz denetlenemediği için kapalı.
    if (verdict.reason === 'VIDEO_NOT_SUPPORTED') {
      return NextResponse.json({ error: 'VIDEO_DISABLED' }, { status: 422 });
    }
    return NextResponse.json(
      { error: 'MEDIA_REJECTED', reason: verdict.reason || null },
      { status: 422 },
    );
  }

  try {
    const blob = await put(`dm/${user.uid}/${Date.now()}.${EXT[type]}`, bytes, {
      access: 'public',
      contentType: type,
      addRandomSuffix: true,     // adresi tahmin edilemez kılar
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ ok: true, url: blob.url, contentType: type });
  } catch {
    return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 503 });
  }
}

/** Dosyanın ilk baytları beyan edilen türle uyuşuyor mu? */
function magicMatches(buf, type) {
  const b = new Uint8Array(buf);
  if (b.length < 12) return false;
  switch (type) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case 'image/webp':
      // "RIFF" .... "WEBP"
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
          && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case 'video/mp4':
    case 'video/quicktime':
      // ISO temel medya biçimi: 4..7 baytında "ftyp" kutusu.
      // MP4 ve MOV AYNI kapsayıcı ailesinden; ayrımı marka (brand) yapıyor ve
      // burada gerekmiyor — ikisi de bizim için geçerli video.
      return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
    default:
      return false;
  }
}
