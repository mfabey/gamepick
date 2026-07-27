'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth, normalizeName } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

export default function RawgGamePage({ params }) {
  const { slug } = params;
  const { ownedGames, xboxOwnedGames = new Set(), gamePassGames = new Set() } = useAuth();
  const { lang, t, formatPrice } = useLanguage();

  const [game,         setGame]         = useState(null);
  const [steamPrice,   setSteamPrice]   = useState(null);
  const [epicPrice,    setEpicPrice]    = useState(null);
  const [gogPrice,      setGogPrice]      = useState(null);
  const [humblePrice,   setHumblePrice]   = useState(null);
  const [xboxPrices,   setXboxPrices]   = useState([]);
  const [steamLoading, setSteamLoading] = useState(false);
  const [epicLoading,  setEpicLoading]  = useState(false);
  const [gogLoading,    setGogLoading]    = useState(false);
  const [humbleLoading, setHumbleLoading] = useState(false);
  const [xboxLoading,  setXboxLoading]  = useState(false);
  const [ai,           setAi]           = useState(null);
  const [aiLoading,    setAiLoading]    = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [imgIdx,       setImgIdx]       = useState(0);

  const formatReleaseDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Prevent UTC timezone shift for YYYY-MM-DD ISO format
      const sanitized = (typeof dateStr === 'string' && dateStr.includes('-')) 
        ? dateStr.replace(/-/g, '/') 
        : dateStr;
      const parsedDate = new Date(sanitized);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.warn("Date formatting error:", e);
    }
    return dateStr;
  };

  // Alt bara "şu an incelenen oyun" bilgisini bildir
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (game) {
      window.dispatchEvent(new CustomEvent('gamepick:viewing', {
        detail: { name: game.name, image: game.image || null },
      }));
    }
    return () => { window.dispatchEvent(new CustomEvent('gamepick:viewing', { detail: null })); };
  }, [game]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setAi(null);
    setImgIdx(0);          // yeni oyuna geçince galeri başa dönsün
    setSteamPrice(null);
    setEpicPrice(null);
    setGogPrice(null);
    setHumblePrice(null);
    setXboxPrices([]);

    fetch('/api/rawg-game?slug=' + slug)
      .then(r => r.json())
      .then(gameData => {
        if (gameData.error) { setError(gameData.error); return; }
        const g = gameData.game;
        setGame(g);

        // ── Steam fiyatı ─────────────────────────────────────────────────
        if (g.steamAppId) {
          setSteamLoading(true);
          fetch('/api/steam-price?appid=' + g.steamAppId)
            .then(r => r.json())
            .then(d => { if (d.price != null) setSteamPrice(d); })
            .catch(() => {})
            .finally(() => setSteamLoading(false));
        } else if (g.hasSteam) {
          setSteamLoading(true);
          fetch('/api/card-price?name=' + encodeURIComponent(g.name) + '&hasSteam=true')
            .then(r => r.json())
            .then(d => { if (d.price != null) setSteamPrice(d); })
            .catch(() => {})
            .finally(() => setSteamLoading(false));
        }

        // ── Epic + Xbox + GOG + Humble — ITAD (appid ile kesin eşleşme) ──
        setEpicLoading(true);
        setXboxLoading(true);
        setGogLoading(true);
        setHumbleLoading(true);

        // steamAppId varsa ITAD kesin lookup, her iki paramı gönder (lookup başarısız olursa title ile fallback çalışır)
        const priceParam = g.steamAppId
          ? `appid=${encodeURIComponent(g.steamAppId)}&title=${encodeURIComponent(g.name)}`
          : `title=${encodeURIComponent(g.name)}`;

        fetch('/api/prices?' + priceParam)
          .then(r => r.json())
          .then(d => {
            const stores = d.stores || [];

            // Epic — isimde 'epic' geçen her store
            const itadEpic = stores.find(s =>
              s.name?.toLowerCase().includes('epic') ||
              s.storeId?.toLowerCase().includes('epic')
            );
            if (itadEpic) {
              setEpicPrice({
                price:    itadEpic.price,
                original: itadEpic.original,
                discount: itadEpic.discount ?? 0,
                isFree:   itadEpic.isFree,
                url:      itadEpic.url || g.epicUrl,
              });
            }

            // GOG — isimde 'gog' geçen her store
            const itadGog = stores.find(s =>
              s.name?.toLowerCase().includes('gog') ||
              s.storeId === '35'
            );
            if (itadGog) {
              setGogPrice({
                price:    itadGog.price,
                original: itadGog.original,
                discount: itadGog.discount ?? 0,
                isFree:   itadGog.isFree,
                url:      itadGog.url,
              });
            }

            // Humble — isimde 'humble' geçen her store
            const itadHumble = stores.find(s =>
              s.name?.toLowerCase().includes('humble') ||
              s.storeId === '37'
            );
            if (itadHumble) {
              setHumblePrice({
                price:    itadHumble.price,
                original: itadHumble.original,
                discount: itadHumble.discount ?? 0,
                isFree:   itadHumble.isFree,
                url:      itadHumble.url,
              });
            }

            // Xbox — isimde 'xbox' veya 'microsoft' geçen store
            const xboxList = stores.filter(s =>
              s.name?.toLowerCase().includes('xbox') ||
              s.name?.toLowerCase().includes('microsoft') ||
              s.storeId?.toLowerCase().includes('xbox')
            );
            setXboxPrices(xboxList);
          })
          .catch(() => {})
          .finally(() => {
            setEpicLoading(false);
            setXboxLoading(false);
            setGogLoading(false);
            setHumbleLoading(false);
          });

      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── AI özeti ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!game) return;
    setAi(null);
    const aiId = game.steamAppId || ('rawg_' + game.rawgId);
    const desc = (game.description || '').replace(/<[^>]+>/g, '').slice(0, 1500);
    setAiLoading(true);
    fetch(
      '/api/ai-game?appid=' + encodeURIComponent(aiId) +
      '&name='              + encodeURIComponent(game.name) +
      '&description='       + encodeURIComponent(desc) +
      '&lang='              + encodeURIComponent(lang)
    )
      .then(r => r.json())
      .then(d => { if (d && d.ozet) setAi(d); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [game, lang]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !game) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 48, marginBottom: 12 }}>😕</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
        {lang === 'tr' ? 'Oyun bulunamadı' : 'Game not found'}
      </p>
      <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>
        {error || (lang === 'tr' ? 'Bilinmeyen hata' : 'Unknown error')}
      </p>
      <Link href="/games" style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
        {lang === 'tr' ? '← Oyunlara Dön' : '← Back to Games'}
      </Link>
    </div>
  );

  const dealsList = [];
  if (steamPrice?.price != null) dealsList.push({ store: 'Steam', price: steamPrice.price, isFree: steamPrice.isFree });
  if (epicPrice?.price != null) dealsList.push({ store: 'Epic Games', price: epicPrice.price, isFree: epicPrice.isFree });
  if (gogPrice?.price != null) dealsList.push({ store: 'GOG', price: gogPrice.price, isFree: gogPrice.isFree });
  if (humblePrice?.price != null) dealsList.push({ store: 'Humble Bundle', price: humblePrice.price, isFree: humblePrice.isFree });
  for (const p of xboxPrices || []) {
    const xboxLabel = (p.isFree || p.price === 0) ? 'Game Pass' : 'Xbox Store';
    if (p.price != null) dealsList.push({ store: xboxLabel, price: p.price, isFree: p.isFree, id: p.storeId });
  }

  let lowestPrice = Infinity;
  let bestStoreKey = null;
  for (const d of dealsList) {
    const pVal = d.isFree ? 0 : d.price;
    if (pVal < lowestPrice) {
      lowestPrice = pVal;
      bestStoreKey = d.store === 'Xbox' ? `Xbox_${d.id}` : d.store;
    }
  }

  const pricesArray = dealsList.map(d => d.isFree ? 0 : d.price);
  const hasMultiplePrices = pricesArray.length > 1;
  const isCheaperOption = hasMultiplePrices && (Math.min(...pricesArray) < Math.max(...pricesArray));

  const allImages = [game.image, ...(game.screenshots || [])].filter(Boolean);

  // Galeri: fragman varsa ilk sıraya (mp4 — HLS tarayıcılarda native oynamaz)
  const media = [
    ...(game.trailerMp4 ? [{ type: 'video', src: game.trailerMp4, poster: game.image }] : []),
    ...allImages.map(src => ({ type: 'image', src })),
  ];
  const activeMedia = media[imgIdx] || media[0];

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Cinematic Background Blur */}
      {game.image && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 600,
          backgroundImage: `url(${game.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(var(--cinematic-blur)) saturate(160%)',
          opacity: 'var(--cinematic-opacity)',
          pointerEvents: 'none',
          zIndex: 0,
          maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
        }} />
      )}

      <div className="container" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 960, position: 'relative', zIndex: 1 }}>
        <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
          {lang === 'tr' ? '← Oyunlara Dön' : '← Back to Games'}
        </Link>

      {/* Başlık ve Rozetler (Mobil Uyumlu) */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="game-title">{game.name}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {ownedGames.size > 0 && ownedGames.has(normalizeName(game.name)) && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: 'rgba(26,159,255,0.12)', border: '1px solid rgba(26,159,255,0.35)',
              color: '#1a9fff', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {lang === 'tr' ? '✓ Steam Kütüphanende var' : '✓ In your Steam library'}
            </div>
          )}
          {xboxOwnedGames.size > 0 && xboxOwnedGames.has(normalizeName(game.name)) && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.35)',
              color: '#107C10', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {lang === 'tr' ? '✓ Xbox Kütüphanende var' : '✓ In your Xbox library'}
            </div>
          )}
          {gamePassGames.size > 0 && gamePassGames.has(normalizeName(game.name)) && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.35)',
              color: '#107C10', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {lang === 'tr' ? '🎮 Game Pass Kütüphanende var' : '🎮 In your Game Pass library'}
            </div>
          )}
          {game.metacritic && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: game.metacritic >= 80 ? 'var(--green-bg)' : game.metacritic >= 60 ? 'var(--amber-bg)' : 'var(--accent-bg)',
              color:      game.metacritic >= 80 ? 'var(--green)' : game.metacritic >= 60 ? 'var(--amber)' : 'var(--accent)',
              border:     game.metacritic >= 80 ? '1px solid var(--green-border)' : game.metacritic >= 60 ? '1px solid var(--border-hover)' : '1px solid var(--accent-border)',
            }}>
              Metacritic {game.metacritic}
            </div>
          )}
          {game.rating > 0 && (
            <div style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-2)', fontWeight: 600 }}>
              ⭐ {game.rating.toFixed(1)} / 5
            </div>
          )}
        </div>
      </div>

      <div className="game-detail-grid">

        {/* ─── Sol ───────────────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>
          {activeMedia && (
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, aspectRatio: '16/9', position: 'relative', background: 'var(--bg-input)' }}>
              {activeMedia.type === 'video' ? (
                <video
                  key={activeMedia.src}
                  src={activeMedia.src}
                  poster={activeMedia.poster || undefined}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Image src={activeMedia.src} alt={game.name} fill sizes="640px" style={{ objectFit: 'cover' }} unoptimized />
              )}
            </div>
          )}
          {media.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              {media.map((m, i) => (
                <button key={i} onClick={() => setImgIdx(i)} title={m.type === 'video' ? 'Fragman' : undefined} style={{
                  flexShrink: 0, width: 80, height: 50, borderRadius: 8, overflow: 'hidden',
                  border: i === imgIdx ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'none', padding: 0, cursor: 'pointer', position: 'relative',
                }}>
                  <Image src={m.type === 'video' ? m.poster : m.src} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} unoptimized />
                  {m.type === 'video' && (
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 18, lineHeight: 1,
                    }}>▶</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* AI Özeti */}
          {ai && (
            <div className="glass-ai-panel" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {lang === 'tr' ? 'AI Özeti' : 'AI Summary'}
                </span>
              </div>
              {ai.ozet && <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: ai.duygu ? 10 : 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{ai.ozet}</p>}
              {ai.duygu && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', borderTop: '1px solid var(--accent-border)', paddingTop: 10, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  💬 {ai.duygu}
                </p>
              )}
              {ai.etiketler?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {ai.etiketler.map(t => (
                    <span key={t} style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Açıklama — Türkçe modda iken varsa AI çevirisi, yoksa orijinal İngilizce */}
          {(lang === 'tr' && ai?.aciklama) ? (
            <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)', marginBottom: 20, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {ai.aciklama}
            </div>
          ) : (game.description) ? (
            <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)', marginBottom: 20, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {game.description.replace(/<[^>]+>/g, '').slice(0, 1200)}
              {game.description.length > 1200 ? '…' : ''}
              {lang === 'tr' && aiLoading && (
                <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>
                  (Türkçe çeviri yükleniyor…)
                </span>
              )}
            </div>
          ) : null}

          {game.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {game.tags.slice(0, 12).map(t => (
                <span key={t} className="badge badge-gray">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* ─── Sağ ───────────────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>
          {/* Detay tablosu */}
          <div className="glass-panel" style={{ marginBottom: 20, fontSize: 13 }}>
            {[
              { label: lang === 'tr' ? 'Geliştirici' : 'Developer', value: game.developer },
              { label: lang === 'tr' ? 'Yayıncı' : 'Publisher',    value: game.publisher  },
              { label: lang === 'tr' ? 'Çıkış' : 'Release Date',      value: formatReleaseDate(game.released) },
              { label: lang === 'tr' ? 'Türler' : 'Genres',     value: (game.genres || []).join(', ') },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontWeight: 500, color: 'var(--text)', textAlign: 'right', marginLeft: 12, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Platform Fiyatları ──────────────────────────────────── */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{t('detail.priceComparison')}</h2>

            {/* Steam */}
            {game.hasSteam ? (
              steamLoading
                ? <LoadingPriceRow />
                : (steamPrice && steamPrice.isAvailable !== false)
                  ? <PriceCard store="Steam" icon="💻"
                      price={steamPrice.price} original={steamPrice.original}
                      discount={steamPrice.discount} isFree={steamPrice.isFree}
                      url={game.steamUrl}
                      highlight={isCheaperOption && bestStoreKey === 'Steam'}
                    />
                  : steamPrice?.isAvailable === false
                    ? <MissingCard platform="Steam" />
                    : <PlaceholderCard store="Steam" icon="💻" url={game.steamUrl} />
            ) : (
              <MissingCard platform="Steam" />
            )}

            {/* Epic Games */}
            {epicPrice ? (
              <PriceCard store="Epic Games" icon="⚡"
                price={epicPrice.price} original={epicPrice.original}
                discount={epicPrice.discount} isFree={epicPrice.isFree}
                url={epicPrice.url || game.epicUrl}
                highlight={isCheaperOption && bestStoreKey === 'Epic Games'}
              />
            ) : epicLoading ? (
              <LoadingPriceRow />
            ) : game.hasEpic ? (
              <PlaceholderCard store="Epic Games" icon="⚡" url={game.epicUrl} />
            ) : (
              <MissingCard platform="Epic Games" />
            )}

            {/* GOG */}
            {gogPrice ? (
              <PriceCard store="GOG" icon="🌌"
                price={gogPrice.price} original={gogPrice.original}
                discount={gogPrice.discount} isFree={gogPrice.isFree}
                url={gogPrice.url}
                highlight={isCheaperOption && bestStoreKey === 'GOG'}
              />
            ) : gogLoading ? (
              <LoadingPriceRow />
            ) : null}

            {/* Xbox / Game Pass — yalnızca ITAD'dan veri geldiyse göster */}
            {xboxLoading ? (
              <LoadingPriceRow />
            ) : xboxPrices.length > 0 ? (
              xboxPrices.map(p => (
                <PriceCard
                  key={p.storeId || p.name}
                  store={p.isFree || p.price === 0 ? 'Game Pass' : 'Xbox Store'}
                  icon="🎮"
                  price={p.price} original={p.original} discount={p.discount}
                  isFree={p.isFree} url={p.url}
                  highlight={isCheaperOption && bestStoreKey === `Xbox_${p.storeId}`}
                />
              ))
            ) : null /* Xbox verisi yoksa hiç gösterme */}

            {/* Humble Bundle */}
            {humblePrice ? (
              <PriceCard store="Humble Bundle" icon="🙏"
                price={humblePrice.price} original={humblePrice.original}
                discount={humblePrice.discount} isFree={humblePrice.isFree}
                url={humblePrice.url}
                highlight={isCheaperOption && bestStoreKey === 'Humble Bundle'}
              />
            ) : humbleLoading ? (
              <LoadingPriceRow />
            ) : null}

            {/* Xbox / Microsoft Store Fallback */}
            {!xboxPrices.length && game.xboxUrl && (
              <PlaceholderCard store="Xbox / Microsoft Store" icon="🎮" url={game.xboxUrl} />
            )}

            {/* GOG Fallback */}
            {!gogPrice && game.gogUrl && (
              <PlaceholderCard store="GOG Store" icon="🌌" url={game.gogUrl} />
            )}

            {/* PlayStation Store Fallback */}
            {game.playstationUrl && (
              <PlaceholderCard store="PlayStation Store" icon="🟦" url={game.playstationUrl} />
            )}

            {/* Nintendo eShop Fallback */}
            {game.nintendoUrl && (
              <PlaceholderCard store="Nintendo eShop" icon="🔴" url={game.nintendoUrl} />
            )}

            {/* Resmi Web Sitesi (Minecraft vb. özel oyunlar için) */}
            {game.officialUrl && (
              <PlaceholderCard store={lang === 'tr' ? 'Resmi Web Sitesi' : 'Official Website'} icon="🌐" url={game.officialUrl} />
            )}

            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
              {lang === 'tr' 
                ? 'Fiyatlar Steam & ITAD üzerinden alınmaktadır. Anlık değişiklikler yansımayabilir.' 
                : 'Prices are sourced from Steam & ITAD. Real-time updates may not be reflected.'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Epic API sonuçlarında en iyi eşleşmeyi bul ─────────────────────────────
function findBestMatch(gameName, results) {
  if (!results.length) return null;
  const t     = gameName.toLowerCase().trim();
  // Ana başlık: ":" veya "–" öncesi (örn. "Witcher 3: Wild Hunt" → "witcher 3")
  const tBase = t.split(/\s*[:–—]\s*/)[0].trim();
  const tWords = tBase.split(/\s+/).filter(w => w.length > 1);

  // Önce tam eşleşme
  let hit = results.find(i => (i.name || '').toLowerCase().trim() === t);
  if (hit) return hit;

  // Ana başlık eşleşmesi
  hit = results.find(i => {
    const en     = (i.name || '').toLowerCase().trim();
    const enBase = en.split(/\s*[:–—]\s*/)[0].trim();
    return enBase === tBase;
  });
  if (hit) return hit;

  // Birinin diğerini içermesi
  hit = results.find(i => {
    const en = (i.name || '').toLowerCase().trim();
    return en.includes(tBase) || tBase.includes(en.split(/\s*[:–—]\s*/)[0].trim());
  });
  if (hit) return hit;

  // En az 2 anlamlı kelime eşleşiyorsa kabul et
  hit = results.find(i => {
    const enWords = (i.name || '').toLowerCase().split(/\s+/);
    const shared  = tWords.filter(w => enWords.some(ew => ew === w || ew.startsWith(w)));
    return shared.length >= Math.min(2, tWords.length);
  });
  return hit || null;
}

// ── Yükleniyor satırı ───────────────────────────────────────────────────────
function LoadingPriceRow() {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
        background: 'var(--bg-hover)', marginBottom: 8,
      }}>
        <div style={{ height: 14, width: 80, background: 'var(--border-hover)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 14, width: 55, background: 'var(--border-hover)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </>
  );
}

// ── Fiyatlı platform kartı ───────────────────────────────────────────────────
function PriceCard({ store, icon, price, original, discount, isFree: isFreeOverride, url, highlight = false }) {
  const { lang, t, formatPrice } = useLanguage();
  const isFree   = isFreeOverride || price === 0;
  const isOnSale = discount > 0 && !isFree;

  const borderCol = highlight ? 'var(--gold-border)' : 'var(--border)';
  const hoverBorderCol = highlight ? 'var(--gold-border-hover)' : 'var(--accent-border)';
  const bgStyle = highlight ? 'var(--gold-bg)' : undefined;
  const glowShadow = highlight ? 'var(--gold-shadow)' : 'none';

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div
        className={highlight ? '' : 'glass-card'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: 10,
          border: highlight ? `1.5px solid ${borderCol}` : undefined,
          background: bgStyle, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
          boxShadow: glowShadow,
          gap: 12,
        }}
        onMouseEnter={e => {
          if (highlight) {
            e.currentTarget.style.borderColor = hoverBorderCol;
            e.currentTarget.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.3)';
          } else {
            e.currentTarget.style.borderColor = 'var(--accent-border)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.05)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={e => {
          if (highlight) {
            e.currentTarget.style.borderColor = borderCol;
            e.currentTarget.style.boxShadow = glowShadow;
          } else {
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.transform = 'none';
          }
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
          <StoreLogo store={store} />
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{store}</span>
          {highlight && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: 'var(--gold-badge-bg)', color: 'var(--gold-badge-text)', border: '1px solid var(--gold-border)',
              whiteSpace: 'nowrap'
            }}>
              {lang === 'tr' ? '👑 En Ucuz' : '👑 Cheapest'}
            </span>
          )}
        </span>
        <div style={{ textAlign: 'right', flexShrink: 0, fontFamily: "-apple-system, 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
          {isFree ? (
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>{lang === 'tr' ? 'Ücretsiz' : 'Free'}</span>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 15, color: isOnSale ? 'var(--amber)' : 'var(--text)' }}>{formatPrice(price)}</span>
              {isOnSale && (
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ textDecoration: 'line-through' }}>{formatPrice(original)}</span>
                  {' '}<span style={{ color: 'var(--amber)' }}>-%{discount}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </a>
  );
}

// ── Fiyat yok ama link var ───────────────────────────────────────────────────
function PlaceholderCard({ store, icon, url }) {
  const { lang } = useLanguage();
  return (
    <a href={url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div className="glass-card" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10,
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        gap: 12,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent-border)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.05)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '';
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
          <StoreLogo store={store} />
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{store}</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>
          {lang === 'tr' ? 'Mağazaya Git →' : 'Go to Store →'}
        </span>
      </div>
    </a>
  );
}

// ── Oyun bu platformda yok ───────────────────────────────────────────────────
function MissingCard({ platform }) {
  const { lang } = useLanguage();
  return (
    <div className="glass-card" style={{
      padding: '12px 14px', borderRadius: 10, marginBottom: 8,
      borderStyle: 'dashed', opacity: 0.7,
      fontSize: 13, color: 'var(--text-3)', textAlign: 'center',
    }}>
      {lang === 'tr' ? `Bu oyun ${platform}'te bulunmuyor` : `This game is not available on ${platform}`}
    </div>
  );
}

