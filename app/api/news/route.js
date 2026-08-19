import { NextResponse } from 'next/server';

import { getNewsList } from '../../lib/news-list';

export const revalidate = 1800; // 30 dk ISR

// LİSTE ÜRETİMİ lib/news-list.js'e taşındı: sohbette haber paylaşımı da aynı
// listeyi okuyor (bkz. lib/chat-share.js). Bu dosya artık yalnızca HTTP
// sarmalayıcısı — RSS okuma, tekilleştirme ve sıralama tek yerde.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'tr';

  const results = await getNewsList(lang);

  return NextResponse.json(
    { results, count: results.length },
    { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
  );
}
