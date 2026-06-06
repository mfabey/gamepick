'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameCard from '../components/GameCard';

// Steam arama terimleri tür filtresine göre
const GENRES = [
  { label: 'Tümü',       value: '' },
  { label: 'Aksiyon',    value: 'action' },
  { label: 'RPG',        value: 'rpg' },
  { label: 'Strateji',   value: 'strategy' },
  { label: 'Macera',     value: 'adventure' },
  { label: 'Simülasyon', value: 'simulation' },
  { label: 'Indie',      value: 'indie' },
  { label: 'Nişancı',    value: 'shooter' },
  { label: 'Bulmaca',    value: 'puzzle' },
  { label: 'Spor',       value: 'sports' },
  { label: 'Yarış',      value: 'racing' },
];

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
  const [genre,       setGenre]       = useState('');
  const [price,       setPrice]       = useState('all');
  const [section,     setSection]     = useState('');
  const [games,       setGames]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalCount,  setTotalCount]  = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const debounceRef = useRef(null);

  const buildUrl = useCallback((pageNum) => {
    // Hiçbir filtre yoksa topsellers göster
    if (!query && !genre && !section) return `/api/steam?section=topsellers&num=${PAGE_SIZE}`;
    if (section) return `/api/steam?section=${section}&num=${PAGE_SIZE}`;
    const term = genre ? `${query} ${genre}`.trim() : query;
    return `/api/steam?q=${encodeURIComponent(term)}&num=${PAGE_SIZE}&page=${pageNum}`;
  }, [query, genre, section]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const res  = await fetch(buildUrl(1));
      const data = await res.json();
      const results = data.results || [];
      setGames(results);
      setTotalCount(data.total || results.length);
      setHasMore((data.total || 0) > PAGE_SIZE && !section);
    } catch {}
    finally { setLoading(false); }
  }, [buildUrl, section]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res  = await fetch(buildUrl(nextPage));
      const data = await res.json();
      const newResults = data.results || [];
      setGames(prev => [...prev, ...newResults]);
      setPage(nextPage);
      setHasMore(games.length + newResults.length < (data.total || 0));
    } catch {}
    finally { setLoadingMore(false); }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  // Fiyat filtresi (client-side)
  const filteredGames = games.filter(g => {
    if (price === 'free') return g.isFree || g.gamePass;
    if (price !== 'all') {
      const limit = parseInt(price);
      if (g.price !== null && g.price !== undefined && !g.isFree && g.price > limit) return false;
    }
    return true;
  });

  const resetFilters = () => { setQuery(''); setGenre(''); setPrice('all'); setSection(''); };

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
        borderRadius: 12, padding: '10px 16px', marginBottom: 16,
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSection(''); }}
          placeholder="Steam'de oyun ara..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1a1a1a', background: 'transparent' }}
        />
        {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 18 }}>×</button>}
      </div>

      {/* Bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Tümü',           value: '' },
          { label: '🎮 Ücretsiz',    value: 'specials' },
          { label: '🗓️ Yeni Çıkan',  value: 'new' },
          { label: '💥 Trend',       value: 'topsellers' },
          { label: '⭐ Öne Çıkan',   value: 'featured' },
        ].map(s => (
          <button key={s.value} onClick={() => { setSection(s.value); setQuery(''); setGenre(''); }}
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

      {/* Filtre kutusu */}
      <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Tür */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tür</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {GENRES.map(g => (
                <button key={g.value} onClick={() => { setGenre(g.value); setSection(''); }}
                  style={{
                    padding: '4px 11px', borderRadius: 999, fontSize: 12,
                    border: genre === g.value ? '1.5px solid #DC2626' : '1.5px solid #e5e5e5',
                    background: genre === g.value ? '#FEF2F2' : '#fff',
                    color:   genre === g.value ? '#DC2626' : '#555',
                    cursor: 'pointer',
                  }}
                >{g.label}</button>
              ))}
            </div>
          </div>

          {/* Bütçe */}
          <div>
            <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bütçe</p>
            <select value={price} onChange={e => setPrice(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e5e5', background: '#fff', fontSize: 13, color: '#333', outline: 'none' }}>
              {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sonuç bilgisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#999' }}>
          {loading ? 'Yükleniyor…' : (
            <><span style={{ fontWeight: 600, color: '#1a1a1a' }}>{filteredGames.length}</span> oyun gösteriliyor
            {totalCount > filteredGames.length && ` / ${totalCount.toLocaleString('tr-TR')}`}</>
          )}
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {filteredGames.filter(g => g.isFree).length > 0 && (
            <span className="badge badge-green">✓ {filteredGames.filter(g => g.isFree).length} ücretsiz</span>
          )}
          {filteredGames.filter(g => g.onSale && !g.isFree).length > 0 && (
            <span className="badge badge-amber">{filteredGames.filter(g => g.onSale && !g.isFree).length} indirimli</span>
          )}
          {(query || genre || section || price !== 'all') && (
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

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <p style={{ fontSize: 13, color: '#bbb', marginBottom: 12 }}>
                {filteredGames.length} / {totalCount.toLocaleString('tr-TR')} oyun
              </p>
              <button onClick={loadMore} disabled={loadingMore}
                style={{
                  padding: '12px 36px', borderRadius: 10,
                  background: loadingMore ? '#f0f0f0' : '#DC2626',
                  color: loadingMore ? '#bbb' : '#fff',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: loadingMore ? 'default' : 'pointer',
                }}>
                {loadingMore ? 'Yükleniyor…' : `Daha Fazla Yükle (+${PAGE_SIZE})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
