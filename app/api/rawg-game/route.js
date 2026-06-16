import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// RAWG store ID'leri
const STEAM_STORE_ID = 1;
const EPIC_STORE_ID  = 11;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug eksik' }, { status: 400 });

  if (slug === 'meccha-chameleon') {
    const game = {
      id:           'rawg_4704690',
      rawgId:       4704690,
      rawgSlug:     'meccha-chameleon',
      name:         'Meccha Chameleon',
      image:        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/163e2a742e5fb8e1f5d1e3a890da98f04ab809d4/header.jpg?t=1781108224',
      description:  'Meccha Chameleon, oyuncuların kendilerini çevreye uydurmak için el ile boyadığı ve kamufle ettiği, son derece eğlenceli ve popüler bir saklambaç oyunudur. Eşyaya dönüşmek yerine, düz beyaz bir karakter olarak başlayıp renk paletleri ve dokular kullanarak sahneye uyum sağlamaya çalışırsınız.',
      metacritic:   null,
      rating:       4.6,
      totalReviews: 1050,
      developer:    'lemorion_1224',
      publisher:    'lemorion_1224',
      released:     '2026-06-10',
      playtime:     null,
      genres:       ['Aksiyon', 'Casual', 'Gizlilik'],
      tags:         ['Saklambaç', 'Party', 'Çok Oyunculu', 'Komik', 'Kamufle'],
      platforms:    ['PC'],
      screenshots:  [
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/6c0a47cc2fba1b160901d1553637a764198bdc98/ss_6c0a47cc2fba1b160901d1553637a764198bdc98.1920x1080.jpg?t=1781108224',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/0383a711ed93bf8edd848df4b63b331fc44f3ad5/ss_0383a711ed93bf8edd848df4b63b331fc44f3ad5.1920x1080.jpg?t=1781108224',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/51b0a906d1767b1b5abde623350dec64c6877c93/ss_51b0a906d1767b1b5abde623350dec64c6877c93.1920x1080.jpg?t=1781108224',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/0a8a562016b13a349349e685f7a4d5a6cbccef3e/ss_0a8a562016b13a349349e685f7a4d5a6cbccef3e.1920x1080.jpg?t=1781108224',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/2764a4a42c24a88d0bbb9b67e5c2bde979a24ac9/ss_2764a4a42c24a88d0bbb9b67e5c2bde979a24ac9.1920x1080.jpg?t=1781108224',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/c0c3ab9f5f2b41e86606a1c790fef432fe2d65cf/ss_c0c3ab9f5f2b41e86606a1c790fef432fe2d65cf.1920x1080.jpg?t=1781108224'
      ],
      hasSteam:     true,
      hasEpic:      false,
      steamAppId:   '4704690',
      epicUrl:      null,
      steamUrl:     'https://store.steampowered.com/app/4704690',
      xboxUrl:      null,
      gogUrl:       null,
      playstationUrl: null,
      nintendoUrl:  null,
      officialUrl:  null,
      source:       'steam',
    };
    return NextResponse.json({ game });
  }

  try {
    // 3 endpoint paralel: detail + screenshots + store URLs
    const [detail, shots, storesData] = await Promise.all([
      fetch(`${BASE}/games/${slug}?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE}/games/${slug}/screenshots?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${BASE}/games/${slug}/stores?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);

    if (detail.detail === 'Not found.') {
      return NextResponse.json({ error: 'Oyun bulunamadi' }, { status: 404 });
    }

    // Tüm store URL'lerini eşleştir
    const storeResults = storesData.results || [];
    const detailStores = detail.stores || [];
    const storeMap = {};
    
    storeResults.forEach(sr => {
      const storeDetail = detailStores.find(ds => ds.store?.id === sr.store_id);
      if (storeDetail) {
        storeMap[storeDetail.store.slug] = sr.url;
      } else {
        if (sr.store_id === 1) storeMap['steam'] = sr.url;
        if (sr.store_id === 11) storeMap['epic-games'] = sr.url;
        if (sr.store_id === 2) storeMap['xbox-store'] = sr.url;
        if (sr.store_id === 3) storeMap['playstation-store'] = sr.url;
        if (sr.store_id === 5) storeMap['gog'] = sr.url;
        if (sr.store_id === 6) storeMap['nintendo'] = sr.url;
      }
    });

    // Steam appid — URL'den regex ile çıkar
    const steamUrl   = storeMap['steam'] || null;
    const steamAppId = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;

    // Epic URL
    const epicUrl = storeMap['epic-games'] || null;

    // hasSteam/hasEpic için de detail.stores'a fallback (liste endpoint'i bunu zaten veriyor)
    const hasSteam = !!steamAppId || detailStores.some(s => s.store?.slug === 'steam');
    const hasEpic  = !!epicUrl  || detailStores.some(s => s.store?.slug === 'epic-games');

    const game = {
      id:           `rawg_${detail.id}`,
      rawgId:       detail.id,
      rawgSlug:     detail.slug,
      name:         detail.name,
      image:        detail.background_image,
      description:  detail.description_raw || '',
      metacritic:   detail.metacritic   || null,
      rating:       detail.rating       || 0,
      totalReviews: detail.ratings_count || 0,
      developer:    detail.developers?.[0]?.name || null,
      publisher:    detail.publishers?.[0]?.name || null,
      released:     detail.released  || null,
      playtime:     detail.playtime  || null,
      genres:       (detail.genres   || []).map(g => g.name),
      tags:         (detail.tags     || []).map(t => t.name).slice(0, 15),
      platforms:    (detail.platforms|| []).map(p => p.platform.name),
      screenshots:  (shots.results   || []).map(s => s.image).filter(Boolean).slice(0, 6),
      hasSteam,
      hasEpic,
      steamAppId:   steamAppId || null,
      epicUrl:      epicUrl ? epicUrl.replace('/en-US/', '/tr/') : (hasEpic ? `https://store.epicgames.com/tr/p/${slug}` : null),
      steamUrl:     steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null,
      xboxUrl:      storeMap['xbox-store'] || storeMap['xbox-360-store'] || null,
      gogUrl:       storeMap['gog'] || null,
      playstationUrl: storeMap['playstation-store'] || null,
      nintendoUrl:  storeMap['nintendo'] || null,
      officialUrl:  detail.website || null,
      source:       steamAppId ? 'steam' : hasEpic ? 'epic' : 'rawg',
    };

    return NextResponse.json({ game });

  } catch (err) {
    console.error('RAWG game detail hatasi:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
