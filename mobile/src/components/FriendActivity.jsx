// ─────────────────────────────────────────────────────────────────────────────
// "Arkadaşların bu hafta ne oynadı" — GÖRÜNME EŞİĞİ ve veri kararları.
//
// Şeridin kendisi artık anasayfada 2.0 `FriendSection` (app/(tabs)/index.jsx).
// Bu dosyadaki Faz-2 şerit bileşeni kaldırıldı (kart ailesi 4/4): hiçbir
// yerden çizilmiyordu. Eşik ve aşağıdaki veri kararları geçerliliğini
// koruyor; anasayfa hem şeridi hem selamlama cümlesini bu eşiğe bağlıyor.
//
// KATALOG DEĞİL ÇEVRE. Anasayfadaki diğer şeritler ("Trend", "Yeni") herkese
// aynı şeyi gösteriyor; bu şerit yalnızca bu kullanıcıya ait. Kartın ana
// bilgisi de oyun değil İNSAN: kaç arkadaş, kimler.
//
// AVATARLAR Steam'in kendi avatarları — Gamerisen hesabı olmayan arkadaşlar
// da görünüyor. Şeridin ilk günden dolu olmasının sebebi bu: kullanıcının
// mevcut Steam çevresini ödünç alıyor.
//
// SAAT KESİN YAZILMAZ. Veri 24 saate kadar bayat olabiliyor (sunucudaki
// kütüphane önbelleği); "6,2 saat" yazmak olduğundan kesin bir izlenim
// verirdi. "Bu hafta oynadı" ifadesi o belirsizliği taşıyabiliyor.
//
// BOŞKEN DAVET YOK. Şerit ya anlamlı veriyle çıkar ya hiç çıkmaz; "arkadaşını
// davet et" gibi bir yer tutucu, ana sayfanın en değerli yerini kalıcı olarak
// boş göstermek olurdu.
// ─────────────────────────────────────────────────────────────────────────────

// ── Görünme eşiği ───────────────────────────────────────────────────────────
// Sunucu zaten SON İKİ HAFTA süzmesi yapıyor (hours2w yoksa oyun hiç gelmiyor),
// ama miktar eşiği yoktu: tek arkadaşın 10 dakikası şeridi açıyordu. Şerit
// "çevren şunu oynuyor" iddiasında; tek kişinin yarım saati o iddiayı
// taşımıyor ve özelliği değersizleştiriyor.
//
// İki yoldan biri yeterli:
//   • aynı oyunu 2+ arkadaş oynamış  → şeridin asıl anlattığı şey bu
//   • toplam 2 haftalık saat eşiği aşmış → tek ama gerçekten aktif arkadaş
const MIN_FRIENDS_ON_A_GAME = 2;
const MIN_TOTAL_HOURS_2W = 5;

/** Şerit gösterilmeye değer mi? Saf fonksiyon — sınır durumları test edilebilir. */
export function hasFriendSignal(games) {
  if (!Array.isArray(games) || games.length === 0) return false;
  if (games.some((g) => (Number(g?.count) || 0) >= MIN_FRIENDS_ON_A_GAME)) return true;
  const total = games.reduce((s, g) => s + (Number(g?.hours) || 0), 0);
  return total >= MIN_TOTAL_HOURS_2W;
}
