'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameCard from '../components/GameCard';

const SECTIONS = [
  { label: 'Tümü',          value: '',         icon: '🎮' },
  { label: 'İndirimde',     value: 'sale',     icon: '🏷️' },
  { label: 'Ücretsiz',      value: 'free',     icon: '🎁' },
  { label: 'Yeni Çıkan',    value: 'new',      icon: '🗓️' },
  { label: 'En İyi Puan',   value: 'topscore', icon: '⭐' },
  { label: 'Popüler',       value: 'popular',  icon: '💥' },
];

const CATEGORIES = [
  { label: 'Tüm Türler',   slug: ''                        },
  { label: 'Aksiyon',      slug: 'action'                  },
  { label: 'RPG',          slug: 'role-playing-games-rpg'  },
  { label: 'Strateji',     slug: 'strategy'                },
  { label: 'Macera',       slug: 'adventure'               },
  { label: 'Nişancı',      slug: 'shooter'                 },
  { label: 'Bulmaca',      slug: 'puzzle'                  },
  { label: 'Spor',         slug: 'sports'                  },
  { label: 'Yarış',        slug: 'racing'                  },
  { label: 'Korku',        slug: 'horror'                  },
  { label: 'Platform',     slug: 'platformer'              },
  { label: 'Kart & Masa',  slug: 'card'                    },
  { label: 'Simülasyon',   slug: 'simulation'              },
];

const PRICE_OPTIONS = [
  { label: 'Tüm Fiyatlar', value: 'all'  },
  { label: 'Ücretsiz',     value: 'free' },
  { label: '0 TL – 100 TL', value: '100'  },
  { label: '0 TL – 300 TL', value: '300'  },
  { label: '0 TL – 500 TL', value: '500'  },
];

const PAGE_SIZE = 24;

