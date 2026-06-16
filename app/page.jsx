'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

const PLACEHOLDER_GAMES = [
  'Elden Ring',
  'GTA V',
  'Cyberpunk 2077',
  'Red Dead Redemption 2',
  'The Witcher 3',
  'Baldur\'s Gate 3',
  'God of War',
  'Hollow Knight',
  'Stardew Valley',
  'Dark Souls III',
];

const CHIPS = [
  { label: 'Tümü',         section: '',         genre: '' },
  { label: '💥 Popüler',   section: 'popular',  genre: '' },
  { label: '🏷️ İndirimde',  section: 'sale',     genre: '' },
  { label: '🗓️ Yeni',       section: 'new',      genre: '' },
  { label: '⭐ En İyi',     section: 'topscore', genre: '' },
  { label: '🎮 Ücretsiz',   section: 'free',     genre: '' },
  { label: '🎯 Aksiyon',    section: '',         genre: 'action' },
  { label: '⚔️ RPG',        section: '',         genre: 'role-playing-games-rpg' },
  { label: '🧠 Strateji',   section: '',         genre: 'strategy' },
  { label: '🌍 Macera',     section: '',         genre: 'adventure' },
  { label: '🔫 Nişancı',    section: '',         genre: 'shooter' },
  { label: '🚗 Yarış',      section: '',         genre: 'racing' },
  { label: '🧩 Bulmaca',    section: '',         genre: 'puzzle' },
  { label: '⚽ Spor',       section: '',         genre: 'sports' },
  { label: '👻 Korku',      section: '',         genre: 'horror' },
  { label: '🏙️ Simülasyon', section: '',         genre: 'simulation' },
];

