'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth, normalizeName } from '../../../context/AuthContext';

export default function RawgGamePage({ params }) {
  const { slug } = params;
  const { ownedGames, xboxOwnedGames = new Set(), gamePassGames = new Set() } = useAuth();

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

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setAi(null);
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

        // ── AI özeti ─────────────────────────────────────────────────────
        const desc = (g.description || '').replace(/<[^>]+>/g, '').slice(0, 1500);
        const aiId = g.steamAppId || ('rawg_' + g.rawgId);
        setAiLoading(true);
        fetch(
          '/api/ai-game?appid=' + encodeURIComponent(aiId) +
          '&name='              + encodeURIComponent(g.name) +
          '&description='       + encodeURIComponent(desc)
        )
          .then(r => r.json())
          .then(d => { if (d && d.ozet) setAi(d); })
          .catch(() => {})
          .finally(() => setAiLoading(false));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !game) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 48, marginBottom: 12 }}>😕</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Oyun bulunamadı</p>
      <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>{error || 'Bilinmeyen hata'}</p>
      <Link href="/games" style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
        ← Oyunlara Dön
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
          ← Oyunlara Dön
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
              ✓ Steam Kütüphanende var
            </div>
          )}
          {xboxOwnedGames.size > 0 && xboxOwnedGames.has(normalizeName(game.name)) && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.35)',
              color: '#107C10', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              ✓ Xbox Kütüphanende var
            </div>
          )}
          {gamePassGames.size > 0 && gamePassGames.has(normalizeName(game.name)) && (
            <div style={{
              padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.35)',
              color: '#107C10', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              🎮 Game Pass Kütüphanende var
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
          {allImages.length > 0 && (
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, aspectRatio: '16/9', position: 'relative', background: 'var(--bg-input)' }}>
              <Image src={allImages[imgIdx]} alt={game.name} fill sizes="640px" style={{ objectFit: 'cover' }} unoptimized />
            </div>
          )}
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              {allImages.map((src, i) => (
                <button key={i} onClick={() => setImgIdx(i)} style={{
                  flexShrink: 0, width: 80, height: 50, borderRadius: 8, overflow: 'hidden',
                  border: i === imgIdx ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'none', padding: 0, cursor: 'pointer', position: 'relative',
                }}>
                  <Image src={src} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} unoptimized />
                </button>
              ))}
            </div>
          )}

          {/* AI Özeti */}
          {ai && (
            <div className="glass-ai-panel" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>AI Özeti</span>
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

          {/* Açıklama — AI yüklenince Türkçe, yoksa İngilizce */}
          {(ai?.aciklama || game.description) && (
            <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)', marginBottom: 20, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {ai?.aciklama ? (
                ai.aciklama
              ) : (
                <>
                  {game.description.replace(/<[^>]+>/g, '').slice(0, 1200)}
                  {game.description.length > 1200 ? '…' : ''}
                  {aiLoading && (
                    <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>
                      (Türkçe çeviri yükleniyor…)
                    </span>
                  )}
                </>
              )}
            </div>
          )}

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
              { label: 'Geliştirici', value: game.developer },
              { label: 'Yayıncı',    value: game.publisher  },
              { label: 'Çıkış',      value: game.released   },
              { label: 'Türler',     value: (game.genres || []).join(', ') },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontWeight: 500, color: 'var(--text)', textAlign: 'right', marginLeft: 12, wordBreak: 'break-word' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Platform Fiyatları ──────────────────────────────────── */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Platform Fiyatları</h2>

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
              <PlaceholderCard store="Resmi Web Sitesi" icon="🌐" url={game.officialUrl} />
            )}

            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
              Fiyatlar Steam & ITAD üzerinden alınmaktadır. Anlık değişiklikler yansımayabilir.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Mağaza logo bileşeni ─────────────────────────────────────────────────────
