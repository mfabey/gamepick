import { NextResponse } from 'next/server';
import { isAdultContent } from '../../lib/adult-filter.js';

const RAWG_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE = 'https://api.rawg.io/api';

// ─────────────────────────────────────────────────────────────────────────────
// Doğal dil ile oyun arama.
// "Dying Light gibi hikayeli ve eşli, karakter geliştirdiğim bir oyun"
//   → { genres:[...], tags:[story-rich,co-op,...], mode:'coop' }
//   → kendi kataloğumuzdan aday oyunlar
//
// LLM'e oyun İSMİ saydırmıyoruz (halüsinasyon riski) — yalnızca FİLTRE çıkarıyor.
// Böylece dönen her oyun gerçekten katalogda, fiyatı ve detayı hazır.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// LLM yalnızca bu listelerden seçebilir → uydurma slug gelmez
const GENRES = [
  'action', 'adventure', 'role-playing-games-rpg', 'shooter', 'strategy',
  'simulation', 'puzzle', 'platformer', 'racing', 'sports', 'fighting',
  'indie', 'arcade', 'massively-multiplayer', 'casual', 'family', 'card',
];

const TAGS = [
  'singleplayer', 'multiplayer', 'co-op', 'online-co-op', 'local-co-op', 'pvp',
  'story-rich', 'choices-matter', 'atmospheric', 'open-world', 'exploration',
  'survival', 'horror', 'zombies', 'post-apocalyptic', 'sandbox', 'crafting',
  'sci-fi', 'fantasy', 'dark-fantasy', 'cyberpunk', 'space', 'medieval',
  'first-person', 'third-person', 'stealth', 'tactical', 'roguelike',
  'souls-like', 'difficult', 'relaxing', 'funny', 'great-soundtrack',
  'pixel-graphics', 'anime', 'realistic', 'female-protagonist',
  'character-customization', 'base-building', 'turn-based', 'metroidvania',
  'hack-and-slash', 'battle-royale', 'racing', 'simulation', 'multiplayer',
];

const MODES = ['singleplayer', 'multiplayer', 'coop'];

async function groqJson(messages, maxTokens = 400) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      temperature: 0.2,          // filtre çıkarımı yaratıcılık değil tutarlılık ister
      response_format: { type: 'json_object' },
      messages,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : {};
}

// Kullanıcı cümlesi → yapılandırılmış filtre
async function extractFilters(query, lang) {
  const prompt = `Kullanıcının oyun arama isteğini analiz et ve filtrelere çevir.

İstek: "${query}"

KURALLAR:
- "X gibi" denirse X oyununun ÖZELLİKLERİNİ etiketlere çevir (oyun ismi yazma).
  Örnek: "Dying Light gibi" → zombies, survival, open-world, first-person, co-op
- Yalnızca aşağıdaki listelerden değer seç. Listede olmayan bir şey YAZMA.
- En fazla 3 genre, en fazla 5 tag seç. Emin olmadığını ekleme.

GEÇERLİ GENRES: ${GENRES.join(', ')}
GEÇERLİ TAGS: ${TAGS.join(', ')}
GEÇERLİ MODE: ${MODES.join(', ')} (yoksa null)

YALNIZCA şu JSON'u döndür:
{
  "genres": ["..."],
  "tags": ["..."],
  "mode": "coop" veya null,
  "summary": "${lang === 'en' ? 'One short English sentence describing what the user wants' : 'Kullanıcının ne istediğini anlatan tek kısa Türkçe cümle'}"
}`;

  const raw = await groqJson([
    { role: 'system', content: 'Sen bir oyun arama filtresi çıkarıcısısın. Her zaman geçerli JSON döndür.' },
    { role: 'user', content: prompt },
  ]);

  // Doğrulama: model listeden sapmışsa temizle
  const genres = (raw.genres || []).filter(g => GENRES.includes(g)).slice(0, 3);
  const tags   = (raw.tags   || []).filter(t => TAGS.includes(t)).slice(0, 5);
  const mode   = MODES.includes(raw.mode) ? raw.mode : '';
  return { genres, tags, mode, summary: typeof raw.summary === 'string' ? raw.summary : '' };
}

