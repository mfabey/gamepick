import { cookies } from 'next/headers';
import { readValue } from './session-cookie';
import { verifyMobileToken } from './mobile-auth';
import { redisGetJSON } from './redis.js';

// ─────────────────────────────────────────────────────────────────────────────
// STEAM HESABI SAHİPLİĞİ — tek kapı.
//
// NEDEN TEK YERDE: `/api/oyun` bir steamId'yi SORGU DİZESİNDEN alıp o hesabın
// kütüphanesini döndürüyordu ve çerez kontrolü yalnızca steamId
// VERİLMEDİĞİNDE çalışıyordu. Yani `?steamId=` eklemek kimlik kapısını tümden
// atlıyordu. Kısıt yalnızca istemcideydi: web ve mobil her zaman kendi
// kimliğini yolluyor, sunucu ise herkesinkini kabul ediyordu.
//
// Aynı çerez ayrıştırma mantığı `oyun`, `oyun-merged` ve `steam-library`
// içinde üç kez elle tekrarlanmıştı — hatanın yalnızca birinde oluşmasının
// sebebi de bu. Kontrol buraya alındı ki bir sonraki uç aynı hatayı
// tekrar edemesin.
//
// İKİ KİMLİK BİÇİMİ BİRDEN DESTEKLENİYOR, çünkü iki istemci farklı çalışıyor:
//   • WEB   → `gp_steam_accounts` / `gp_steam_session` çerezleri
//   • MOBİL → Firebase Bearer jetonu; bağlı hesaplar `user_connections:{uid}`
//
// MOBİLDE JETON ŞART KOŞMAK GÜVENLİ: Steam bağlama akışı
// (AuthContext.loginSteam) `putSteamConnection` → `authed()` üzerinden
// gidiyor ve sunucuya yazamazsa YERELE DE YAZMIYOR. Dolayısıyla mobildeki
// her bağlı hesap kimlikli bir çağrıdan geçmiş; jetonsuz bir kullanıcının
// elinde sorgulayacak steamId zaten olamaz.
// ─────────────────────────────────────────────────────────────────────────────

const connKey = (uid) => `user_connections:${uid}`;

function idsFromConnections(conn) {
  const out = [];
  if (Array.isArray(conn?.steamAccounts)) {
    for (const a of conn.steamAccounts) if (a?.steamId) out.push(String(a.steamId));
  }
  if (conn?.steam?.steamId) out.push(String(conn.steam.steamId));
  return out;
}

async function idsFromCookies() {
  const jar = await cookies();
  const out = [];

  const multi = jar.get('gp_steam_accounts');
  if (multi?.value) {
    try {
      const list = await readValue(multi.value);
      if (Array.isArray(list)) {
        for (const a of list) if (a?.steamId) out.push(String(a.steamId));
      }
    } catch { /* bozuk çerez = hesap yok */ }
  }

  // Geriye uyumluluk: eski tek hesap çerezi.
  const single = jar.get('gp_steam_session');
  if (single?.value) {
    try {
      const s = await readValue(single.value);
      if (s?.steamId) out.push(String(s.steamId));
    } catch { /* bozuk çerez = hesap yok */ }
  }

  return out;
}

/**
 * Bu isteği yapanın SAHİP OLDUĞU tüm Steam kimlikleri.
 * Sıra korunuyor: ilk eleman "birincil hesap" olarak kullanılabilir.
 * Kimlik yoksa boş dizi döner — çağıran 401 vermeli.
 */
export async function sessionSteamIds(request) {
  const fromCookie = await idsFromCookies();
  if (fromCookie.length) return [...new Set(fromCookie)];

  // Çerez yoksa mobil olabilir: Bearer jetonu → bağlı hesaplar.
  const user = await verifyMobileToken(request);
  if (!user) return [];

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  return [...new Set(idsFromConnections(conn))];
}

/**
 * İstenen steamId gerçekten bu kullanıcının mı?
 *
 * @param request        gelen istek (çerez ve Bearer jetonu buradan okunuyor)
 * @param requestedId    sorgu dizesinden gelen steamId; boşsa kullanıcının
 *                       birincil hesabı seçilir (eski davranış korunuyor)
 * @returns {{ok:true, steamId:string} | {ok:false, error:string, status:number}}
 */
export async function resolveOwnedSteamId(request, requestedId) {
  const owned = await sessionSteamIds(request);
  if (!owned.length) {
    return { ok: false, error: 'Giriş yapılmamış', status: 401 };
  }

  const wanted = requestedId ? String(requestedId).trim() : '';
  if (!wanted) return { ok: true, steamId: owned[0] };

  if (!owned.includes(wanted)) {
    // 404 DEĞİL 403: burada gizlenecek bir varlık bilgisi yok — istenen
    // steamId zaten isteyenin elinde. Doğru mesaj "bu hesap senin değil".
    return { ok: false, error: 'Bu Steam hesabı bu oturuma bağlı değil', status: 403 };
  }
  return { ok: true, steamId: wanted };
}
