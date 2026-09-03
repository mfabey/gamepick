import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import {
  getProfile, uidForUsername, getPrivacy, getFriendState,
  isBlockedBetween, mutualFriendCount,
} from '../../../lib/social-store';
import { listUserReviews, countUserReviews } from '../../../lib/review-store';
import { listUserPosts, countUserPosts, countReplies, reviewRef } from '../../../lib/post-store';
import { redisCmd, redisGetJSON } from '../../../lib/redis';
import { getSteamDetailsCached } from '../../../lib/steam-cache.js';
import { clientIp } from '../../../lib/client-ip';

// ─────────────────────────────────────────────────────────────────────────────
// Herkese açık profil — kimlik + kullanıcının ürettiği içerik.
//
// NEDEN YENİ BİR UÇ. Bu ekran bugüne kadar YOKTU: `PersonMenu` içindeki
// "profiline git" satırı bilerek boş bırakılmıştı, çünkü gidecek yer yoktu.
// Parçaların hepsi ayrı ayrı duruyordu (profil kaydı, arkadaşlık kümeleri,
// gizlilik, incelemeler, gönderiler, koleksiyon/istek listesi anahtarları);
// eksik olan tek şey bunları TEK KAPIDAN, gizlilik kapısıyla birlikte veren
// bir uçtu.
//
// TEK İSTEK, DÖRT SEKME DEĞİL: profil açılışı başlık + sayaçlar + ilk
// sekmeyi birlikte istiyor. Ayrı uçlar olsaydı ilk çizim için iki tur
// gerekirdi ve sayaçlar içerikten sonra gelirdi.
//
//   GET ?username=nil                    → başlık + sayaçlar + arkadaşlık
//   GET ?username=nil&tab=reviews&offset=20 → sekme sayfası (+ aynı başlık)
//   GET ?uid=...                         → aynısı (arkadaş listesi uid taşıyor)
//
// HESAPSIZ OKUNABİLİR. İnceleme akışının gerekçesiyle aynı (Guideline
// 5.1.1(v)): okumak kayıt istemez. Jeton gönderilirse arkadaşlık durumu ve
// engel süzgeci ancak o zaman hesaplanabiliyor.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE = 20;
const TABS = new Set(['collection', 'wishlist', 'reviews', 'posts']);

// ── KAPAK ADRESİ ──
// Steam varlık yolları HASH'Lİ: elle kurulan `/apps/<id>/header.jpg` yeni
// oyunlarda 404 veriyor (bkz. scripts/check-image-urls.mjs — bu depoda 12
// dosyalık bir borç olarak duruyor ve büyümesi yasak).
//
// Bu yüzden gerçek adres önbellekten okunuyor; elle kurulan yol yalnızca
// YEDEK. Sayfa başına en çok 20 inceleme var ve `getSteamDetailsCached`
// bellek içi önbellek + istek birleştirme yapıyor, yani ikinci açılışta
// ağ turu yok.
async function coverFor(appid) {
  const d = await getSteamDetailsCached(appid).catch(() => null);
  return d?.header_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
}

function notFound() {
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}

/** Kapak ızgarasının tek öğesi — koleksiyon ve istek listesi aynı biçimi kullanıyor. */
function gridItem(g) {
  const appid = g?.appid ? String(g.appid) : null;
  return {
    id: String(g?.id ?? appid ?? ''),
    appid,
    name: String(g?.name || ''),
    // Kapak KAYITTAN geliyor (koleksiyon ve istek listesi kaydı görseli
    // birlikte saklıyor — bkz. collectionsStore.slimGame). Yoksa boş
    // bırakılıyor ve istemci baş harfe düşüyor; burada appid'den adres
    // TÜRETİLMİYOR, çünkü ızgarada 60 oyun olabiliyor ve her biri için
    // Steam detayı çekmek makul değil (bkz. coverFor'un gerekçesi).
    image: g?.image || '',
  };
}

