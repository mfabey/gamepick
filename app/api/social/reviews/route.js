import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { validateFreeText } from '../../../lib/content-filter';
import { redisGetJSON } from '../../../lib/redis';
import { getProfiles, getHiddenUids } from '../../../lib/social-store';
import { countReplies, reviewRef } from '../../../lib/post-store';
import { libraries } from '../../../lib/steam-graph';
import { clientIp } from '../../../lib/client-ip';
import {
  saveReview, getReview, listReviews, deleteReview, reviewSummary,
  MAX_REVIEW_TEXT, MIN_HOURS,
} from '../../../lib/review-store';

// ─────────────────────────────────────────────────────────────────────────────
// Doğrulanmış incelemeler.
//
// UYGULAMADAKİ İLK KULLANICI ÜRETİMİ İÇERİK. Şimdiye kadar kullanıcı yalnızca
// seçiyordu (koleksiyon, liste) veya özel yazışıyordu (sohbet); bir oyun
// hakkında herkese açık bir şey yazamıyordu.
//
// SAAT İSTEMCİDEN ALINMIYOR. Sunucu, kullanıcının Steam kütüphanesini okuyup
// o oyundaki saatini kendisi buluyor. Bu özelliğin tamamı bu satıra dayanıyor:
// istemci saat gönderebilseydi "doğrulanmış" kelimesinin anlamı kalmazdı.
//
// GET herkese açık DEĞİL — oturum istiyor. Sebebi engellenen kullanıcıların
// incelemelerini elemek; oturumsuz istekte kimin kimi engellediği bilinemez.
// ─────────────────────────────────────────────────────────────────────────────

const connKey = (uid) => `user_connections:${uid}`;

function steamListOf(conn) {
  if (Array.isArray(conn?.steamAccounts) && conn.steamAccounts.length) return conn.steamAccounts;
  if (conn?.steam?.steamId) return [conn.steam];
  return [];
}

/**
 * Kullanıcının bu oyundaki DOĞRULANMIŞ saatini ve oyunun adını bulur.
 *
 * AD DA BURADAN geliyor, istemciden değil: kütüphane kaydında zaten var,
 * ayrıca istemcinin gönderdiği adı saklamak "X oyunu" görüntüsü altında
 * başka bir metin yazdırmaya kapı açardı.
 *
 * @returns {Promise<{hours:number,name:string}|null>} null = kütüphanede yok
 */
