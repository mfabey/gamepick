import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisCmd, redisSetJSONStrict } from '../../../lib/redis';
import { parseBody, reportBody } from '../../../lib/schemas';

// ─────────────────────────────────────────────────────────────────────────────
// İçerik/kullanıcı raporlama — App Store Guideline 1.2'nin ikinci şartı
// ("uygunsuz içeriği raporlama mekanizması ve zamanında yanıt").
//
// Raporlar bir moderasyon kuyruğuna yazılır. Kuyruk şu an manuel işleniyor;
// destek adresi (support@gamerisen.com) zaten yayınlanmış durumda ve
// destek sayfasında "~24 saat içinde yanıt" taahhüdü var.
//
// Redis:
//   report:{id}     → JSON rapor kaydı
//   report_queue    → LIST (en yeni başta) — moderasyon için
//   report_dupe:{uid}:{targetType}:{targetId} → aynı şeyi tekrar raporlamayı engeller
// ─────────────────────────────────────────────────────────────────────────────

// Apple Guideline 1.2 kullanıcı üretimi içeriğin RAPORLANABİLİR olmasını
// istiyor. Her yeni içerik türü buraya da eklenmek zorunda; eklenmezse o tür
// moderasyonda görünmez bir boşluk olarak kalıyor.
//   `message` — birebir sohbet mesajı (özel yazışma da UGC sayılıyor)
//   `review`  — doğrulanmış oyun incelemesi
const VALID_TARGETS = ['user', 'collection', 'list', 'comment', 'message', 'review', 'post'];
const VALID_REASONS = [
  'spam', 'harassment', 'hate', 'sexual', 'violence',
  'impersonation', 'illegal', 'other',
];
const QUEUE_MAX = 5000;
const DUPE_TTL_SEC = 30 * 86400;

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // Raporlama taciz aracına dönüşmesin
  const rl = await rateLimit(`rl:report:${user.uid}`, 20, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  // `targetId` REDIS ANAHTARINA GİRİYOR (`report_dupe:{uid}:{tip}:{id}`,
  // SET NX ile YAZILIYOR) ve daha önce uzunluk sınırı yoktu — megabaytlık
  // anahtar adları yaratılabiliyordu. Şema hem uzunluğu hem karakter
  // kümesini bağlıyor; bkz. app/lib/schemas.js `kaynakKimligi`.
  const ayrist = await parseBody(request, reportBody);
  if (!ayrist.ok) return ayrist.response;
  const { targetType, targetId, reason, note } = ayrist.data;

  // İzin listeleri şemanın ÜSTÜNDE duruyor: şema biçimi, bunlar anlamı
  // doğruluyor. İkisi ayrı sorular.
  if (!VALID_TARGETS.includes(targetType)) {
    return NextResponse.json({ error: 'INVALID_TARGET_TYPE' }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'INVALID_REASON' }, { status: 400 });
  }
  if (targetType === 'user' && targetId === user.uid) {
    return NextResponse.json({ error: 'CANNOT_REPORT_SELF' }, { status: 400 });
  }

  // Aynı kullanıcının aynı hedefi tekrar tekrar raporlaması kuyruğu şişirmesin.
  // SET NX ile: ilk rapor yazılır, tekrarları sessizce başarılı sayılır
  // (kullanıcıya "zaten raporladın" demek gereksiz sürtünme).
  const dupeKey = `report_dupe:${user.uid}:${targetType}:${targetId}`;
  const first = await redisCmd(['SET', dupeKey, '1', 'NX', 'EX', String(DUPE_TTL_SEC)]);
  if (first !== 'OK') {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const report = {
    id,
    reporterUid: user.uid,
    targetType,
    targetId,
    reason,
    note,
    status: 'open',
    createdAt: Date.now(),
  };

  try {
    await redisSetJSONStrict(`report:${id}`, report);
  } catch {
    // Rapor yazılamadıysa tekrar denenebilsin diye kilidi kaldır
    await redisCmd(['DEL', dupeKey]).catch(() => {});
    return NextResponse.json({ error: 'WRITE_FAILED' }, { status: 500 });
  }

  // Kuyruğa ekle ve sınırla (en yeni başta)
  await redisCmd(['LPUSH', 'report_queue', id]).catch(() => {});
  await redisCmd(['LTRIM', 'report_queue', '0', String(QUEUE_MAX - 1)]).catch(() => {});

  // Topluluk listesi şikayet edildiyse eşiğe ulaşınca OTOMATİK GİZLE.
  // Apple Guideline 1.2 "zamanında yanıt" istiyor; yalnızca manuel incelemeye
  // bel bağlamak, inceleme yapılana kadar içeriğin görünür kalması demekti.
  let autoHidden = false;
  if (targetType === 'list') {
    try {
      const { recordListReport } = await import('../../../lib/lists-store');
      const r = await recordListReport(targetId, user.uid);
      autoHidden = r.hidden;
    } catch { /* moderasyon sayacı yazılamadıysa rapor yine de kaydedildi */ }
  }

  return NextResponse.json({ ok: true, reportId: id, autoHidden });
}
