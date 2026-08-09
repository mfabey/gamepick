import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { validateFreeText } from '../../../lib/content-filter';
import { areFriends, getHiddenUids, getProfile } from '../../../lib/social-store';
import {
  convId, appendMessage, getMessages, markRead, deleteMessage, getReadAt, MAX_TEXT,
} from '../../../lib/chat-store';
import { triggerMessage, triggerDelete, triggerRead } from '../../../lib/pusher-server';
import { touchPresence, getPresence } from '../../../lib/presence';
import { resolveShare } from '../../../lib/chat-share';
import { sendPush } from '../../../lib/push';

// ─────────────────────────────────────────────────────────────────────────────
// Birebir mesajlaşma — geçmiş (GET) ve gönderim (POST).
//
// YALNIZCA ARKADAŞLAR. Bu, yabancıdan gelen mesaj spam'ini kökten kapatan en
// basit kural: rastgele kullanıcıya yazmanın yolu yok, önce arkadaşlık isteği
// kabul edilmeli. Apple Guideline 1.2'nin istediği önlemlerden biri de bu.
//
// ENGELLEME arkadaşlıktan BAĞIMSIZ kontrol ediliyor: iki kullanıcı arkadaş
// kalıp birbirini engellemiş olabilir; engel her durumda kazanır.
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

/**
 * Adres BİZİM blob depomuzda ve GÖNDERENİN klasöründe mi?
 * Yükleme ucu `dm/{uid}/...` yoluna yazıyor; bu kontrol hem yabancı adresleri
 * hem de başkasının medyasını iliştirmeyi kapatıyor.
 */
function isOwnBlob(url, uid) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (!u.hostname.endsWith('.public.blob.vercel-storage.com')) return false;
  return u.pathname.startsWith(`/dm/${uid}/`);
}

