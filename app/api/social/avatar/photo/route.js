import { NextResponse } from 'next/server';
import { guard } from '../../../../lib/rate-guard';
import { put } from '@vercel/blob';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { isModerationConfigured, moderateMedia } from '../../../../lib/media-moderation';
import { getProfile, mergeProfile } from '../../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar fotoğrafı yükleme.
//
// SOHBET MEDYASININ AYNI KURALLARI (bkz. chat/media/route.js), çünkü avatar
// DAHA açık bir içerik: özel bir mesajda değil, kullanıcının her gönderisinin,
// her incelemesinin ve arkadaş listelerinin yanında görünüyor.
//
//  • Moderasyon bağlı değilse yükleme YOK. Gerekçe media-moderation.js
//    başında: denetimsiz görsel yüklemeye izin vermek, yasal yükümlülüğü
//    hiçbir denetim olmadan üstlenmek demek.
//  • Beyan edilen içerik türüne GÜVENİLMİYOR; sihirli bayt kontrolü yapılıyor.
//  • Video yok. Avatar zaten durağan; ayrıca video denetlenemiyor.
//
// BOYUT SINIRI DAR TUTULDU (1,5 MB): istemci yüklemeden önce 256px'e
// indiriyor, yani normal bir avatar ~30–60 KB. Sınır kötüye kullanımı
// engellemek için var, normal akışı değil.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BYTES = 1.5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function magicMatches(buf, type) {
  const b = new Uint8Array(buf);
  if (b.length < 12) return false;
  switch (type) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case 'image/webp':
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
          && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    default:
      return false;
  }
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!isModerationConfigured()) {
    return NextResponse.json({ error: 'MEDIA_DISABLED' }, { status: 503 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'STORAGE_DISABLED' }, { status: 503 });
  }

  // Avatar değiştirmek nadir bir iş; sınır dar.
  const rl = await rateLimit(`rl:avatarup:${user.uid}`, 10, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  // GÜNLÜK TAVAN — Google Vision görüntü başına ücretli.
  // Saatlik sınır anlık patlamayı keser ama gün boyu sürdürülen bir akışı
  // bağlamaz; günlük sayaç ayrı anahtarda tutuluyor (rate-limit-config.js).
  const gunluk = await guard(request, 'visionModeration', { account: user.uid });
  if (gunluk) return gunluk;

  // Ön ayar ucundaki KURALIN AYNISI: kullanıcı adı yoksa profil kaydı da yok,
  // avatar yazmanın anlamı kalmıyor. Fotoğraf yolu bu kuralı atlamamalı —
  // yoksa yükleme yapılır, sonra hiçbir yerde görünmez.
  const existing = await getProfile(user.uid);
  if (!existing?.username) {
    return NextResponse.json({ error: 'NO_USERNAME' }, { status: 409 });
  }

  let form;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 }); }

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }

  const type = String(file.type || '');
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'TOO_LARGE' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  // Beyan edilen tür yeterli DEĞİL: istemci `type` alanını serbestçe yazabilir.
  if (!magicMatches(bytes, type)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }

  const verdict = await moderateMedia(bytes, type);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.reason || 'REJECTED' }, { status: 422 });
  }

  try {
    // Yol `avatars/` ile başlıyor — isValidAvatar tam bu öneki arıyor.
    // Rastgele son ek Blob tarafından ekleniyor, adres tahmin edilemez.
    const blob = await put(`avatars/${user.uid}/${Date.now()}.${EXT[type]}`, bytes, {
      access: 'public',
      contentType: type,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Yükleme başarılıysa profili DE güncelliyoruz: istemcinin ikinci bir
    // çağrı yapması gerekseydi, arada düşen bir istekte kullanıcı yüklediği
    // ama profiline geçmeyen bir fotoğrafla kalırdı.
    await mergeProfile(user.uid, { avatar: blob.url, updatedAt: Date.now() });

    return NextResponse.json({ ok: true, avatar: blob.url });
  } catch {
    return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 });
  }
}