async function verifiedGame(uid, appid) {
  const conn = await redisGetJSON(connKey(uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) return null;

  const libs = await libraries([accounts[0].steamId]);
  const games = libs.get(accounts[0].steamId)?.games;
  if (!Array.isArray(games)) return null;

  const g = games.find((x) => String(x.appid) === String(appid));
  return g ? { hours: g.hours, name: g.name || null } : null;
}

export async function GET(request) {
  // ── OTURUM ARTIK ŞART DEĞİL ──
  // Bu uç 401 dönüyordu ve gerekçesi "oturumsuz istekte kimin kimi
  // engellediği bilinemez"di. Ölçüldü: `getHiddenUids(null)` zaten boş küme
  // döndürüyor (social-store), yani anonim okuyucuda süzgeç kendiliğinden
  // devre dışı — akış ve gönderi uçları tam olarak böyle çalışıyor.
  //
  // Kapıyı kapalı tutmanın bedeli ise büyüdü: incelemeler artık OYUN
  // SAYFASINDA gösteriliyor ve hesapsız bir ziyaretçi oyun sayfasını
  // açabiliyor. Okumayı kayıt arkasına almak Guideline 5.1.1(v) itirazına
  // açık kapı (bkz. reviews/feed'in aynı kararı).
  const user = await verifyMobileToken(request);
  const viewerUid = user?.uid || null;

  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  if (!appid) return NextResponse.json({ error: 'APPID_REQUIRED' }, { status: 400 });

  const rlKey = viewerUid
    ? `rl:gamerev:${viewerUid}`
    : `rl:gamerev:ip:${clientIp(request)}`;
  const rl = await rateLimit(rlKey, 240, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const [rows, summary, mine, eligible] = await Promise.all([
    listReviews(appid, { limit: 20 }),
    reviewSummary(appid),
    viewerUid ? getReview(appid, viewerUid) : Promise.resolve(null),
    // DAVET BLOĞUNUN KOŞULU. Oyun sayfasında hiç inceleme yoksa bölüm ya bir
    // davete dönüşüyor ya da HİÇ ÇİZİLMİYOR; kararı veren şey kullanıcının o
    // oyunda doğrulanmış saati olup olmadığı. İstemci bunu kendisi
    // hesaplayamıyor (saat sunucunun Steam okumasından geliyor).
    viewerUid ? verifiedGame(viewerUid, appid).catch(() => null) : Promise.resolve(null),
  ]);

  // Engellenenlerin incelemeleri elenir — sohbet ve listelerdeki kuralla aynı.
  const hidden = await getHiddenUids(viewerUid);
  const visible = rows.filter((r) => !hidden.has(r.uid));

  // Yanıt sayıları TEK TURDA. Her incelemenin altında "n yanıt" duruyor ve
  // dokunulunca topluluk konusu açılıyor; sayı sıfırsa satır hiç çizilmiyor.
  const [profiles, yanit] = await Promise.all([
    getProfiles(visible.map((r) => r.uid)),
    countReplies(visible.map((r) => reviewRef(r.appid, r.uid))),
  ]);

  return NextResponse.json({
    summary,
    mine,
    // İstemci yalnız SAATE bakıyor: "bu oyunu oynadın, ilk incelemeyi sen
    // yaz". Kütüphanenin geri kalanı dışarı verilmiyor.
    eligible: eligible ? { hours: eligible.hours, name: eligible.name } : null,
    reviews: visible.map((r) => {
      const p = profiles[r.uid];
      return {
        ...r,
        replyCount: yanit[reviewRef(r.appid, r.uid)] || 0,
        author: {
          uid: r.uid,
          username: p?.username || null,
          displayName: p?.displayName || p?.username || null,
          avatar: p?.avatar ?? null,
        },
      };
    }),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // İnceleme yazmak nadir bir eylem; sınır sıkı olabilir.
  const rl = await rateLimit(`rl:review:${user.uid}`, 20, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const appid = Number(body.appid);
  if (!Number.isInteger(appid) || appid <= 0) {
    return NextResponse.json({ error: 'APPID_REQUIRED' }, { status: 400 });
  }

  const text = String(body.text || '');
  const v = validateFreeText(text, { maxLength: MAX_REVIEW_TEXT });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  // ── Doğrulama ──
  const found = await verifiedGame(user.uid, appid);

  if (!found) {
    // Oyun kütüphanede yok VEYA Steam bağlı değil VEYA profil gizli.
    // Üçünü ayırmıyoruz: arayüz "bu oyunu kütüphanende bulamadık" diyor ve
    // Steam ayarlarına yönlendiriyor, hepsinin çözümü aynı yerde.
    return NextResponse.json({ error: 'NOT_IN_LIBRARY' }, { status: 403 });
  }
  if (found.hours < MIN_HOURS) {
    return NextResponse.json({ error: 'NOT_ENOUGH_HOURS', hours: found.hours }, { status: 403 });
  }

  const review = await saveReview({
    uid: user.uid,
    appid,
    text: text.trim(),
    recommended: !!body.recommended,
    hours: found.hours,
    gameName: found.name,
  });

  return NextResponse.json({ ok: true, review });
}

export async function DELETE(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const appid = Number(body.appid);
  if (!Number.isInteger(appid)) {
    return NextResponse.json({ error: 'APPID_REQUIRED' }, { status: 400 });
  }

  // Anahtar `review:{appid}:{uid}` — uid anahtarın parçası olduğu için
  // başkasının incelemesine erişmek yapısal olarak mümkün değil.
  await deleteReview(appid, user.uid);
  return NextResponse.json({ ok: true });
}
