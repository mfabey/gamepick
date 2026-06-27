'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
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
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M3.623 0v18.954l2.507 1.597V3.207h9.123v3.21H9.118v2.674h5.628v3.21H9.118v3.474h6.231v3.21H6.23V24l14.148-4.625V0z"/>
    </svg>
  );
}

// Steam App ID çözümleme (GameImage'dan bağımsız, kart içi kullanım)
const SLUG_TO_STEAM = {
  'elden-ring': '1245620', 'grand-theft-auto-v': '271590', 'cyberpunk-2077': '1091500',
  'lethal-company': '1966720', 'palworld': '1623730', 'balatro': '2379780',
  'manor-lords': '1363080', 'phasmophobia': '739630', 'baldurs-gate-3': '1086940',
  'counter-strike-2': '730', 'rust': '252490', 'helldivers-2': '553850',
  'among-us': '945360', 'supermarket-simulator': '2670630',
};

function getSteamAppId(game) {
  if (game.appid) return game.appid;
  if (game.steamAppId) return game.steamAppId;
  if (game.steamAppid) return game.steamAppid;
  if (game.steam_appid) return game.steam_appid;
  // URL'den çıkar
  const urls = [game.image, game.logo, game.steamUrl, game.storeUrl].filter(Boolean);
  for (const u of urls) {
    const m = u.match(/\/apps?\/([\d]+)/);
    if (m) return m[1];
  }
  // Slug eşleştirmesi
  const slug = game.rawgSlug || game.slug;
  if (slug && SLUG_TO_STEAM[slug]) return SLUG_TO_STEAM[slug];
  // rawgId'den çıkar (Steam'e doğrudan eşleşen oyunlar)
  const rawgId = game.rawgId || game.id;
  if (rawgId) {
    const numId = Number(String(rawgId).replace('rawg_', ''));
    // Eğer numId 6 hane ve üzeri ise, Steam AppID olma ihtimali yüksek
    if (numId > 100000) return String(numId);
  }
  return null;
}

