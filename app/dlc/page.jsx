'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import GameCard from '../components/GameCard';

const SECTIONS = [
  { label: 'Tümü',       value: ''        },
  { label: '🗓️ Yeni',    value: 'new'     },
  { label: '💥 Popüler', value: 'popular' },
];

const PAGE_SIZE = 24;

export default function DlcPage() {
  const [query,       setQuery]       = useState('');
  const [section,     setSection]     = useState('');
  const [dlcs,        setDlcs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef  = useRef(null);
  const sentinelRef  = useRef(null);
  const scrollRef    = useRef({ page: 1, fetching: false, canMore: false, seenIds: new Set(), section: '', query: '' });

  const buildUrl = useCallback((pageNum) => {
    const { section: s, query: q } = scrollRef.current;
    const p = new URLSearchParams({ page: pageNum, num: PAGE_SIZE });
    if (s) p.set('section', s);
    if (q) p.set('q', q);
    return '/api/dlc?' + p.toString();
  }, []);

  const fetchDlcs = useCallback(async () => {
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
      const results = data.results || [];
      results.forEach(g => ref.seenIds.add(g.id));
      setDlcs(results);
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
        const newResults = (data.results || []).filter(g => {
          if (ref.seenIds.has(g.id)) return false;
          ref.seenIds.add(g.id);
          return true;
        });
        ref.page = nextPage;
        if (newResults.length > 0) {
          setDlcs(prev => [...prev, ...newResults]);
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

  // Kullanıcı yazmaya başlar başlamaz eski sonuçları gizle
  useEffect(() => {
    if (query.trim()) {
      setDlcs([]);
      setLoading(true);
    }
  }, [query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchDlcs, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetchDlcs]);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prev_catalog', '/dlc');
    }
  }, []);

  const resetFilters = () => { setQuery(''); setSection(''); };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      {/* Başlık */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 999, padding: '3px 12px', marginBottom: 10,
          fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          ✦ Ek İçerik
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>DLC & Genişleme Paketleri</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Oyunlara özel ek içerikler, sezon geçişleri ve genişleme paketleri</p>
      </div>

      {/* Arama */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
        borderRadius: 12, padding: '12px 18px', marginBottom: 16,
        boxShadow: 'var(--shadow)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSection(''); }}
          placeholder="DLC veya paket ara…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)', background: 'transparent' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Bölüm filtreleri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.value} onClick={() => { setSection(s.value); setQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, border: 'none', cursor: 'pointer',
              background: section === s.value ? 'var(--accent)' : 'var(--bg-input)',
              color:      section === s.value ? '#fff'    : 'var(--text-2)',
              fontWeight: section === s.value ? 600       : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Sonuç bilgisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          {loading ? 'Yükleniyor…' : (
            <><span style={{ fontWeight: 600, color: 'var(--text)' }}>{dlcs.length}</span> ek içerik gösteriliyor</>
          )}
        </p>
        {(query || section) && (
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
      ) : dlcs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)' }}>DLC bulunamadı</p>
          <button onClick={resetFilters} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <>
          <div className="grid-auto">
            {dlcs.map(dlc => <DlcCard key={dlc.id} dlc={dlc} />)}
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

// DLC'ye özel kart — oyun sayfasına yönlendir, üstüne "DLC" rozeti ekle
function DlcCard({ dlc }) {
  const [hovered, setHovered] = useState(false);
  const href = `/game/rawg/${dlc.rawgSlug || dlc.id}`;

  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background:   'var(--bg-card)',
          border:       `1.5px solid ${hovered ? 'var(--accent-border)' : 'var(--border)'}`,
          borderRadius: 14, overflow: 'hidden',
          transition:   'border-color 0.15s, transform 0.15s',
          transform:    hovered ? 'translateY(-2px)' : 'none',
          cursor:       'pointer',
        }}
      >
        {/* Kapak */}
        <div style={{ height: 110, background: 'var(--bg-input)', position: 'relative', overflow: 'hidden' }}>
          {dlc.image ? (
            <img src={dlc.image} alt={dlc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--text-3)' }}>
              {dlc.name?.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* DLC rozeti */}
          <div style={{ position: 'absolute', top: 7, left: 7 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: 'var(--accent)', color: '#fff', letterSpacing: '0.04em',
            }}>
              DLC
            </span>
          </div>

          {/* Metacritic */}
          {dlc.metacritic && (
            <div style={{ position: 'absolute', bottom: 6, right: 7 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(0,0,0,0.6)',
                color: dlc.metacritic >= 80 ? '#4ade80' : dlc.metacritic >= 60 ? '#fbbf24' : '#f87171',
              }}>
                {dlc.metacritic}
              </span>
            </div>
          )}
        </div>

        {/* Alt bilgi */}
        <div style={{ padding: '9px 11px' }}>
          <p style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, color: 'var(--text)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dlc.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {dlc.totalReviews > 0 ? '⭐ ' + dlc.totalReviews.toLocaleString('tr') : dlc.released?.slice(0, 4) || '—'}
            </span>
            {(dlc.genres || []).slice(0, 1).map(g => (
              <span key={g} className="badge badge-gray" style={{ fontSize: 10 }}>{g}</span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}
