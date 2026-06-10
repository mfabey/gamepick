'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function GameCard({ game, compact = false }) {
  const [hovered,      setHovered]      = useState(false);
  const [livePrice,    setLivePrice]    = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceDone,    setPriceDone]    = useState(false);
  const cardRef = useRef(null);

  // Kart görünüme girince Steam fiyatı lazy-load et
  useEffect(() => {
    if (!game.hasSteam || priceDone || priceLoading) return;
    const el = cardRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      setPriceLoading(true);

      // Slug varsa garantili doğru eşleşme, yoksa isim fallback
      const params = game.rawgSlug
        ? `slug=${encodeURIComponent(game.rawgSlug)}&hasSteam=true`
        : `name=${encodeURIComponent(game.name)}&hasSteam=true`;

      fetch('/api/card-price?' + params)
        .then(r => r.json())
        .then(d => { if (d.price != null) setLivePrice(d); })
        .catch(() => {})
        .finally(() => { setPriceLoading(false); setPriceDone(true); });
    }, { rootMargin: '300px' });

    obs.observe(el);
    return () => obs.disconnect();
  }, [game.name, game.rawgSlug, game.hasSteam, priceLoading, priceDone]);

  const isFree   = livePrice?.isFree || game.isFree || game.gamePass;
  const isOnSale = (livePrice?.discount > 0) && !isFree;
  const imgH     = compact ? 90 : 110;
  const href     = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;

  return (
    <Link href={href} style={{ flexShrink: 0, width: compact ? imgH * 1.78 : undefined }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background:   '#fff',
          border:       `1.5px solid ${hovered ? '#FECACA' : '#ebebeb'}`,
          borderRadius: 14,
          overflow:     'hidden',
          transition:   'border-color 0.15s, transform 0.15s',
          transform:    hovered ? 'translateY(-2px)' : 'none',
          cursor:       'pointer',
          width:        compact ? imgH * 1.78 : undefined,
        }}
      >
        {/* Kapak */}
        <div style={{ height: imgH, background: '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
          {game.image ? (
            <Image
              src={game.image} alt={game.name} fill
              sizes="(max-width:640px) 50vw, 200px"
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#ccc' }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Sol üst: indirim / ücretsiz badge */}
          <div style={{ position: 'absolute', top: 7, left: 7, display: 'flex', gap: 4 }}>
            {isFree   && <span className="badge badge-green">Ücretsiz</span>}
            {isOnSale && (
              <span className="badge badge-amber" style={{ fontWeight: 700, border: '1px solid #fcd34d' }}>
                {livePrice.storeIcon} -%{livePrice.discount}
              </span>
            )}
          </div>

          {/* Sağ alt: metacritic */}
          {game.metacritic && (
            <div style={{ position: 'absolute', bottom: 6, right: 7 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(0,0,0,0.6)',
                color: game.metacritic >= 80 ? '#4ade80' : game.metacritic >= 60 ? '#fbbf24' : '#f87171',
              }}>
                {game.metacritic}
              </span>
            </div>
          )}
        </div>

        {/* Alt bilgi */}
        <div style={{ padding: '9px 11px' }}>
          <p style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, color: '#1a1a1a', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {game.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>

            {/* Fiyat — yükleme sırasında ⭐ sayısı kalır, gelince ₺ ile değişir */}
            {isFree ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Ücretsiz</span>
            ) : livePrice?.price != null ? (
              isOnSale ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>
                      ₺{livePrice.price}
                    </span>
                    {livePrice.storeIcon && (
                      <span title={livePrice.storeName} style={{ fontSize: 10, opacity: 0.85 }}>
                        {livePrice.storeIcon}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#999', marginTop: 1 }}>
                    <span style={{ textDecoration: 'line-through' }}>₺{livePrice.original}</span>
                    <span style={{ color: '#ea580c', fontWeight: 700 }}>-%{livePrice.discount}</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>
                  ₺{livePrice.price}
                </span>
              )
            ) : priceLoading ? (
              /* Yükleme noktaları — sadece fetch çalışırken görünür */
              <span style={{ fontSize: 10, color: '#e0e0e0', letterSpacing: 3 }}>•••</span>
            ) : (
              <span style={{ fontSize: 11, color: '#999' }}>
                {game.totalReviews > 0 ? '⭐ ' + game.totalReviews.toLocaleString('tr') : '—'}
              </span>
            )}

            {/* Platform badge'leri — sadece geniş kartlarda */}
            {!compact && (
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                {game.hasSteam && (
                  <span title="Steam" style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: '#e3f2fd', color: '#1565c0' }}>STM</span>
                )}
                {game.hasEpic && (
                  <span title="Epic Games" style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: '#fce4ec', color: '#c62828' }}>EPC</span>
                )}
              </div>
            )}
          </div>

          {/* Tür — sadece geniş kartlarda */}
          {!compact && (game.genres || []).slice(0, 1).map(g => (
            <span key={g} className="badge badge-gray" style={{ fontSize: 10, marginTop: 4 }}>{g}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
