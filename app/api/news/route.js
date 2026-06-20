import { NextResponse } from 'next/server';

export const revalidate = 1800; // 30 dk ISR

const FEEDS_TR = [
  { url: 'https://www.merlininkazani.com/feed/',         source: 'Merlin\'in Kazanı' },
  { url: 'https://frpnet.net/feed',                    source: 'FRPNET' },
  { url: 'https://geekyapar.com/feed/',                 source: 'Geekyapar' },
  { url: 'https://www.savebutonu.com/feed',            source: 'SaveButonu' },
];

const FEEDS_EN = [
  { url: 'https://www.pcgamer.com/rss/',                 source: 'PC Gamer'   },
  { url: 'https://www.eurogamer.net/feed',               source: 'Eurogamer'  },
  { url: 'https://www.rockpapershotgun.com/feed',        source: 'RPS'        },
  { url: 'https://feeds.ign.com/ign/games-all',          source: 'IGN'        },
  { url: 'https://www.gamespot.com/feeds/news/',         source: 'GameSpot'   },
];

const CAT_RULES_TR = [
  { cat: 'İndirimler',    re: /\b(indirim|kampanya|fırsat|ucuz|bedava|ücretsiz|hediye|paket|indirimde|fiyat)\b/i },
  { cat: 'İncelemeler',   re: /\b(inceleme|değerlendirme|nasıl|bakış|puan|yorum|test)\b/i },
  { cat: 'Güncellemeler', re: /\b(güncelleme|yama|hotfix|sürüm|dlc|paket|yeni sezon|eklenti)\b/i },
  { cat: 'Çıkışlar',      re: /\b(çıkış|yayınlandı|geldi|duyuruldu|fragman|tanıtım|tarih|çıkıyor)\b/i },
];

const CAT_RULES_EN = [
  { cat: 'Sales',         re: /\b(sale|discount|deal|deals|free|bundle|cheap|% off|price drop|giveaway)\b/i },
  { cat: 'Reviews',       re: /\b(review|hands.on|impressions|preview|verdict)\b/i },
  { cat: 'Updates',       re: /\b(update|patch|hotfix|version|dlc|expansion|season|content drop)\b/i },
  { cat: 'Releases',      re: /\b(release|launch|out now|release date|announced|reveal|trailer|coming)\b/i },
];

const ART_PALETTE = [
  'linear-gradient(145deg,#6b4f1d 0%,#b8860b 55%,#1c1407 100%)',
  'linear-gradient(145deg,#0d2b4a 0%,#1f8a8f 65%,#06121f 100%)',
  'linear-gradient(145deg,#0f5e63 0%,#c0286b 60%,#1a0a24 100%)',
  'linear-gradient(145deg,#6b1a1a 0%,#3a4654 70%,#160a0a 100%)',
  'linear-gradient(145deg,#1f3a52 0%,#7fa8c9 65%,#0a141d 100%)',
  'linear-gradient(145deg,#7a1020 0%,#5a1f7a 60%,#1a0610 100%)',
  'linear-gradient(145deg,#3a1f5c 0%,#7d1f3a 60%,#160a1f 100%)',
  'linear-gradient(145deg,#2f7d32 0%,#a3c93a 60%,#13361a 100%)',
];

function decodeEntities(str = '') {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')               // HTML etiketlerini temizle
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, '’')
    .replace(/&#0?34;|&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const open = block.indexOf('<' + name);
  if (open === -1) return '';
  const gt = block.indexOf('>', open);
  if (gt === -1) return '';
  const close = block.indexOf('</' + name + '>', gt);
  if (close === -1) return '';
  return block.slice(gt + 1, close);
}

function extractImage(block) {
  // media:content / media:thumbnail / enclosure url
  let m = block.match(/<media:(?:content|thumbnail)[^>]*\burl="([^"]+)"/i);
  if (m) return m[1];
  m = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i);
  if (m) return m[1];
  m = block.match(/<enclosure[^>]*\burl="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
  if (m) return m[1];
  // description içindeki ilk <img src>
  const desc = tag(block, 'description') + tag(block, 'content:encoded');
  m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1].replace(/&amp;/g, '&');
  return null;
}

