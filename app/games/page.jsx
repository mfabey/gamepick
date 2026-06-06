'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameCard from '../components/GameCard';

const PRICE_OPTIONS = [
  { label: 'Tümü',      value: 'all' },
  { label: 'Ücretsiz',  value: 'free' },
  { label: '₺0 – ₺100', value: '100' },
  { label: '₺0 – ₺300', value: '300' },
  { label: '₺0 – ₺500', value: '500' },
];

const PAGE_SIZE = 24;

export default function GamesPage() {
  const [query,       setQuery]       = useState('');
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState('');
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const debounceRef   = useRef(null);
  const sentinelRef   = useRef(null);
  const fetchingRef   = useRef(false);
  const seenIdsRef    = useRef(new Set());

  const buildUrl = useCallback((pageNum) => {
    if (section) return `/api/steam?section=${section}&num=80`;
    if (query)   return `/api/steam?q=${encodeURIComponent(query)}&num=${PAGE_SIZE}&page=${pageNum}`;
    return `/api/steam?section=all&num=${PAGE_SIZE}&page=${pageNum}`;
  }, [query, section]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setPage(1);
    fetchingRef.current = false;
    seenIdsRef.current  = new Set();
    try {
      const res     = await fetch(buildUrl(1));
      const data    = await res.json();
      const results = data.results || [];
      results.forEach(g => seenIdsRef.current.add(g.id));
      setGames(results);
      setTotalCount(data.total || results.length);
      const canPaginate = !section;
      setHasMore(canPaginate && (data.total || 0) > PAGE_SIZE);
    } catch {}
    finally { setLoading(false); }
  }, [buildUrl, section, query]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res        = await fetch(buildUrl(nextPage));
      const data       = await res.json();
      const newResults = (data.results || []).filter(g => {
        if (seenIdsRef.current.has(g.id)) return false;
        seenIdsRef.current.add(g.id);
        return true;
      });
      if (newResults.length > 0) {
        setGames(prev => [...prev, ...newResults]);
      }
      setPage(nextPage);
      setHasMore(newResults.length > 0 || nextPage < page + 3);
    } catch {}
    finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, page, buildUrl]);

  // Arama değişince debounce ile yeniden çek
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  // Sonsuz scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Fiyat filtresi (client-side)
  const filteredGames = games.filter(g => {
    if (price === 'free') return g.isFree || g.gamePass;
    if (price !== 'all') {
      const limit = parseInt(price);
      if (g.price !== null && g.price !== undefined && !g.isFree && g.price > limit) return false;
    }
    return true;
  });

  const resetFilters = () => { setQuery(''); setPrice('all'); setSection(''); };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Oyunlar</h1>
        <p style={{ color: '#999', fontSize: 14 }}>
          {totalCount > 0 ? `${totalCount.toLocaleString('tr-TR')} oyun — Steam fiyatları` : 'Steam\'den gerçek zamanlı fiyatlar'}
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
          placeholder="Ne arıyorsunuz? (aksiyon, macera, deniz, uzay…)"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1a1a1a', background: 'transparent' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Tümü',           value: '' },
          { label: '🎮 Ücretsiz',    value: 'free' },
          { label: '🗓️ Yeni Çıkan',  value: 'new' },
          { label: '💥 Trend',       value: 'topsellers' },
          { label: '⭐ Öne Çıkan',   value: 'featured' },
        ].map(s => (
          <button key={s.value} onClick={() => { setSection(s.value); setQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, border: 'none',
              background: section === s.value ? '#DC2626' : '#f5f5f5',
              color:      section === s.value ? '#fff'    : '#555',
              fontWeight: section === s.value ? 600       : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Bütçe filtresi */}
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
          <p style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Sonuç bulunamadı</p>
          <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <>
          <div className="grid-auto">
            {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>

          {/* Sonsuz scroll tetikleyici */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {/* Yükleniyor göstergesi */}
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                display: 'inline-flex', gap: 6, alignItems: 'center',
                fontSize: 13, color: '#bbb',
              }}>
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
