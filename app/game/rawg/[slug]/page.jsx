'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function RawgGamePage({ params }) {
  const { slug } = params;

  const [game,    setGame]    = useState(null);
  const [prices,  setPrices]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [imgIdx,  setImgIdx]  = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetch('/api/rawg-game?slug=' + slug)
      .then(r => r.json())
      .then(gameData => {
        if (gameData.error) { setError(gameData.error); return; }
        setGame(gameData.game);

        const steamAppId = gameData.game?.steamAppId;
        const name       = gameData.game?.name;
        const pricePromises = [];

        if (steamAppId) {
          pricePromises.push(
            fetch('https://store.steampowered.com/api/appdetails?appids=' + steamAppId + '&cc=tr&filters=price_overview')
              .then(r => r.json())
              .then(d => {
                const info = d?.[steamAppId]?.data?.price_overview;
                if (!info) return null;
                return {
                  store:    'Steam',
                  price:    Math.round(info.final / 100),
                  original: Math.round(info.initial / 100),
                  discount: info.discount_percent,
                  url:      'https://store.steampowered.com/app/' + steamAppId,
                  currency: 'TRY',
                };
              })
              .catch(() => null)
          );
        }

        if (name) {
          pricePromises.push(
            fetch('/api/prices?title=' + encodeURIComponent(name))
              .then(r => r.json())
              .then(d => d.prices || [])
              .catch(() => [])
          );
        }

        Promise.all(pricePromises).then(results => {
          setPrices(results.flat().filter(Boolean));
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #f0f0f0', borderTopColor: '#DC2626', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !game) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 48, marginBottom: 12 }}>😕</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Oyun bulunamadı</p>
      <p style={{ color: '#999', marginBottom: 24 }}>{error || 'Bilinmeyen hata'}</p>
      <Link href="/games" style={{ padding: '10px 24px', background: '#DC2626', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>← Oyunlara Dön</Link>
    </div>
  );

  const screenshots = game.screenshots || [];
  const allImages   = [game.image, ...screenshots].filter(Boolean);
  const steamPrice  = prices.find(p => p.store === 'Steam');
  const otherPrices = prices.filter(p => p.store !== 'Steam');

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 960 }}>
      <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#999', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Oyunlara Dön
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>

        {/* Sol: görsel + meta */}
        <div>
          {allImages.length > 0 && (
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, aspectRatio: '16/9', position: 'relative', background: '#f0f0f0' }}>
              <Image src={allImages[imgIdx]} alt={game.name} fill sizes="640px" style={{ objectFit: 'cover' }} unoptimized />
            </div>
          )}
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20 }}>
              {allImages.map((src, i) => (
                <button key={i} onClick={() => setImgIdx(i)} style={{
                  flexShrink: 0, width: 80, height: 50, borderRadius: 8, overflow: 'hidden',
                  border: i === imgIdx ? '2px solid #DC2626' : '2px solid transparent',
                  background: 'none', padding: 0, cursor: 'pointer', position: 'relative',
                }}>
                  <Image src={src} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} unoptimized />
                </button>
              ))}
            </div>
          )}
          {game.description && (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#444', marginBottom: 20 }}
              dangerouslySetInnerHTML={{ __html: game.description.slice(0, 1200) + (game.description.length > 1200 ? '…' : '') }}
            />
          )}
          {game.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {game.tags.slice(0, 12).map(t => (
                <span key={t} className="badge badge-gray">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Sağ: bilgi + fiyatlar */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: 10 }}>{game.name}</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {game.metacritic && (
              <div style={{
                padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                background: game.metacritic >= 80 ? '#dcfce7' : game.metacritic >= 60 ? '#fef9c3' : '#fee2e2',
                color:      game.metacritic >= 80 ? '#166534' : game.metacritic >= 60 ? '#713f12' : '#991b1b',
              }}>
                Metacritic {game.metacritic}
              </div>
            )}
            {game.rating > 0 && (
              <div style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: '#f5f5f5', color: '#555' }}>
                ⭐ {game.rating.toFixed(1)} ({(game.totalReviews || 0).toLocaleString('tr')} oy)
              </div>
            )}
          </div>

          <div style={{ background: '#fafafa', border: '1.5px solid #ebebeb', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
            {[
              { label: 'Geliştirici', value: game.developer },
              { label: 'Yayıncı',     value: game.publisher },
              { label: 'Çıkış',       value: game.released },
              { label: 'Türler',      value: (game.genres || []).join(', ') },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#999' }}>{row.label}</span>
                <span style={{ fontWeight: 500, color: '#1a1a1a', textAlign: 'right', maxWidth: 180 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Fiyatlar</h2>

          {game.hasSteam ? (
            steamPrice ? (
              <PriceCard store="Steam" icon="💻"
                price={steamPrice.price} original={steamPrice.original} discount={steamPrice.discount}
                url={steamPrice.url}
              />
            ) : (
              <PlaceholderCard store="Steam" icon="💻" url={'https://store.steampowered.com/app/' + game.steamAppId} />
            )
          ) : (
            <MissingCard platform="Steam" />
          )}

          {game.hasEpic ? (
            <PlaceholderCard store="Epic Games" icon="⚡" url={game.epicUrl} />
          ) : (
            <MissingCard platform="Epic Games" />
          )}

          {otherPrices.map(p => (
            <PriceCard key={p.store}
              store={p.store} icon={p.store.toLowerCase().includes('xbox') ? '🎮' : '🏪'}
              price={p.price} original={p.original} discount={p.discount}
              url={p.url}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceCard({ store, icon, price, original, discount, url }) {
  const isFree   = price === 0;
  const isOnSale = discount > 0 && !isFree;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10, marginBottom: 8,
        border: '1.5px solid #ebebeb', background: '#fff', cursor: 'pointer',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{icon} {store}</span>
        <div style={{ textAlign: 'right' }}>
          {isFree ? (
            <span style={{ fontWeight: 700, fontSize: 15, color: '#16a34a' }}>Ücretsiz</span>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 15, color: isOnSale ? '#ea580c' : '#1a1a1a' }}>₺{price}</span>
              {isOnSale && (
                <>
                  <br />
                  <span style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>₺{original}</span>
                  {' '}
                  <span style={{ fontSize: 11, color: '#ea580c' }}>-%{discount}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </a>
  );
}

function PlaceholderCard({ store, icon, url }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10, marginBottom: 8,
        border: '1.5px solid #ebebeb', background: '#fff',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{icon} {store}</span>
        <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Mağazaya Git →</span>
      </div>
    </a>
  );
}

function MissingCard({ platform }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10, marginBottom: 8,
      border: '1.5px dashed #e5e5e5', background: '#fafafa',
      fontSize: 13, color: '#bbb', textAlign: 'center',
    }}>
      Bu oyun {platform}&apos;te bulunmuyor
    </div>
  );
}
