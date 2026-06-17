'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, normalizeName } from '../context/AuthContext';

function SteamIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.909c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.503 1.009 2.459-.397.957-1.501 1.41-2.455 1.008zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
    </svg>
  );
}

function EpicIcon({ size = 16 }) {
  // Simpleicons'dan alınan gerçek Epic Games logosu path'i
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M3.623 0v18.954l2.507 1.597V3.207h9.123v3.21H9.118v2.674h5.628v3.21H9.118v3.474h6.231v3.21H6.23V24l14.148-4.625V0z"/>
    </svg>
  );
}

export default function GameCard({ game, compact = false, onPriceLoaded }) {
  const { ownedGames, xboxOwnedGames = new Set(), gamePassGames = new Set() } = useAuth();
  const normalizedNameStr = normalizeName(game.name);
  const isOwnedSteam = ownedGames.size > 0 && ownedGames.has(normalizedNameStr);
  const isOwnedXbox  = xboxOwnedGames.size > 0 && xboxOwnedGames.has(normalizedNameStr);
  const isGamePass   = gamePassGames.size > 0 && gamePassGames.has(normalizedNameStr);
  const [hovered,      setHovered]      = useState(false);
  const [livePrice,    setLivePrice]    = useState(game.priceInfo || null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceDone,    setPriceDone]    = useState(!!game.priceInfo);
  const cardRef = useRef(null);

  useEffect(() => {
    if (game.priceInfo) {
      setPriceDone(true);
    }
  }, [game.priceInfo]);

  // Kart görünüme girince Steam fiyatı lazy-load et
  useEffect(() => {
    if (priceDone || priceLoading) return;
    const el = cardRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      setPriceLoading(true);

      // Slug varsa garantili doğru eşleşme, yoksa isim fallback
      const params = game.rawgSlug
        ? `slug=${encodeURIComponent(game.rawgSlug)}&name=${encodeURIComponent(game.name)}&hasSteam=${!!game.hasSteam}`
        : `name=${encodeURIComponent(game.name)}&hasSteam=${!!game.hasSteam}`;

      fetch('/api/card-price?' + params)
        .then(r => r.json())
        .then(d => {
          if (d.price != null) {
            setLivePrice(d);
            if (onPriceLoaded) onPriceLoaded(game.id, d);
          }
        })
        .catch(() => {})
        .finally(() => { setPriceLoading(false); setPriceDone(true); });
    }, { rootMargin: '300px' });

    obs.observe(el);
    return () => obs.disconnect();
  }, [game.name, game.rawgSlug, game.hasSteam, priceLoading, priceDone, onPriceLoaded, game.id]);

  const activePrice = game.priceInfo || livePrice;
  const isFree   = activePrice?.isFree || game.isFree || game.gamePass;
  const isOnSale = (activePrice?.discount > 0) && !isFree;
  const imgH     = compact ? 130 : 150;
  const href     = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;

  return (
    <Link href={href} style={{ flexShrink: 0, width: compact ? imgH * 1.78 : undefined }}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background:   'var(--bg-card)',
          border:       `1.5px solid ${hovered ? 'var(--accent-border)' : 'var(--border)'}`,
          borderRadius: 16,
          overflow:     'hidden',
          transition:   'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
          transform:    hovered ? 'translateY(-5px)' : 'translateY(0)',
          boxShadow:    hovered ? '0 18px 42px rgba(74,52,28,0.17)' : '0 1px 2px rgba(74,52,28,0.05)',
          cursor:       'pointer',
          width:        compact ? imgH * 1.78 : undefined,
          position:     'relative',
          zIndex:       hovered ? 10 : 1,
        }}
      >
        {/* Kapak */}
        <div style={{ aspectRatio: '16/9', width: '100%', background: 'var(--bg-input)', position: 'relative', overflow: 'hidden' }}>
          {game.image ? (
            <Image
              src={game.image} alt={game.name} fill
              sizes="(max-width:640px) 50vw, 200px"
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--text-3)' }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Oyun kutusu parlaklığı */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(125deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.09) 22%, rgba(255,255,255,0) 44%), linear-gradient(to top, rgba(0,0,0,0.30), rgba(0,0,0,0) 46%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 0 0 1px rgba(255,255,255,0.06)' }} />

          {/* Sol üst: indirim / ücretsiz badge */}
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
            {isFree   && <span className="badge badge-green">Ücretsiz</span>}
            {isOnSale && (
              <span className="badge badge-amber" style={{ fontWeight: 700, border: '1px solid var(--border-hover)' }}>
                {activePrice.storeIcon} -%{activePrice.discount}
              </span>
            )}
          </div>

          {/* Sağ üst: sahiplik rozeti */}
          {isOwnedSteam && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                background: 'rgba(26,159,255,0.92)',
                color: '#fff', backdropFilter: 'blur(4px)',
              }}>
                ✓ Sahipsin
              </span>
            </div>
          )}
          {!isOwnedSteam && isOwnedXbox && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                background: 'rgba(16,124,16,0.92)',
                color: '#fff', backdropFilter: 'blur(4px)',
              }}>
                ✓ Xbox'ta
              </span>
            </div>
          )}
          {!isOwnedSteam && !isOwnedXbox && isGamePass && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                background: 'rgba(16,124,16,0.92)',
                color: '#fff', backdropFilter: 'blur(4px)',
              }}>
                🎮 Game Pass
              </span>
            </div>
          )}

          {/* Sol alt: platform logoları */}
          <div style={{ position: 'absolute', bottom: 7, left: 8, display: 'flex', gap: 4 }}>
            {(game.hasSteam || activePrice?.storeName === 'Steam') && activePrice?.isAvailable !== false && (
              <span title="Steam" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(23,42,61,0.92)', backdropFilter: 'blur(4px)',
                color: '#c7d5e0',
              }}>
                <SteamIcon size={14} />
              </span>
            )}
            {(game.hasEpic || activePrice?.storeName === 'Epic Games') && (
              <span title="Epic Games" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                color: '#ffffff',
              }}>
                <EpicIcon size={13} />
              </span>
            )}
          </div>

          {/* Sağ alt: metacritic */}
          {game.metacritic && (
            <div style={{ position: 'absolute', bottom: 7, right: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                background: 'rgba(0,0,0,0.65)',
                color: game.metacritic >= 80 ? '#4ade80' : game.metacritic >= 60 ? '#fbbf24' : '#f87171',
              }}>
                {game.metacritic}
              </span>
            </div>
          )}
        </div>

        {/* Alt bilgi */}
        <div style={{ padding: '13px 15px' }}>
          <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: 'var(--text)', marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {game.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, fontFamily: "-apple-system, 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif" }}>

            {/* Fiyat */}
            {isFree ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Ücretsiz</span>
            ) : activePrice?.price != null ? (
              isOnSale ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
                      {activePrice.price} ₺
                    </span>
                    {activePrice.storeIcon && (
                      <span title={activePrice.storeName} style={{ fontSize: 11, opacity: 0.85 }}>
                        {activePrice.storeIcon}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    <span style={{ textDecoration: 'line-through' }}>{activePrice.original} ₺</span>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>-%{activePrice.discount}</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {activePrice.price} ₺
                </span>
              )
            ) : priceLoading ? (
              <span style={{ fontSize: 11, color: 'var(--border-hover)', letterSpacing: 3 }}>•••</span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {game.totalReviews > 0 ? '⭐ ' + game.totalReviews.toLocaleString('tr') : '—'}
              </span>
            )}

          </div>

          {/* Tür — sadece geniş kartlarda */}
          {!compact && (game.genres || []).slice(0, 1).map(g => (
            <span key={g} className="badge badge-gray" style={{ marginTop: 6 }}>{g}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
