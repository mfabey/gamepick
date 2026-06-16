'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [query,        setQuery]        = useState('');
  const [suggestions,  setSuggestions]  = useState([]);
  const [showSug,      setShowSug]      = useState(false);
  const [sugLoading,   setSugLoading]   = useState(false);
  const [saleGames,    setSaleGames]    = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [newGames,     setNewGames]     = useState([]);
  const [topGames,     setTopGames]     = useState([]);
  const [loadingSale,  setLoadingSale]  = useState(true);
  const [loadingPop,   setLoadingPop]   = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingTop,   setLoadingTop]   = useState(true);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  const fetchSection = useCallback(async (section, setter, loadingSetter) => {
    loadingSetter(true);
    try {
      const res  = await fetch(`/api/games?section=${section}&num=12&rotate=true`);
      const data = await res.json();
      setter(data.results || []);
    } catch {}
    finally { loadingSetter(false); }
  }, []);

  useEffect(() => {
    fetchSection('sale',     setSaleGames,    setLoadingSale);
    fetchSection('popular',  setPopularGames, setLoadingPop);
    fetchSection('new',      setNewGames,     setLoadingNew);
    fetchSection('topscore', setTopGames,     setLoadingTop);
  }, [fetchSection]);

  // Autocomplete: query değişince önerileri çek
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res  = await fetch(`/api/games?q=${encodeURIComponent(q)}&num=6`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSug(true);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSug(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSug(false);
    router.push(`/games?q=${encodeURIComponent(q)}`);
  };

  const handleSuggestionClick = (game) => {
    setShowSug(false);
    const href = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;
    router.push(href);
  };

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Hero */}
      <div style={{
        background: 'var(--hero-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '60px 0 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            borderRadius: 999, padding: '4px 14px', marginBottom: 18,
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          }}>
            ✦ Yapay Zeka Destekli Oyun Keşfi
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14, color: 'var(--text)', lineHeight: 1.15 }}>
            Doğru Oyun,<br />
            <span style={{ color: 'var(--accent)' }}>En İyi Fiyat</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 17, maxWidth: 520, margin: '0 auto 28px' }}>
            Binlerce oyunu tek ekranda keşfet. Ruh haline göre AI önerisi al.
          </p>

          {/* ── Büyük Arama Çubuğu + Autocomplete ── */}
          <div ref={wrapperRef} style={{ maxWidth: 600, margin: '0 auto 28px', position: 'relative', textAlign: 'left' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-card)', border: '2px solid var(--border)',
                borderRight: 'none', borderRadius: '14px 0 0 14px',
                padding: '0 18px', transition: 'border-color 0.2s',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSug(true); }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSug(false); }}
                  placeholder="Oyun ara… (örn. Elden Ring, GTA V)"
                  autoComplete="off"
                  style={{
                    flex: 1, border: 'none', outline: 'none', fontSize: 16,
                    color: 'var(--text)', background: 'transparent', padding: '16px 0',
                  }}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
              <button type="submit" style={{
                padding: '0 28px', borderRadius: '0 14px 14px 0', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Ara
              </button>
            </form>

            {/* Dropdown öneriler */}
            {showSug && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', zIndex: 1000,
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              }}>
                {sugLoading ? (
                  <div style={{ padding: '14px 18px', color: 'var(--text-3)', fontSize: 13 }}>Aranıyor…</div>
                ) : suggestions.length === 0 ? (
                  <div style={{ padding: '14px 18px', color: 'var(--text-3)', fontSize: 13 }}>Sonuç bulunamadı</div>
                ) : suggestions.map(game => (
                  <button
                    key={game.id}
                    onMouseDown={() => handleSuggestionClick(game)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 14px', border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {game.image ? (
                      <img src={game.image} alt="" style={{ width: 42, height: 28, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 42, height: 28, borderRadius: 5, background: 'var(--bg-input)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        {(game.genres || []).slice(0,2).join(' • ')}
                        {game.metacritic ? ` • ⭐ ${game.metacritic}` : ''}
                      </p>
                    </div>
                    {game.isFree ? (
                      <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>Ücretsiz</span>
                    ) : null}
                  </button>
                ))}
                <div style={{ padding: '8px 14px', borderTop: suggestions.length ? '1px solid var(--border)' : 'none' }}>
                  <button onMouseDown={handleSearch} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    "{query}" için tüm sonuçları gör →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/games" className="btn btn-red" style={{ fontSize: 14, padding: '12px 28px' }}>
              Oyunları Keşfet →
            </Link>
            {!user && (
              <Link href="/signup" className="btn btn-ghost" style={{ fontSize: 14, padding: '12px 28px' }}>
                Ücretsiz Üye Ol
              </Link>
            )}
            {user && (
              <Link href="/library" className="btn btn-ghost" style={{ fontSize: 14, padding: '12px 28px' }}>
                Kütüphanem →
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {[['500K+', 'Oyun'], ['Puan & Yorum', 'Metacritic Verisi'], ['AI', 'Kişisel Öneri']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{n}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40 }}>

        {/* ── Öne Çıkan Oyunlar (büyük thumbnaillar) ── */}
        <FeaturedSection games={popularGames} loading={loadingPop} />

        {/* İndirim Fırsatları */}
        <Section
          title="🏷️ İndirim Fırsatları"
          subtitle="En ucuz fiyatlı platform teklifleri"
          href="/games?section=sale"
          games={saleGames}
          loading={loadingSale}
        />

        {/* Popüler */}
        <Section
          title="💥 Popüler Oyunlar"
          subtitle="Oyuncuların en çok oynadığı oyunlar"
          href="/games?section=popular"
          games={popularGames}
          loading={loadingPop}
        />

        {/* Yeni Çıkanlar */}
        <Section
          title="🗓️ Yeni Çıkanlar"
          subtitle="Son dönemde yayınlanan oyunlar"
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
        />

        {/* En Yüksek Puanlı */}
        <Section
          title="⭐ En Yüksek Puanlı"
          subtitle="Metacritic'e göre en iyi oyunlar"
          href="/games?section=topscore"
          games={topGames}
          loading={loadingTop}
        />

        {/* CTA */}
        <div style={{
          marginTop: 32,
          background: 'var(--cta-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: 16, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              ✦ Tek Kütüphane
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Oyunlarını tek yerden yönet
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Oyun listenini oluştur, takip et ve AI önerileri al.
            </p>
          </div>
          <Link href={user ? '/library' : '/signup'} className="btn btn-red" style={{ whiteSpace: 'nowrap', padding: '12px 24px' }}>
            {user ? 'Kütüphaneyi Aç →' : 'Hemen Başla →'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Öne Çıkan Büyük Kartlar ─────────────────────────────────────────────────
function FeaturedSection({ games, loading }) {
  const featured = games.slice(0, 6);

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>🔥 Öne Çıkan Oyunlar</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Şu an en popüler oyunlar</p>
        </div>
        <Link href="/games?section=popular" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          Tümünü gör →
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <FeaturedSkeleton key={i} />)
          : featured.map(g => <FeaturedCard key={g.id} game={g} />)
        }
      </div>
    </div>
  );
}

function FeaturedCard({ game }) {
  const [hovered, setHovered] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const href = game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`;

  useEffect(() => {
    setPriceLoading(true);
    const params = game.rawgSlug
      ? `slug=${encodeURIComponent(game.rawgSlug)}&name=${encodeURIComponent(game.name)}&hasSteam=${!!game.hasSteam}`
      : `name=${encodeURIComponent(game.name)}&hasSteam=${!!game.hasSteam}`;

    fetch('/api/card-price?' + params)
      .then(r => r.json())
      .then(d => { if (d.price != null) setLivePrice(d); })
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, [game.name, game.rawgSlug, game.hasSteam]);

  const releaseYear = game.released ? game.released.split('-')[0] : null;

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: `1.5px solid ${hovered ? 'var(--accent-border)' : 'var(--border)'}`,
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.2s ease, border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          position: 'relative',
          zIndex: hovered ? 10 : 1,
        }}
      >
        {/* Büyük görsel */}
        <div style={{ height: 160, position: 'relative', background: 'var(--bg-input)' }}>
          {game.image && (
            <Image
              src={game.image} alt={game.name} fill
              sizes="(max-width: 640px) 100vw, 300px"
              style={{ objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
              unoptimized
            />
          )}
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%)',
            transition: 'opacity 0.2s',
            opacity: hovered ? 1 : 0.6,
          }} />
          {/* Metacritic */}
          {game.metacritic && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 7,
                background: 'rgba(0,0,0,0.7)',
                color: game.metacritic >= 80 ? '#4ade80' : game.metacritic >= 60 ? '#fbbf24' : '#f87171',
                backdropFilter: 'blur(4px)',
              }}>
                {game.metacritic}
              </span>
            </div>
          )}
          {/* Oyun adı overlay */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {game.name}
            </p>
          </div>
        </div>

        {/* Alt bilgi — hover'da açılır */}
        <div style={{
          padding: '10px 14px 12px',
          maxHeight: hovered ? 85 : 44,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(game.genres || []).slice(0, 2).map(g => (
                <span key={g} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-input)', color: 'var(--text-3)' }}>{g}</span>
              ))}
            </div>
            {game.totalReviews > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                ⭐ {game.totalReviews.toLocaleString('tr')}
              </span>
            )}
          </div>
          {/* Hover'da görünen ek bilgi (Çıkış yılı ve en ucuz fiyat) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: 6, 
            opacity: hovered ? 1 : 0, 
            transition: 'opacity 0.2s' 
          }}>
            {releaseYear && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                📅 {releaseYear}
              </span>
            )}
            {priceLoading ? (
              <span style={{ fontSize: 10, color: 'var(--border-hover)', letterSpacing: 2 }}>•••</span>
            ) : livePrice ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: livePrice.isFree ? 'var(--green)' : 'var(--accent)' }}>
                {livePrice.storeIcon} {livePrice.isFree ? 'Ücretsiz' : `₺${livePrice.price}`}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Fiyat yok</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturedSkeleton() {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <div style={{ height: 160, background: 'var(--bg-input)' }} />
      <div style={{ padding: '10px 14px' }}>
        <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 8, width: '70%' }} />
        <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 4, width: '40%' }} />
      </div>
    </div>
  );
}

// ── Scroll Row Bölümleri ─────────────────────────────────────────────────────
function Section({ title, subtitle, href, games, loading }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</p>}
        </div>
        <Link href={href} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          Tümünü gör →
        </Link>
      </div>
      <div className="scroll-row">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : games.length === 0
            ? <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Yüklenemedi.</p>
            : games.map(g => <GameCard key={g.id} game={g} compact />)
        }
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      flexShrink: 0, width: 160, borderRadius: 14,
      background: 'var(--bg-card)', border: '1.5px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ height: 90, background: 'var(--bg-input)' }} />
      <div style={{ padding: '9px 11px' }}>
        <div style={{ height: 11, background: 'var(--border)', borderRadius: 4, marginBottom: 7 }} />
        <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}
