'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

const PLACEHOLDER_GAMES = [
  'Elden Ring', 'GTA V', 'Cyberpunk 2077', 'Red Dead Redemption 2',
  'The Witcher 3', "Baldur's Gate 3", 'God of War', 'Hollow Knight',
];

export default function Home() {
  const { user } = useAuth();
  const router   = useRouter();

  // Arama
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);

  // Typewriter placeholder
  const [phIndex, setPhIndex] = useState(0);
  const [phText,  setPhText]  = useState('');
  const [phPhase, setPhPhase] = useState('typing');

  // Bölüm verileri
  const [popularGames, setPopularGames] = useState([]);
  const [newGames,     setNewGames]     = useState([]);
  const [saleGames,    setSaleGames]    = useState([]);
  const [loadingPop,   setLoadingPop]   = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingSale,  setLoadingSale]  = useState(true);

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
    fetchSection('popular',  setPopularGames, setLoadingPop);
    fetchSection('new',      setNewGames,     setLoadingNew);
    fetchSection('sale',     setSaleGames,    setLoadingSale);
  }, [fetchSection]);

  // ── Typewriter animasyonu ────────────────────────────────────────────────
  useEffect(() => {
    const target = PLACEHOLDER_GAMES[phIndex];
    let t;
    if (phPhase === 'typing') {
      if (phText.length < target.length) {
        t = setTimeout(() => setPhText(target.slice(0, phText.length + 1)), 70);
      } else {
        t = setTimeout(() => setPhPhase('pause'), 1800);
      }
    } else if (phPhase === 'pause') {
      t = setTimeout(() => setPhPhase('erasing'), 400);
    } else {
      if (phText.length > 0) {
        t = setTimeout(() => setPhText(phText.slice(0, -1)), 35);
      } else {
        setPhIndex(i => (i + 1) % PLACEHOLDER_GAMES.length);
        setPhPhase('typing');
      }
    }
    return () => clearTimeout(t);
  }, [phText, phPhase, phIndex]);

  // ── Autocomplete ─────────────────────────────────────────────────────────
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

  useEffect(() => {
    const fn = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = e => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSug(false);
    router.push(`/games?q=${encodeURIComponent(q)}`);
  };

  const handleSugClick = game => {
    setShowSug(false);
    router.push(game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`);
  };

  // Hero için 5 oyun (populardan al)
  const heroGames = popularGames.slice(0, 5);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ══ HERO: tam ekran 5 oyun mozaiği ══════════════════════════════════ */}
      <div style={{ position: 'relative', height: 'calc(100vh - 56px)', overflow: 'hidden', minHeight: 480 }}>

        {/* Mozaik arka plan */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr 2fr',
          gridTemplateRows: '1fr 1fr',
          height: '100%',
          gap: 3,
        }}>
          {heroGames.length >= 5 ? heroGames.map((g, i) => (
            <div key={g.id} style={{
              gridRow: i === 0 ? '1 / 3' : 'auto',
              position: 'relative', overflow: 'hidden', background: 'var(--bg-input)',
            }}>
              {g.image && (
                <Image src={g.image} alt={g.name} fill
                  sizes="50vw" style={{ objectFit: 'cover', transition: 'transform 8s ease' }}
                  unoptimized />
              )}
              {/* Her panelde hafif koyu vignette */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
            </div>
          )) : (
            // Yüklenirken gradient placeholder
            <div style={{ gridColumn: '1 / -1', gridRow: '1 / -1', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }} />
          )}
        </div>

        {/* Büyük genel karartma + gradient alt */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.80) 100%)',
        }} />

        {/* Overlay: başlık + arama */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 20px', zIndex: 10,
        }}>

          {/* Glowing animasyonlu başlık */}
          <h1 className="hero-glow-title">Ne aramıştınız?</h1>

          {/* Animasyonlu arama çubuğu */}
          <div ref={wrapperRef} style={{ width: '100%', maxWidth: 620, position: 'relative' }}
            className="search-scale-in">
            <form onSubmit={handleSearch}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 999, height: 62, padding: '0 8px 0 24px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
                onFocusCapture={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.boxShadow   = '0 8px 48px rgba(0,0,0,0.5)';
                }}
                onBlurCapture={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.boxShadow   = '0 8px 40px rgba(0,0,0,0.4)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSug(true); }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSug(false); }}
                  placeholder={query ? '' : phText}
                  autoComplete="off"
                  style={{
                    flex: 1, border: 'none', outline: 'none', fontSize: 17,
                    color: '#fff', background: 'transparent', caretColor: '#fff',
                  }}
                />
                {/* Cursor */}
                {!query && (
                  <span style={{
                    width: 2, height: 22, background: 'rgba(255,255,255,0.8)',
                    borderRadius: 1, flexShrink: 0, animation: 'blink 1s step-end infinite',
                  }} />
                )}
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>
                    ×
                  </button>
                )}
                <button type="submit" style={{
                  flexShrink: 0, height: 46, padding: '0 24px', borderRadius: 999,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Ara
                </button>
              </div>
            </form>

            {/* Autocomplete */}
            {showSug && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'rgba(18,18,24,0.95)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, overflow: 'hidden', zIndex: 100,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                textAlign: 'left',
              }}>
                {sugLoading ? (
                  <div style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Aranıyor…</div>
                ) : suggestions.map(g => (
                  <button key={g.id} onMouseDown={() => handleSugClick(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {g.image
                      ? <img src={g.image} alt="" style={{ width: 50, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      : <div style={{ width: 50, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                        {(g.genres || []).slice(0, 2).join(' • ')}
                        {g.metacritic ? ` • ⭐ ${g.metacritic}` : ''}
                      </p>
                    </div>
                    {g.isFree && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>Ücretsiz</span>}
                  </button>
                ))}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button onMouseDown={handleSearch} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    "{query}" için tüm sonuçları gör →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hızlı linkler */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['💥 Popüler', '🏷️ İndirimde', '🗓️ Yeni Çıkan', '⭐ En İyi'].map((label, i) => {
              const sections = ['popular', 'sale', 'new', 'topscore'];
              return (
                <Link key={label} href={`/games?section=${sections[i]}`}
                  style={{
                    padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                    color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ İÇERİK BÖLÜMLERİ ══════════════════════════════════════════════════ */}
      <div className="container" style={{ paddingTop: 48 }}>

        {/* Yeni Çıkanlar */}
        <Section
          title="🗓️ Yeni Çıkanlar"
          subtitle="Son dönemde yayınlanan oyunlar"
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
        />

        {/* Popüler Oyunlar */}
        <Section
          title="💥 Popüler Oyunlar"
          subtitle="Oyuncuların en çok oynadığı oyunlar"
          href="/games?section=popular"
          games={popularGames}
          loading={loadingPop}
        />

        {/* İndirimdekiler */}
        <Section
          title="🏷️ İndirimdekiler"
          subtitle="En iyi fiyat fırsatları"
          href="/games?section=sale"
          games={saleGames}
          loading={loadingSale}
        />

        {/* CTA */}
        <div style={{
          marginTop: 16, marginBottom: 8,
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
              Steam ve Xbox oyun listenlerini bağla, takip et.
            </p>
          </div>
          <Link href={user ? '/library' : '/signup'} className="btn btn-red" style={{ whiteSpace: 'nowrap', padding: '12px 24px' }}>
            {user ? 'Kütüphaneyi Aç →' : 'Hemen Başla →'}
          </Link>
        </div>
      </div>

      <style>{`
        /* Glow animasyonlu başlık */
        .hero-glow-title {
          font-size: clamp(32px, 6vw, 58px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -1px;
          margin-bottom: 32px;
          text-align: center;
          animation: glow-pulse 3s ease-in-out infinite;
          text-shadow:
            0 0 20px rgba(255,255,255,0.4),
            0 0 60px rgba(220,60,60,0.3),
            0 2px 8px rgba(0,0,0,0.8);
        }
        @keyframes glow-pulse {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(255,255,255,0.4),
              0 0 60px rgba(220,60,60,0.3),
              0 2px 8px rgba(0,0,0,0.8);
          }
          50% {
            text-shadow:
              0 0 30px rgba(255,255,255,0.7),
              0 0 90px rgba(220,60,60,0.6),
              0 0 120px rgba(180,40,40,0.3),
              0 2px 8px rgba(0,0,0,0.8);
          }
        }

        /* Arama çubuğu küçükten büyüme animasyonu */
        .search-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes scale-in {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        /* Cursor blink */
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

// ── Yatay scroll bölüm ────────────────────────────────────────────────────────
function Section({ title, subtitle, href, games, loading }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</p>}
        </div>
        <Link href={href} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          Tümünü gör →
        </Link>
      </div>
      <div className="scroll-row">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
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