function categorize(text, lang = 'tr') {
  const rules = lang === 'tr' ? CAT_RULES_TR : CAT_RULES_EN;
  for (const r of rules) if (r.re.test(text)) return r.cat;
  return lang === 'tr' ? 'Endüstri' : 'Industry';
}

function formatDate(pubDate, lang = 'tr') {
  const d = new Date(pubDate);
  if (isNaN(d)) return '';
  const monthsTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = lang === 'tr' ? monthsTr : monthsEn;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function readingTime(text, lang = 'tr') {
  const words = text.split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return lang === 'tr' ? `${mins} dk` : `${mins} min`;
}

async function fetchFeed(feed, lang = 'tr') {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (GamePick News Aggregator)' },
      next: { revalidate: 1800 }, // 30 dk cache
    });
    if (!res.ok) return [];

    const buffer = await res.arrayBuffer();
    
    // Try to decode as UTF-8 first
    const decoderUtf8 = new TextDecoder('utf-8', { fatal: true });
    let xml = '';
    try {
      xml = decoderUtf8.decode(buffer);
    } catch {
      // Fallback to XML-declared encoding
      const tempDecoder = new TextDecoder('utf-8');
      const tempText = tempDecoder.decode(buffer.slice(0, 1000));
      let encoding = 'utf-8';
      const encMatch = tempText.match(/encoding=["']([^"']+)["']/i);
      if (encMatch) {
        encoding = encMatch[1].toLowerCase();
      }
      const decoder = new TextDecoder(encoding);
      xml = decoder.decode(buffer);
    }
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    return items.slice(0, 12).map((block) => {
      const title   = decodeEntities(tag(block, 'title'));
      const link    = decodeEntities(tag(block, 'link')) || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
      const rawDesc = tag(block, 'description') || tag(block, 'content:encoded');
      const excerpt = decodeEntities(rawDesc).slice(0, 200);
      const pubDate = decodeEntities(tag(block, 'pubDate') || tag(block, 'dc:date'));
      const image   = extractImage(block);
      if (!title || !link) return null;

      return {
        title,
        url: link,
        excerpt: excerpt ? excerpt + (excerpt.length >= 200 ? '…' : '') : '',
        image,
        source: feed.source,
        pubDate,
        ts: new Date(pubDate).getTime() || 0,
        cat: categorize(title + ' ' + excerpt, lang),
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'tr';

  const feeds = lang === 'tr' ? FEEDS_TR : FEEDS_EN;
  const settled = await Promise.allSettled(feeds.map(f => fetchFeed(f, lang)));
  let all = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

  // Başlığa göre tekilleştir
  const seen = new Set();
  all = all.filter((n) => {
    const key = n.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // En yeni önce
  all.sort((a, b) => b.ts - a.ts);
  all = all.slice(0, 40);

  // Görüntüsü olmayan haberlerin (özellikle Merlin'in Kazanı) og:image değerlerini paralel olarak çöz
  all = await Promise.all(all.map(async (n) => {
    if (!n.image && n.url) {
      const img = await resolveOgImage(n.url);
      if (img) n.image = img;
    }
    return n;
  }));

  const results = all.map((n, i) => ({
    id:      'news_' + i,
    cat:     n.cat,
    date:    formatDate(n.pubDate, lang),
    read:    readingTime(n.excerpt || n.title, lang),
    title:   n.title,
    excerpt: n.excerpt,
    image:   n.image,
    url:     n.url,
    source:  n.source,
    mono:    (n.source?.[0] || n.title?.[0] || '?').toUpperCase(),
    art:     ART_PALETTE[i % ART_PALETTE.length],
    featured: i === 0,
  }));

  return NextResponse.json(
    { results, count: results.length },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
  );
}