/**
 * Koleksiyonları TEK KAPAK IZGARASINA düzleştirir.
 *
 * Maket koleksiyon sekmesinde koleksiyon adları değil OYUN KAPAKLARI
 * gösteriyor ("Koleksiyon · 214" sayacı da oyun sayıyor). Kullanıcı 6
 * koleksiyona dağılmış 214 oyununu tek ızgarada görüyor; koleksiyon adı
 * kırılımı ayrı ekranda (`/collections`) duruyor.
 *
 * TEKİLLEŞTİRME ŞART: aynı oyun birden çok koleksiyonda olabiliyor ve ızgarada
 * iki kez çıkarsa sayaç da yalan söylerdi.
 */
function flattenCollections(collections) {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(collections) ? collections : []) {
    for (const g of Array.isArray(c?.games) ? c.games : []) {
      const key = String(g?.id ?? g?.appid ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(gridItem(g));
    }
  }
  return out;
}

export async function GET(request) {
  const viewer = await verifyMobileToken(request);
  const viewerUid = viewer?.uid || null;

  const { searchParams } = new URL(request.url);
  const username = (searchParams.get('username') || '').trim();
  const uidParam = (searchParams.get('uid') || '').trim();
  const tab = searchParams.get('tab');
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  // Parametresiz çağrı = KENDİ PROFİLİM. Kendi profil sekmesi kullanıcı adını
  // bilmeden açılıyor (oturumda yalnız jeton var); ad için önce
  // `/api/social/username` çağrılsaydı ilk çizim iki tura çıkardı.
  if (!username && !uidParam && !viewerUid) return notFound();
  if (tab && !TABS.has(tab)) {
    return NextResponse.json({ error: 'INVALID_TAB' }, { status: 400 });
  }

  // Anonimde uid yok; sayaç IP'ye bağlanıyor (reviews/feed ile aynı kalıp).
  // Sınır BOL: profil açılışı + sekme değişimleri aynı kovadan geçiyor ve
  // dört sekmeyi gezen bir kullanıcı tek profilde 5 istek yapabiliyor.
  const rlKey = viewerUid
    ? `rl:profile:${viewerUid}`
    : `rl:profile:ip:${clientIp(request)}`;
  const rl = await rateLimit(rlKey, 300, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const targetUid = username ? await uidForUsername(username) : (uidParam || viewerUid);
  if (!targetUid) return notFound();

  const profile = await getProfile(targetUid);
  // `username` yoksa sosyal kimlik hiç kurulmamış demektir (kimlik uçları
  // aynı anahtara ad/e-posta yazıyor — bkz. mergeProfile). Böyle bir kaydı
  // profil saymak, adı olmayan bir sayfaya kapı açardı.
  if (!profile?.username) return notFound();

  const isSelf = !!viewerUid && viewerUid === targetUid;

  // ── Kapı 1: engel ──
  // 403 DEĞİL 404: "engellendin" demek, engelleyenin kimliğini ve kararını
  // ifşa eder. Var olmayan sayfa gibi davranmak tek doğru cevap.
  if (!isSelf && viewerUid && await isBlockedBetween(viewerUid, targetUid)) return notFound();

  const [privacy, friendState] = await Promise.all([
    getPrivacy(targetUid),
    viewerUid && !isSelf ? getFriendState(viewerUid) : Promise.resolve(null),
  ]);

  let friendship = 'none';
  if (isSelf) friendship = 'self';
  else if (friendState) {
    if (friendState.friends.includes(targetUid)) friendship = 'friends';
    else if (friendState.outgoing.includes(targetUid)) friendship = 'requested';
    else if (friendState.incoming.includes(targetUid)) friendship = 'incoming';
  }
  const isFriend = friendship === 'friends';

  // ── Kapı 2: bulunabilirlik ──
  // `discoverable` bugüne kadar HİÇBİR YERDE uygulanmıyordu (searchUsers
  // yalnız engel süzüyor). Anahtarın sözü "kullanıcı adımla bulunabileyim
  // mi"; profil sayfası tam olarak kullanıcı adıyla açılan yer, yani sözün
  // tutulacağı yer burası. Arkadaşlar muaf: zaten birbirlerini bulmuşlar.
  if (!isSelf && !isFriend && privacy.discoverable === false) return notFound();

  // ── Kapı 3: gizli profil ──
  // İçerik kapanıyor, KİMLİK KAPANMIYOR: maket gizli profilde kimlik bloğunu,
  // üç sayacı ve eylem satırını gösteriyor — arkadaşlık isteği gönderebilmek
  // için kullanıcının kime baktığını görmesi gerekiyor.
  const canView = isSelf || isFriend || !privacy.privateProfile;

  const [collections, wishlist, friendCount, postCount, reviewCount, conn, mutual] =
    await Promise.all([
      redisGetJSON(`user_collections:${targetUid}`).catch(() => null),
      redisGetJSON(`user_wishlist:${targetUid}`).catch(() => null),
      redisCmd(['SCARD', `friends:${targetUid}`]).then((n) => Number(n) || 0).catch(() => 0),
      countUserPosts(targetUid),
      countUserReviews(targetUid),
      redisGetJSON(`user_connections:${targetUid}`).catch(() => null),
      viewerUid && !isSelf ? mutualFriendCount(viewerUid, targetUid) : Promise.resolve(0),
    ]);

  const collectionGames = flattenCollections(collections);
  const wishItems = (Array.isArray(wishlist) ? wishlist : []).map(gridItem);

  const body = {
    profile: {
      uid: targetUid,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      bio: profile.bio || '',
      avatar: profile.avatar ?? null,
      counts: {
        // Sayaç üçlüsü (maket): gönderi · arkadaş · oyun.
        posts: postCount,
        friends: friendCount,
        games: Number(profile.gameCount) || 0,
        // Sekme bağlam satırı ("KOLEKSİYON · 214") bu üçünü okuyor.
        collection: collectionGames.length,
        wishlist: wishItems.length,
        reviews: reviewCount,
      },
      connections: {
        // Yalnız VARLIK bilgisi: hangi hesap, hangi ad, hangi steamId —
        // hiçbiri dışarı verilmiyor. Maketteki çip "bağlı" diyor, kim
        // olduğunu değil.
        steam: !!(conn?.steam?.steamId || conn?.steamAccounts?.length),
        xbox: !!conn?.xbox?.gamertag,
      },
      isSelf,
      privateProfile: !!privacy.privateProfile,
    },
    friendship,
    mutualFriends: mutual,
    canView,
  };

  if (!tab) return NextResponse.json(body);

  // Gizli profilde sekme İSTEĞİ HATA DEĞİL: istemci aynı çağrıyla kilitli
  // görünümü çiziyor. 403 dönseydi ekran "bir şeyler ters gitti" derdi;
  // oysa doğru mesaj "bu profil gizli".
  if (!canView) return NextResponse.json({ ...body, items: [], hasMore: false });

  let items = [];
  if (tab === 'collection') {
    items = collectionGames.slice(offset, offset + PAGE);
  } else if (tab === 'wishlist') {
    items = wishItems.slice(offset, offset + PAGE);
  } else if (tab === 'reviews') {
    const rows = await listUserReviews(targetUid, { limit: PAGE, offset });
    const [kapaklar, yanit] = await Promise.all([
      Promise.all(rows.map((r) => coverFor(r.appid))),
      countReplies(rows.map((r) => reviewRef(r.appid, r.uid))),
    ]);
    items = rows.map((r, i) => ({
      ...r,
      image: kapaklar[i],
      replyCount: yanit[reviewRef(r.appid, r.uid)] || 0,
      author: {
        uid: targetUid,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatar: profile.avatar ?? null,
      },
    }));
  } else {
    // Yanıtlar da geliyor (user_posts kümesi ikisini birden tutuyor) ve
    // BİLEREK süzülmüyor: X'in profil akışı da yanıtları gösteriyor, kart
    // `replyTo` alanını taşıdığı için istemci "yanıt" bağlam satırını
    // çizebiliyor. Süzmek, sayfalamayı da yalancı yapardı — 20 kayıt
    // çekilip 6'sı elenirse "devamı var mı" kararı bozulur.
    const rows = await listUserPosts(targetUid, { limit: PAGE, offset, viewerUid });
    items = rows.map((p) => ({
      ...p,
      author: {
        uid: targetUid,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatar: profile.avatar ?? null,
      },
    }));
  }

  return NextResponse.json({ ...body, items, hasMore: items.length === PAGE });
}