// Çıktı şekli /api/games ile birebir aynı → mevcut kart bileşenleri değişmeden çalışır
function formatGame(game) {
  const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = game.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore;
  const hasEpic    = !!epicStore;
  return {
    id:           'rawg_' + game.id,
    rawgId:       game.id,
    rawgSlug:     game.slug,
    name:         game.name,
    image:        game.background_image,
    metacritic:   game.metacritic    || null,
    reviewScore:  game.rating ? Math.round(game.rating * 20) : 0,
    totalReviews: game.ratings_count || 0,
    isFree:       !!game.tags?.some(t => t.slug === 'free-to-play'),
    onSale:       false,
    price:        null,
    noData:       true,
    platforms:    ['pc'],
    source:       hasSteam ? 'steam' : hasEpic ? 'epic' : 'rawg',
    hasSteam,
    hasEpic,
    hasStores:    !!(game.stores && game.stores.length > 0),
    epicUrl:      hasEpic ? 'https://store.epicgames.com/tr/p/' + game.slug : null,
    steamUrl:     null,
    genres:       (game.genres || []).map(g => g.name).slice(0, 3),
    released:     game.released || null,
  };
}

// RAWG'a DOĞRUDAN sorgu.
// /api/games üzerinden gitmiyoruz: o route RAWG+Steam birleştirme ve yedekleme
// katmanları içeriyor, ince etiket filtrelerini yutuyor (doğrulandı).
async function rawgQuery({ genres = '', tags = '', ordering = '-rating' }) {
  const url = new URL(`${RAWG_BASE}/games`);
  url.searchParams.set('key', RAWG_KEY);
  url.searchParams.set('platforms', '4');          // PC
  url.searchParams.set('page_size', '24');
  url.searchParams.set('exclude_additions', 'true');
  url.searchParams.set('ordering', ordering);
  if (genres) url.searchParams.set('genres', genres);
  if (tags)   url.searchParams.set('tags', tags);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter(g => g && !isAdultContent(g) && g.background_image)
      .map(formatGame);
  } catch {
    return [];
  }
}

// POST /api/smart-search   body: { query, lang }
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const query = (body.query || '').toString().trim().slice(0, 500);
  const lang = body.lang === 'en' ? 'en' : 'tr';

  if (!query) return NextResponse.json({ error: 'query gerekli' }, { status: 400 });
  if (!GROQ_KEY) return NextResponse.json({ error: 'AI yapılandırılmamış', results: [] }, { status: 503 });
  if (!RAWG_KEY) return NextResponse.json({ error: 'RAWG yapılandırılmamış', results: [] }, { status: 503 });

  let filters;
  try {
    filters = await extractFilters(query, lang);
  } catch (err) {
    console.error('smart-search filtre çıkarımı başarısız:', err.message);
    return NextResponse.json({ error: 'analiz-basarisiz', results: [] }, { status: 502 });
  }

  const { genres, tags, mode } = filters;
  if (genres.length === 0 && tags.length === 0) {
    return NextResponse.json({ filters, results: [], count: 0 });
  }

  // Mod (co-op / tek oyunculu) RAWG'da bir ETİKET olduğu için tags'e katılır
  const MODE_TAG = { coop: 'co-op', singleplayer: 'singleplayer', multiplayer: 'multiplayer' };
  const allTags = [...new Set([...tags, ...(MODE_TAG[mode] ? [MODE_TAG[mode]] : [])])];

  // Dar → geniş kademeler. RAWG çoklu etiketi VE olarak yorumlar; dar sorgu
  // boş dönerse alttaki geniş kademeler listeyi doldurur.
  const genreParam = genres.join(',');
  const jobs = [
    rawgQuery({ genres: genreParam, tags: allTags.join(',') }),                 // 1) tam eşleşme
    rawgQuery({ genres: genreParam, tags: allTags.slice(0, 2).join(',') }),     // 2) en güçlü 2 etiket
    rawgQuery({ tags: allTags.slice(0, 2).join(','), ordering: '-added' }),     // 3) türsüz, etiket odaklı
    rawgQuery({ genres: genreParam }),                                          // 4) yalnızca tür
  ];

  const lists = await Promise.all(jobs);

  // Sırayı koruyarak tekilleştir (dar sorgunun sonuçları önde kalır)
  const map = new Map();
  for (const g of lists.flat()) {
    if (g && g.id != null && !map.has(g.id)) map.set(g.id, g);
  }
  const results = [...map.values()].slice(0, 60);

  return NextResponse.json({ filters, results, count: results.length });
}
