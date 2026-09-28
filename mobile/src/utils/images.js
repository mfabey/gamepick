// Dikey (3:4) kartlar için: Steam yatay header görselini (~460×215) dikey
// kapağa (library_600x900, 2:3) çevir. Steam olmayan URL'ler değişmeden döner.
export function posterImage(url) {
  if (typeof url === 'string') {
    if (/\/apps\/\d+\/header\.jpg/i.test(url)) {
      return url.replace(/\/header\.jpg.*$/i, '/library_600x900.jpg');
    }
    if (/media\.rawg\.io\/media\/(crop\/\d+\/\d+\/|resize\/\d+\/-\/)/i.test(url)) {
      return url.replace(/media\.rawg\.io\/media\/(crop\/\d+\/\d+\/|resize\/\d+\/-\/)/i, 'media.rawg.io/media/');
    }
  }
  return url;
}

/**
 * Oyun detay sayfası ve geniş hero alanları için yüksek çözünürlüklü kapak görseli.
 *
 * 1. Steam oyunları:
 *    - 460x215'lik düşük çözünürlüklü `header.jpg` veya dikey `library_600x900.jpg` yerine
 *      1920x620 çözünürlüklü `library_hero.jpg` kullanılır.
 * 2. RAWG oyunları:
 *    - `crop/600/400/` veya `resize/640/-/` ile kırpılıp sıkıştırılmış URL'ler orijinal
 *      1080p/4K tam boy görseline (`media.rawg.io/media/...`) dönüştürülür.
 * 3. Steam AppID biliniyorsa doğrudan Steam CDN'inden yüksek çözünürlüklü hero URL üretilir.
 */
export function heroImage(url, appid = null) {
  if (!url && !appid) return url;

  if (typeof url === 'string') {
    // 1. RAWG crop / resize parametrelerini temizleyip orijinal yüksek çözünürlüklü görseli al
    if (/media\.rawg\.io\/media\/(crop\/\d+\/\d+\/|resize\/\d+\/-\/)/i.test(url)) {
      return url.replace(/media\.rawg\.io\/media\/(crop\/\d+\/\d+\/|resize\/\d+\/-\/)/i, 'media.rawg.io/media/');
    }

    // 2. Steam URL'lerini ultra-HD library_hero.jpg formatına dönüştür
    if (/steamstatic|steamcommunity|steampowered/i.test(url)) {
      if (/\/(header|library_600x900|capsule_\d+x\d+)\.jpg/i.test(url)) {
        return url.replace(/\/(header|library_600x900|capsule_\d+x\d+)\.jpg.*/i, '/library_hero.jpg');
      }
    }
  }

  // 3. Eğer appid varsa ve Steam görseli ise veya URL boşsa library_hero.jpg döndür
  const cleanAppId = appid || (typeof url === 'string' ? url.match(/\/apps\/(\d+)\//i)?.[1] : null);
  if (cleanAppId && (!url || /steam/i.test(url))) {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${cleanAppId}/library_hero.jpg`;
  }

  return url;
}

