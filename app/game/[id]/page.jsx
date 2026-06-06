'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function GameDetail() {
  const { id }  = useParams();
  const router  = useRouter();
  const [game,   setGame]   = useState(null);
  const [prices, setPrices] = useState(null);
  const [aiData, setAiData] = useState(null);
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
        // Oyun detaylarını al
        const gRes  = await fetch(`/api/games?id=${id}`);
        const gData = await gRes.json();
        setGame(gData.game || null);

        // Fiyatları al (oyun adıyla ITAD'dan)
        if (gData.game?.name) {
          const pRes  = await fetch(`/api/prices?title=${encodeURIComponent(gData.game.name)}`);
          const pData = await pRes.json();
          setPrices(pData);
        }

        // AI özeti al
        if (gData.game) {
          const aRes  = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'summary',
              gameTitle: gData.game.name,
              genres: gData.game.genres?.join(', ') || '',
              description: gData.game.description?.slice(0, 400) || '',
            }),
          });
          const aData = await aRes.json();
          setAiData(aData);
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
  if (!game)   return <div className="container" style={{ padding: '60px 20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Oyun bulunamadı.</div>;

  const bestPrice = getBestPrice(prices);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      {/* Geri butonu */}
      <button onClick={() => router.back()} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
        fontSize: 14, marginBottom: 24, cursor: 'pointer', padding: 0,
      }}>
        ← Geri dön
      </button>

      {/* Üst başlık alanı */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28, marginBottom: 32, alignItems: 'start' }}>
        {/* Kapak */}
        <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '3/4', background: '#1a1a1a', position: 'relative' }}>
          {game.image ? (
            <Image src={game.image} alt={game.name} fill style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, fontWeight: 800, color: 'rgba(255,255,255,0.2)',
            }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Meta */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            {(game.genres || []).slice(0, 3).map(g => (
              <span key={g} className="badge badge-gray">{g}</span>
            ))}
            {game.gamePass && <span className="badge badge-green">Game Pass</span>}
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>{game.name}</h1>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 14 }}>
            {game.developer && <span>{game.developer}</span>}
            {game.released && <span> · {game.released?.slice(0, 4)}</span>}
          </p>

          {/* Metacritic + süre */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {game.metacritic && (
              <div style={{
                background: game.metacritic >= 80 ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                border: `1px solid ${game.metacritic >= 80 ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
                borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: game.metacritic >= 80 ? '#4ade80' : '#fbbf24' }}>{game.metacritic}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metacritic</p>
              </div>
            )}
            {game.playtime && (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>{game.playtime}s</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ort. süre</p>
              </div>
            )}
            {bestPrice && (
              <div style={{ background: 'rgba(123,110,232,0.08)', border: '1px solid rgba(123,110,232,0.2)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#a594f9' }}>{bestPrice.label}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En ucuz</p>
              </div>
            )}
          </div>

          {/* Butonlar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={toggleWishlist}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: inWishlist ? 'rgba(123,110,232,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${inWishlist ? 'rgba(123,110,232,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: inWishlist ? '#a594f9' : '#f0f0f0',
                cursor: 'pointer',
              }}
            >
              {inWishlist ? '✓ İstek listesinde' : '+ İstek listesine ekle'}
            </button>
            {prices?.steamUrl && (
              <a href={prices.steamUrl} target="_blank" rel="noreferrer" style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#1a9fff', color: '#fff', border: 'none', cursor: 'pointer',
              }}>
                Steam'de Gör
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* Sol: AI özeti + açıklama */}
        <div>
          {/* AI özet kutusu */}
          {aiData?.summary && (
            <div style={{
              background: 'rgba(123,110,232,0.07)',
              border: '1px solid rgba(123,110,232,0.2)',
              borderRadius: 12, padding: '16px 18px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7B6EE8', fontWeight: 700, marginBottom: 8 }}>
                ✦ AI özeti
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>{aiData.summary}</p>

              {/* Gizli etiketler */}
              {aiData.tags?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Gizli etiketler</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {aiData.tags.map(tag => (
                      <span key={tag} className="badge badge-purple">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Açıklama */}
          {game.description && (
            <div>
              <h2 className="section-title" style={{ fontSize: 16 }}>Hakkında</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>
                {game.description.replace(/<[^>]+>/g, '').slice(0, 600)}
                {game.description.length > 600 && '...'}
              </p>
            </div>
          )}
        </div>

        {/* Sağ: Fiyat matrisi */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>Fiyat karşılaştırması</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            <PriceTable prices={prices} gamePass={game.gamePass} />
          </div>

          {/* Platform linkleri */}
          {prices && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prices.steamUrl && (
                <StoreButton href={prices.steamUrl} name="Steam" color="#1a9fff" price={prices.steam} />
              )}
              {prices.epicUrl && (
                <StoreButton href={prices.epicUrl} name="Epic Games" color="#7B6EE8" price={prices.epic} />
              )}
              {game.gamePass && (
                <StoreButton href="https://www.xbox.com/tr-TR/xbox-game-pass" name="Xbox Game Pass" color="#4ade80" price="Ücretsiz" isGP />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceTable({ prices, gamePass }) {
  const rows = [
    {
      store: 'Steam',
      color: '#1a9fff',
      price: prices?.steam ?? null,
      original: prices?.steamOriginal ?? null,
      available: prices?.steam !== undefined,
    },
    {
      store: 'Epic Games',
      color: '#7B6EE8',
      price: prices?.epic ?? null,
      original: prices?.epicOriginal ?? null,
      available: prices?.epic !== undefined,
    },
    {
      store: 'Xbox / Game Pass',
      color: '#4ade80',
      price: gamePass ? 0 : (prices?.xbox ?? null),
      available: gamePass || prices?.xbox !== undefined,
      isGP: gamePass,
    },
  ];

  const minPrice = Math.min(...rows.filter(r => r.price !== null && r.price >= 0).map(r => r.price));

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mağaza</th>
          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiyat</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.store} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '12px 14px' }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: row.color, marginRight: 8, verticalAlign: 'middle',
              }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{row.store}</span>
            </td>
            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
              {row.isGP ? (
                <span className="badge badge-green">Ücretsiz</span>
              ) : !row.available ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Mevcut değil</span>
              ) : row.price === null ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Yükleniyor…</span>
              ) : (
                <span>
                  {row.original && row.original > row.price && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: 6 }}>₺{row.original}</span>
                  )}
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: row.price === minPrice ? '#4ade80' : '#f0f0f0',
                  }}>₺{row.price}</span>
                </span>
              )}
            </td>
            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
              {row.price === minPrice && row.price >= 0 && !row.isGP && (
                <span title="En ucuz" style={{ fontSize: 14 }}>✓</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StoreButton({ href, name, color, price, isGP }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      textDecoration: 'none',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{name}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: isGP ? '#4ade80' : '#f0f0f0' }}>
        {isGP ? 'Ücretsiz (GP)' : price ? `₺${price}` : 'Gör →'}
      </span>
    </a>
  );
}

function getBestPrice(prices) {
  if (!prices) return null;
  const candidates = [
    prices.steam && { label: `₺${prices.steam}`, store: 'Steam' },
    prices.epic  && { label: `₺${prices.epic}`,  store: 'Epic' },
  ].filter(Boolean);
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => {
    const aNum = parseInt(a.label.replace('₺', ''));
    const bNum = parseInt(b.label.replace('₺', ''));
    return aNum < bNum ? a : b;
  });
}

function DetailSkeleton() {
  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ height: 14, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28 }}>
        <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.05)', aspectRatio: '3/4' }} />
        <div>
          <div style={{ height: 16, width: 200, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 14 }} />
          <div style={{ height: 32, width: '70%', background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