// ── Mağaza logoları ──────────────────────────────────────────────────────────
function StoreLogo({ store }) {
  const s = (store || '').toLowerCase();
  let slug = 'googlechrome', bg = 'var(--accent)';
  if (s.includes('steam'))            { slug = 'steam';          bg = '#1b2838'; }
  else if (s.includes('epic'))        { slug = 'epicgames';      bg = '#121212'; }
  else if (s.includes('game pass'))   { slug = 'xbox';           bg = 'linear-gradient(135deg,#107c10,#0b5a0b)'; }
  else if (s.includes('xbox') || s.includes('microsoft')) { slug = 'xbox'; bg = '#107c10'; }
  else if (s.includes('gog'))         { slug = 'gogdotcom';      bg = '#7c2da0'; }
  else if (s.includes('humble'))      { slug = 'humblebundle';   bg = '#cc2929'; }
  else if (s.includes('playstation')) { slug = 'playstation';    bg = '#003791'; }
  else if (s.includes('nintendo'))    { slug = 'nintendoswitch'; bg = '#e60012'; }

  return (
    <span style={{
      width: 26, height: 26, borderRadius: 7, background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.12)',
    }}>
      <img src={`https://cdn.simpleicons.org/${slug}/white`} alt={store} width={15} height={15} style={{ display: 'block' }} />
    </span>
  );
}

