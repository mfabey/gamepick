'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function EpicGameDetail() {
  const { slug }      = useParams();
  const router        = useRouter();
  const [game,       setGame]       = useState(null);
  const [prices,     setPrices]     = useState(null);
  const [steamGame,  setSteamGame]  = useState(undefined); // undefined=yükleniyor, null=bulunamadı
  const [loading,    setLoading]    = useState(true);
  const [wishlist,   setWishlist]   = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
      setWishlist(stored);
    } catch { setWishlist([]); }
  }, []);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      try {
        const gRes     = await fetch(`/api/epic?slug=${encodeURIComponent(slug)}`);
        const gData    = await gRes.json();
        const gameData = gData.game || null;
        setGame(gameData);

        if (gameData?.name) {
          // ITAD fiyatları + Steam cross-search paralel
          const [pRes, steamRes] = await Promise.all([
            fetch(`/api/prices?title=${encodeURIComponent(gameData.name)}`),
            fetch(`/api/steam?q=${encodeURIComponent(gameData.name)}&num=5`),
          ]);
          const pData     = await pRes.json();
          const steamData = await steamRes.json();
          setPrices(pData);

          const target = gameData.name.toLowerCase().trim();
          const match  = (steamData.results || []).find(g =>
            g.name?.toLowerCase().trim() === target ||
            g.name?.toLowerCase().includes(target.slice(0, 15))
          );
          setSteamGame(match || null);
        }
      } catch (err) {
        console.error('Epic detay yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const toggleWishlist = () => {
    if (!game) return;
    const stored  = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
    const exists  = stored.find(w => w.id === game.id);
    const updated = exists
      ? stored.filter(w => w.id !== game.id)
      : [...stored, { id: game.id, name: game.name, image: game.image, source: 'epic', epicSlug: game.epicSlug }];
    localStorage.setItem('gamepick_wishlist', JSON.stringify(updated));
    setWishlist(updated);
  };

  if (loading) return <DetailSkeleton />;
  if (!game) return (
    <div className="container" style={{ padding: '60px 20px', color: '#999', textAlign: 'center' }}>
      Oyun bulunamadı.{' '}
      <Link href="/games" style={{ color: '#DC2626' }}>Geri dön →</Link>
    </div>
  );

  const inWishlist  = wishlist.find(w => w.id === game.id);
  const allStores   = buildStoreList(game, prices);
  const paidPrices  = allStores.filter(s => !s.isFree && s.price > 0).map(s => s.price);
  const bestPrice   = paidPrices.length > 0 ? Math.min(...paidPrices) : null;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      <button onClick={() => router.back()} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: '#999',
        fontSize: 14, marginBottom: 20, cursor: 'pointer', padding: 0,
      }}>
        ← Geri dön
      </button>

      {/* Platform rozeti */}
      <div style={{ marginBottom: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#1a1a1a', color: '#fff', padding: '4px 12px',
          borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
        }}>
          ⚡ Epic Games
        </span>
      </div>

      {/* Üst alan */}
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
          </p>

          {/* Stat kutular */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>
                {game.isFree ? 'Ücretsiz' : (bestPrice ? `₺${bestPrice}` : (game.price ? `₺${game.price}` : '—'))}
              </p>
              <p style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {allStores.length > 1 ? 'En ucuz' : 'Fiyat'}
              </p>
            </div>
            {allStores.length > 1 && (
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
            <a href={game.epicUrl} target="_blank" rel="noreferrer" style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: '#1a1a1a', color: '#fff', textDecoration: 'none',
            }}>
              ⚡ Epic'te Gör
            </a>
          </div>
        </div>
      </div>

      {/* Alt grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* Sol */}
        <div>
          {game.description && (
            <div style={{ marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 16 }}>Hakkında</h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}>
                {game.description.length > 900 ? game.description.slice(0, 900) + '…' : game.description}
              </p>
            </div>
          )}

          {game.tags?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 16 }}>Etiketler</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {game.tags.slice(0, 10).map(t => (
                  <span key={t} className="badge badge-gray">{t}</span>
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
                    <Image src={ss} alt={`Screenshot ${i + 1}`} fill sizes="(max-width: 768px) 100vw, 400px" style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: fiyatlar */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>Platform Fiyatları</h2>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 10 }}>
            <PriceTable stores={allStores} loading={!prices} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {allStores.map((store, i) => (
              <a key={i} href={store.url} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#fff', border: '1px solid #e5e5e5',
                borderRadius: 10, textDecoration: 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{store.icon} {store.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: store.isFree ? '#16a34a' : '#DC2626' }}>
                  {store.isFree ? 'Ücretsiz' : `₺${store.price}`}
                </span>
              </a>
            ))}
          </div>

          {/* Steam durumu */}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              💻 Steam
            </p>
            {steamGame === undefined ? (
              <div style={{ height: 44, background: '#f5f5f5', borderRadius: 10 }} />
            ) : steamGame ? (
              <a href={`https://store.steampowered.com/app/${steamGame.id}`} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#fff', border: '1px solid #e5e5e5',
                borderRadius: 10, textDecoration: 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>💻 Steam</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: steamGame.isFree ? '#16a34a' : '#1a1a1a' }}>
                  {steamGame.isFree ? 'Ücretsiz' : (steamGame.price ? `₺${steamGame.price}` : 'Gör →')}
                </span>
              </a>
            ) : (
              <div style={{
                padding: '10px 14px', background: '#f9f9f9', border: '1px dashed #e5e5e5',
                borderRadius: 10, fontSize: 13, color: '#bbb', textAlign: 'center',
              }}>
                Bu oyun Steam'de bulunmuyor
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Epic fiyatı + ITAD'dan Xbox
function buildStoreList(game, prices) {
  const stores = [{
    storeId:  'epic',
    name:     'Epic Games',
    icon:     '⚡',
    color:    '#313131',
    price:    game.isFree ? 0 : (game.price ?? 0),
    original: game.original ?? game.price ?? 0,
    discount: game.discount ?? 0,
    isFree:   !!game.isFree,
    url:      game.epicUrl,
  }];

  if (prices?.stores?.length) {
    for (const s of prices.stores) {
      const isXbox = String(s.storeId ?? '').toLowerCase().includes('xbox') ||
                     String(s.storeId ?? '').toLowerCase().includes('microsoft');
      if (isXbox) stores.push(s);
    }
  }
  return stores;
}

function PriceTable({ stores, loading }) {
  if (loading) return (
    <div style={{ padding: 16 }}>
      {[1, 2].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ height: 12, width: 80, background: '#f0f0f0', borderRadius: 4 }} />
          <div style={{ height: 12, width: 50, background: '#f5f5f5', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
  if (!stores.length) return <p style={{ padding: 16, fontSize: 13, color: '#ccc' }}>Fiyat bulunamadı.</p>;

  const paidPrices = stores.filter(s => !s.isFree && s.price > 0).map(s => s.price);
  const minPrice   = paidPrices.length > 0 ? Math.min(...paidPrices) : Infinity;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f9f9f9' }}>
          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mağaza</th>
          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat</th>
        </tr>
      </thead>
      <tbody>
        {stores.map((store, i) => (
          <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
            <td style={{ padding: '12px 14px' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: store.color, marginRight: 8, verticalAlign: 'middle' }} />
              <span style={{ fontSize: 13, color: '#333' }}>{store.name}</span>
              {store.discount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#FEF2F2', color: '#DC2626', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>-{store.discount}%</span>
              )}
            </td>
            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
              {store.isFree ? (
                <span className="badge badge-green">Ücretsiz</span>
              ) : (
                <span>
                  {store.original > store.price && (
                    <span style={{ fontSize: 11, color: '#ccc', textDecoration: 'line-through', marginRight: 5 }}>₺{store.original}</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: store.price === minPrice ? '#16a34a' : '#1a1a1a' }}>₺{store.price}</span>
                </span>
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
