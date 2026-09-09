import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisCmd, redisSetJSONStrict } from '../../../lib/redis';
import { blockUser, unblockUser, getBlocked, getProfiles } from '../../../lib/social-store';

// Şikâyet ucundaki sayılarla AYNI olmak zorunda: iki uç aynı listeye yazıyor
// ve farklı bir kırpma sınırı, hangisinin son yazdığına göre değişen bir
// kuyruk boyu demek olurdu.
const QUEUE_MAX = 5000;
const SIGNAL_TTL_SEC = 30 * 86400;

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı engelleme — App Store Guideline 1.2'nin üçüncü şartı
// ("kötüye kullanan kullanıcıları engelleme yeteneği").
//
// GET                        → engellediklerim (profilleriyle)
// POST { targetUid, action } → 'block' | 'unblock'
//
// Engelleme ÇİFT YÖNLÜ görünürlük kesintisi yaratır (social-store).
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const uids = await getBlocked(user.uid);
  const profiles = await getProfiles(uids);

  return NextResponse.json({
    blocked: uids.map((uid) => ({
      uid,
      username: profiles[uid]?.username || null,
      displayName: profiles[uid]?.displayName || null,
      avatar: profiles[uid]?.avatar || null,
    })),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const rl = await rateLimit(`rl:block:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const targetUid = String(body.targetUid || '').trim();
  const action = body.action === 'unblock' ? 'unblock' : 'block';

  if (!targetUid) return NextResponse.json({ error: 'TARGET_REQUIRED' }, { status: 400 });
  if (targetUid === user.uid) return NextResponse.json({ error: 'CANNOT_BLOCK_SELF' }, { status: 400 });

  const ok = action === 'block'
    ? await blockUser(user.uid, targetUid)
    : await unblockUser(user.uid, targetUid);

  if (!ok) return NextResponse.json({ error: 'FAILED' }, { status: 500 });

  // ── ENGELLEME GELİŞTİRİCİYE BİLDİRİLİYOR ──
  // App Store Guideline 1.2 bunu açıkça istiyor: "blocking should also notify
  // the developer of the inappropriate content". 2.6.1 (42) reddinde
  // maddelerden biri buydu — engelleme yalnızca Redis'e yazıyor, moderasyona
  // hiçbir iz düşmüyordu.
  //
  // ŞİKÂYETLERLE AYNI KUYRUK. Ayrı bir kuyruk açmak, moderasyonu iki liste
  // okumaya zorlardı ve ikincisi er geç okunmayan liste olurdu. Kayıt
  // `reason: 'block'` ile ayırt ediliyor.
  //
  // ENGEL BİR ŞİKÂYET DEĞİL. Kişi bir sebep yazmadı, yalnızca görmek
  // istemediğini söyledi; kayıt `status: 'signal'` ile açılıyor, `'open'`
  // ile değil. Aynı hedefe biriken sinyaller bakılacak yeri gösteriyor,
  // tek başına bir sinyal bir suçlama değil.
  //
  // TEKRAR YAZMIYOR. Engelle/kaldır/engelle döngüsü kuyruğu şişirmesin diye
  // aynı çiftten 30 günde bir kayıt düşüyor (şikâyet ucundaki kilidin aynısı).
  //
  // SESSİZ BAŞARISIZLIK BİLİNÇLİ: engelleme kullanıcının güvenlik eylemi,
  // moderasyon kaydı bizim iç işimiz. Redis yazamadı diye engelleme
  // başarısız sayılamaz.
  if (action === 'block') {
    try {
      const dupeKey = `block_signal:${user.uid}:${targetUid}`;
      const ilk = await redisCmd(['SET', dupeKey, '1', 'NX', 'EX', String(SIGNAL_TTL_SEC)]);
      if (ilk === 'OK') {
        const id = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        await redisSetJSONStrict(`report:${id}`, {
          id,
          reporterUid: user.uid,
          targetType: 'user',
          targetId: targetUid,
          reason: 'block',
          note: '',
          status: 'signal',
          createdAt: Date.now(),
        });
        await redisCmd(['LPUSH', 'report_queue', id]);
        await redisCmd(['LTRIM', 'report_queue', '0', String(QUEUE_MAX - 1)]);
      }
    } catch { /* engelleme yine de başarılı */ }
  }

  return NextResponse.json({ ok: true, action, targetUid });
}
