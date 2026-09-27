import { NextResponse } from 'next/server';
import { guard } from '../../lib/rate-guard';
import { parseBody, smartSearchBody } from '../../lib/schemas';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';

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

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isValidKey(key) {
  return Boolean(key && key.trim() !== '' && !key.startsWith('buraya_') && key !== 'placeholder');
}

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

// LLM bazı ifadeleri kaçırıyor ("sakin" → relaxing gibi). Bu deterministik eşleme
// modelden bağımsız çalışır ve sonucu LLM'in çıkardıklarıyla birleştirilir.
//
// BEŞ DİL (27 Eyl): mobil örnek istemleri tr/en/de/es/pt. Model düştüğünde
// (ölçüldü: özet boş, tür boş dönüyordu) elde kalan TEK sinyal bu eşleme;
// yalnız tr/en olunca "Etwas Entspannendes zum Abschalten" hiçbir etikete
// dönüşmüyordu. de/es/pt kökleri eklendi.
const KEYWORD_TAGS = [
  [/sakin|rahatla|stressiz|stressiz|huzur|relax|chill|calm|unwind|entspann|abschalt|gemütlich|gemutlich|relaj|tranquil|desestress/i, 'relaxing'],
  [/korku|korkut|ürküt|urkut|gerilim|horror|scary|creepy|grusel|unheimlich|terror|miedo|medo|assustador/i, 'horror'],
  [/zombi|zombie/i, 'zombies'],
  [/hikaye|hikâye|senaryo|story|narrative|geschichte|handlung|historia|história/i, 'story-rich'],
  [/açık dünya|acik dunya|open.?world|offene.? welt|mundo abierto|mundo aberto/i, 'open-world'],
  [/hayatta kal|survival|überleb|uberleb|superviv|sobreviv/i, 'survival'],
  [/keşf|kesf|explor|erkund/i, 'exploration'],
  [/zor|çetin|cetin|meydan oku|hard|difficult|challeng|schwer|fordernd|difícil|dificil|desafi/i, 'difficult'],
  [/müzik|muzik|ses|soundtrack|music|musik|música|musica/i, 'great-soundtrack'],
  [/atmosfer|atmospher|atmosphär|atmosphar/i, 'atmospheric'],
  [/gizli|sinsi|stealth|schleich|sigilo|furtiv/i, 'stealth'],
  [/uzay|space|sci.?fi|bilim kurgu|weltraum|espacio|espaço|ciencia ficción|ficção científica/i, 'sci-fi'],
  [/fantast|fantasy|büyü|buyu|fantas/i, 'fantasy'],
  [/kıyamet|kiyamet|post.?apocal|apokalyp|apocal/i, 'post-apocalyptic'],
  [/inşa|insa|üs kur|us kur|base.?build|basisbau|construir|construção|construcao/i, 'base-building'],
  [/karakter geliştir|karakter gelistir|seviye atla|rpg/i, 'character-customization'],
  [/soulslike|souls.?like|dark souls|elden ring/i, 'souls-like'],
  [/rekabet|competitive|pvp|wettkampf|kompetitiv|competitiv/i, 'pvp'],
];

const KEYWORD_MODES = [
  [/eşli|esli|arkadaş|arkadas|birlikte|beraber|co.?op|with a friend|freund|zusammen|koop|amigo|juntos|cooperativ/i, 'coop'],
  [/tek başıma|tek basima|yalnız|yalniz|solo|single.?player|allein|einzelspieler|un jugador|um jogador/i, 'singleplayer'],
  [/online|rekabet|competitive|multiplayer|mehrspieler|multijugador|multijogador/i, 'multiplayer'],
];

// ── STEAM YEDEĞİ ──
// RAWG çöktüğünde (3 Ağu, 522) ya da aylık kotası dolduğunda (27 Eyl ölçüldü:
// HTTP 401 "The monthly API limit reached") bu uç HİÇ sonuç döndürmüyordu.
// Steam mağaza araması etiketle süzebiliyor (`tags=` VE mantığıyla). Kimlikler
// Steam'in kendi listesinden: store.steampowered.com/tagdata/populartags/english
// (27 Eyl) — tahmin değil. Tür slug'ları da Steam'de etiket.
const STEAM_TAG = {
  singleplayer: 4182, multiplayer: 3859, 'co-op': 1685, 'online-co-op': 3843, 'local-co-op': 3841,
  pvp: 1775, 'story-rich': 1742, 'choices-matter': 6426, atmospheric: 4166, 'open-world': 1695,
  exploration: 3834, survival: 1662, horror: 1667, zombies: 1659, 'post-apocalyptic': 3835,
  sandbox: 3810, crafting: 1702, 'sci-fi': 3942, fantasy: 1684, 'dark-fantasy': 4604,
  cyberpunk: 4115, space: 1755, medieval: 4172, 'first-person': 3839, 'third-person': 1697,
  stealth: 1687, tactical: 1708, roguelike: 1716, 'souls-like': 29482, difficult: 4026,
  relaxing: 1654, funny: 4136, 'great-soundtrack': 1756, 'pixel-graphics': 3964, anime: 4085,
  realistic: 4175, 'female-protagonist': 7208, 'character-customization': 4747,
  'base-building': 7332, 'turn-based': 1677, metroidvania: 1628, 'hack-and-slash': 1646,
  'battle-royale': 176981, racing: 699, simulation: 599,
  action: 19, adventure: 21, 'role-playing-games-rpg': 122, shooter: 1774, strategy: 9,
  puzzle: 1664, platformer: 1625, sports: 701, fighting: 1743, indie: 492, arcade: 1773,
  'massively-multiplayer': 128, casual: 597, family: 5350, card: 1666,
};

