'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import GameImage from './GameImage';
import { useAuth, normalizeName } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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

function GameCard({ game, compact = false }) {
  const { ownedGames, xboxOwnedGames = new Set(), gamePassGames = new Set() } = useAuth();
  const { lang, t, formatPrice } = useLanguage();
  const normalizedNameStr = normalizeName(game.name);
  const isOwnedSteam = ownedGames.size > 0 && ownedGames.has(normalizedNameStr);
  const isOwnedXbox  = xboxOwnedGames.size > 0 && xboxOwnedGames.has(normalizedNameStr);
  const isGamePass   = gamePassGames.size > 0 && gamePassGames.has(normalizedNameStr);
  const [hovered,      setHovered]      = useState(false);
  const [livePrice,    setLivePrice]    = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceDone,    setPriceDone]    = useState(false);
  const cardRef = useRef(null);
  const tiltRef = useRef(null);

  // 3B eğilme (mouse takipli) + üzerine gelince yükselme
  const handleTilt = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  };
  const resetTilt = () => {
    setHovered(false);
    const el = tiltRef.current;
    if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
  };

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
        .then(d => { if (d.price != null) setLivePrice(d); })
        .catch(() => {})
        .finally(() => { setPriceLoading(false); setPriceDone(true); });
    }, { rootMargin: '300px' });

    obs.observe(el);
    return () => obs.disconnect();
  }, [game.name, game.rawgSlug, game.hasSteam, priceLoading, priceDone]);

  const isFree   = livePrice?.isFree || game.isFree || game.gamePass;
  const isOnSale = (livePrice?.discount > 0) && !isFree;
  const imgH     = compact ? 130 : 150;
  const href     = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;

  return (
    <Link href={href} style={{ flexShrink: 0, width: compact ? imgH * 1.78 : undefined, perspective: 1100 }}>
      <div
        ref={el => { cardRef.current = el; tiltRef.current = el; }}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        style={{
          background:   'var(--bg-card)',
          border:       `1.5px solid ${hovered ? 'var(--accent-border)' : 'var(--border)'}`,
          borderRadius: 16,
          overflow:     'hidden',
          transition:   'border-color 0.2s, box-shadow 0.35s, transform 0.14s ease-out',
          transform:    `rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(${hovered ? -8 : 0}px) scale(${hovered ? 1.035 : 1})`,
          transformStyle: 'preserve-3d',
          boxShadow:    hovered ? '0 34px 70px -22px var(--accent-glow), 0 0 0 1px var(--accent-border)' : '0 1px 2px rgba(0,0,0,0.2)',
          cursor:       'pointer',
          width:        compact ? imgH * 1.78 : undefined,
          position:     'relative',
          zIndex:       hovered ? 10 : 1,
          willChange:   'transform',
        }}
      >
        {/* Kapak */}
        <div style={{ aspectRatio: '16/9', width: '100%', background: 'var(--bg-input)', position: 'relative', overflow: 'hidden' }}>
          <GameImage
            game={game}
            alt={game.name}
            fill
            style={{ objectFit: 'cover', pointerEvents: 'none' }}
          />

          {/* Oyun kutusu parlaklığı + mouse takipli ışık */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(125deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.09) 22%, rgba(255,255,255,0) 44%), linear-gradient(to top, rgba(0,0,0,0.30), rgba(0,0,0,0) 46%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 0 0 1px rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: hovered ? 1 : 0, transition: 'opacity 0.35s ease', mixBlendMode: 'soft-light', background: 'radial-gradient(180px circle at var(--mx,50%) var(--my,40%), rgba(255,255,255,0.22), transparent 60%)' }} />

          {/* Sol üst: indirim / ücretsiz badge */}
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
            {isFree   && <span className="badge badge-green">{t('card.free')}</span>}
            {isOnSale && (
              <span className="badge badge-amber" style={{ fontWeight: 700, border: '1px solid var(--border-hover)' }}>
                {livePrice.storeIcon} -%{livePrice.discount}
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
                ✓ {t('card.owned')}
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
                ✓ {t('card.xbox')}
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
                🎮 {t('card.gamepass')}
              </span>
            </div>
          )}

          {/* Sol alt: platform logoları */}
          <div style={{ position: 'absolute', bottom: 7, left: 8, display: 'flex', gap: 4 }}>
            {(game.hasSteam || livePrice?.storeName === 'Steam') && livePrice?.isAvailable !== false && (
              <span title="Steam" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(23,42,61,0.92)', backdropFilter: 'blur(4px)',
                color: '#c7d5e0',
              }}>
                <SteamIcon size={14} />
              </span>
            )}
            {(game.hasEpic || livePrice?.storeName === 'Epic Games') && (
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{t('card.free')}</span>
            ) : livePrice?.price != null ? (
              isOnSale ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
                      {formatPrice(livePrice.price)}
                    </span>
                    {livePrice.storeIcon && (
                      <span title={livePrice.storeName} style={{ fontSize: 11, opacity: 0.85 }}>
                        {livePrice.storeIcon}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    <span style={{ textDecoration: 'line-through' }}>{formatPrice(livePrice.original)}</span>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>-%{livePrice.discount}</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {formatPrice(livePrice.price)}
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

// game.id değişmedikçe yeniden render etme — anasayfadaki typewriter/hover
// state güncellemelerinde 60+ kartın gereksiz re-render'ını önler
export default memo(GameCard, (prev, next) =>
  prev.game.id === next.game.id &&
  prev.compact === next.compact
);
