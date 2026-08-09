import { getSession, subscribeSession } from './session';
import { registerForPushToken } from '../notifications';
import { registerDmPush, unregisterDmPush } from '../api/social';

// ─────────────────────────────────────────────────────────────────────────────
// Mesaj bildirimleri için push token eşitlemesi.
//
// İSTEK LİSTESİ UYARILARINDAN AYRI. WishlistContext de token alıyor ama o
// sistem fiyat düşüşleri için ve kullanıcı onu kapalı tutabilir; mesaj
// bildirimi buna bağlanamaz.
//
// TOKEN ZAMANLA DEĞİŞİYOR (yeniden kurulum, bazı işletim sistemi
// güncellemeleri). Girişte bir kez yazıp bırakmak yetmiyor — her oturum
// değişiminde tazeleniyor.
//
// ÇIKIŞTA SİLİNİYOR: silinmezse cihazı devralan kişi önceki kullanıcının
// mesaj bildirimlerini almaya devam eder.
// ─────────────────────────────────────────────────────────────────────────────

let lastToken = null;
let lastUid = null;
let started = false;

async function sync() {
  // uid `session.user.uid` içinde — `session` nesnesi
  // { user, idToken, refreshToken, expiresAt } şeklinde. Önce `session.uid`
  // yazılmıştı ve daima undefined dönüyordu: token hiç kaydedilmiyor, dolayısıyla
  // hiç bildirim gitmiyordu. Sessiz bir hataydı, çünkü kod "oturum yok" sanıp
  // usulca çıkıyordu.
  const uid = getSession()?.user?.uid || null;

  // Çıkış yapıldı → önceki kaydı düşür.
  if (!uid) {
    if (lastToken && lastUid) {
      try { await unregisterDmPush(lastToken); } catch { /* çevrimdışı olabilir */ }
    }
    lastUid = null;
    return;
  }

  // Aynı kullanıcı, aynı token → tekrar yazmanın anlamı yok.
  if (uid === lastUid && lastToken) return;

  // DİKKAT: registerForPushToken() izin verilmemişse İZİN İSTER — yalnızca
  // okumaz. Yukarıdaki erken çıkışlar sayesinde bu ancak OTURUM AÇILDIKTAN
  // sonra oluyor, yani kullanıcı ilk açılışta bağlamsız bir pencereyle
  // karşılaşmıyor. Girişten hemen sonra sorulması kabul edilebilir bir an.
  const r = await registerForPushToken();
  if (r?.error || !r?.token) return;

  try {
    await registerDmPush(r.token);
    lastToken = r.token;
    lastUid = uid;
  } catch { /* sonraki oturum değişiminde yeniden denenir */ }
}

/** Uygulama açılışında BİR KEZ çağrılır. */
export function startDmPushSync() {
  if (started) return;
  started = true;
  sync();
  subscribeSession(() => { sync(); });
}
