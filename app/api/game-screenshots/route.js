import { NextResponse } from 'next/server';

export const revalidate = 86400; // 24 hours cache

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');

  if (!appid) {
    return NextResponse.json({ screenshots: [] });
  }

  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=screenshots`, {
      next: { revalidate: 86400 } // Cache aggressively for 24 hours
    });
    
    if (res.ok) {
      const data = await res.json();
      const entry = data[appid];
      
      if (entry?.success && entry.data?.screenshots) {
        const screenshots = entry.data.screenshots.map(s => s.path_full);
        return NextResponse.json({ screenshots }, {
          headers: {
            'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800'
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch screenshots for appid', appid, err);
  }

  return NextResponse.json({ screenshots: [] });
}
