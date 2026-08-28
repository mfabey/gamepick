// ─────────────────────────────────────────────────────────────────────────────
// İYİMSER GÖNDERİMİN EŞLEŞTİRMESİ — saf fonksiyonlar.
//
// Ayrı dosyada, çünkü sınanabilir olmaları gerekiyor: buradaki hatalar
// ekranda "aynı mesaj iki kez" ve "baloncuk iki kez zıplıyor" olarak
// çıkıyor ve ikisi de ancak gerçek bir gönderim yapılarak görülebiliyor.
// Saf fonksiyon olarak Node'da saniyeler içinde sınanıyor.
//
// ── SORUNUN KAYNAĞI ──
// Pusher mesajı GÖNDERENE DE düşürüyor. Yani aynı mesaj iki yoldan
// geliyor: yankı (anlık) ve HTTP yanıtı (biraz sonra). Hangisinin önce
// geleceği garanti değil ve ikisi de aynı satıra oturmak zorunda.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Geçici baloncuğu sunucunun döndürdüğü gerçeğiyle değiştirir.
 *
 * ── ÖNCE VAR MI DİYE BAKIYOR ──
 * Pusher mesajı GÖNDERENE DE düşürüyor (bkz. dosya başlığı). Yanıt
 * gelmeden önce yankı düşmüşse gerçek mesaj listede ZATEN var; düz bir
 * `map` o durumda tmp'yi ikinci bir kopyayla değiştiriyor ve aynı
 * kimlikten iki satır kalıyor.
 *
 * Cihazda görüldü: "Encountered two children with the same key".
 * Hata koddaydı ama ERİŞİLEMİYORDU — Pusher hiç bağlanmadığı için yankı
 * hiç gelmiyordu (bkz. services/realtime.js'teki içe aktarım düzeltmesi).
 * Bağlantı çalışır çalışmaz yarış gerçek oldu.
 */
export function tmpDegistir(liste, tempId, gercek) {
  // Yankı bu satıra ZATEN yerleşmiş olabilir (bkz. addMessage): o durumda
  // satır gerçek kimliğini almış ve `yerelId`i korumuş demektir, yapacak
  // bir şey yok.
  if (liste.some((m) => m.id === gercek.id)) {
    return liste.filter((m) => m.yerelId !== tempId || m.id === gercek.id);
  }
  // `yerelId` KORUNUYOR: anahtar bu, değişirse hücre sökülür.
  return liste.map((m) => (m.yerelId === tempId ? { ...gercek, yerelId: tempId } : m));
}

/**
 * Gelen mesaj, BEKLEYEN kendi satırlarımdan birinin yankısı mı?
 *
 * Sunucu istemci kimliğini geri döndürmüyor, o yüzden eşleşme içerikten
 * kuruluyor: gönderen ben + satır hâlâ `pending` + aynı gövde. Pencere
 * çok dar (gönderim uçuşta olduğu sürece), yani yanlış eşleşme için aynı
 * metni saniyeler içinde iki kez göndermek gerekir — o hâlde de sonuç
 * yalnızca iki baloncuğun sırasının yer değiştirmesi olurdu.
 */
export function bekleyenEsIndeks(liste, gelen, myUid) {
  if (!myUid || gelen.from !== myUid) return -1;
  return liste.findIndex((m) => {
    if (!m.pending || m.from !== myUid) return false;
    if (m.text || gelen.text) return (m.text || '') === (gelen.text || '');
    if (m.gif?.url || gelen.gif?.url) return m.gif?.url === gelen.gif?.url;
    if (m.media?.url || gelen.media?.url) return m.media?.url === gelen.media?.url;
    return false;
  });
}
