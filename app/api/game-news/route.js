import { NextResponse } from 'next/server';

// Steam News API — ücretsiz, anahtar gerekmez.
// GET /api/game-news?appid=271590&count=5
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  const count = Math.min(parseInt(searchParams.get('count') || '5'), 10);

  if (!appid || !/^\d+$/.test(appid)) {
    return NextResponse.json({ results: [] });
  }

  try {
    // feeds=steam_community_announcements → geliştiricinin kendi resmi duyuruları
    // (üçüncü taraf/çok dilli haber feed'lerini eler, çoğunlukla İngilizce gelir)
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=${count}&maxlength=320&feeds=steam_community_announcements&format=json`;
    const res = await fetch(url, { next: { revalidate: 10800 } }); // 3 saat cache
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const items = data?.appnews?.newsitems || [];

    const results = items.map(it => ({
      id:      it.gid,
      title:   it.title,
      url:     it.url,
      source:  it.feedlabel || 'Steam',
      date:    it.date ? new Date(it.date * 1000).toISOString() : null,
      excerpt: cleanBody(it.contents),
    })).filter(n => n.title && n.url);

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 's-maxage=10800, stale-while-revalidate=21600' } }
    );
  } catch {
    return NextResponse.json({ results: [] });
  }
}

function cleanBody(str = '') {
  return str
    .replace(/\[\/?[^\]]+\]/g, ' ')   // Steam BBCode
    .replace(/<[^>]+>/g, ' ')         // HTML
    .replace(/https?:\/\/\S+/g, '')   // çıplak linkler
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
