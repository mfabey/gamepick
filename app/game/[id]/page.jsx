'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function GameDetail() {
  const { id }    = useParams();
  const router    = useRouter();
  const [game,    setGame]    = useState(null);
  const [prices,  setPrices]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
    setWishlist(stored);
  }, []);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        // Steam API'den oyun detayı
        const gRes  = await fetch(`/api/steam?appid=${id}`);
        const gData = await gRes.json();
        const gameData = gData.game || null;
        setGame(gameData);

        if (gameData?.name) {
          // ITAD üzerinden çoklu platform fiyatları
          const pRes  = await fetch(`/api/prices?title=${encodeURIComponent(gameData.name)}`);
          const pData = await pRes.json();
          setPrices(pData);
        }
      } catch (err) {
        console.error('Detay yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const toggleWishlist = () => {
    if (!game) return;
    const stored = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
    const exists = stored.find(w => w.id === game.id);
    const updated = exists
      ? stored.filter(w => w.id !== game.id)
      : [...stored, { id: game.id, name: game.name, image: game.image }];
    localStorage.setItem('gamepick_wishlist', JSON.stringify(updated));
    setWishlist(updated);
  };

  const inWishlist = wishlist.find(w => w.id === game?.id);

  if (loading) return <DetailSkeleton />;
  if (!game) return (
    <div className="container" style={{ padding: '60px 20px', color: '#999', textAlign: 'center' }}>
      Oyun bulunamadı.{' '}
      <Link href="/games" style={{ color: '#DC2626' }}>Geri dön →</Link>
    </div>
  );

  // Steam'den gelen fiyat + ITAD mağazalarını birleştir
  const allStores = buildStoreList(game, prices);
  const paidStores = allStores.filter(s => !s.isFree && s.price > 0);
  const bestStore  = paidStores.sort((a, b) => a.price - b.price)[0];
  const freeStore  = allStores.find(s => s.isFree);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      {/* Geri */}
      <button onClick={() => router.back()} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: '#999',
        fontSize: 14, marginBottom: 24, cursor: 'pointer', padding: 0,
      }}>
        ← Geri dön
      </button>

      {/* Üst başlık */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, marginBottom: 32, alignItems: 'start' }}>

        {/* Kapak */}
        <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '3/4', background: '#f0f0f0', position: 'relative' }}>
          {game.image ? (
            <Image src={game.image} alt={game.name} fill style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 800, color: '#ccc' }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Meta */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {(game.genres || []).slice(0, 3).map(g => (
              <span key={g} className="badge badge-gray">{g}</span>
            ))}
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6, color: '#1a1a1a' }}>
            {game.name}
          </h1>

          <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
            {game.developer && <span>{game.developer}</span>}
            {game.released  && <span> · {game.released?.slice(0, 4)}</span>}
            {game.publisher && game.publisher !== game.developer && <span> · {game.publisher}</span>}
          </p>

          {/* Stat kutular */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {game.metacritic && (
              <div style={{
                background: game.metacritic >= 80 ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${game.metacritic >= 80 ? '#bbf7d0' : '#fde68a'}`,
                borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: game.metacritic >= 80 ? '#16a34a' : '#d97706' }}>{game.metacritic}</p>
                <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metacritic</p>
              </div>
            )}
            {(freeStore || bestStore) && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>
                  {freeStore ? 'Ücretsiz' : `₺${bestStore.price}`}
                </p>
                <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En ucuz</p>
              </div>
            )}
            {allStores.length > 0 && (
              <div style={{ background: '#f5f5f5', border: '1px solid #ebebeb', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a' }}>{allStores.length}</p>
                <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</p>
              </div>
            )}
          </div>

          {/* Butonlar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={toggleWishlist} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: inWishlist ? '#FEF2F2' : '#f5f5f5',
              border: `1px solid ${inWishlist ? '#FECACA' : '#e5e5e5'}`,
              color: inWishlist ? '#DC2626' : '#555', cursor: 'pointer',
            }}>
              {inWishlist ? '✓ İstek listesinde' : '+ İstek listesine ekle'}
            </button>
            <a href={`https://store.steampowered.com/app/${id}`} target="_blank" rel="noreferrer" style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: '#1a9fff', color: '#fff', textDecoration: 'none', display: 'inline-block',
            }}>
              Steam'de Gör
            </a>
          </div>
        </div>
      </div>

      {/* Alt grid: açıklama + fiyatlar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* Sol: Açıklama + ekran görüntüleri */}
        <div>
          {game.description && (
            <div style={{ marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 16 }}>Hakkında</h2>
              <p
                style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}
                dangerouslySetInnerHTML={{ __html:
                  game.description.length > 900
                    ? game.description.slice(0, 900) + '…'
                    : game.description
                }}
              />
            </div>
          )}

          {game.categories?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 16 }}>Özellikler</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {game.categories.slice(0, 8).map(c => (
                  <span key={c} className="badge badge-gray">{c}</span>
                ))}
              </div>
            </div>
          )}

          {game.screenshots?.length > 0 && (
            <div>
              <h2 className="section-title" style={{ fontSize: 16 }}>Ekran Görüntüleri</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {game.screenshots.slice(0, 4).map((ss, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', background: '#f0f0f0' }}>
                    <Image src={ss} alt={`Screenshot ${i + 1}`} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Platform fiyatları */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>Platform Fiyatları</h2>

          <div className="card" style={{ overflow: 'hidden', marginBottom: 10 }}>
            <PriceTable stores={allStores} loading={!prices} />
          </div>

          {/* PlayStation — arama linki (ücretsiz API yok) */}
          <a
            href={prices?.psUrl || `https://store.playstation.com/tr-tr/search/${encodeURIComponent(game.name)}`}
            target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 14px', background: '#fff',
              border: '1.5px solid #003087',
              borderRadius: 10, textDecoration: 'none', marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#003087' }}>🎮 PlayStation Store</span>
            <span style={{ fontSize: 12, color: '#003087', fontWeight: 500 }}>PS Store'da Ara →</span>
          </a>

          {/* Doğrudan mağaza butonları */}
          {allStores.length > 0 && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allStores.map((store, i) => (
                <a
                  key={i}
                  href={store.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: '#fff', border: '1px solid #e5e5e5',
                    borderRadius: 10, textDecoration: 'none', transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                    {store.icon} {store.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: store.isFree ? '#16a34a' : '#DC2626' }}>
                    {store.isFree ? 'Ücretsiz' : `₺${store.price}`}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Steam'den gelen fiyatı + ITAD mağazalarını birleştir
function buildStoreList(game, prices) {
  const stores = [];

  // Steam önce (Steam API'den gerçek ₺ fiyat)
  stores.push({
    storeId:  'steam',
    name:     'Steam',
    icon:     '💻',
    color:    '#1b2838',
    price:    game.isFree ? 0 : (game.price ?? 0),
    original: game.original ?? (game.price ?? 0),
    discount: game.discount ?? 0,
    isFree:   !!game.isFree,
    url:      `https://store.steampowered.com/app/${game.id}`,
  });

  // ITAD'dan diğer mağazalar (Steam hariç)
  if (prices?.stores?.length) {
    for (const s of prices.stores) {
      if (s.storeId === 'steam') continue;
      stores.push(s);
    }
  }

  return stores;
}

function PriceTable({ stores, loading }) {
  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ height: 12, width: 80, background: '#f0f0f0', borderRadius: 4 }} />
            <div style={{ height: 12, width: 50, background: '#f5f5f5', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!stores.length) {
    return <p style={{ padding: 16, fontSize: 13, color: '#ccc' }}>Fiyat bulunamadı.</p>;
  }

  const minPrice = Math.min(
    ...stores.filter(s => !s.isFree && s.price > 0).map(s => s.price)
  );

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f9f9f9' }}>
          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mağaza</th>
          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat</th>
          <th style={{ width: 32 }}></th>
        </tr>
      </thead>
      <tbody>
        {stores.map((store, i) => (
          <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
            <td style={{ padding: '12px 14px' }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: store.color, marginRight: 8, verticalAlign: 'middle',
              }} />
              <span style={{ fontSize: 13, color: '#333' }}>{store.name}</span>
              {store.discount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#FEF2F2', color: '#DC2626', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                  -{store.discount}%
                </span>
              )}
            </td>
            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
              {store.isFree ? (
                <span className="badge badge-green">Ücretsiz</span>
              ) : (
                <span>
                  {store.original > store.price && (
                    <span style={{ fontSize: 11, color: '#ccc', textDecoration: 'line-through', marginRight: 5 }}>
                      ₺{store.original}
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: store.price === minPrice ? '#16a34a' : '#1a1a1a' }}>
                    ₺{store.price}
                  </span>
                </span>
              )}
            </td>
            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
              {!store.isFree && store.price === minPrice && store.price > 0 && (
                <span title="En ucuz" style={{ fontSize: 14, color: '#16a34a' }}>✓</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailSkeleton() {
  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ height: 14, width: 80, background: '#f0f0f0', borderRadius: 6, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28 }}>
        <div style={{ borderRadius: 14, background: '#f5f5f5', aspectRatio: '3/4' }} />
        <div>
          <div style={{ height: 16, width: 200, background: '#f0f0f0', borderRadius: 6, marginBottom: 14 }} />
          <div style={{ height: 32, width: '70%', background: '#f5f5f5', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 12, width: 120, background: '#f0f0f0', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
