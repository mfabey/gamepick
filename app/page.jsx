'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const MOODS = [
  { id: 'relax',     label: 'Rahatlamak',       query: 'relaxing casual peaceful' },
  { id: 'action',    label: 'Heyecan',           query: 'action exciting fast-paced' },
  { id: 'challenge', label: 'Meydan okuma',      query: 'challenging difficult hardcore' },
  { id: 'story',     label: 'Derin hikaye',      query: 'story-rich narrative' },
  { id: 'coop',      label: 'Arkadaşlarla',      query: 'multiplayer co-op' },
  { id: 'strategy',  label: 'Strateji',          query: 'strategy puzzle' },
];

const POPULAR_QUERIES = ['rpg', 'indie', 'action', 'adventure', 'simulation'];

export default function Home() {
  const [query, setQuery]         = useState('');
  const [moods, setMoods]         = useState([]);
  const [budget, setBudget]       = useState(500);
  const [platforms, setPlatforms] = useState({ steam: true, epic: true, xbox: false });
  const [games, setGames]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSugg] = useState('');
  const debounceRef = useRef(null);

  const fetchPrices = useCallback(async (gamesList) => {
    gamesList.forEach(async (game) => {
      try {
        const res  = await fetch(`/api/prices?title=${encodeURIComponent(game.name)}`);
        const data = await res.json();
        const bestPrice = data.gamePass ? null : (data.steam || data.epic || null);
        setGames(prev => prev.map(g =>
          g.id === game.id
            ? { ...g, price: bestPrice, gamePass: data.gamePass, onSale: data.steamOriginal > data.steam }
            : g
        ));
      } catch {}
    });
  }, []);

  const fetchGames = useCallback(async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/games?q=${encodeURIComponent(searchQuery)}&budget=${budget}`);
      const data = await res.json();
      const results = data.results || [];
      setGames(results);
      fetchPrices(results);
    } catch (err) {
      console.error('Oyun arama hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [budget, fetchPrices]);

  const askAI = useCallback(async () => {
    if (moods.length === 0) return;
    setAiLoading(true);
    setAiSugg('');
    try {
      const moodLabels = moods.map(m => MOODS.find(x => x.id === m)?.label).join(', ');
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moods: moodLabels, budget }),
      });
      const data = await res.json();
      setAiSugg(data.message || '');
      if (data.searchQuery) fetchGames(data.searchQuery);
    } catch (err) {
      console.error('AI öneri hatası:', err);
    } finally {
      setAiLoading(false);
    }
  }, [moods, budget, fetchGames]);

  useEffect(() => {
    if (!query) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGames(query), 600);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchGames]);

  useEffect(() => {
    fetchGames(POPULAR_QUERIES[Math.floor(Math.random() * POPULAR_QUERIES.length)]);
  }, []);

  useEffect(() => {
    if (moods.length > 0) askAI();
  }, [moods]);

  const toggleMood = (id) =>
    setMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const filteredGames = games.filter(g => {
    if (g.price !== null && g.price !== undefined && g.price > budget) return false;
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10, color: '#1a1a1a' }}>
          Doğru Oyun,{' '}
          <span style={{ color: '#DC2626' }}>En İyi Fiyat</span>
        </h1>
        <p style={{ color: '#888', fontSize: 16 }}>
          Ruh haline göre AI önerisi — Steam, Epic ve Xbox fiyatları tek ekranda
        </p>
      </div>

      {/* Arama kutusu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        border: '1.5px solid #e5e5e5',
        borderRadius: 14,
        padding: '12px 18px',
        marginBottom: 24,
        maxWidth: 700,
        margin: '0 auto 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <SearchIcon />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Oyun ara... veya 'stresten kaçmak istiyorum' yaz"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#1a1a1a',
            fontSize: 15,
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#999', fontSize: 18 }}>
            ×
          </button>
        )}
      </div>

      {/* Ruh hali seçici */}
      <div style={{ marginBottom: 24, maxWidth: 700, margin: '0 auto 24px' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 10 }}>
          Ruh halin nasıl?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => toggleMood(m.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                fontSize: 13,
                border: moods.includes(m.id) ? '1.5px solid #DC2626' : '1.5px solid #e5e5e5',
                background: moods.includes(m.id) ? '#FEF2F2' : '#fff',
                color: moods.includes(m.id) ? '#DC2626' : '#555',
                fontWeight: moods.includes(m.id) ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI önerisi */}
      {(aiLoading || aiSuggestion) && (
        <div style={{
          maxWidth: 700,
          margin: '0 auto 28px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <AIIcon loading={aiLoading} />
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            {aiLoading ? 'AI analiz ediyor...' : aiSuggestion}
          </p>
        </div>
      )}

      {/* Filtreler */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 10 }}>Platform</p>
          {['Steam', 'Epic Games', 'Xbox / Game Pass'].map((p, i) => {
            const key = ['steam', 'epic', 'xbox'][i];
            return (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444', marginBottom: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={platforms[key]}
                  onChange={() => setPlatforms(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={{ accentColor: '#DC2626' }}
                />
                {p}
              </label>
            );
          })}
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 10 }}>Bütçe</p>
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>
            ₺0 — ₺{budget}
          </p>
          <input
            type="range"
            min={0} max={1500} step={50}
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DC2626' }}
          />
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', fontWeight: 600, marginBottom: 10 }}>Sonuçlar</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{filteredGames.length}</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>oyun bulundu</p>
          {filteredGames.filter(g => g.gamePass).length > 0 && (
            <span className="badge badge-green" style={{ marginTop: 8 }}>
              ✓ {filteredGames.filter(g => g.gamePass).length} Game Pass'te
            </span>
          )}
        </div>
      </div>

      {/* Oyun grid */}
      {loading ? (
        <LoadingGrid />
      ) : (
        <>
          <p className="section-title">
            {query ? `"${query}" sonuçları` : moods.length > 0 ? 'Sana özel öneriler' : 'Popüler oyunlar'}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {filteredGames.length === 0 ? (
              <p style={{ color: '#999', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
                Sonuç bulunamadı. Farklı bir arama deneyin.
              </p>
            ) : (
              filteredGames.map(game => <GameCard key={game.id} game={game} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GameCard({ game }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/game/${game.id}`}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          border: `1.5px solid ${hovered ? '#FECACA' : '#ebebeb'}`,
          borderRadius: 14,
          overflow: 'hidden',
          transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? '0 4px 16px rgba(220,38,38,0.1)' : '0 1px 4px rgba(0,0,0,0.06)',
          cursor: 'pointer',
        }}
      >
        <div style={{ height: 110, background: game.thumbColor || '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
          {game.image ? (
            <Image src={game.image} alt={game.name} fill style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#999',
            }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          {game.gamePass && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <span className="badge badge-green">Game Pass</span>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, lineHeight: 1.3, color: '#1a1a1a' }}>
            {game.name}
          </p>
          {game.metacritic && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: game.metacritic >= 80 ? '#16a34a' : game.metacritic >= 60 ? '#d97706' : '#dc2626',
            }}>
              {game.metacritic} Metacritic
            </span>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0 8px' }}>
            {(game.genres || []).slice(0, 2).map(g => (
              <span key={g} className="badge badge-gray">{g}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {game.gamePass ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Game Pass — Ücretsiz</span>
            ) : game.price !== null && game.price !== undefined ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>₺{game.price}</span>
            ) : (
              <span style={{ fontSize: 12, color: '#ccc', fontStyle: 'italic' }}>yükleniyor…</span>
            )}
            {game.onSale && <span className="badge badge-amber">İndirimli</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          background: '#fff',
          border: '1.5px solid #ebebeb',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div style={{ height: 110, background: '#f5f5f5' }} />
          <div style={{ padding: '10px 12px' }}>
            <div style={{ height: 12, background: '#f0f0f0', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 10, background: '#f5f5f5', borderRadius: 6, width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function AIIcon({ loading }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