async function steamQuery(slugs) {
  const ids = [...new Set(slugs.map((s) => STEAM_TAG[s]).filter(Boolean))];
  if (!ids.length) return [];
  const url = `https://store.steampowered.com/search/results/?tags=${ids.join(',')}`
    // Sıralama Steam'in varsayılanı (alaka): "en çok satan" etiketi zayıf
    // taşıyan dev oyunları (CS2, PUBG → "Difficult") öne alıyordu (ölçüldü).
    + '&category1=998&cc=tr&l=english&json=1&count=25';
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) { lastError = `Steam ${res.status}`; return []; }
    const data = await res.json();
    return (data.items || []).map((item) => {
      const appid = Number((item.logo || '').match(/\/apps\/(\d+)\//)?.[1]) || null;
      if (!appid) return null;
      const slug = String(item.name || '').toLowerCase().normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (isAdultTitleOrSlug(item.name, slug)) return null;
      // Biçim /api/games'in Steam kaynaklı öğeleriyle aynı (fetchSteamByMode).
      const header = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
      return {
        id: 'rawg_' + appid, rawgId: appid, rawgSlug: slug, appid, name: item.name,
        image: header,
        coverImage: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`,
        metacritic: null, reviewScore: 0, totalReviews: 0, isFree: false, onSale: false,
        price: null, noData: false, platforms: ['pc'], source: 'steam',
        hasSteam: true, hasEpic: false, hasStores: true, genres: [], released: null,
      };
    }).filter(Boolean);
  } catch (e) {
    lastError = `Steam: ${e.message?.slice(0, 80) || 'bilinmeyen'}`;
    return [];
  }
}

// Neredeyse her büyük oyunda bulunan etiketler. Ayırt edici değiller; eşit
// sayılırsa Witcher 3 (singleplayer+atmospheric+story-rich+open-world = 4 puan)
// gerçek bir korku oyununu (horror+atmospheric = 2 puan) geçiyor.
const GENERIC_TAGS = new Set([
  'singleplayer', 'multiplayer', 'atmospheric', 'story-rich', 'open-world',
  'exploration', 'great-soundtrack', 'realistic', 'third-person', 'first-person',
]);

// Etiket ağırlığı: kullanıcının kendi kelimesinden geldiyse en güçlü,
// jenerikse zayıf, diğerleri normal.
function tagWeight(tag, strongSet) {
  if (strongSet.has(tag)) return 3;
  return GENERIC_TAGS.has(tag) ? 0.3 : 1;
}

function keywordHints(query) {
  const tags = KEYWORD_TAGS.filter(([re]) => re.test(query)).map(([, t]) => t);
  const modeHit = KEYWORD_MODES.find(([re]) => re.test(query));
  return { tags, mode: modeHit ? modeHit[1] : '' };
}

async function groqJson(messages, maxTokens = 400) {
  // 1. Try Gemini
  if (isValidKey(GEMINI_KEY)) {
    const geminiModels = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsg = messages.find(m => m.role === 'user')?.content || '';

    for (const m of geminiModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const match = text.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
        }
      } catch (e) {}
    }
  }

  // 2. Try Groq (Fallback)
  if (isValidKey(GROQ_KEY)) {
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'groq/compound'];
    for (const modelName of models) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'GamerisenAI/2.0 (gamerisen.com)'
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: maxTokens,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages,
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content || '';
          const match = text.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
        }
      } catch (e) {}
    }
  }
  return {};
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
- mode SADECE kullanıcı açıkça söylerse doldurulur:
  "eşli/arkadaşımla/birlikte" → "coop"
  "tek başıma/hikaye odaklı tek kişilik" → "singleplayer"
  "online/rekabetçi" → "multiplayer"
  Cümlede böyle bir ifade YOKSA mode kesinlikle null olmalı. Tahmin etme.

GEÇERLİ GENRES: ${GENRES.join(', ')}
GEÇERLİ TAGS: ${TAGS.join(', ')}
GEÇERLİ MODE: ${MODES.join(', ')} (yoksa null)

ÖRNEKLER:
"sakin, stressiz, güzel müzikli bir oyun"
→ genres: ["indie","simulation"], tags: ["relaxing","great-soundtrack","atmospheric"], mode: null
"arkadaşımla oynayacağım kısa maçlı nişancı"
→ genres: ["shooter"], tags: ["multiplayer","pvp"], mode: "multiplayer"
"çok zor, karanlık fantastik, boss dövüşleri"
→ genres: ["action","role-playing-games-rpg"], tags: ["souls-like","difficult","dark-fantasy"], mode: null
Duyguları ve tarifleri de etikete çevir: "kafa dağıtmak"→relaxing, "sürükleyici hikaye"→story-rich,
"korkutucu"→horror, "keşfetmek"→exploration, "kendi üssümü kurmak"→base-building.

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
  const llmTags = (raw.tags || []).filter(t => TAGS.includes(t));

  // Anahtar kelime ipuçlarını ÖNE koy — bunlar kullanıcının kelimelerinden
  // doğrudan türediği için modelin tahmininden daha güvenilir.
  const hints = keywordHints(query);
  const tags = [...new Set([...hints.tags, ...llmTags])].slice(0, 5);
  const mode = hints.mode || (MODES.includes(raw.mode) ? raw.mode : '');

  return {
    genres, tags, mode,
    strongTags: hints.tags,          // kullanıcının kendi kelimelerinden gelenler
    summary: typeof raw.summary === 'string' ? raw.summary : '',
  };
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
// Sıralama '-added' (kaç kullanıcı kütüphanesine ekledi) = popülerlik vekili.
// '-rating' kullanmıyoruz: 5 kişinin oyladığı belirsiz oyunu Witcher 3'ün üstüne çıkarıyor.
async function rawgQuery({ genres = '', tags = '', ordering = '-added', strong = new Set() }) {
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
    if (!res.ok) {
      // RAWG hata gövdesi sebebi söyler: geçersiz anahtar mı, kota mı?
      let detail = '';
      try { detail = (await res.text()).slice(0, 200); } catch { /* gövde okunamadı */ }
      lastError = `RAWG ${res.status} — ${detail}`;
      return [];
    }
    const data = await res.json();
    const raw = data.results || [];
    const wanted = tags ? tags.split(',').filter(Boolean) : [];
    const kept = raw
      // ratings_count eşiği: neredeyse hiç oylanmamış belirsiz oyunları eler.
      .filter(g => g && !isAdultContent(g) && g.background_image && (g.ratings_count || 0) >= 50)
      .map(g => {
        // RAWG etiketleri VEYA olarak eşleştiriyor → tek etiket tutan popüler oyun
        // tepeye çıkıyordu. Eşleşmeleri AĞIRLIKLI puanlıyoruz: kullanıcının kendi
        // kelimesinden gelen etiket ağır, jenerik etiket hafif.
        const slugs = new Set((g.tags || []).map(t => t.slug));
        const hits = wanted
          .filter(w => slugs.has(w))
          .reduce((sum, w) => sum + tagWeight(w, strong), 0);
        return { game: formatGame(g), hits };
      });
    if (raw.length && !kept.length) lastError = `filtre hepsini eledi (${raw.length})`;
    return kept;
  } catch (e) {
    lastError = e.message?.slice(0, 120) || 'bilinmeyen';
    return [];
  }
}

// Teşhis için son hata (yanıta yalnızca debug:true ile eklenir)
let lastError = null;

// POST /api/smart-search   body: { query, lang }
export async function POST(request) {
  // Groq çağrısı yapıyor, kimliksiz — bkz. ai/chat.
  const kapi = await guard(request, 'aiSearch');
  if (kapi) return kapi;

  // Bu uç zaten 500'e kırpıyordu; şemaya alınması davranışı DEĞİŞTİRMİYOR,
  // sınırı diğer LLM uçlarıyla aynı yerde toplayıp karşılaştırılabilir kılıyor.
  // Fark: kırpmak yerine reddediyor — sessizce kesilen sorgu, kullanıcının
  // yazdığından başka bir arama yapıyordu.
  const ayrist = await parseBody(request, smartSearchBody);
  if (!ayrist.ok) return ayrist.response;
  const { query, lang, debug } = ayrist.data;
  if (!GROQ_KEY) return NextResponse.json({ error: 'AI yapılandırılmamış', results: [] }, { status: 503 });
  if (!RAWG_KEY) return NextResponse.json({ error: 'RAWG yapılandırılmamış', results: [] }, { status: 503 });

  let filters;
  try {
    filters = await extractFilters(query, lang === 'tr' ? 'tr' : 'en');
  } catch (err) {
    console.error('smart-search filtre çıkarımı başarısız:', err.message);
    return NextResponse.json({ error: 'analiz-basarisiz', results: [] }, { status: 502 });
  }

  const { genres, tags, mode } = filters;
  const strong = new Set(filters.strongTags || []);

  // Mod (co-op / tek oyunculu) RAWG'da bir ETİKET olduğu için tags'e katılır
  const MODE_TAG = { coop: 'co-op', singleplayer: 'singleplayer', multiplayer: 'multiplayer' };
  const allTags = [...new Set([...tags, ...(MODE_TAG[mode] ? [MODE_TAG[mode]] : [])])];
  // Yalnız mod çıkan sorgu ("un juego para jugar con un amigo" → coop) da
  // aranabilir: eskiden tür ve etiket boş diye burada boş dönüyordu.
  if (genres.length === 0 && allTags.length === 0) {
    return NextResponse.json({ filters, results: [], count: 0 });
  }

  // Dar → geniş kademeler. RAWG çoklu etiketi VE olarak yorumlar; dar sorgu
  // boş dönerse alttaki geniş kademeler listeyi doldurur.
  const genreParam = genres.join(',');
  const MIN_RESULTS = 12;

  // KOŞULLU kademeler: geniş sorgular yalnızca dar olanlar yetersiz kalırsa devreye
  // girer. Hepsi birden çalışırsa "en popüler oyunlar" listesi her sorguyu bastırıyor.
  const lists = [];
  const totalSoFar = () => lists.reduce((n, l) => n + l.length, 0);

  if (allTags.length) {
    // 1) Tür + tüm etiketler → en isabetli
    lists.push(await rawgQuery({ genres: genreParam, tags: allTags.join(','), strong }));
    // 2) Etiket sayısını azaltarak genişlet
    if (totalSoFar() < MIN_RESULTS && allTags.length > 2) {
      lists.push(await rawgQuery({ genres: genreParam, tags: allTags.slice(0, 2).join(','), strong }));
    }
    // 3) Türü bırak, etiketlerde kal (tür yanlış çıkarılmış olabilir)
    if (totalSoFar() < MIN_RESULTS) {
      lists.push(await rawgQuery({ tags: allTags.slice(0, 2).join(','), strong }));
    }
  }

  // 4) Son çare: yalnızca tür. Etiket eşleşmesi hiç tutmadıysa boş ekran yerine
  //    en azından doğru türden popüler oyunlar gösterilsin.
  if (totalSoFar() < MIN_RESULTS && genreParam) {
    lists.push(await rawgQuery({ genres: genreParam, strong }));
  }

  // Sırayı koruyarak tekilleştir (dar sorgunun sonuçları önde kalır)
  // Tekilleştir — aynı oyun farklı kademelerde çıkarsa en yüksek eşleşme sayısını tut
  const map = new Map();
  for (const item of lists.flat()) {
    if (!item?.game?.id) continue;
    const prev = map.get(item.game.id);
    if (!prev || item.hits > prev.hits) map.set(item.game.id, item);
  }

  // Kaç etiketin tuttuğuna göre sırala; eşitlikte daha çok oylanan önde
  let results = [...map.values()]
    .sort((a, b) => (b.hits - a.hits) || ((b.game.totalReviews || 0) - (a.game.totalReviews || 0)))
    .slice(0, 60)
    .map(x => x.game);

  // RAWG'dan HİÇ sonuç yoksa Steam (bkz. STEAM_TAG). Aynı dar → geniş
  // kademeler: Steam etiketleri VE ile birleştiriyor, fazla etiket boş döner.
  // Kullanıcının kendi kelimesinden gelen etiketler (strong) öncelikli.
  let kaynak = 'rawg';
  const steamTiers = [];
  if (!results.length) {
    kaynak = 'steam';
    const oncelik = [...new Set([...(filters.strongTags || []), ...allTags])];
    const kademeler = [
      [...genres.slice(0, 1), ...oncelik.slice(0, 2)],
      oncelik.slice(0, 2),
      oncelik.slice(0, 1),
      genres.slice(0, 1),
    ].filter((k) => k.length);
    const gorulen = new Set();
    for (const k of kademeler) {
      if (results.length >= MIN_RESULTS) break;
      const liste = await steamQuery(k);
      steamTiers.push(liste.length);
      for (const g of liste) if (!gorulen.has(g.id)) { gorulen.add(g.id); results.push(g); }
    }
    results = results.slice(0, 60);
  }

  return NextResponse.json({
    filters,
    results,
    count: results.length,
    ...(debug ? { debug: { lastError, tiers: lists.map(l => l.length), kaynak, steamTiers } } : {}),
  });
}
