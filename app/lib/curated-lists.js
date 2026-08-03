// ─────────────────────────────────────────────────────────────────────────────
// Gamerisen editör listeleri.
//
// NEDEN KODDA, VERİTABANINDA DEĞİL:
//  • Yönetici ucu açmaya gerek kalmıyor (güvenlik yüzeyi yok)
//  • Git'te sürümleniyor, yanlışlıkla silinemez
//  • Tohumlama adımı yok — deploy edildiği anda oradalar
//
// NEDEN SAHTE KULLANICI DEĞİL:
// Bu listeler uydurma kullanıcı hesapları altında yayınlanmıyor. Sahibi açıkça
// Gamerisen; arayüzde de "Editör" rozetiyle işaretleniyor. Uydurma kullanıcı
// üretmek hem yanıltıcı olurdu hem de App Store'un kullanıcı üretimi içerik
// kurallarında sorun çıkarırdı.
//
// Kullanıcı listeleriyle aynı şekilde beğenilemez/raporlanamaz — sahipleri
// bir kullanıcı değil.
// ─────────────────────────────────────────────────────────────────────────────

export const CURATOR_UID = 'gamerisen';

export const CURATOR_PROFILE = Object.freeze({
  uid: CURATOR_UID,
  username: 'gamerisen',
  displayName: 'Gamerisen',
  official: true,
});

/** Editör listesi mi? Kimlik önekinden anlaşılıyor. */
export function isCuratedId(id) {
  return typeof id === 'string' && id.startsWith('gr_');
}

export const CURATED_LISTS = Object.freeze([
  {
    id: 'gr_coop',
    ownerUid: CURATOR_UID,
    official: true,
    status: 'public',
    emoji: '🤝',
    title: "Arkadaşla Oynanacaklar",
    description: "Tek başına da güzel ama asıl tadı birlikteyken çıkıyor. Co-op için en çok önerilenler.",
    createdAt: 1784548800000,
    updatedAt: 1784548800000,
    likeCount: 0,
    games: [
      { id: 'rawg_1091500', name: "Cyberpunk 2077", appid: '1091500', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg' },
      { id: 'rawg_892970', name: "Valheim", appid: '892970', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/892970/header.jpg' },
      { id: 'rawg_322330', name: "Don't Starve Together", appid: '322330', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/322330/header.jpg' },
      { id: 'rawg_1222670', name: "The Sims™ 4", appid: '1222670', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1222670/header.jpg' },
      { id: 'rawg_493520', name: "GTFO", appid: '493520', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/493520/header.jpg' },
      { id: 'rawg_1966720', name: "Lethal Company", appid: '1966720', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg' },
      { id: 'rawg_552500', name: "Warhammer: Vermintide 2", appid: '552500', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/552500/header.jpg' },
    ],
  },
  {
    id: 'gr_story',
    ownerUid: CURATOR_UID,
    official: true,
    status: 'public',
    emoji: '📖',
    title: "Hikâyesi Aklında Kalanlar",
    description: "Bitirdikten sonra bir süre başka oyuna başlayamadığınız türden anlatılar.",
    createdAt: 1784635200000,
    updatedAt: 1784635200000,
    likeCount: 0,
    games: [
      { id: 'rawg_1174180', name: "Red Dead Redemption 2", appid: '1174180', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg' },
      { id: 'rawg_292030', name: "The Witcher 3: Wild Hunt", appid: '292030', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg' },
      { id: 'rawg_1245620', name: "ELDEN RING", appid: '1245620', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg' },
      { id: 'rawg_377160', name: "Fallout 4", appid: '377160', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/377160/header.jpg' },
      { id: 'rawg_1593500', name: "God of War", appid: '1593500', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1593500/header.jpg' },
      { id: 'rawg_261550', name: "Mount & Blade II: Bannerlord", appid: '261550', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/261550/header.jpg' },
    ],
  },
  {
    id: 'gr_indie',
    ownerUid: CURATOR_UID,
    official: true,
    status: 'public',
    emoji: '💎',
    title: "Bağımsız Başyapıtlar",
    description: "Küçük ekiplerden çıkan, büyük yapımlarla aynı sofraya oturan oyunlar.",
    createdAt: 1784721600000,
    updatedAt: 1784721600000,
    likeCount: 0,
    games: [
      { id: 'rawg_367520', name: "Hollow Knight", appid: '367520', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg' },
      { id: 'rawg_413150', name: "Stardew Valley", appid: '413150', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg' },
      { id: 'rawg_268910', name: "Cuphead", appid: '268910', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/268910/header.jpg' },
      { id: 'rawg_105600', name: "Terraria", appid: '105600', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg' },
      { id: 'rawg_322170', name: "Geometry Dash", appid: '322170', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/322170/header.jpg' },
      { id: 'rawg_250900', name: "The Binding of Isaac: Rebirth", appid: '250900', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/header.jpg' },
    ],
  },
  {
    id: 'gr_rogue',
    ownerUid: CURATOR_UID,
    official: true,
    status: 'public',
    emoji: '🔁',
    title: "\"Bir El Daha\" Dedirtenler",
    description: "Her ölümde yeniden başlatan roguelike ve roguelite seçkisi.",
    createdAt: 1784808000000,
    updatedAt: 1784808000000,
    likeCount: 0,
    games: [
      { id: 'rawg_1145360', name: "Hades", appid: '1145360', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg' },
      { id: 'rawg_646570', name: "Slay the Spire", appid: '646570', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/646570/header.jpg' },
      { id: 'rawg_1057090', name: "Ori and the Will of the Wisps", appid: '1057090', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1057090/header.jpg' },
      { id: 'rawg_588650', name: "Dead Cells", appid: '588650', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/588650/header.jpg' },
      { id: 'rawg_632360', name: "Risk of Rain 2", appid: '632360', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/632360/header.jpg' },
      { id: 'rawg_1229490', name: "ULTRAKILL", appid: '1229490', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1229490/header.jpg' },
    ],
  },
  {
    id: 'gr_short',
    ownerUid: CURATOR_UID,
    official: true,
    status: 'public',
    emoji: '⏱️',
    title: "Tek Oturuşta Bitenler",
    description: "Uzun yapımlara vakti olmayanlar için kısa ama akılda kalıcı oyunlar.",
    createdAt: 1784894400000,
    updatedAt: 1784894400000,
    likeCount: 0,
    games: [
      { id: 'rawg_620', name: "Portal 2", appid: '620', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/620/header.jpg' },
      { id: 'rawg_400', name: "Portal", appid: '400', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/400/header.jpg' },
      { id: 'rawg_391540', name: "Undertale", appid: '391540', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/391540/header.jpg' },
      { id: 'rawg_504230', name: "Celeste", appid: '504230', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/504230/header.jpg' },
      { id: 'rawg_219890', name: "Antichamber", appid: '219890', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/219890/header.jpg' },
      { id: 'rawg_638970', name: "Yakuza 0", appid: '638970', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/638970/header.jpg' },
    ],
  },
]);