export default function Home() {
  const { user } = useAuth();
  const router   = useRouter();

  // Arama
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);

  // Animasyonlu placeholder
  const [phIndex,  setPhIndex]  = useState(0);
  const [phText,   setPhText]   = useState('');
  const [phPhase,  setPhPhase]  = useState('typing'); // typing | pause | erasing

  // Oyun feed
  const [activeChip,   setActiveChip]   = useState(0);
  const [games,        setGames]        = useState([]);
  const [loadingFeed,  setLoadingFeed]  = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const scrollRef   = useRef({ page: 1, fetching: false, canMore: false, seenIds: new Set() });
  const sentinelRef = useRef(null);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // ── Typewriter animasyonu ──────────────────────────────────────────────────
  useEffect(() => {
    const target = PLACEHOLDER_GAMES[phIndex];
    let timeout;

    if (phPhase === 'typing') {
      if (phText.length < target.length) {
        timeout = setTimeout(() => setPhText(target.slice(0, phText.length + 1)), 70);
      } else {
        timeout = setTimeout(() => setPhPhase('pause'), 1800);
      }
    } else if (phPhase === 'pause') {
      timeout = setTimeout(() => setPhPhase('erasing'), 400);
    } else if (phPhase === 'erasing') {
      if (phText.length > 0) {
        timeout = setTimeout(() => setPhText(phText.slice(0, -1)), 35);
      } else {
        setPhIndex(i => (i + 1) % PLACEHOLDER_GAMES.length);
        setPhPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [phText, phPhase, phIndex]);

  // ── Autocomplete ──────────────────────────────────────────────────────────
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
    const handler = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = e => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSug(false);
    router.push(`/games?q=${encodeURIComponent(q)}`);
  };

  const handleSuggestionClick = game => {
    setShowSug(false);
    router.push(game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`);
  };

  // ── Feed yükleme ──────────────────────────────────────────────────────────
  const chip = CHIPS[activeChip];

  const buildFeedUrl = useCallback((pageNum) => {
    const { section, genre } = chip;
    const p = new URLSearchParams({ page: pageNum, num: 24 });
    if (section) p.set('section', section);
    if (genre)   p.set('genres', genre);
    return '/api/games?' + p.toString();
  }, [chip]);

  const fetchFeed = useCallback(async () => {
    const ref = scrollRef.current;
    ref.page     = 1;
    ref.fetching = false;
    ref.canMore  = false;
    ref.seenIds  = new Set();
    setLoadingFeed(true);
    try {
      const data    = await fetch(buildFeedUrl(1)).then(r => r.json());
      const results = data.results || [];
      results.forEach(g => ref.seenIds.add(g.id));
      setGames(results);
      ref.canMore = (data.total || 0) > 24;
    } catch {}
    finally { setLoadingFeed(false); }
  }, [buildFeedUrl]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    const ref = scrollRef.current;
    if (ref.fetching || !ref.canMore) return;
    ref.fetching = true;
    setLoadingMore(true);
    let found = false, skips = 0;
    while (!found && skips < 4) {
      const next = ref.page + 1;
      try {
        const data    = await fetch(buildFeedUrl(next)).then(r => r.json());
        const results = (data.results || []).filter(g => {
          if (ref.seenIds.has(g.id)) return false;
          ref.seenIds.add(g.id); return true;
        });
        ref.page = next;
        if (results.length) { setGames(prev => [...prev, ...results]); found = true; }
        else { skips++; if (next * 24 >= (data.total || 0)) { ref.canMore = false; break; } }
      } catch { break; }
    }
    ref.fetching = false;
    setLoadingMore(false);
  }, [buildFeedUrl]);

  useEffect(() => {
    const onScroll = () => {
      if (!sentinelRef.current) return;
      if (sentinelRef.current.getBoundingClientRect().top < window.innerHeight + 600) loadMore();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const t = setTimeout(onScroll, 800);
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, [loadMore]);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ── Hero: sadece arama çubuğu ── */}
      <div style={{
        background: 'var(--hero-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '64px 20px 56px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 16, opacity: 0.85,
        }}>
          500.000+ oyun tek ekranda
        </p>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800,
          color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 36,
        }}>
          Ne aramıştınız?
        </h1>

        {/* Animasyonlu arama çubuğu */}
        <div ref={wrapperRef} style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <form onSubmit={handleSearch}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 999,
              padding: '0 20px 0 24px',
              height: 60,
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.16)';
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 17, color: 'var(--text)', background: 'transparent',
                  caretColor: 'var(--accent)',
                }}
              />
              {/* Cursor animasyonu (sadece placeholder gösteriliyorken) */}
              {!query && (
                <span style={{
                  width: 2, height: 22, background: 'var(--accent)',
                  borderRadius: 1, flexShrink: 0,
                  animation: 'blink 1s step-end infinite',
                  opacity: 0.8,
                }} />
              )}
              {query && (
                <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>
                  ×
                </button>
              )}
              <button type="submit" style={{
                flexShrink: 0, height: 42, padding: '0 22px',
                borderRadius: 999, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Ara
              </button>
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showSug && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: 20, overflow: 'hidden', zIndex: 1000,
              boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
              textAlign: 'left',
            }}>
              {sugLoading ? (
                <div style={{ padding: '14px 20px', color: 'var(--text-3)', fontSize: 13 }}>Aranıyor…</div>
              ) : suggestions.length === 0 ? (
                <div style={{ padding: '14px 20px', color: 'var(--text-3)', fontSize: 13 }}>Sonuç yok</div>
              ) : suggestions.map(game => (
                <button key={game.id} onMouseDown={() => handleSuggestionClick(game)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '10px 16px', border: 'none', background: 'transparent',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {game.image
                    ? <img src={game.image} alt="" style={{ width: 48, height: 30, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 30, borderRadius: 6, background: 'var(--bg-input)', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                      {(game.genres || []).slice(0, 2).join(' • ')}
                      {game.metacritic ? ` • ⭐ ${game.metacritic}` : ''}
                    </p>
                  </div>
                  {game.isFree && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>Ücretsiz</span>}
                </button>
              ))}
              <div style={{ padding: '10px 16px' }}>
                <button onMouseDown={handleSearch} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  "{query}" için tüm sonuçları gör →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Kategori chip'leri (YouTube tarzı) ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 0',
      }}>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', gap: 8, padding: '0 20px', width: 'max-content' }}>
            {CHIPS.map((c, i) => (
              <button key={i} onClick={() => setActiveChip(i)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 13, whiteSpace: 'nowrap',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeChip === i ? 'var(--text)' : 'var(--bg-input)',
                  color:      activeChip === i ? 'var(--bg)'   : 'var(--text-2)',
                  fontWeight: activeChip === i ? 700            : 400,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Oyun feed grid (YouTube tarzı) ── */}
      <div className="container" style={{ paddingTop: 24 }}>
        {loadingFeed ? (
          <div className="yt-grid">
            {Array.from({ length: 24 }).map((_, i) => <YTSkeleton key={i} />)}
          </div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🎮</p>
            <p style={{ fontSize: 16, color: 'var(--text-2)' }}>Oyun bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="yt-grid">
              {games.map(game => <GameCard key={game.id} game={game} />)}
            </div>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                  border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to { transform: rotate(360deg); } }
        .yt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 18px;
        }
        @media (max-width: 480px) {
          .yt-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function YTSkeleton() {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <div style={{ height: 110, background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '10px 12px' }}>
        <div style={{ height: 11, background: 'var(--border)', borderRadius: 4, marginBottom: 7, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 4, width: '55%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
