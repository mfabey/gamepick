import { getSteamDetailsCached } from './steam-cache.js';
import { isSteamDataAdult } from './adult-filter.js';

// ─────────────────────────────────────────────────────────────────────────────
// Sohbette video/oyun paylaşımı — Reels'ten arkadaşa gönderme.
//
// MODERASYONA GİRMİYOR ve girmemeli: paylaşılan içerik KULLANICI YÜKLEMESİ
// DEĞİL, zaten bizim akışımızda servis ettiğimiz Steam fragmanı. Yükleme
// hattındaki denetim, denetlenmemiş içeriğin depoya inmesini engellemek için
// vardı; burada denetlenmemiş içerik yok.
//
// İSTEMCİDEN YALNIZCA `appid` ALINIYOR. Başlık ve görseli sunucu çözüyor.
// Sebebi: istemciden gelen metni saklasaydık, sohbet baloncuğu istenen her
// şeyin yazdırılabildiği bir yüzeye dönüşürdü — "X oyunu" diye gönderip
// içine başka bir metin koymak mümkün olurdu.
//
// YETİŞKİN SÜZGECİ akıştaki ile AYNI. Akışta gösterilmeyen bir oyunun
// paylaşımla dolaşıma girmesi süzgeci anlamsız kılardı.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * appid'i paylaşılabilir bir karta çözer.
 *
 * @returns {Promise<{kind:'reel', appid:string, name:string, image:string}|null>}
 *   `null` = geçersiz appid, oyun bulunamadı veya yetişkin içerik
 */
export async function resolveShare(appid, lang = 'tr') {
  const id = Number(appid);
  if (!Number.isInteger(id) || id <= 0) return null;

  const d = await getSteamDetailsCached(id, lang).catch(() => null);
  if (!d?.name) return null;
  if (isSteamDataAdult(d)) return null;

  return {
    kind: 'reel',
    appid: String(id),
    // Steam'den gelen ad; istemciden DEĞİL.
    name: String(d.name).slice(0, 120),
    image: d.header_image
      || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
  };
}
