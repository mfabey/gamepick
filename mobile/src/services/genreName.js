// ─────────────────────────────────────────────────────────────────────────────
// Tür adının GÖRÜNEN hâli.
//
// NEDEN VAR. Faz 2 ızgara kartına tür satırı ekledi ve tür adları ilk kez
// ekranda göründü — Türkçe arayüzde "Shooter · Puzzle" yazıyordu.
//
// Sebep veri tarafında ve eskiden beri var: aday kaynakları tür adlarını
// KARIŞIK dilde veriyor. RAWG İngilizce ("Action"), curated/trending listesi
// Türkçe ("Aksiyon"). recommend.js bunu zaten biliyor ve skorlama için
// kanonik İngilizceye indirgiyor (GENRE_CANON); orada dert değildi çünkü
// sonuç hiç gösterilmiyordu.
//
// Zincir: ham ad → kanonik İngilizce → RAWG slug → i18n anahtarı.
// Sözlükte olmayan tür HAM HÂLİYLE geçiyor: eksik çeviri yüzünden tür satırı
// boş kalmasın — yanlış dil, hiç bilgi olmamasından iyi.
// ─────────────────────────────────────────────────────────────────────────────
import { GENRE_CANON } from './recommend';

// Kanonik İngilizce ad → RAWG genre slug. Anahtarlar i18n'de `genre.<slug>`.
const SLUG = {
  Action: 'action',
  RPG: 'role-playing-games-rpg',
  Strategy: 'strategy',
  Adventure: 'adventure',
  Shooter: 'shooter',
  Puzzle: 'puzzle',
  Sports: 'sports',
  Racing: 'racing',
  Horror: 'horror',
  Platformer: 'platformer',
  Card: 'card',
  Simulation: 'simulation',
  Indie: 'indie',
  Casual: 'casual',
  Family: 'family',
  Fighting: 'fighting',
  Arcade: 'arcade',
  Educational: 'educational',
  'Massively Multiplayer': 'massively-multiplayer',
  'Board Games': 'board-games',
};

/** @param {string} ad ham tür adı · @param {func} t i18n çevirici */
export function turAdi(ad, t) {
  const ham = String(ad || '').trim();
  if (!ham) return '';
  const kanonik = GENRE_CANON[ham] || ham;
  const slug = SLUG[kanonik];
  if (!slug) return ham;
  const cevrilmis = t(`genre.${slug}`);
  // t() bulamadığında anahtarın kendisini döndürüyor — o hâlde ham ada dön.
  return cevrilmis === `genre.${slug}` ? ham : cevrilmis;
}
