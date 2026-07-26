// Dikey (3:4) kartlar için: Steam yatay header görselini (~460×215) dikey
// kapağa (library_600x900, 2:3) çevir. Steam olmayan URL'ler değişmeden döner.
export function posterImage(url) {
  if (typeof url === 'string' && /\/apps\/\d+\/header\.jpg/i.test(url)) {
    return url.replace(/\/header\.jpg.*$/i, '/library_600x900.jpg');
  }
  return url;
}
