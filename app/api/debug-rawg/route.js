import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Yalnızca geliştirmede. Bu uç yukarı akış yanıt başlıklarını olduğu gibi
  // döküyor ve kimlik doğrulaması yok; üretimde açık bırakmanın karşılığı yok
  // (repoda tek bir çağıranı da yok).
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const RAWG_KEY = process.env.RAWG_API_KEY;
  const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&page_size=1&platforms=4`;

  // `keyPreview` KALDIRILDI: anahtarın ilk 6 karakterini döndürmenin teşhis
  // değeri `hasKey`in üstüne bir şey katmıyor, sızdırdığı bilgi ise gerçek.
  const diag = {
    hasKey: !!RAWG_KEY,
    timestamp: new Date().toISOString(),
  };

  try {
    const start = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);

    diag.status = res.status;
    diag.timeMs = Date.now() - start;
    diag.headers = Object.fromEntries(res.headers.entries());

    if (res.ok) {
      const json = await res.json();
      diag.count = json.count;
      diag.firstGame = json.results?.[0]?.name || null;
      diag.ok = true;
    } else {
      diag.body = (await res.text()).slice(0, 500);
      diag.ok = false;
    }
  } catch (err) {
    diag.ok = false;
    diag.error = err.message;
    diag.errorName = err.name;
  }

  return NextResponse.json(diag);
}
