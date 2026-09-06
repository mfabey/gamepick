import { NextResponse } from 'next/server';
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

const MAX_BYTES = 3 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  const b = new Uint8Array(buf);
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  // WebP: RIFF ... WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
      && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  // GIF: GIF87a / GIF89a
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  return null;
}

function extractImageFromMultipart(rawBytes) {
  if (!rawBytes || rawBytes.length < 12) return null;
  const b = Buffer.from(rawBytes);

  // Search for JPEG (FF D8 FF)
  const jpegIdx = b.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  if (jpegIdx !== -1) {
    const endIdx = b.lastIndexOf(Buffer.from([0xff, 0xd9]));
    if (endIdx !== -1 && endIdx > jpegIdx) {
      return b.subarray(jpegIdx, endIdx + 2);
    }
    return b.subarray(jpegIdx);
  }

  // Search for PNG (89 50 4E 47)
  const pngIdx = b.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (pngIdx !== -1) {
    const endIdx = b.lastIndexOf(Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]));
    if (endIdx !== -1 && endIdx > pngIdx) {
      return b.subarray(pngIdx, endIdx + 8);
    }
    return b.subarray(pngIdx);
  }

  // Search for WebP (RIFF .... WEBP)
  const riffIdx = b.indexOf(Buffer.from('RIFF'));
  if (riffIdx !== -1 && b.indexOf(Buffer.from('WEBP'), riffIdx) === riffIdx + 8) {
    return b.subarray(riffIdx);
  }

  return null;
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Avatar sınırı geniş tutuldu
  const rl = await rateLimit(`rl:avatarup:${user.uid}`, 200, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const existing = (await getProfile(user.uid)) || {};
  const fallbackUsername = existing.username || (user.email ? user.email.split('@')[0] : `user_${user.uid.slice(0, 6)}`);

  let bytes = null;
  let type = 'image/jpeg';

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      if (body?.base64) {
        bytes = Buffer.from(body.base64, 'base64');
      }
    } catch {
      return NextResponse.json({ error: 'BAD_BODY' }, { status: 400 });
    }
  } else {
    // 1. Try formData
    try {
      const form = await request.clone().formData();
      let file = form.get('file') || form.get('avatar') || form.get('image') || form.get('photo');
      if (!file) {
        for (const [, val] of form.entries()) {
          if (val && typeof val === 'object' && typeof val.arrayBuffer === 'function') {
            file = val;
            break;
          }
        }
      }
      if (file && typeof file.arrayBuffer === 'function') {
        const ab = await file.arrayBuffer();
        bytes = Buffer.from(ab);
      } else if (typeof file === 'string') {
        if (file.startsWith('data:image/')) {
          bytes = Buffer.from(file.split(',')[1], 'base64');
        } else {
          bytes = Buffer.from(file, 'base64');
        }
      }
    } catch (formErr) {
      console.warn('formData parse error, falling back to raw stream:', formErr.message);
    }

    // 2. Fallback to raw binary buffer if formData failed to extract bytes
    if (!bytes || bytes.length === 0) {
      try {
        const rawBuf = Buffer.from(await request.arrayBuffer());
        const extracted = extractImageFromMultipart(rawBuf);
        if (extracted) {
          bytes = extracted;
        }
      } catch (rawErr) {
        console.warn('raw buffer parse error:', rawErr.message);
      }
    }
  }

  if (!bytes || bytes.length === 0) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }

  if (bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: 'TOO_LARGE' }, { status: 400 });
  }

  // Gerçek görsel tipini dosya başlığından (magic bytes) tespit et
  const detected = detectImageType(bytes);
  if (!detected) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }
  type = detected;

  if (isModerationConfigured()) {
    const verdict = await moderateMedia(bytes, type);
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.reason || 'REJECTED' }, { status: 422 });
    }
  }

  try {
    let avatarUrl = null;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`avatars/${user.uid}/${Date.now()}.${EXT[type]}`, bytes, {
          access: 'public',
          contentType: type,
          addRandomSuffix: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        avatarUrl = blob.url;
      } catch (blobErr) {
        console.warn('Vercel blob put failed, falling back to data URI:', blobErr.message);
      }
    }

    if (!avatarUrl) {
      // Data URI fallback (256x256 compressed JPEG ~15-25 KB)
      avatarUrl = `data:${type};base64,${bytes.toString('base64')}`;
    }

    await mergeProfile(user.uid, {
      avatar: avatarUrl,
      username: existing.username || fallbackUsername,
      displayName: existing.displayName || user.name || fallbackUsername,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, avatar: avatarUrl });
  } catch (err) {
    console.error('Avatar upload failed:', err.message);
    return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 });
  }
}
