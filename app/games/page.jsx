'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GameCard from '../components/GameCard';

const PRICE_OPTIONS = [
  { label: 'Tümü',       value: 'all'  },
  { label: 'Ücretsiz',   value: 'free' },
  { label: '₺0 – ₺100',  value: '100'  },
  { label: '₺0 – ₺300',  value: '300'  },
  { label: '₺0 – ₺500',  value: '500'  },
];

const SECTIONS = [
  { label: 'Tümü',        value: ''         },
  { label: '🏷️ İndirimdekiler', value: 'sale' },
  { label: '🎮 Ücretsiz', value: 'free'     },
  { label: '🗓️ Yeni',     value: 'new'      },
  { label: '⭐ En İyi',   value: 'topscore' },
  { label: '💥 Popüler',  value: 'popular'  },
];

const PAGE_SIZE = 24;

function GamesList() {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get('section') || '';

  const [query,       setQuery]       = useState('');
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState(initialSection);
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef  = useRef(null);
  const sentinelRef  = useRef(null);
  const scrollRef    = useRef({ page: 1, fetching: false, canMore: false, seenIds: new Set(), section: '', query: '' });

  // URL'deki section parametresi değiştiğinde state'i ve aramayı güncelle
  useEffect(() => {
    const sec = searchParams.get('section') || '';
    setSection(sec);
    setQuery('');
  }, [searchParams]);

  const buildUrl = useCallback((pageNum) => {
    const { section: s, query: q } = scrollRef.current;
    const p = new URLSearchParams({ page: pageNum, num: PAGE_SIZE });
    if (s) p.set('section', s);
    if (q) p.set('q', q);
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

    setLoading(true);
    try {
      const data    = await fetch(buildUrl(1)).then(r => r.json());
      const results = (data.results || []);
      results.forEach(g => ref.seenIds.add(g.id));
      setGames(results);
      ref.canMore = (data.total || 0) > PAGE_SIZE;
    } catch {}
    finally { setLoading(false); }
  }, [section, query, buildUrl]);

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
        const merged     = (data.results || []);
        const newResults = merged.filter(g => {
          if (ref.seenIds.has(g.id)) return false;
          ref.seenIds.add(g.id);
          return true;
        });
        ref.page = nextPage;
        if (newResults.length > 0) {
          setGames(prev => [...prev, ...newResults]);
          found = true;
        } else {
          skips++;
          if (nextPage * PAGE_SIZE >= (data.total || 0)) { ref.canMore = false; break; }
        }
      } catch { break; }
    }

    ref.fetching = false;
    setLoadingMore(false);
  }, [buildUrl]);

  // Kullanıcı yazmaya başlar başlamaz eski sonuçları gizle (debounce bitmesini bekleme)
  useEffect(() => {
    if (query.trim()) {
      setGames([]);
      setLoading(true);
    }
  }, [query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight + 500) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const t = setTimeout(handleScroll, 800);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, [loadMore]);

  const filteredGames = games.filter(g => {
    if (price === 'free') return g.isFree;
    if (price !== 'all' && g.price != null && !g.isFree && g.price > parseInt(price)) return false;
    return true;
  });

  const resetFilters = () => { setQuery(''); setPrice('all'); setSection(''); };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Oyunlar</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>500.000+ oyun — puan, yorum ve AI önerisi</p>
      </div>

      {/* Arama */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 18px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSection(''); }}
          placeholder="Oyun ara…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)', background: 'transparent' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.value} onClick={() => { setSection(s.value); setQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: section === s.value ? 'var(--accent)' : 'var(--bg-input)',
              color:      section === s.value ? '#fff'    : 'var(--text-2)',
              fontWeight: section === s.value ? 600       : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Bütçe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bütçe</span>
        <select value={price} onChange={e => setPrice(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-card)', fontSize: 13, color: 'var(--text)', outline: 'none' }}>
          {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Sonuç bilgisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          {loading ? 'Yükleniyor…' : (
            <><span style={{ fontWeight: 600, color: 'var(--text)' }}>{filteredGames.length}</span> oyun gösteriliyor</>
          )}
        </p>
        {(query || section || price !== 'all') && (
          <button onClick={resetFilters} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            × Temizle
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid-auto">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 110, background: 'var(--bg-input)' }} />
              <div style={{ padding: '10px 12px' }}>
                <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 4, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)' }}>Sonuç bulunamadı</p>
          <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <>
          <div className="grid-auto">
            {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-3)' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Yükleniyor…
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Oyunlar</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>500.000+ oyun — puan, yorum ve AI önerisi</p>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>Yükleniyor…</div>
      </div>
    }>
      <GamesList />
    </Suspense>
  );
}
