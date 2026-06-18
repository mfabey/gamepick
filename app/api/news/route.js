import { NextResponse } from 'next/server';

export const revalidate = 1800; // 30 dk ISR

// ── Oyun haberleri RSS kaynakları (anahtar gerekmez) ────────────────────────
// Büyük İngilizce oyun haber siteleri. Vercel'de anında çalışır, kayıt yok.
const FEEDS = [
  { url: 'https://www.pcgamer.com/rss/',                 source: 'PC Gamer'   },
  { url: 'https://www.eurogamer.net/feed',               source: 'Eurogamer'  },
  { url: 'https://www.rockpapershotgun.com/feed',        source: 'RPS'        },
  { url: 'https://feeds.ign.com/ign/games-all',          source: 'IGN'        },
  { url: 'https://www.gamespot.com/feeds/news/',         source: 'GameSpot'   },
];

// Türkçe kategori — başlık/özet içindeki anahtar kelimelere göre
const CAT_RULES = [
  { cat: 'İndirimler',    re: /\b(sale|discount|deal|deals|free|bundle|cheap|% off|price drop|giveaway)\b/i },
  { cat: 'İncelemeler',   re: /\b(review|hands.on|impressions|preview|verdict)\b/i },
  { cat: 'Güncellemeler', re: /\b(update|patch|hotfix|version|dlc|expansion|season|content drop)\b/i },
  { cat: 'Çıkışlar',      re: /\b(release|launch|out now|release date|announced|reveal|trailer|coming)\b/i },
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

// indexOf tabanlı — dinamik RegExp + escaping tuzağından kaçınır
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

function categorize(text) {
  for (const r of CAT_RULES) if (r.re.test(text)) return r.cat;
  return 'Endüstri';
}

function formatDate(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d)) return '';
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function readingTime(text) {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} dk`;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (GamePick News Aggregator)' },
      next: { revalidate: 1800 }, // 30 dk cache
    });
    if (!res.ok) return [];
    const xml = await res.text();
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
        cat: categorize(title + ' ' + excerpt),
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
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

  const results = all.map((n, i) => ({
    id:      'news_' + i,
    cat:     n.cat,
    date:    formatDate(n.pubDate),
    read:    readingTime(n.excerpt || n.title),
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
