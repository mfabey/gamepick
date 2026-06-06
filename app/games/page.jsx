'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameCard from '../components/GameCard';

const GENRES = [
  { label: 'Tümü',       value: '' },
  { label: 'Aksiyon',    value: 'action' },
  { label: 'RPG',        value: 'role-playing-games-rpg' },
  { label: 'Strateji',   value: 'strategy' },
  { label: 'Macera',     value: 'adventure' },
  { label: 'Simülasyon', value: 'simulation' },
  { label: 'Indie',      value: 'indie' },
  { label: 'Nişancı',    value: 'shooter' },
  { label: 'Bulmaca',    value: 'puzzle' },
  { label: 'Spor',       value: 'sports' },
  { label: 'Yarış',      value: 'racing' },
];

const SORT_OPTIONS = [
  { label: 'Popülerlik',    value: '-added' },
  { label: 'Metacritic',    value: '-metacritic' },
  { label: 'Çıkış tarihi',  value: '-released' },
  { label: 'İsim A-Z',      value: 'name' },
];

const PRICE_OPTIONS = [
  { label: 'Tümü',          value: 'all' },
  { label: 'Ücretsiz',      value: 'free' },
  { label: '₺0 – ₺100',    value: '100' },
  { label: '₺0 – ₺300',    value: '300' },
  { label: '₺0 – ₺500',    value: '500' },
];

export default function GamesPage() {
  const [query,    setQuery]    = useState('');
  const [genre,    setGenre]    = useState('');
  const [sort,     setSort]     = useState('-added');
  const [price,    setPrice]    = useState('all');
  const [section,  setSection]  = useState(''); // free | new | trending | ''
  const [games,    setGames]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const debounceRef = useRef(null);

  const fetchPrices = useCallback(async (list) => {
    list.forEach(async (game) => {
      try {
        const res  = await fetch(`/api/prices?title=${encodeURIComponent(game.name)}`);
        const data = await res.json();
        const bestPrice = data.gamePass ? null : (data.steam || data.epic || null);
        setGames(prev => prev.map(g =>
          g.id === game.id
            ? { ...g, price: bestPrice, gamePass: data.gamePass, onSale: (data.steamOriginal || 0) > (data.steam || 0) }
            : g
        ));
      } catch {}
    });
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/games?page_size=24';
      if (section) {
        url += `&section=${section}`;
      } else if (query) {
        url += `&q=${encodeURIComponent(query)}&ordering=${sort}`;
      } else {
        url += `&ordering=${sort}`;
      }
      if (genre && !section) url += `&genre=${genre}`;

      const res  = await fetch(url);
      const data = await res.json();
      const results = (data.results || []).map(g =>
        section === 'free' ? { ...g, isFree: true } : g
      );
      setGames(results);
      fetchPrices(results);
    } catch {}
    finally { setLoading(false); }
  }, [query, genre, sort, section, fetchPrices]);

  // Debounce arama
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchGames, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetchGames]);

  // Fiyat filtresi client-side
  const filteredGames = games.filter(g => {
    if (price === 'free') return g.isFree || g.gamePass;
    if (price !== 'all') {
      const limit = parseInt(price);
      if (g.price !== null && g.price !== undefined && g.price > limit) return false;
    }
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Oyunlar</h1>
        <p style={{ color: '#999', fontSize: 14 }}>Ara, filtrele, fiyatları karşılaştır</p>
      </div>

      {/* Arama */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: '1.5px solid #e5e5e5',
        borderRadius: 12, padding: '10px 16px', marginBottom: 20,
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSection(''); }}
          placeholder="Oyun adı ara..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1a1a1a', background: 'transparent' }}
        />
        {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 18 }}>×</button>}
      </div>

      {/* Hızlı bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Tümü',          value: '' },
          { label: '🟢 Ücretsiz',   value: 'free' },
          { label: '🆕 Yeni Çıkan', value: 'new' },
          { label: '🔥 Trend',      value: 'trending' },
        ].map(s => (
          <button
            key={s.value}
            onClick={() => { setSection(s.value); setQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, border: 'none',
              background: section === s.value ? '#DC2626' : '#f5f5f5',
              color:      section === s.value ? '#fff'    : '#555',
              fontWeight: section === s.value ? 600       : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filtre çubuğu */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Tür */}
        <div>
          <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tür</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <button
                key={g.value}
                onClick={() => setGenre(g.value)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12,
                  border: genre === g.value ? '1.5px solid #DC2626' : '1.5px solid #e5e5e5',
                  background: genre === g.value ? '#FEF2F2' : '#fff',
                  color:   genre === g.value ? '#DC2626' : '#555',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Fiyat */}
          <div>
            <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Bütçe</p>
            <select
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e5e5',
                background: '#fff', fontSize: 13, color: '#333', outline: 'none',
              }}
            >
              {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Sıralama */}
          <div>
            <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sıralama</p>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e5e5',
                background: '#fff', fontSize: 13, color: '#333', outline: 'none',
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sonuç sayısı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: '#999' }}>
          {loading ? 'Yükleniyor…' : `${filteredGames.length} oyun`}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {filteredGames.filter(g => g.isFree || g.gamePass).length > 0 && (
            <span className="badge badge-green">
              ✓ {filteredGames.filter(g => g.isFree || g.gamePass).length} ücretsiz
            </span>
          )}
          {filteredGames.filter(g => g.onSale).length > 0 && (
            <span className="badge badge-amber">
              {filteredGames.filter(g => g.onSale).length} indirimli
            </span>
          )}
        </div>
      </div>

      {/* Oyun grid */}
      {loading ? (
        <div className="grid-auto">
          {Array.from({ length: 12 }).map((_, i) => (
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
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 6 }}>Sonuç bulunamadı</p>
          <p style={{ fontSize: 13 }}>Farklı bir arama veya filtre deneyin.</p>
        </div>
      ) : (
        <div className="grid-auto">
          {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      )}
    </div>
  );
}