function GamesList() {
  const searchParams   = useSearchParams();
  const initialSection = searchParams.get('section') || '';
  const initialQuery   = searchParams.get('q') || '';

  const [query,       setQuery]       = useState(initialQuery);
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState(initialSection);
  const [genre,       setGenre]       = useState('');
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [isRestored,  setIsRestored]  = useState(false);

  const debounceRef = useRef(null);
  const sentinelRef = useRef(null);
  const scrollRef   = useRef({ page: 1, fetching: false, canMore: false, seenIds: new Set(), section: '', query: '', genre: '' });

  // Tarayıcı geçmişinden/sessionStorage'dan durum geri yükleme
  useEffect(() => {
    const saved = sessionStorage.getItem('games_page_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        const currentSearch = window.location.search;
        if (state.search === currentSearch) {
          if (state.query !== undefined) setQuery(state.query);
          if (state.section !== undefined) setSection(state.section);
          if (state.genre !== undefined) setGenre(state.genre);
          if (state.price !== undefined) setPrice(state.price);
          if (state.games !== undefined) setGames(state.games);
          if (state.scrollRefVal !== undefined) {
            scrollRef.current = {
              ...scrollRef.current,
              ...state.scrollRefVal,
              seenIds: new Set(state.scrollRefVal.seenIds || [])
            };
          }
          setIsRestored(true);

          if (state.scrollPosition) {
            setTimeout(() => {
              window.scrollTo({ top: state.scrollPosition, behavior: 'instant' });
            }, 100);
          }
          return;
        }
      } catch (e) {}
    }
    sessionStorage.removeItem('games_page_state');
  }, []);

  // Durumu sessionStorage'a kaydetme
  useEffect(() => {
    const saveState = () => {
      const state = {
        search: window.location.search,
        query,
        section,
        genre,
        price,
        games,
        scrollRefVal: {
          ...scrollRef.current,
          seenIds: Array.from(scrollRef.current.seenIds || [])
        },
        scrollPosition: window.scrollY
      };
      sessionStorage.setItem('games_page_state', JSON.stringify(state));
    };

    saveState();

    window.addEventListener('beforeunload', saveState);
    return () => {
      saveState();
      window.removeEventListener('beforeunload', saveState);
    };
  }, [query, section, genre, price, games]);

  // Kaydırma (scroll) konumunu anlık güncelleme (sessionStorage optimize)
  useEffect(() => {
    const handleScrollSave = () => {
      const saved = sessionStorage.getItem('games_page_state');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          state.scrollPosition = window.scrollY;
          sessionStorage.setItem('games_page_state', JSON.stringify(state));
        } catch (e) {}
      }
    };
    window.addEventListener('scroll', handleScrollSave, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSave);
  }, []);

  useEffect(() => {
    const sec = searchParams.get('section') || '';
    const q   = searchParams.get('q') || '';
    
    // Eğer restored durumdaysak URL değişiklik takibini ilk seferde pas geç
    const saved = sessionStorage.getItem('games_page_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.search === window.location.search) {
          return;
        }
      } catch (e) {}
    }

    setSection(sec);
    setQuery(q);
    setGenre('');
  }, [searchParams]);

  const buildUrl = useCallback((pageNum) => {
    const { section: s, query: q, genre: g } = scrollRef.current;
    const p = new URLSearchParams({ page: pageNum, num: PAGE_SIZE });
    if (s) p.set('section', s);
    if (q) p.set('q', q);
    if (g) p.set('genres', g);
    return '/api/games?' + p.toString();
  }, []);

  const fetchGames = useCallback(async () => {
    if (isRestored) {
      setIsRestored(false);
      return;
    }
    const ref    = scrollRef.current;
    ref.page     = 1;
    ref.fetching = false;
    ref.canMore  = false;
    ref.seenIds  = new Set();
    ref.section  = section;
    ref.query    = query;
    ref.genre    = genre;
    setLoading(true);
    try {
      const data    = await fetch(buildUrl(1)).then(r => r.json());
      const results = data.results || [];
      results.forEach(g => ref.seenIds.add(g.id));
      setGames(results);
      ref.canMore = (data.total || 0) > PAGE_SIZE;
    } catch {}
    finally { setLoading(false); }
  }, [section, query, genre, buildUrl, isRestored]);

  const loadMore = useCallback(async () => {
    const ref = scrollRef.current;
    if (ref.fetching || !ref.canMore) return;
    ref.fetching = true;
    setLoadingMore(true);
    let found = false, skips = 0;
    while (!found && skips < 6) {
      const nextPage = ref.page + 1;
      try {
        const data       = await fetch(buildUrl(nextPage)).then(r => r.json());
        const newResults = (data.results || []).filter(g => {
          if (ref.seenIds.has(g.id)) return false;
          ref.seenIds.add(g.id);
          return true;
        });
        ref.page = nextPage;
        if (newResults.length > 0) { setGames(prev => [...prev, ...newResults]); found = true; }
        else { skips++; if (nextPage * PAGE_SIZE >= (data.total || 0)) { ref.canMore = false; break; } }
      } catch { break; }
    }
    ref.fetching = false;
    setLoadingMore(false);
  }, [buildUrl]);

  useEffect(() => {
    if (query.trim() && !isRestored) { setGames([]); setLoading(true); }
  }, [query, isRestored]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sentinelRef.current) return;
      if (sentinelRef.current.getBoundingClientRect().top < window.innerHeight + 500) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const t = setTimeout(handleScroll, 800);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, [loadMore]);

  const handlePriceLoaded = useCallback((gameId, priceInfo) => {
    setGames(prev => prev.map(g => {
      if (g.id === gameId) {
        return { ...g, priceInfo };
      }
      return g;
    }));
  }, []);

  const filteredGames = games.filter(g => {
    if (price === 'free') {
      const isFree = g.priceInfo ? g.priceInfo.isFree : g.isFree;
      return isFree;
    }
    if (price !== 'all') {
      const isFree = g.priceInfo ? g.priceInfo.isFree : g.isFree;
      if (isFree) return true;
      const currentPrice = g.priceInfo ? g.priceInfo.price : g.price;
      if (currentPrice != null && currentPrice > parseInt(price)) return false;
    }
    return true;
  });

  const resetFilters = () => { setQuery(''); setPrice('all'); setSection(''); setGenre(''); };

  const handleGenre = (slug) => {
    setGenre(prev => prev === slug ? '' : slug);
    setQuery('');
    setSection('');
  };

  const handleSection = (val) => {
    setSection(val);
    setQuery('');
  };

  const activeCount = [query, section, price !== 'all' ? price : '', genre].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>

      {/* ── Sticky üst arama çubuğu ── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 50,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-input)',
            border: `1.5px solid ${searchFocus ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10, padding: '0 18px', height: 50,
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: searchFocus ? '0 0 0 3px var(--accent-glow)' : 'none',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={searchFocus ? 'var(--accent)' : 'var(--text-3)'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transition: 'stroke 0.15s' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSection(''); setGenre(''); }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Oyun ara… (500.000+ oyun)"
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 15, color: 'var(--text)', background: 'transparent',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                ×
              </button>
            )}
            {activeCount > 0 && (
              <button onClick={resetFilters} style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 6,
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Temizle ({activeCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Ana layout: sol içerik + sağ sidebar ── */}
      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="games-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 32, alignItems: 'start' }}>

          {/* ── SOL: bölüm filtreleri + oyun grid ── */}
          <div>
            {/* Section chip'leri */}
            <div className="scroll-filter-row-mobile" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {SECTIONS.map(s => {
                const active = section === s.value;
                return (
                  <button key={s.value} onClick={() => handleSection(s.value)} className="section-filter-btn" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 999,
                    border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--bg-card)',
                    color: active ? '#fff' : 'var(--text-2)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: active ? '0 4px 12px var(--accent-glow)' : 'none',
                  }}>
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobil için Kategori ve Bütçe Filtreleri */}
            <div className="mobile-only" style={{ flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {/* Kategoriler */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>KATEGORİLER</span>
                <div className="scroll-filter-row-mobile" style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'nowrap' }}>
                  {CATEGORIES.map(c => {
                    const active = genre === c.slug;
                    return (
                      <button key={c.slug} onClick={() => handleGenre(c.slug)} className="section-filter-btn" style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
                        color: active ? 'var(--accent)' : 'var(--text-2)',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bütçe */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>BÜTÇE</span>
                </div>
                <div className="scroll-filter-row-mobile" style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'nowrap' }}>
                  {PRICE_OPTIONS.map(o => {
                    const active = price === o.value;
                    return (
                      <button key={o.value} onClick={() => setPrice(o.value)} className="section-filter-btn" style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
                        color: active ? 'var(--accent)' : 'var(--text-2)',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sonuç bilgisi */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
                {loading ? 'Yükleniyor…' : (
                  <><span style={{ fontWeight: 700, color: 'var(--text)' }}>{filteredGames.length}</span> oyun</>
                )}
                {genre && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {CATEGORIES.find(c => c.slug === genre)?.label}</span>}
                {section && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {SECTIONS.find(s => s.value === section)?.label}</span>}
              </p>
            </div>

            {/* Oyun grid */}
            {loading ? (
              <div className="grid-auto">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '16/9', background: 'var(--bg-input)' }} />
                    <div style={{ padding: '13px 15px' }}>
                      <div style={{ height: 14, background: 'var(--border)', borderRadius: 4, marginBottom: 9 }} />
                      <div style={{ height: 12, background: 'var(--bg-input)', borderRadius: 4, width: '55%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Sonuç bulunamadı</p>
                <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>Farklı bir arama veya filtre deneyin</p>
                <button onClick={resetFilters} style={{
                  padding: '10px 24px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <>
                <div className="grid-auto">
                  {filteredGames.map(game => <GameCard key={game.id} game={game} onPriceLoaded={handlePriceLoaded} />)}
                </div>
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '2.5px solid var(--border)',
                      borderTopColor: 'var(--accent)',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Daha fazla yükleniyor…</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── SAĞ: sticky sidebar ── */}
          <aside className="games-sidebar games-sidebar-scroll" style={{ position: 'sticky', top: 130 }}>

            {/* Kategoriler */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 16,
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>KATEGORİLER</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {CATEGORIES.map(c => {
                  const active = genre === c.slug;
                  return (
                    <button key={c.slug} onClick={() => handleGenre(c.slug)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 18px', border: 'none', cursor: 'pointer',
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      fontSize: 14, fontWeight: active ? 600 : 400,
                      transition: 'background 0.12s, color 0.12s',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                      textAlign: 'left',
                    }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}}
                    >
                      <span>{c.label}</span>
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bütçe filtresi */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>BÜTÇE</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {PRICE_OPTIONS.map(o => {
                  const active = price === o.value;
                  return (
                    <button key={o.value} onClick={() => setPrice(o.value)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 18px', border: 'none', cursor: 'pointer',
                      fontFamily: "-apple-system, 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif",
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      fontSize: 14, fontWeight: active ? 600 : 400,
                      transition: 'background 0.12s, color 0.12s',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                      textAlign: 'left',
                    }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}}
                    >
                      <span>{o.label}</span>
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </aside>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .games-sidebar-scroll {
          max-height: calc(100vh - 160px);
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
        }
        .games-sidebar-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        @media (max-width: 768px) {
          .games-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 16px !important;
          }
          .games-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
        <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 36px' }}>
          <div style={{ height: 50, background: 'var(--bg-input)', borderRadius: 10 }} />
        </div>
        <div className="container" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--text-3)' }}>
          Yükleniyor…
        </div>
      </div>
    }>
      <GamesList />
    </Suspense>
  );
}
