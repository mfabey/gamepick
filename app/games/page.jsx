'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameCard from '../components/GameCard';

const PRICE_OPTIONS = [
  { label: 'Tümü',       value: 'all' },
  { label: 'Ücretsiz',   value: 'free' },
  { label: '₺0 – ₺100',  value: '100' },
  { label: '₺0 – ₺300',  value: '300' },
  { label: '₺0 – ₺500',  value: '500' },
];

// Her bölümün hangi platformdan veri alacağını tanımlar
const SECTIONS = [
  { label: 'Tümü',          value: '',           platform: 'both'  },
  { label: '🎮 Ücretsiz',   value: 'free',       platform: 'both'  },
  { label: '🗓️ Yeni Çıkan', value: 'new',        platform: 'both'  },
  { label: '💥 Trend',      value: 'topsellers', platform: 'steam' },
  { label: '🔥 İndirimli',  value: 'sale',       platform: 'epic'  },
];

const PAGE_SIZE  = 24; // toplam (her platformdan 12)
const HALF_SIZE  = 12;

export default function GamesPage() {
  const [query,       setQuery]       = useState('');
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState('');
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const debounceRef = useRef(null);
  const sentinelRef = useRef(null);
  const scrollRef   = useRef({
    page: 1, fetching: false, canMore: false,
    seenIds: new Set(), section: '', query: '',
  });

  // Aktif bölümün platform bilgisi
  const activePlatform = SECTIONS.find(s => s.value === section)?.platform || 'both';

  // URL listesi oluştur (tek veya çift platform)
  const buildUrls = useCallback((pageNum) => {
    const { section: s, query: q } = scrollRef.current;
    const plat = SECTIONS.find(x => x.value === s)?.platform || 'both';
    const start = (pageNum - 1);  // page sayacı — her API kendi offsetini hesaplar

    const urls = [];

    if (plat === 'both' || plat === 'steam') {
      if (s)      urls.push(`/api/steam?section=${s}&num=${plat === 'both' ? 40 : 80}`);
      else if (q) urls.push(`/api/steam?q=${encodeURIComponent(q)}&num=${plat === 'both' ? HALF_SIZE : PAGE_SIZE}&page=${pageNum}`);
      else        urls.push(`/api/steam?section=all&num=${plat === 'both' ? HALF_SIZE : PAGE_SIZE}&page=${pageNum}`);
    }

    if (plat === 'both' || plat === 'epic') {
      if (s && s !== 'topsellers' && s !== 'featured') {
        urls.push(`/api/epic?section=${s}&num=${plat === 'both' ? 40 : 80}`);
      } else if (q) {
        urls.push(`/api/epic?q=${encodeURIComponent(q)}&num=${plat === 'both' ? HALF_SIZE : PAGE_SIZE}&page=${pageNum}`);
      } else if (!s) {
        urls.push(`/api/epic?num=${plat === 'both' ? HALF_SIZE : PAGE_SIZE}&page=${pageNum}`);
      }
    }

    return urls;
  }, []);

  const fetchGames = useCallback(async () => {
    const ref = scrollRef.current;
    ref.page     = 1;
    ref.fetching = false;
    ref.canMore  = false;
    ref.seenIds  = new Set();
    ref.section  = section;
    ref.query    = query;

    setLoading(true);
    setPage(1);
    try {
      const urls    = buildUrls(1);
      const resps   = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
      const results = interleave(resps.map(d => d.results || []));
      results.forEach(g => ref.seenIds.add(g.id));
      setGames(results);
      const total = resps.reduce((acc, d) => acc + (d.total || 0), 0);
      setTotalCount(total);
      ref.canMore = !section; // bölüm yoksa sayfalandır
    } catch {}
    finally { setLoading(false); }
  }, [section, query, buildUrls]);

  const loadMore = useCallback(async () => {
    const ref = scrollRef.current;
    if (ref.fetching || !ref.canMore) return;
    ref.fetching = true;
    setLoadingMore(true);

    let found = false;
    let skips = 0;
    while (!found && skips < 8) {
      const nextPage = ref.page + 1;
      try {
        const urls       = buildUrls(nextPage);
        const resps      = await Promise.all(urls.map(u => fetch(u).then(r => r.json())));
        const merged     = interleave(resps.map(d => d.results || []));
        const newResults = merged.filter(g => {
          if (ref.seenIds.has(g.id)) return false;
          ref.seenIds.add(g.id);
          return true;
        });
        ref.page = nextPage;
        setPage(nextPage);
        if (newResults.length > 0) {
          setGames(prev => [...prev, ...newResults]);
          found = true;
        } else { skips++; }
      } catch { break; }
    }

    ref.fetching = false;
    setLoadingMore(false);
  }, [buildUrls]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight + 400) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const t = setTimeout(handleScroll, 800);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, [loadMore]);

  const filteredGames = games.filter(g => {
    if (price === 'free') return g.isFree || g.gamePass;
    if (price !== 'all') {
      const limit = parseInt(price);
      if (g.price != null && !g.isFree && g.price > limit) return false;
    }
    return true;
  });

  const resetFilters = () => { setQuery(''); setPrice('all'); setSection(''); };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Oyunlar</h1>
        <p style={{ color: '#999', fontSize: 14 }}>
          Steam & Epic Games — gerçek zamanlı fiyatlar
        </p>
      </div>

      {/* Arama */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: '1.5px solid #e5e5e5',
        borderRadius: 12, padding: '12px 18px', marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSection(''); }}
          placeholder="Oyun ara… (Steam ve Epic'te arar)"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1a1a1a', background: 'transparent' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.value} onClick={() => { setSection(s.value); setQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, border: 'none',
              background: section === s.value ? '#DC2626' : '#f5f5f5',
              color:      section === s.value ? '#fff'    : '#555',
              fontWeight: section === s.value ? 600       : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {s.label}
            {/* Platform göstergesi */}
            {s.value !== '' && s.platform !== 'both' && (
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                {s.platform === 'steam' ? '(Steam)' : '(Epic)'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bütçe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Bütçe</span>
        <select value={price} onChange={e => setPrice(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e5e5', background: '#fff', fontSize: 13, color: '#333', outline: 'none' }}>
          {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Sonuç bilgisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#999' }}>
          {loading ? 'Yükleniyor…' : (
            <><span style={{ fontWeight: 600, color: '#1a1a1a' }}>{filteredGames.length}</span> oyun gösteriliyor</>
          )}
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {filteredGames.filter(g => g.isFree).length > 0 && (
            <span className="badge badge-green">✓ {filteredGames.filter(g => g.isFree).length} ücretsiz</span>
          )}
          {filteredGames.filter(g => g.onSale && !g.isFree).length > 0 && (
            <span className="badge badge-amber">{filteredGames.filter(g => g.onSale && !g.isFree).length} indirimli</span>
          )}
          {(query || section || price !== 'all') && (
            <button onClick={resetFilters} style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
              × Temizle
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid-auto">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1.5px solid #ebebeb', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 110, background: '#f5f5f5' }} />
              <div style={{ padding: '10px 12px' }}>
                <div style={{ height: 12, background: '#f0f0f0', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, background: '#f5f5f5', borderRadius: 4, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#555' }}>Sonuç bulunamadı</p>
          <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#bbb' }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid #f0f0f0', borderTopColor: '#DC2626',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
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

// İki diziden sırayla eleman alarak birleştirir (Steam, Epic, Steam, Epic...)
function interleave(arrays) {
  const result = [];
  const maxLen = Math.max(...arrays.map(a => a.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) result.push(arr[i]);
    }
  }
  return result;
}
