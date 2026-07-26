import { NextResponse } from 'next/server';

// Steam appreviews özeti — appid → topluluk inceleme analizi (olumlu %, toplam).
// Uzun cache (inceleme özeti yavaş değişir).
export const revalidate = 3600;

const EMPTY = { total: 0 };

// GET /api/steam-reviews?appid=1174180
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  if (!appid) return NextResponse.json(EMPTY);

  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${encodeURIComponent(appid)}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 21600 } } // 6 saat
    );
    if (!res.ok) return NextResponse.json(EMPTY);
    const data = await res.json();
    const q = data?.query_summary;
    const total = q?.total_reviews || 0;
    if (!total) return NextResponse.json(EMPTY);

    const positive = q.total_positive || 0;
    return NextResponse.json(
      {
        score: q.review_score || 0,
        desc: q.review_score_desc || '',
        positive,
        negative: q.total_negative || 0,
        total,
        positivePct: Math.round((positive / total) * 100),
      },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json(EMPTY);
  }
}