function StoreLogo({ store }) {
  const s = store?.toLowerCase() || '';

  if (s.includes('steam')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#1b2838', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#c7d5e0" d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.909c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.503 1.009 2.459-.397.957-1.501 1.41-2.455 1.008zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
      </svg>
    </span>
  );

  if (s.includes('epic')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#000', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M3.623 0v18.954l2.507 1.597V3.207h9.123v3.21H9.118v2.674h5.628v3.21H9.118v3.474h6.231v3.21H6.23V24l14.148-4.625V0z"/>
      </svg>
    </span>
  );

  if (s.includes('gog')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#7b2fbe', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8c3.978 0 7.2 3.222 7.2 7.2s-3.222 7.2-7.2 7.2S4.8 15.978 4.8 12 8.022 4.8 12 4.8zm0 2.4c-2.651 0-4.8 2.149-4.8 4.8s2.149 4.8 4.8 4.8 4.8-2.149 4.8-4.8-2.149-4.8-4.8-4.8zm0 1.8a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
      </svg>
    </span>
  );

  if (s.includes('game pass')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#107c10', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M4.102 5.475C6.37 2.mumble15 9.039 0 12 0c2.96 0 5.63 2.15 7.898 5.475C22.166 8.8 24 12.74 24 16.5c0 2.072-.957 3.768-2.285 4.786C20.392 22.304 18.784 23 16.5 23c-1.432 0-2.583-.41-3.676-1.16A23.65 23.65 0 0 1 12 21.5a23.65 23.65 0 0 1-.824.34C10.083 22.59 8.932 23 7.5 23c-2.284 0-3.892-.696-5.215-1.714C.957 20.268 0 18.572 0 16.5c0-3.76 1.834-7.7 4.102-11.025zM12 2c-1.895 0-4.16 1.745-6.2 4.737C3.755 9.713 2 13.363 2 16.5c0 1.428.668 2.607 1.66 3.377C4.657 20.65 5.865 21 7.5 21c1.068 0 1.917-.31 2.824-.84.415-.246.78-.474 1.676-.974.896.5 1.261.728 1.676.974.907.53 1.756.84 2.824.84 1.635 0 2.843-.35 3.84-1.123C21.332 19.107 22 17.928 22 16.5c0-3.137-1.755-6.787-3.8-9.763C16.16 3.745 13.895 2 12 2z"/>
      </svg>
    </span>
  );

  if (s.includes('xbox') || s.includes('microsoft')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#107c10', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M4.102 5.475C6.37 2.15 9.039 0 12 0c2.96 0 5.63 2.15 7.898 5.475C22.166 8.8 24 12.74 24 16.5c0 2.072-.957 3.768-2.285 4.786C20.392 22.304 18.784 23 16.5 23c-1.432 0-2.583-.41-3.676-1.16A23.65 23.65 0 0 1 12 21.5a23.65 23.65 0 0 1-.824.34C10.083 22.59 8.932 23 7.5 23c-2.284 0-3.892-.696-5.215-1.714C.957 20.268 0 18.572 0 16.5c0-3.76 1.834-7.7 4.102-11.025zM12 2c-1.895 0-4.16 1.745-6.2 4.737C3.755 9.713 2 13.363 2 16.5c0 1.428.668 2.607 1.66 3.377C4.657 20.65 5.865 21 7.5 21c1.068 0 1.917-.31 2.824-.84.415-.246.78-.474 1.676-.974.896.5 1.261.728 1.676.974.907.53 1.756.84 2.824.84 1.635 0 2.843-.35 3.84-1.123C21.332 19.107 22 17.928 22 16.5c0-3.137-1.755-6.787-3.8-9.763C16.16 3.745 13.895 2 12 2z"/>
      </svg>
    </span>
  );

  if (s.includes('humble')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#cc2727', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.371 18.764l-4.53-4.53 1.414-1.414 3.116 3.116 6.364-6.364 1.414 1.414-7.778 7.778z"/>
      </svg>
    </span>
  );

  if (s.includes('playstation')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#003791', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M8.984 2.596v15.43l3.915 1.23V6.688c0-.612.27-.978.702-.844.561.18.67.812.67 1.424v5.8l3.917 1.23V7.57c0-2.785-1.52-4.074-3.987-4.86-1.201-.383-3.043-.79-5.217-1.114zM2 17.42l4.989 1.735.006-3.63L2 13.738zm15.285-4.528c-2.255-.77-4.758-1.08-6.285-1.478v3.067l3.79 1.307v-1.664c0-.61.244-1.022.69-.864.563.197.663.743.663 1.35v7.389L24 21.39V14.97c-1.927-1.257-4.11-1.554-6.715-2.078z"/>
      </svg>
    </span>
  );

  if (s.includes('nintendo')) return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'#e60012', flexShrink:0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#fff" d="M9.03 4H14.97A8 8 0 0 1 23 12a8 8 0 0 1-8.03 8H9.03A8 8 0 0 1 1 12a8 8 0 0 1 8.03-8zm5.47 2.5A5.5 5.5 0 0 1 20 12a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 9 12a5.5 5.5 0 0 1 5.5-5.5zM8.5 8.5a3.5 3.5 0 0 0-3.5 3.5 3.5 3.5 0 0 0 3.5 3.5A3.5 3.5 0 0 0 12 12a3.5 3.5 0 0 0-3.5-3.5z"/>
      </svg>
    </span>
  );

  // Genel / resmi site
  return (
    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'var(--bg-input)', flexShrink:0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </span>
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
function PriceCard({ store, price, original, discount, isFree: isFreeOverride, url, highlight = false }) {
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
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
          <StoreLogo store={store} />
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{store}</span>
          {highlight && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: 'var(--gold-badge-bg)', color: 'var(--gold-badge-text)', border: '1px solid var(--gold-border)',
              whiteSpace: 'nowrap'
            }}>
              👑 En Ucuz
            </span>
          )}
        </span>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isFree ? (
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>Ücretsiz</span>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 15, color: isOnSale ? 'var(--amber)' : 'var(--text)' }}>₺{price}</span>
              {isOnSale && (
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ textDecoration: 'line-through' }}>₺{original}</span>
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
function PlaceholderCard({ store, url }) {
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
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
          <StoreLogo store={store} />
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{store}</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>Mağazaya Git →</span>
      </div>
    </a>
  );
}

// ── Oyun bu platformda yok ───────────────────────────────────────────────────
function MissingCard({ platform }) {
  return (
    <div className="glass-card" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 10, marginBottom: 8,
      borderStyle: 'dashed', opacity: 0.55,
      fontSize: 13, color: 'var(--text-3)',
    }}>
      <StoreLogo store={platform} />
      <span>Bu oyun {platform}&apos;te bulunmuyor</span>
    </div>
  );
}
