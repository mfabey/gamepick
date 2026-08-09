import { ImageResponse } from 'next/og';
import { verifyCard } from '../../lib/card-sign';

// ─────────────────────────────────────────────────────────────────────────────
// Paylaşılabilir oyun kartı — PNG.
//
// KİMLİK DOĞRULAMASI YOK, İMZA VAR. Bağlantıyı karşı taraf açacak, o yüzden
// Bearer belirteci isteyemeyiz; ama parametreler de serbest olamaz (bkz.
// lib/card-sign.js). İmzayı yalnızca sunucu üretebiliyor.
//
// SATORI KISITLARI (next/og'un çizim motoru):
//   - yalnızca flexbox, grid yok
//   - birden çok çocuğu olan her kapsayıcıda `display: flex` AÇIK yazılmalı,
//     aksi hâlde çocuklar üst üste biniyor
//   - kısayol özellikler (`background`, `font`) güvenilmez; ayrık yazılıyor
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'edge';

const C = {
  bg: '#06070a',
  card: '#151920',
  text: '#f2f4f7',
  text2: '#9aa3b0',
  text3: '#808690',
  accent: '#e8242b',
  green: '#00d26e',
};

/** Girdi kırpma — imza olsa da uzun metin çizimi bozar. */
const clamp = (v, n) => String(v ?? '').slice(0, n);

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const params = {
    g: searchParams.get('g') || '',
    h: searchParams.get('h') || '0',
    r: searchParams.get('r') || '',
    o: searchParams.get('o') || '',
    u: searchParams.get('u') || '',
    l: searchParams.get('l') || 'tr',
    sig: searchParams.get('sig') || '',
  };

  if (!(await verifyCard(params))) {
    // 403, 404 değil: kart var ama bu imzayla değil. Sır tanımsızsa da buraya
    // düşüyor — kapalı hâlde başarısız oluyoruz.
    return new Response('Gecersiz imza', { status: 403 });
  }

  const game  = clamp(params.g, 48);
  const hours = clamp(params.h, 8);
  const user  = clamp(params.u, 24);
  const rank  = params.r ? Number(params.r) : null;
  const owners = params.o ? Number(params.o) : null;
  const showRank = Number.isFinite(rank) && Number.isFinite(owners) && owners > 1;

  // Kart bir GÖRSEL — paylaşıldıktan sonra dili değiştirilemez, o yüzden dil
  // de imzalı parametrelerin içinde. Satori'nin varsayılan yazı tipi Türkçe
  // harfleri kapsamadığı için burada aksansız yazım tercih edildi.
  const L = params.l === 'en'
    ? { hours: 'hours', among: 'among your friends' }
    : { hours: 'saat',  among: 'arkadaslarin arasinda' };

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', backgroundColor: C.bg,
        padding: 64, position: 'relative',
        // Marka kırmızısının izi. ÖNCE mutlak konumlu yuvarlak bir div idi ama
        // Satori `filter: blur()` DESTEKLEMİYOR — sert kenarlı bir disk olarak
        // çıkıyordu. Radyal gradyan destekleniyor ve gerçekten sönümleniyor.
        backgroundImage: 'radial-gradient(circle at 88% 6%, rgba(232,36,43,0.20), rgba(6,7,10,0) 55%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent,
            marginRight: 12, display: 'flex',
          }} />
          <div style={{ fontSize: 26, color: C.text2, letterSpacing: 2 }}>GAMERISEN</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, color: C.text2, marginBottom: 4 }}>{game}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 168, color: C.text, fontWeight: 800, lineHeight: 1 }}>{hours}</div>
            <div style={{ fontSize: 46, color: C.text3, marginLeft: 16, marginBottom: 22 }}>{L.hours}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {showRank ? (
            <div style={{
              display: 'flex', alignItems: 'center',
              backgroundColor: C.card, borderRadius: 999,
              paddingLeft: 26, paddingRight: 26, paddingTop: 14, paddingBottom: 14,
            }}>
              {/* TEK dizge olmak ZORUNDA: `{rank}/{owners}` yazımı JSX'te üç
                  ayrı çocuk üretir (rank, '/', owners) ve Satori çok çocuklu
                  her düğümde açık `display: flex` ister — aksi hâlde çizim
                  tamamen başarısız oluyor, kısmi değil. */}
              <div style={{ fontSize: 34, color: C.green, fontWeight: 800, marginRight: 10 }}>
                {`${rank}/${owners}`}
              </div>
              <div style={{ fontSize: 28, color: C.text2 }}>{L.among}</div>
            </div>
          ) : <div style={{ display: 'flex' }} />}

          {!!user && <div style={{ fontSize: 30, color: C.text3 }}>{`@${user}`}</div>}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // İmzalı ve değişmez: uzun süre önbelleklenebilir.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
