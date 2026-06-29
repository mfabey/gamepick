'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameCard from '../components/GameCard';
import { useLanguage } from '../context/LanguageContext';

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
  { label: '0 – 100₺',    value: '100'  },
  { label: '0 – 300₺',    value: '300'  },
  { label: '0 – 500₺',    value: '500'  },
];

const PAGE_SIZE = 24;

function GamesList() {
  const searchParams   = useSearchParams();
  const initialSection = searchParams.get('section') || '';
  const initialQuery   = searchParams.get('q') || '';
  const { lang, t } = useLanguage();

  const localizedSections = [
    { label: lang === 'tr' ? 'Tümü' : 'All',          value: '',         icon: '🎮' },
    { label: lang === 'tr' ? 'İndirimde' : 'On Sale',     value: 'sale',     icon: '🏷️' },
    { label: lang === 'tr' ? 'Ücretsiz' : 'Free',      value: 'free',     icon: '🎁' },
    { label: lang === 'tr' ? 'Yeni Çıkan' : 'New',    value: 'new',      icon: '🗓️' },
    { label: lang === 'tr' ? 'En İyi Puan' : 'Top Rated',   value: 'topscore', icon: '⭐' },
    { label: lang === 'tr' ? 'Popüler' : 'Popular',       value: 'popular',  icon: '💥' },
  ];

  const localizedCategories = [
    { label: lang === 'tr' ? 'Tüm Türler' : 'All Genres',   slug: ''                        },
    { label: lang === 'tr' ? 'Aksiyon' : 'Action',      slug: 'action'                  },
    { label: lang === 'tr' ? 'RPG' : 'RPG',          slug: 'role-playing-games-rpg'  },
    { label: lang === 'tr' ? 'Strateji' : 'Strategy',     slug: 'strategy'                },
    { label: lang === 'tr' ? 'Macera' : 'Adventure',       slug: 'adventure'               },
    { label: lang === 'tr' ? 'Nişancı' : 'Shooter',     slug: 'shooter'                 },
    { label: lang === 'tr' ? 'Bulmaca' : 'Puzzle',      slug: 'puzzle'                  },
    { label: lang === 'tr' ? 'Spor' : 'Sports',         slug: 'sports'                  },
    { label: lang === 'tr' ? 'Yarış' : 'Racing',        slug: 'racing'                  },
    { label: lang === 'tr' ? 'Korku' : 'Horror',        slug: 'horror'                  },
    { label: lang === 'tr' ? 'Platform' : 'Platformer',     slug: 'platformer'              },
    { label: lang === 'tr' ? 'Kart & Masa' : 'Card & Board',  slug: 'card'                    },
    { label: lang === 'tr' ? 'Simülasyon' : 'Simulation',   slug: 'simulation'              },
  ];

  const localizedPriceOptions = [
    { label: lang === 'tr' ? 'Tüm Fiyatlar' : 'All Prices', value: 'all'  },
    { label: lang === 'tr' ? 'Ücretsiz' : 'Free',     value: 'free' },
    { label: lang === 'tr' ? '0 – 100₺' : '0 – $3',    value: '100'  },
    { label: lang === 'tr' ? '0 – 300₺' : '0 – $9',    value: '300'  },
    { label: lang === 'tr' ? '0 – 500₺' : '0 – $15',    value: '500'  },
  ];

  const [query,       setQuery]       = useState(initialQuery);
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState(initialSection);
  const [genre,       setGenre]       = useState('');
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [isWide,      setIsWide]      = useState(true);
  const [store,       setStore]       = useState('all');
  const [mcMin,       setMcMin]       = useState(0);

  // Aşağı kaydırınca arama çubuğu cam efektiyle küçülüp oyun alanını kapsar (histerezisli eşik).
  useEffect(() => {
    const upd = () => setIsWide(typeof window !== 'undefined' && window.innerWidth > 768);
    upd();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        setScrolled(prev => (prev ? y > 50 : y > 90));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', upd); };
  }, []);

  const debounceRef = useRef(null);
  const sentinelRef = useRef(null);
  const scrollRef   = useRef({ page: 1, fetching: false, canMore: false, seenIds: new Set(), section: '', query: '', genre: '' });

  useEffect(() => {
    const sec = searchParams.get('section') || '';
    const q   = searchParams.get('q') || '';
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
  }, [section, query, genre, buildUrl]);

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
    if (query.trim()) { setGames([]); setLoading(true); }
  }, [query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  useEffect(() => {
    // rAF ile throttle — her scroll olayında getBoundingClientRect (layout reflow)
    // çağrılmasını önler, kare başına en fazla bir kez kontrol eder
    let ticking = false;
    const check = () => {
      ticking = false;
      if (!sentinelRef.current) return;
      if (sentinelRef.current.getBoundingClientRect().top < window.innerHeight + 500) loadMore();
    };
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const t = setTimeout(check, 800);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, [loadMore]);

  const filteredGames = useMemo(() => games.filter(g => {
    // Bütçe
    if (price === 'free' && !g.isFree) return false;
    if (price !== 'all' && price !== 'free' && g.price != null && !g.isFree && g.price > parseInt(price)) return false;
    // Mağaza
    if (store === 'steam' && !g.hasSteam) return false;
    if (store === 'epic'  && !g.hasEpic)  return false;
    // Metacritic
    if (mcMin > 0 && !(g.metacritic >= mcMin)) return false;
    return true;
  }), [games, price, store, mcMin]);

  const resetFilters = () => { setQuery(''); setPrice('all'); setSection(''); setGenre(''); setStore('all'); setMcMin(0); };

  const handleGenre = (slug) => {
    setGenre(prev => prev === slug ? '' : slug);
    setQuery('');
    setSection('');
  };

  const handleSection = (val) => {
    setSection(val);
    setQuery('');
  };

  const activeCount = [query, section, price !== 'all' ? price : '', genre, store !== 'all' ? store : '', mcMin > 0 ? 'mc' : ''].filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>

      {/* ── Sticky üst arama çubuğu ── */}
      <div className="sticky-search-bar">
        <div className="container" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: scrolled ? 'color-mix(in srgb, var(--bg-card) 72%, transparent)' : 'var(--bg-input)',
            border: `1.5px solid ${searchFocus ? 'var(--accent)' : (scrolled ? 'var(--border-hover)' : 'var(--border)')}`,
            borderRadius: scrolled ? 14 : 10, padding: '0 18px', height: scrolled ? 44 : 50,
            marginLeft: scrolled && isWide ? 292 : 0,
            backdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'blur(0px)',
            WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'blur(0px)',
            willChange: 'margin-left, height, backdrop-filter',
            transition: 'margin-left 0.5s cubic-bezier(.4,0,.18,1), height 0.5s cubic-bezier(.4,0,.18,1), background 0.5s ease, border-color 0.3s ease, backdrop-filter 0.5s ease, -webkit-backdrop-filter 0.5s ease, box-shadow 0.4s ease',
            boxShadow: scrolled ? '0 10px 30px rgba(20,20,40,0.18)' : (searchFocus ? '0 0 0 3px var(--accent-glow)' : 'none'),
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
              placeholder={lang === 'tr' ? 'Oyun ara… (500.000+ oyun)' : 'Search games... (500,000+ games)'}
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
                {t('games.clearFilters')} ({activeCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Ana layout: sol içerik + sağ sidebar ── */}
      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        <div className="games-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── SOL: bölüm filtreleri + oyun grid ── */}
          <div>
            {/* Section chip'leri */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {localizedSections.map(s => {
                const active = section === s.value;
                return (
                  <button key={s.value} onClick={() => handleSection(s.value)} style={{
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

            {/* Mobil Filtreler (Kategori ve Bütçe) */}
            <div className="mobile-only" style={{ gap: 10, marginBottom: 20, width: '100%' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={genre} 
                  onChange={e => handleGenre(e.target.value)} 
                  style={{
                    width: '100%', height: 42, padding: '0 30px 0 12px',
                    borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)',
                    fontSize: 14, fontWeight: 500, color: 'var(--text)', outline: 'none',
                    appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer'
                  }}
                >
                  {localizedCategories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', fontSize: 10 }}>▼</span>
              </div>

              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  style={{
                    width: '100%', height: 42, padding: '0 30px 0 12px',
                    borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)',
                    fontSize: 14, fontWeight: 500, color: 'var(--text)', outline: 'none',
                    appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer'
                  }}
                >
                  {localizedPriceOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', fontSize: 10 }}>▼</span>
              </div>
            </div>

            {/* Sonuç bilgisi (prototiple eşleşmesi için sayaç kaldırıldı) */}
            <div style={{ marginBottom: 16 }} />

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
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{t('games.noResults')}</p>
                <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>{lang === 'tr' ? 'Farklı bir arama veya filtre deneyin' : 'Try a different search or filter'}</p>
                <button onClick={resetFilters} style={{
                  padding: '10px 24px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {t('games.clearFilters')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid-auto">
                  {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
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
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>{t('games.loading')}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── SAĞ: sticky sidebar ── */}
          <aside className="games-sidebar" style={{
            position: 'sticky',
            order: -1,
            top: 130,
            maxHeight: 'calc(100vh - 150px)',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>

            {/* Kategoriler */}
            <div className="gr-glass" style={{
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
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>{lang === 'tr' ? 'TÜRLER' : 'GENRES'}</span>
              </div>
              <div style={{ padding: '14px 16px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {localizedCategories.map(c => {
                  const active = genre === c.slug;
                  return (
                    <button key={c.slug} onClick={() => handleGenre(c.slug)} style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '7px 13px', borderRadius: 999,
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-2)',
                      fontSize: 12.5, fontWeight: active ? 600 : 500,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      boxShadow: active ? '0 4px 12px var(--accent-glow)' : 'none',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)'; }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mağaza filtresi */}
            <div className="gr-glass" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18M3 9l1.5-5h15L21 9M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>{lang === 'tr' ? 'MAĞAZA' : 'STORE'}</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {[
                  { v: 'all',   label: lang === 'tr' ? 'Tüm Mağazalar' : 'All Stores' },
                  { v: 'steam', label: 'Steam' },
                  { v: 'epic',  label: 'Epic Games' },
                ].map(o => {
                  const active = store === o.v;
                  return (
                    <button key={o.v} onClick={() => setStore(o.v)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
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
                      {o.v === 'steam' && <span style={{ width:24, height:24, borderRadius:6, background:'rgba(18,28,42,.9)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="#c7d5e0"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.909c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/></svg></span>}
                      {o.v === 'epic'  && <span style={{ width:24, height:24, borderRadius:6, background:'rgba(8,8,10,.88)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M3.623 0v18.954l2.507 1.597V3.207h9.123v3.21H9.118v2.674h5.628v3.21H9.118v3.474h6.231v3.21H6.23V24l14.148-4.625V0z"/></svg></span>}
                      {o.v === 'all'   && <span style={{ width:24, flexShrink:0 }} />}
                      <span style={{ flex:1 }}>{o.label}</span>
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
            <div className="gr-glass" style={{
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>{lang === 'tr' ? 'BÜTÇE' : 'BUDGET'}</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {localizedPriceOptions.map(o => {
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
            {/* Metacritic filtresi */}
            <div className="gr-glass" style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>METACRITIC</span>
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '14px 16px 16px' }}>
                {[
                  { v: 0,  label: lang === 'tr' ? 'Tümü' : 'All' },
                  { v: 70, label: '70+' },
                  { v: 80, label: '80+' },
                  { v: 90, label: '90+' },
                ].map(o => {
                  const active = mcMin === o.v;
                  return (
                    <button key={o.v} onClick={() => setMcMin(o.v)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 9,
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-2)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                      {o.label}
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
        .games-sidebar::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 768px) {
          .games-layout { grid-template-columns: 1fr !important; }
          .games-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function GamesPage() {
  const { lang } = useLanguage();
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
        <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 36px' }}>
          <div style={{ height: 50, background: 'var(--bg-input)', borderRadius: 10 }} />
        </div>
        <div className="container" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Yükleniyor…' : 'Loading...'}
        </div>
      </div>
    }>
      <GamesList />
    </Suspense>
  );
}
