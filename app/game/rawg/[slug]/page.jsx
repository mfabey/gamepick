'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function RawgGamePage({ params }) {
  const { slug } = params;

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
        fetch(
          '/api/ai-game?appid=' + encodeURIComponent(aiId) +
          '&name='              + encodeURIComponent(g.name) +
          '&description='       + encodeURIComponent(desc)
        )
          .then(r => r.json())
          .then(d => { if (d.ozet) setAi(d); })
          .catch(() => {});
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
      <Link href="/games" style={{ padding: '10px 24px', background: '#DC2626', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
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
    if (p.price != null) dealsList.push({ store: 'Xbox', price: p.price, isFree: p.isFree, id: p.storeId });
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
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 960 }}>
      <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#999', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Oyunlara Dön
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>

        {/* ─── Sol ───────────────────────────────────────────────────── */}
        <div>
          {allImages.length > 0 && (
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12, aspectRatio: '16/9', position: 'relative', background: '#f0f0f0' }}>
              <Image src={allImages[imgIdx]} alt={game.name} fill sizes="640px" style={{ objectFit: 'cover' }} unoptimized />
            </div>
          )}
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
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

          {/* AI Özeti */}
          {ai && (
            <div style={{ background: 'linear-gradient(135deg,#fff7f7,#fff)', border: '1.5px solid #FECACA', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>AI Özeti</span>
              </div>
              {ai.ozet && <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333', marginBottom: ai.duygu ? 10 : 0 }}>{ai.ozet}</p>}
              {ai.duygu && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#666', borderTop: '1px solid #fee2e2', paddingTop: 10 }}>
                  💬 {ai.duygu}
                </p>
              )}
              {ai.etiketler?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {ai.etiketler.map(t => (
                    <span key={t} style={{ padding: '3px 9px', borderRadius: 999, background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Açıklama — AI yüklenince Türkçe, yoksa İngilizce */}
          {(ai?.aciklama || game.description) && (
            <div style={{ fontSize: 14, lineHeight: 1.75, color: '#444', marginBottom: 20 }}>
              {ai?.aciklama ? (
                ai.aciklama
              ) : (
                <>
                  {game.description.replace(/<[^>]+>/g, '').slice(0, 1200)}
                  {game.description.length > 1200 ? '…' : ''}
                  {!ai && (
                    <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 11, color: '#bbb' }}>
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
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: 10 }}>{game.name}</h1>

          {/* Puan rozetleri */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
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
              <div style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, background: '#f5f5f5', color: '#555', fontWeight: 600 }}>
                ⭐ {game.rating.toFixed(1)} / 5
              </div>
            )}
          </div>

          {/* Detay tablosu */}
          <div style={{ background: '#fafafa', border: '1.5px solid #ebebeb', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
            {[
              { label: 'Geliştirici', value: game.developer },
              { label: 'Yayıncı',    value: game.publisher  },
              { label: 'Çıkış',      value: game.released   },
              { label: 'Türler',     value: (game.genres || []).join(', ') },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#999', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontWeight: 500, color: '#1a1a1a', textAlign: 'right', marginLeft: 12 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Platform Fiyatları ──────────────────────────────────── */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Platform Fiyatları</h2>

            {/* Steam */}
            {game.hasSteam ? (
              steamLoading
                ? <LoadingPriceRow />
                : steamPrice
                  ? <PriceCard store="Steam" icon="💻"
                      price={steamPrice.price} original={steamPrice.original}
                      discount={steamPrice.discount} isFree={steamPrice.isFree}
                      url={game.steamUrl}
                      highlight={isCheaperOption && bestStoreKey === 'Steam'}
                    />
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

            {/* Xbox / Game Pass */}
            {xboxPrices.length > 0 ? (
              xboxPrices.map(p => (
                <PriceCard key={p.storeId || p.name} store="Xbox / Game Pass" icon="🎮"
                  price={p.price} original={p.original} discount={p.discount}
                  isFree={p.isFree} url={p.url}
                  highlight={isCheaperOption && bestStoreKey === `Xbox_${p.storeId}`}
                />
              ))
            ) : xboxLoading ? (
              <LoadingPriceRow />
            ) : (
              <MissingCard platform="Xbox / Game Pass" />
            )}

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

            <p style={{ fontSize: 11, color: '#bbb', marginTop: 10, lineHeight: 1.5 }}>
              Fiyatlar Steam & ITAD üzerinden alınmaktadır. Anlık değişiklikler yansımayabilir.
            </p>
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
        padding: '12px 14px', borderRadius: 10, border: '1.5px solid #f0f0f0',
        background: '#fafafa', marginBottom: 8,
      }}>
        <div style={{ height: 14, width: 80, background: '#ebebeb', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 14, width: 55, background: '#ebebeb', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </>
  );
}

// ── Fiyatlı platform kartı ───────────────────────────────────────────────────
function PriceCard({ store, icon, price, original, discount, isFree: isFreeOverride, url, highlight = false }) {
  const isFree   = isFreeOverride || price === 0;
  const isOnSale = discount > 0 && !isFree;

  const borderCol = highlight ? '#FCD34D' : '#ebebeb';
  const hoverBorderCol = highlight ? '#F59E0B' : '#FECACA';
  const bgStyle = highlight ? 'linear-gradient(135deg, #FFFDF5, #FFF9E6)' : '#fff';
  const glowShadow = highlight ? '0 0 12px rgba(245, 158, 11, 0.15)' : 'none';

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${borderCol}`,
          background: bgStyle, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: glowShadow,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = hoverBorderCol;
          if (highlight) e.currentTarget.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = borderCol;
          if (highlight) e.currentTarget.style.boxShadow = glowShadow;
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {icon} {store}
          {highlight && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D',
              marginLeft: 4
            }}>
              👑 En Ucuz
            </span>
          )}
        </span>
        <div style={{ textAlign: 'right' }}>
          {isFree ? (
            <span style={{ fontWeight: 700, fontSize: 15, color: '#16a34a' }}>Ücretsiz</span>
          ) : (
            <>
              <span style={{ fontWeight: 700, fontSize: 15, color: isOnSale ? '#ea580c' : '#1a1a1a' }}>₺{price}</span>
              {isOnSale && (
                <div style={{ fontSize: 11, color: '#999' }}>
                  <span style={{ textDecoration: 'line-through' }}>₺{original}</span>
                  {' '}<span style={{ color: '#ea580c' }}>-%{discount}</span>
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
  return (
    <a href={url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10, border: '1.5px solid #ebebeb', background: '#fff',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{icon} {store}</span>
        <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Mağazaya Git →</span>
      </div>
    </a>
  );
}

// ── Oyun bu platformda yok ───────────────────────────────────────────────────
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
