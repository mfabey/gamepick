'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

export default function LibraryPage() {
  const { steamUser, steamLogout } = useAuth();

  const [library,       setLibrary]       = useState(null);  // { games, total, played, totalHours }
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [sort,          setSort]          = useState('hours'); // hours | name | recent | value
  const [filter,        setFilter]        = useState('all');  // all | played | unplayed
  const [prices,        setPrices]        = useState({});     // { appid: priceInfo }
  const [pricesLoading, setPricesLoading] = useState(false);

  // Steam kütüphanesini çek
  useEffect(() => {
    if (!steamUser) return;
    setLoading(true);
    setError(null);
    fetch('/api/steam-library')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d); return; }
        setLibrary(d);
      })
      .catch(e => setError({ error: e.message }))
      .finally(() => setLoading(false));
  }, [steamUser]);

  // Kütüphane yüklendikten sonra fiyatları çek
  useEffect(() => {
    if (!library?.games?.length) return;
    const appids = library.games.map(g => g.appid).join(',');
    setPricesLoading(true);
    fetch(`/api/steam-prices?appids=${appids}`)
      .then(r => r.json())
      .then(d => setPrices(d))
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, [library]);

  // Toplam kütüphane değeri
  const totalValue = useMemo(() => {
    if (!library?.games) return null;
    let sum = 0;
    let counted = 0;
    for (const g of library.games) {
      const p = prices[g.appid];
      if (p && !p.isFree && p.original > 0) {
        sum += p.original;
        counted++;
      }
    }
    return counted > 0 ? { sum, counted } : null;
  }, [prices, library]);

  // Steam ile giriş yapılmamışsa
  if (!steamUser) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 60, maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎮</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Steam Kütüphaneni Bağla</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Steam hesabınla giriş yaparak tüm oyunlarını, oynadığın saatleri ve istatistiklerini burada görüntüle.
        </p>

        <a href="/api/auth/steam" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '14px 32px', borderRadius: 12,
            background: '#1b2838', color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(27,40,56,0.4)',
            transition: 'transform 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <svg width="28" height="28" viewBox="0 0 233 233" fill="#fff">
              <path d="M116.5 0C52.1 0 0 52.1 0 116.5c0 57.5 41.8 105.3 96.8 114.5l-38-91.1c-5.5-2.4-9.6-7.5-10.5-13.8-1.6-11.4 6.4-21.9 17.8-23.5 11.4-1.6 21.9 6.4 23.5 17.8.7 4.9-.4 9.7-2.9 13.5l38.2 91.5c.9 0 1.9.1 2.8.1 64.4 0 116.5-52.1 116.5-116.5C233 52.1 180.9 0 116.5 0z"/>
              <path d="M95.8 161.8l-12.3-29.5c-3.3.5-6.8.3-10.1-.7l12.2 29.2c3.2.7 6.8.5 10.2 1z" fill="#1b2838"/>
              <path d="M63.5 127.5c0 9.7 7.9 17.6 17.6 17.6s17.6-7.9 17.6-17.6-7.9-17.6-17.6-17.6-17.6 7.9-17.6 17.6z" fill="#fff"/>
              <path d="M145 74.5c-14.6 0-26.5 11.9-26.5 26.5s11.9 26.5 26.5 26.5 26.5-11.9 26.5-26.5S159.6 74.5 145 74.5zm0 44.2c-9.8 0-17.7-7.9-17.7-17.7s7.9-17.7 17.7-17.7 17.7 7.9 17.7 17.7-7.9 17.7-17.7 17.7z" fill="#fff"/>
            </svg>
            Steam ile Giriş Yap
          </div>
        </a>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', textAlign: 'left', fontSize: 13, color: 'var(--text-3)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>📋 Gereksinimler</p>
          <p style={{ marginBottom: 4 }}>• Steam profilin <strong>herkese açık</strong> olmalı</p>
          <p style={{ marginBottom: 4 }}>• Profil gizliliği: Steam → Profili Düzenle → Gizlilik Ayarları</p>
          <p>• GamePick hiçbir bilgini kaydetmez, yalnızca görüntüler</p>
        </div>
      </div>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 60 }}>
        <SteamProfileHeader steamUser={steamUser} library={null} totalValue={null} pricesLoading={false} onLogout={steamLogout} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: 68, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      </div>
    );
  }

  // Hata
  if (error) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 60 }}>
        <SteamProfileHeader steamUser={steamUser} library={null} totalValue={null} pricesLoading={false} onLogout={steamLogout} />
        <div style={{ marginTop: 32, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '24px 28px', textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🔒</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
            {error.private ? 'Profil Gizli' : 'Kütüphane Yüklenemedi'}
          </p>
          <p style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.6 }}>
            {error.private
              ? 'Steam profilini "Herkese Açık" yapman gerekiyor. Steam → Profili Düzenle → Gizlilik Ayarları → Oyun Detayları: Herkese Açık'
              : error.error
            }
          </p>
          {error.private && (
            <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#1b2838', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Steam Gizlilik Ayarları →
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!library) return null;

  // Filtreleme ve arama
  const filtered = (library.games || [])
    .filter(g => {
      if (filter === 'played')   return g.hours > 0;
      if (filter === 'unplayed') return g.hours === 0;
      return true;
    })
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'hours')  return b.hours - a.hours;
      if (sort === 'name')   return a.name.localeCompare(b.name, 'tr');
      if (sort === 'recent') return b.lastPlayed - a.lastPlayed;
      if (sort === 'value') {
        const pa = prices[a.appid]?.original ?? -1;
        const pb = prices[b.appid]?.original ?? -1;
        return pb - pa;
      }
      return 0;
    });

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      <SteamProfileHeader steamUser={steamUser} library={library} totalValue={totalValue} pricesLoading={pricesLoading} onLogout={steamLogout} />

      {/* Filtreler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Oynanma durumu */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Tümü',         value: 'all'      },
            { label: '▶ Oynandı',   value: 'played'   },
            { label: '○ Oynanmadı', value: 'unplayed' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer',
              background: filter === f.value ? '#1a9fff' : 'var(--bg-input)',
              color:      filter === f.value ? '#fff'    : 'var(--text-2)',
              fontWeight: filter === f.value ? 600       : 400,
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Sıralama */}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
          fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)',
        }}>
          <option value="hours">Saat ↓</option>
          <option value="name">İsim A-Z</option>
          <option value="recent">Son Oynanan</option>
          <option value="value">Değer ↓</option>
        </select>

        {/* Arama */}
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1.5px solid var(--border)',
          borderRadius: 10, padding: '7px 14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Kütüphanede ara…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', background: 'transparent' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {/* Sonuç sayısı */}
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{filtered.length}</span> oyun gösteriliyor
        {pricesLoading && <span style={{ marginLeft: 10, color: '#1a9fff', fontStyle: 'italic' }}>fiyatlar yükleniyor…</span>}
      </p>

      {/* Oyun listesi */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Oyun bulunamadı</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filtered.map((game, i) => (
            <GameRow
              key={game.appid}
              game={game}
              rank={sort === 'hours' ? i + 1 : null}
              price={prices[game.appid]}
              pricesLoading={pricesLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Steam Profil Başlığı ─────────────────────────────────────────────────────
function SteamProfileHeader({ steamUser, library, totalValue, pricesLoading, onLogout }) {
  const fmtTL = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1b2838, #2a475e)',
      borderRadius: 16, padding: '20px 24px', marginBottom: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Avatar */}
        {steamUser.avatar ? (
          <img src={steamUser.avatar} alt="" style={{ width: 64, height: 64, borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 12, background: '#1a9fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {steamUser.name?.slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* İsim + link */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Steam Kütüphanesi</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{steamUser.name}</h1>
          <a href={steamUser.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1a9fff', textDecoration: 'none' }}>
            Profili Görüntüle →
          </a>
        </div>

        {/* İstatistikler */}
        {library && (
          <div style={{ display: 'flex', gap: 20, flexShrink: 0, flexWrap: 'wrap' }}>
            {[
              { label: 'Toplam Oyun',  value: library.total },
              { label: 'Oynanan',      value: library.played },
              { label: 'Toplam Saat',  value: `${library.totalHours}s` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}

            {/* Kütüphane değeri */}
            <div style={{ textAlign: 'center' }}>
              {pricesLoading && !totalValue ? (
                <>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>…</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Kütüphane Değeri</p>
                </>
              ) : totalValue ? (
                <>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>{fmtTL(totalValue.sum)}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Kütüphane Değeri</p>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Çıkış */}
        <button onClick={onLogout} style={{
          padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)', cursor: 'pointer', flexShrink: 0,
        }}>
          Çıkış Yap
        </button>
      </div>

      {/* Fiyat alt notu */}
      {totalValue && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>
          * Güncel Steam Türkiye fiyatları baz alınmıştır ({totalValue.counted} oyun).
          Ücretsiz ve bölgede satılmayan oyunlar dahil edilmemiştir.
        </p>
      )}
    </div>
  );
}

// ── Oyun Satırı ──────────────────────────────────────────────────────────────
function GameRow({ game, rank, price, pricesLoading }) {
  const [imgError, setImgError] = useState(false);
  const hasHours   = game.hours > 0;
  const lastPlayed = game.lastPlayed ? formatLastPlayed(game.lastPlayed) : null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 14px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        transition: 'border-color 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#1a9fff'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Sıralama */}
      {rank && (
        <span style={{ width: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>
          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
        </span>
      )}

      {/* Kapak görseli */}
      <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
        <div style={{ width: 60, height: 38, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-input)', position: 'relative' }}>
          {!imgError ? (
            <Image src={game.image} alt={game.name} fill style={{ objectFit: 'cover' }} unoptimized onError={() => setImgError(true)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </a>

      {/* İsim + son oynanma */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {game.name}
          </p>
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
          {game.hoursRecent > 0 && (
            <span style={{ fontSize: 11, color: '#1a9fff' }}>Son 2 haftada {game.hoursRecent}s</span>
          )}
          {lastPlayed && !game.hoursRecent && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Son: {lastPlayed}</span>
          )}
        </div>
      </div>

      {/* GamePick arama linki */}
      <a
        href={`/games?q=${encodeURIComponent(game.name)}`}
        title="GamePick'te ara"
        style={{
          flexShrink: 0, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          color: 'var(--text-3)', textDecoration: 'none', whiteSpace: 'nowrap',
          transition: 'color 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
      >
        🔍 GamePick
      </a>

      {/* Fiyat */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
        {price ? (
          price.isFree ? (
            <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>Ücretsiz</p>
          ) : (
            <>
              {price.discount > 0 && (
                <p style={{ fontSize: 10, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 1 }}>
                  {price.originalFormatted}
                </p>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: price.discount > 0 ? '#4ade80' : 'var(--text)' }}>
                {price.currentFormatted}
                {price.discount > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 10, background: '#16a34a', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>
                    -{price.discount}%
                  </span>
                )}
              </p>
            </>
          )
        ) : pricesLoading ? (
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>…</p>
        ) : null}
      </div>

      {/* Saat */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
        {hasHours ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{game.hours}s</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>oynandı</p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Oynanmadı</p>
        )}
      </div>
    </div>
  );
}

// ── Son oynanma tarihini formatla ────────────────────────────────────────────
function formatLastPlayed(ts) {
  if (!ts || ts === 0) return null;
  const d       = new Date(ts * 1000);
  const now     = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7)  return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
  return `${Math.floor(diffDays / 365)} yıl önce`;
}