/** İki taraf da yazışabiliyor mu? Tek yerde, GET ve POST aynı kuralı kullansın. */
async function canTalk(me, other) {
  if (!other || other === me) return 'INVALID_TARGET';
  const hidden = await getHiddenUids(me);
  if (hidden.has(other)) return 'BLOCKED';
  if (!(await areFriends(me, other))) return 'NOT_FRIENDS';
  return null;
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const other = searchParams.get('with');
  const before = Number(searchParams.get('before')) || undefined;
  // `after` = yedek yoklama modu: yalnızca yeni mesajlar isteniyor.
  const after = Number(searchParams.get('after')) || undefined;

  const deny = await canTalk(user.uid, other);
  if (deny) return NextResponse.json({ error: deny }, { status: 403 });

  const cid = convId(user.uid, other);
  const [messages, profile, otherReadAt, presence] = await Promise.all([
    getMessages(cid, { before, after }),
    getProfile(other).catch(() => null),
    // KARŞI TARAFIN okuma zamanı — kendi mesajlarıma "görüldü" koymak için.
    getReadAt(cid, other),
    getPresence(other),
  ]);

  // Geçmişi okumak = okundu. Sayfalama isteklerinde de zararsız: zaten
  // en yeni mesajı görmüş olan biri geriye kaydırıyor demektir.
  await markRead(cid, user.uid);

  // Sohbeti açmak etkinlik sayılıyor; nabız da bu ucu kullanıyor.
  await touchPresence(user.uid);

  // Karşı tarafın açık ekranı "görüldü" işaretini anında görsün.
  await triggerRead(cid, user.uid, Date.now());

  return NextResponse.json({
    cid,
    messages,
    otherReadAt,
    // `null` = kullanıcı durumunu paylaşmıyor (gizlilik ayarı kapalı)
    presence,
    other: profile ? {
      uid: other,
      username: profile.username || null,
      displayName: profile.displayName || profile.username || null,
      avatar: profile.avatar ?? null,
    } : { uid: other },
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // Sohbet hızlı yazılır ama sel de buradan gelir: dakikada 30 mesaj normal
  // kullanımın çok üstünde, otomasyonun ise altında kalır.
  const rl = await rateLimit(`rl:dm:${user.uid}`, 30, 60);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const other = String(body.to || '');
  const deny = await canTalk(user.uid, other);
  if (deny) return NextResponse.json({ error: deny }, { status: 403 });

  // Medya, /api/social/chat/media ucundan GEÇMİŞ olmalı. Serbest URL kabul
  // etseydik moderasyon atlanırdı: kullanıcı içeriği başka yere yükleyip
  // adresini iliştirir, denetimden hiç geçmezdi.
  //
  // İki koşul: adres bizim blob deposunda VE yol gönderenin kendi klasöründe.
  // İkincisi, başkasının yüklediği medyayı iliştirmeyi de engelliyor.
  let media = null;
  if (body.media?.url) {
    if (!isOwnBlob(String(body.media.url), user.uid)) {
      return NextResponse.json({ error: 'INVALID_MEDIA' }, { status: 400 });
    }
    media = { url: String(body.media.url), type: String(body.media.type || 'image/jpeg') };
  }

  // Reels paylaşımı. MODERASYONA GİRMİYOR ve girmemeli: içerik kullanıcı
  // yüklemesi değil, zaten akışımızda servis ettiğimiz Steam fragmanı.
  //
  // İstemciden YALNIZCA appid alınıyor; ad ve görsel sunucuda çözülüyor.
  // İstemcinin gönderdiği metni saklasaydık sohbet baloncuğu istenen her şeyin
  // yazdırılabildiği bir yüzeye dönüşürdü.
  let share = null;
  if (body.share?.appid != null) {
    share = await resolveShare(body.share.appid, body.lang === 'en' ? 'en' : 'tr');
    if (!share) return NextResponse.json({ error: 'INVALID_SHARE' }, { status: 400 });
  }

  const text = String(body.text || '');

  // Medya veya paylaşım varken metin ZORUNLU DEĞİL.
  if (text.trim() || (!media && !share)) {
    const v = validateFreeText(text, { maxLength: MAX_TEXT });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  try {
    const msg = await appendMessage({
      from: user.uid, to: other, text: text.trim(), media, share,
    });

    // Anlık teslim ve bildirim DENENIYOR ama ikisi de gönderimi bağlamıyor:
    // düşerlerse mesaj yine Redis'te ve karşı taraf uygulamayı açınca görecek.
    //
    // İkisi PARALEL: sunucusuz işlev yanıttan sonra sonlandığı için "ateşle ve
    // unut" güvenilir değil, beklemek zorundayız — o hâlde sırayla değil
    // aynı anda beklensinler.
    const me = await getProfile(user.uid).catch(() => null);
    const senderName = me?.displayName || me?.username || 'Gamerisen';

    const [delivered] = await Promise.all([
      triggerMessage(convId(user.uid, other), msg),
      sendPush(other, {
        title: senderName,
        // Metinsiz mesajlarda önizleme boş kalmasın. Paylaşımda oyun adı
        // yazılıyor — bildirimde "📷" görmek hiçbir şey anlatmazdı.
        body: msg.text || (share ? `🎬 ${share.name}` : '📷'),
        // İstemci bu veriyle doğrudan sohbete açılıyor.
        data: { type: 'dm', from: user.uid },
      }),
    ]);

    return NextResponse.json({ ok: true, message: msg, delivered });
  } catch {
    // Yazma başarısızlığı SESSİZCE yutulmuyor: kullanıcı mesajın gitmediğini
    // bilmeli, aksi hâlde gönderdiğini sanıp bekler.
    return NextResponse.json({ error: 'SEND_FAILED' }, { status: 503 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mesajı geri al.
//
// SAHİPLİK İKİ KEZ DOĞRULANIYOR: burada oturum sahibi belirleniyor,
// chat-store.deleteMessage ise mesajın `from` alanının o kişi olduğunu ayrıca
// kontrol ediyor. Yalnızca kendi mesajını geri alabilirsin.
//
// Mesaj listeden SİLİNMİYOR, içeriği boşaltılıyor — sıralama ve sayfalama
// bozulmasın diye (bkz. chat-store.js).
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const rl = await rateLimit(`rl:dmdel:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const other = String(body.with || '');
  const msgId = String(body.id || '');
  if (!msgId) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });

  // Engel/arkadaşlık kapısı gönderimle aynı — engellenen biriyle olan
  // konuşmaya dokunulamıyor.
  const deny = await canTalk(user.uid, other);
  if (deny) return NextResponse.json({ error: deny }, { status: 403 });

  const cid = convId(user.uid, other);
  const r = await deleteMessage(cid, msgId, user.uid);
  if (!r.ok) {
    return NextResponse.json(
      { error: r.error },
      { status: r.error === 'NOT_OWNER' ? 403 : 404 },
    );
  }

  await triggerDelete(cid, msgId);
  return NextResponse.json({ ok: true });
}