// Dikey (3:4) oyun kartı — prototip GxCard: 3B eğilme, üzerine gelince bilgi + kırmızı glow + screenshot slideshow
function GameCard({ game, compact = false, cardWidth }) {
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

  // ── Screenshot slideshow state ──
  const [ssIndex, setSsIndex] = useState(0);
  const [ssUrls, setSsUrls] = useState([]);
  const [ssLoaded, setSsLoaded] = useState(new Set());
  const ssInterval = useRef(null);

  // Steam screenshot URL'lerini fetch et
  useEffect(() => {
    // RAWG'dan halihazırda gelmişse onu kullan
    if (game.short_screenshots && game.short_screenshots.length > 0) {
      setSsUrls(game.short_screenshots.map(s => s.image || s).slice(0, 5));
      return;
    }
    if (game.screenshots && game.screenshots.length > 0) {
      setSsUrls(game.screenshots.slice(0, 5));
      return;
    }

    const appid = getSteamAppId(game);
    if (!appid) { setSsUrls([]); return; }
    
    fetch(`/api/game-screenshots?appid=${appid}`)
      .then(r => r.json())
      .then(d => {
        if (d.screenshots && d.screenshots.length > 0) {
          // İlk 5 ekran görüntüsü
          setSsUrls(d.screenshots.slice(0, 5));
        }
      })
      .catch(() => {});
  }, [game]);

  // Hover başladığında slideshow'u başlat
  const startSlideshow = useCallback(() => {
    if (ssInterval.current) clearInterval(ssInterval.current);
    setSsIndex(0);
    ssInterval.current = setInterval(() => {
      setSsIndex(prev => prev + 1);
    }, 1200);
  }, []);

  const stopSlideshow = useCallback(() => {
    if (ssInterval.current) {
      clearInterval(ssInterval.current);
      ssInterval.current = null;
    }
    setSsIndex(0);
  }, []);

  useEffect(() => {
    return () => { if (ssInterval.current) clearInterval(ssInterval.current); };
  }, []);

  // 3B eğilme (mouse takipli)
  const handleTilt = (e) => {
    const el = cardRef.current;
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
    stopSlideshow();
    const el = cardRef.current;
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
  const href     = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;
  const mcColor  = game.metacritic >= 80 ? '#4ade80' : game.metacritic >= 60 ? '#fbbf24' : '#f87171';
  const genres   = (game.genres || []).slice(0, 2).join(' · ');

  // Aktif screenshot URL'si (döngüsel)
  const validSsUrls = ssUrls.filter((_, i) => ssLoaded.has(i));
  const activeScreenshot = validSsUrls.length > 0 ? validSsUrls[ssIndex % validSsUrls.length] : null;

  return (
    <Link draggable={false} onDragStart={(e) => e.preventDefault()} href={href} style={{ flexShrink: 0, width: compact ? (cardWidth || 220) : '100%', perspective: 1100, display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={() => { setHovered(true); startSlideshow(); }}
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#0d0f12',
          cursor: 'pointer',
          transformStyle: 'preserve-3d',
          transform: `rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(${hovered ? -8 : 0}px) scale(${hovered ? 1.035 : 1})`,
          transition: 'transform 0.14s ease-out, box-shadow 0.35s ease',
          boxShadow: hovered
            ? '0 34px 70px -22px var(--accent-glow), 0 0 0 1px var(--accent-border), inset 0 0 0 1px rgba(255,255,255,0.10)'
            : '0 8px 24px -14px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)',
          willChange: 'transform',
        }}
      >
        {/* Kapak görseli */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <GameImage game={game} alt={game.name} fill isVertical style={{ objectFit: 'cover', pointerEvents: 'none' }} />
        </div>

        {/* Mouse takipli ışık */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: hovered ? 1 : 0, transition: 'opacity 0.35s ease', mixBlendMode: 'soft-light', background: 'radial-gradient(190px circle at var(--mx,50%) var(--my,40%), rgba(255,255,255,0.22), transparent 60%)' }} />

        {/* Alt karartma */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: hovered
          ? 'linear-gradient(to top, rgba(6,7,9,0.97) 24%, rgba(6,7,9,0.78) 52%, rgba(6,7,9,0.18) 90%)'
          : 'linear-gradient(to top, rgba(6,7,9,0.94) 4%, rgba(6,7,9,0.55) 30%, rgba(6,7,9,0) 56%)', transition: 'background 0.35s ease' }} />

        {/* Üst rozetler */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
            {isFree && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', padding: '4px 9px', borderRadius: 8, color: '#04130d', background: '#19f0a0' }}>{t('card.free')}</span>}
            {isOnSale && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', padding: '4px 9px', borderRadius: 8, color: '#fff', background: 'var(--accent)', boxShadow: '0 6px 16px -6px var(--accent-glow)' }}>{livePrice.storeIcon} -%{livePrice.discount}</span>}
            {isOwnedSteam && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(26,159,255,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>✓ {t('card.owned')}</span>}
            {!isOwnedSteam && isOwnedXbox && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,124,16,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>✓ {t('card.xbox')}</span>}
            {!isOwnedSteam && !isOwnedXbox && isGamePass && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,124,16,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>🎮 {t('card.gamepass')}</span>}
          </div>
          {game.metacritic ? (
            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(8,10,14,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.14)', color: mcColor }}>{game.metacritic}</span>
          ) : null}
        </div>

        {/* Alt bilgi (varsayılan) */}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 3, opacity: hovered ? 0 : 1, transform: hovered ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.28s ease, transform 0.3s cubic-bezier(0.2,0.9,0.3,1)' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 17, lineHeight: 1.12, letterSpacing: '-0.4px', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
          {genres && <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.66)', marginTop: 4 }}>{genres}</p>}
        </div>

        {/* Üzerine gelince: detay + fiyat + mağaza (ve yeni dinamik screenshot) */}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 5, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(14px)', pointerEvents: hovered ? 'auto' : 'none', transition: 'opacity 0.3s ease, transform 0.34s cubic-bezier(0.2,0.9,0.3,1)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Dinamik Screenshot (Oyun adının hemen üstünde yer alır) */}
          {activeScreenshot && (
            <div
              key={activeScreenshot}
              style={{
                width: '100%', aspectRatio: '16/9', marginBottom: 12, borderRadius: 10, position: 'relative',
                backgroundImage: `url(${activeScreenshot})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                animation: 'ssReveal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                boxShadow: '0 8px 30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {/* Slideshow ilerleme çubuğu */}
              {validSsUrls.length > 1 && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, zIndex: 12,
                  display: 'flex', gap: 3, padding: '6px 8px',
                }}>
                  {validSsUrls.map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i === (ssIndex % validSsUrls.length)
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(255,255,255,0.25)',
                      transition: 'background 0.3s',
                      boxShadow: i === (ssIndex % validSsUrls.length) ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, lineHeight: 1.1, letterSpacing: '-0.3px', color: '#fff', marginBottom: 8 }}>{game.name}</p>
          {genres && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>{genres}</p>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {(game.hasSteam || livePrice?.storeName === 'Steam') && (
                <span title="Steam" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'rgba(23,42,61,0.92)', color: '#c7d5e0' }}><SteamIcon size={13} /></span>
              )}
              {(game.hasEpic || livePrice?.storeName === 'Epic Games') && (
                <span title="Epic Games" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.85)', color: '#fff' }}><EpicIcon size={12} /></span>
              )}
            </div>
            <span style={{ textAlign: 'right' }}>
              {isFree ? (
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, color: '#19f0a0' }}>{t('card.free')}</span>
              ) : livePrice?.price != null ? (
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  {isOnSale && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>{formatPrice(livePrice.original)}</span>}
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, color: isOnSale ? '#fbbf24' : '#fff' }}>{formatPrice(livePrice.price)}</span>
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{game.totalReviews > 0 ? '⭐ ' + game.totalReviews.toLocaleString('tr') : '—'}</span>
              )}
            </span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 11, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 20px -8px var(--accent-glow)' }}>İncele</span>
        </div>
      </div>
    </Link>
  );
}

export default memo(GameCard, (prev, next) =>
  prev.game.id === next.game.id &&
  prev.compact === next.compact &&
  prev.cardWidth === next.cardWidth
);

