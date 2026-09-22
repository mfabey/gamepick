import { NextResponse } from 'next/server';

import { getNewsList } from '../../lib/news-list';
import { redisGetJSON } from '../../lib/redis';

export const revalidate = 1800; // 30 dk ISR

// LİSTE ÜRETİMİ lib/news-list.js'e taşındı: sohbette haber paylaşımı da aynı
// listeyi okuyor (bkz. lib/chat-share.js). Bu dosya artık yalnızca HTTP
// sarmalayıcısı — RSS okuma, tekilleştirme ve sıralama tek yerde.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'tr';

  const id = searchParams.get('id');
  if (id !== null) {
    if (!/^news_[a-f0-9]{24}$/.test(id)) return NextResponse.json({ error: 'Invalid news id' }, { status: 400 });
    const saved = await redisGetJSON(`news:article:${id}`).catch(() => null);
    const item = saved || (await getNewsList(lang)).find(article => article.id === id);
    return item ? NextResponse.json({ item }) : NextResponse.json({ error: 'Article unavailable' }, { status: 404 });
  }

  const results = await getNewsList(lang);

  return NextResponse.json(
    { results, count: results.length },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
  );
}
