'use client';
// Gamerisen Library Page - Version 2.0.0 (Multi-Steam Account Support)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import GameImage from '../components/GameImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// ANA SAYFA
// ─────────────────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const { user, steamAccounts = [], steamLogoutAccount, xboxUser, xboxLogout } = useAuth();
  const { lang, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState(() => {
    if (steamAccounts.length > 0) return `steam_${steamAccounts[0].steamId}`;
    return 'steam';
  });
  const [showXboxModal, setShowXboxModal] = useState(false);
  const [xboxError, setXboxError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (steamAccounts.length > 0) {
      const valid = steamAccounts.some(a => `steam_${a.steamId}` === activeTab);
      if (!valid && activeTab !== 'merged' && activeTab !== 'xbox') setActiveTab(`steam_${steamAccounts[0].steamId}`);
    } else if (!xboxUser && activeTab !== 'xbox') {
      setActiveTab('steam');
    }
    if (steamAccounts.length === 0 && xboxUser) setActiveTab('xbox');
  }, [steamAccounts, xboxUser, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('xbox_error');
      if (err) {
        setXboxError(decodeURIComponent(err));
        window.history.replaceState({}, '', window.location.pathname);
        setShowXboxModal(true);
      }
    }
  }, []);

  const handleRemoveSteamAccount = async (steamId) => {
    setRemovingId(steamId);
    if (steamLogoutAccount) await steamLogoutAccount(steamId);
    setRemovingId(null);
  };

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 60, maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
          {lang === 'tr' ? 'Önce Giriş Yapmalısınız' : 'Please Log In First'}
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          {lang === 'tr'
            ? 'Steam veya Xbox kütüphanenizi bağlamak ve yönetmek için önce bir Gamerisen hesabı oluşturmalı veya mevcut hesabınıza giriş yapmalısınız.'
            : 'To connect and manage your Steam or Xbox library, you must first create a Gamerisen account or log in to your existing account.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/login" style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 24px', borderRadius: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s'
            }}>
              {lang === 'tr' ? 'Giriş Yap' : 'Log In'}
            </div>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 24px', borderRadius: 12,
              background: 'var(--accent)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px var(--accent-glow)', transition: 'all 0.15s'
            }}>
              {lang === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const hasSteam = steamAccounts.length > 0;
  const hasXbox  = !!xboxUser;
  const hasAny   = hasSteam || hasXbox;

  if (!hasAny) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 540, margin: '0 auto' }}>
        <div className="premium-dashboard-card" style={{ padding: '40px 36px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(201, 133, 10, 0.05), rgba(255, 255, 255, 0.01))' }}>
          <div style={{ fontSize: 54, marginBottom: 16 }}>🎮</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 8 }}>
            {t('library.connect')}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14.5, lineHeight: 1.6, marginBottom: 32 }}>
            {t('library.connectDesc')}
          </p>

          {!showXboxModal && xboxError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left'
            }}>
              <span style={{ fontSize: 16 }}>❌</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>{t('library.xboxError')}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{xboxError}</p>
              </div>
              <button onClick={() => setXboxError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 20, padding: 0 }}>×</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
              <div 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, 
                  background: 'linear-gradient(135deg, #1b2838, #2a475e)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', 
                  boxShadow: '0 4px 20px rgba(27,40,56,0.3)', border: '1px solid rgba(26, 159, 255, 0.2)',
                  transition: 'all 0.25s' 
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(27,40,56,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(27,40,56,0.3)';
                }}
              >
                <SteamLogo size={22} />
                {t('library.steamLogin')}
              </div>
            </a>
            <div 
              onClick={() => setShowXboxModal(true)} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, 
                background: 'linear-gradient(135deg, #0e4d0e, #107C10)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', 
                boxShadow: '0 4px 20px rgba(16,124,16,0.3)', border: '1px solid rgba(16, 124, 16, 0.2)',
                transition: 'all 0.25s' 
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(16,124,16,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,124,16,0.3)';
              }}
            >
              <XboxLogo size={22} />
              {t('library.xboxLogin')}
            </div>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, 
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', color: 'var(--text-3)', opacity: 0.5, 
              fontSize: 15, fontWeight: 700, cursor: 'not-allowed' 
            }}>
              <EpicLogo size={22} color="var(--text-3)" />
              Epic Games
              <span style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-2)', padding: '2px 8px', borderRadius: 6, marginLeft: 6, fontWeight: 600 }}>
                {lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', textAlign: 'left', fontSize: 13, color: 'var(--text-3)', marginTop: 32, lineHeight: 1.5 }}>
            <p style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, fontSize: 13.5 }}>{t('library.req.title')}</p>
            <p style={{ marginBottom: 4, display: 'flex', gap: 6 }}><span style={{ color: 'var(--accent)' }}>•</span>{t('library.req.steam')}</p>
            <p style={{ marginBottom: 4, display: 'flex', gap: 6 }}><span style={{ color: 'var(--accent)' }}>•</span>{t('library.req.xbox')}</p>
            <p style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--accent)' }}>•</span>{t('library.req.gp')}</p>
          </div>
        </div>

        {showXboxModal && <XboxConnectModal onClose={() => setShowXboxModal(false)} xboxError={xboxError} setXboxError={setXboxError} />}
      </div>
    );
  }

  return (
      <div className="scroll-chips-wrapper">
        <div className="category-scroll-chips" style={{ marginBottom: 28, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {steamAccounts.map(account => {
            const isActive = activeTab === `steam_${account.steamId}`;
            return (
              <div key={`steam_${account.steamId}`} style={{ 
                display: 'flex', 
                alignItems: 'stretch',
                borderRadius: 12,
                overflow: 'hidden',
                border: `1.5px solid ${isActive ? 'rgba(26, 159, 255, 0.4)' : 'var(--border)'}`,
                boxShadow: isActive ? '0 4px 16px rgba(26, 159, 255, 0.15)' : 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(26, 159, 255, 0.1), rgba(255,255,255,0.01))' : 'var(--bg-card)',
                transition: 'all 0.25s'
              }}>
                <button 
                  onClick={() => setActiveTab(`steam_${account.steamId}`)} 
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
                    background: 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-3)',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.color = 'var(--text-2)'; }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.color = 'var(--text-3)'; }}
                >
                  <SteamLogo size={15} color={isActive ? '#1a9fff' : 'var(--text-3)'} />
                  Steam <span style={{ fontSize: 11, color: isActive ? '#1a9fff' : 'var(--text-3)', fontWeight: 500 }}>{account.name?.slice(0, 12)}</span>
                </button>
                <button 
                  onClick={() => handleRemoveSteamAccount(account.steamId)} 
                  disabled={removingId === account.steamId} 
                  style={{
                    background: 'transparent',
                    color: isActive ? '#1a9fff' : 'var(--text-3)',
                    border: 'none', padding: '0 10px',
                    cursor: 'pointer', fontSize: 16, 
                    borderLeft: `1px solid ${isActive ? 'rgba(26, 159, 255, 0.2)' : 'var(--border)'}`,
                    transition: 'all 0.2s',
                  }} 
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = isActive ? '#1a9fff' : 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
                  title={lang === 'tr' ? "Hesabı Kaldır" : "Remove Account"}
                >
                  {removingId === account.steamId ? '...' : '×'}
                </button>
              </div>
            );
          })}
          
          <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
            <button 
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, 
                border: '1.5px dashed rgba(26, 159, 255, 0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 13, 
                background: 'transparent', color: '#1a9fff',
                transition: 'all 0.25s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26, 159, 255, 0.06)'; e.currentTarget.style.borderColor = '#1a9fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(26, 159, 255, 0.4)'; }}
            >
              + {lang === 'tr' ? 'Hesap Ekle' : 'Add Account'}
            </button>
          </a>

          {steamAccounts.length > 1 && (
            <button 
              onClick={() => setActiveTab('merged')} 
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, 
                border: `1.5px solid ${activeTab === 'merged' ? 'rgba(139, 92, 246, 0.4)' : 'var(--border)'}`, 
                cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
                background: activeTab === 'merged' ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(255,255,255,0.01))' : 'var(--bg-card)', 
                color: activeTab === 'merged' ? '#a78bfa' : 'var(--text-3)', 
                marginLeft: 'auto',
                boxShadow: activeTab === 'merged' ? '0 4px 16px rgba(139, 92, 246, 0.15)' : 'none',
                transition: 'all 0.25s'
              }}
              onMouseEnter={e => { if(activeTab !== 'merged') e.currentTarget.style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { if(activeTab !== 'merged') e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              🌟 {lang === 'tr' ? 'Birleşik Kütüphane' : 'Merged Library'}
            </button>
          )}

          {hasXbox ? (
            <button 
              onClick={() => setActiveTab('xbox')} 
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginLeft: steamAccounts.length <= 1 ? 'auto' : 0,
                padding: '8px 16px', borderRadius: 12, 
                border: `1.5px solid ${activeTab === 'xbox' ? 'rgba(16, 124, 16, 0.4)' : 'var(--border)'}`, 
                cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
                background: activeTab === 'xbox' ? 'linear-gradient(135deg, rgba(16, 124, 16, 0.1), rgba(255,255,255,0.01))' : 'var(--bg-card)', 
                color: activeTab === 'xbox' ? 'var(--green)' : 'var(--text-3)',
                boxShadow: activeTab === 'xbox' ? '0 4px 16px rgba(16, 124, 16, 0.15)' : 'none',
                transition: 'all 0.25s'
              }}
              onMouseEnter={e => { if(activeTab !== 'xbox') e.currentTarget.style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { if(activeTab !== 'xbox') e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <XboxLogo size={14} color={activeTab === 'xbox' ? '#107C10' : 'var(--text-3)'} />
              Xbox <span style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>{xboxUser.gamertag?.slice(0, 12)}</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowXboxModal(true)} 
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginLeft: steamAccounts.length <= 1 ? 'auto' : 0,
                padding: '8px 14px', borderRadius: 12, 
                border: '1.5px dashed rgba(16, 124, 16, 0.4)', cursor: 'pointer', fontWeight: 700, fontSize: 13, 
                background: 'transparent', color: '#107C10',
                transition: 'all 0.25s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 124, 16, 0.06)'; e.currentTarget.style.borderColor = '#107C10'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(16, 124, 16, 0.4)'; }}
            >
              + {lang === 'tr' ? 'Xbox Bağla' : 'Connect Xbox'}
            </button>
          )}
        </div>
      </div>

      {steamAccounts.map(account => 
        activeTab === `steam_${account.steamId}` && (
          <SteamLibrary key={account.steamId} steamAccount={account} />
        )
      )}
      
      {activeTab === 'merged' && steamAccounts.length > 1 && <MergedLibrary />}
      {activeTab === 'xbox' && hasXbox && <XboxLibrary xboxUser={xboxUser} onLogout={xboxLogout} />}
      {showXboxModal && <XboxConnectModal onClose={() => setShowXboxModal(false)} xboxError={xboxError} setXboxError={setXboxError} />}
    </div>
  );
}

function SteamLibrary({ steamAccount }) {
  const { t } = useLanguage();
  const [library,       setLibrary]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [sort,          setSort]          = useState('hours');
  const [filter,        setFilter]        = useState('all');
  const [prices,        setPrices]        = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (!steamAccount?.steamId) return;
    setLoading(true); setError(null);
    fetch(`/api/oyun?steamId=${steamAccount.steamId}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d); return; } setLibrary(d); })
      .catch(e => setError({ error: e.message }))
      .finally(() => setLoading(false));
  }, [steamAccount]);

  useEffect(() => {
    if (!library?.games?.length) return;
    const appids = library.games.map(g => g.appid).join(',');
    setPricesLoading(true);
    fetch(`/api/steam-prices?appids=${appids}`)
      .then(r => r.json()).then(d => setPrices(d)).catch(() => {})
      .finally(() => setPricesLoading(false));
  }, [library]);

  const totalValue = useMemo(() => {
    if (!library?.games) return null;
    let sum = 0, counted = 0;
    for (const g of library.games) {
      const p = prices[g.appid];
      if (p && !p.isFree && p.original > 0) { sum += p.original; counted++; }
    }
    return counted > 0 ? { sum, counted } : null;
  }, [prices, library]);

  if (loading) return <><SteamProfileHeader steamUser={steamAccount} library={null} totalValue={null} pricesLoading={false} /><SkeletonList /></>;
  if (error) return <><SteamProfileHeader steamUser={steamAccount} library={null} totalValue={null} pricesLoading={false} /><ErrorBox error={error} /></>;
  if (!library) return null;

  const filtered = (library.games || [])
    .filter(g => filter === 'played' ? g.hours > 0 : filter === 'unplayed' ? g.hours === 0 : true)
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'hours')  return b.hours - a.hours;
      if (sort === 'name')   return a.name.localeCompare(b.name, 'tr');
      if (sort === 'recent') return b.lastPlayed - a.lastPlayed;
      if (sort === 'value')  return (prices[b.appid]?.original ?? -1) - (prices[a.appid]?.original ?? -1);
      return 0;
    });

  return (
    <>
      <SteamProfileHeader steamUser={steamAccount} library={library} totalValue={totalValue} pricesLoading={pricesLoading} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: t('library.filter.all'), value: 'all' }, { label: t('library.filter.played'), value: 'played' }, { label: t('library.filter.unplayed'), value: 'unplayed' }].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: filter === f.value ? '#1a9fff' : 'var(--bg-input)', color: filter === f.value ? '#fff' : 'var(--text-2)', fontWeight: filter === f.value ? 600 : 400 }}>{f.label}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)' }}>
          <option value="hours">{t('library.sort.hours')}</option>
          <option value="name">{t('library.sort.name')}</option>
          <option value="recent">{t('library.sort.recent')}</option>
          <option value="value">{t('library.sort.value')}</option>
        </select>
        <SearchBox value={search} onChange={setSearch} placeholder={t('library.searchPlaceholder')} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        {t('library.showingGames').split('{count}').map((part, i) => <span key={i}>{part}{i === 0 && <span style={{ fontWeight: 600, color: 'var(--text)' }}>{filtered.length}</span>}</span>)}
        {pricesLoading && <span style={{ marginLeft: 10, color: '#1a9fff', fontStyle: 'italic' }}>{t('library.showingGamesLoading')}</span>}
      </p>
      {filtered.length === 0 ? <EmptyState /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{filtered.map((game, i) => <GameRow key={game.appid} game={game} rank={sort === 'hours' ? i + 1 : null} price={prices[game.appid]} pricesLoading={pricesLoading} />)}</div>}
    </>
  );
}

function MergedLibrary() {
  const { lang, t } = useLanguage();
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('hours');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true); setError(null);
    fetch('/api/oyun-merged')
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d); return; } setLibrary(d); })
      .catch(e => setError({ error: e.message }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><SkeletonList /></>;
  if (error) return <><ErrorBox error={error} /></>;
  if (!library) return null;

  const filtered = (library.games || [])
    .filter(g => filter === 'played' ? g.hours > 0 : filter === 'unplayed' ? g.hours === 0 : true)
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'hours') return b.hours - a.hours;
      if (sort === 'name') return a.name.localeCompare(b.name, 'tr');
      if (sort === 'recent') return b.lastPlayed - a.lastPlayed;
      return 0;
    });

  return (
    <>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>🌟 {lang === 'tr' ? 'Birleşik Kütüphane' : 'Merged Library'}</h2>
        <p style={{ margin: '8px 0 0 0', color: 'var(--text-2)', fontSize: 14 }}>{lang === 'tr' ? 'Tüm Steam hesaplarınızdaki oyunlar ve toplam oyun süreniz.' : 'Games across all your Steam accounts and total playtime.'}</p>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div><span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Toplam Oyun' : 'Total Games'}</span><div style={{ fontSize: 20, fontWeight: 700 }}>{library.total}</div></div>
          <div><span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Oynanan' : 'Played'}</span><div style={{ fontSize: 20, fontWeight: 700 }}>{library.played}</div></div>
          <div><span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Toplam Süre' : 'Total Playtime'}</span><div style={{ fontSize: 20, fontWeight: 700 }}>{library.totalHours.toLocaleString('tr-TR')} sa</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: t('library.filter.all'), value: 'all' }, { label: t('library.filter.played'), value: 'played' }, { label: t('library.filter.unplayed'), value: 'unplayed' }].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: filter === f.value ? '#6b21a8' : 'var(--bg-input)', color: filter === f.value ? '#fff' : 'var(--text-2)', fontWeight: filter === f.value ? 600 : 400 }}>{f.label}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)' }}>
          <option value="hours">{t('library.sort.hours')}</option>
          <option value="name">{t('library.sort.name')}</option>
          <option value="recent">{t('library.sort.recent')}</option>
        </select>
        <SearchBox value={search} onChange={setSearch} placeholder={t('library.searchPlaceholder')} />
      </div>
      {filtered.length === 0 ? <EmptyState /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.map((game, i) => (
          <GameRow key={game.appid} game={game} rank={sort === 'hours' ? i + 1 : null} />
        ))}
      </div>}
    </>
  );
}

function XboxLibrary({ xboxUser, onLogout }) {
  const { t, lang } = useLanguage();
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('recent');
  const [filter,  setFilter]  = useState('all'); // all | gamepass | owned

  useEffect(() => {
    setLoading(true); setError(null);
    fetch('/api/xbox-library')
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d); return; } setLibrary(d); })
      .catch(e => setError({ error: e.message }))
      .finally(() => setLoading(false));
  }, [xboxUser]);

  if (loading) return (
    <>
      <XboxProfileHeader xboxUser={xboxUser} library={null} onLogout={onLogout} />
      <SkeletonList />
    </>
  );

  if (error) return (
    <>
      <XboxProfileHeader xboxUser={xboxUser} library={null} onLogout={onLogout} />
      <div style={{ marginTop: 24, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '24px 28px', textAlign: 'center' }}>
        <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
          {error.expired ? t('library.xbox.sessionExpired') : t('library.xbox.loadFailed')}
        </p>
        <p style={{ fontSize: 14, color: '#7f1d1d' }}>{error.error}</p>
        {error.expired && (
          <a href="/api/auth/xbox" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#107C10', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            {t('library.xbox.relogin')}
          </a>
        )}
      </div>
    </>
  );

  if (!library) return null;

  const filtered = (library.games || [])
    .filter(g => filter === 'gamepass' ? g.isGamePass : filter === 'owned' ? !g.isGamePass : true)
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'recent') return b.lastPlayed - a.lastPlayed;
      if (sort === 'name')   return a.name.localeCompare(b.name, 'tr');
      if (sort === 'score')  return b.currentGamerscore - a.currentGamerscore;
      return 0;
    });

  return (
    <>
      <XboxProfileHeader xboxUser={xboxUser} library={library} onLogout={onLogout} />

      {xboxUser.isMock && (
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 14,
          padding: '16px 20px', marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-start',
          color: 'var(--accent)', fontSize: 13, lineHeight: 1.5
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>
              {lang === 'tr' ? 'Gamertag Simülasyon Modu' : 'Gamertag Simulation Mode'}
            </p>
            <p>
              {lang === 'tr' 
                ? 'Microsoft güvenlik protokolleri nedeniyle, şifresiz şekilde (sadece Gamertag yazarak) gerçek kütüphanenize erişilemez. Bu sebeple test amaçlı örnek oyunlar listelenmektedir. Gerçek oyunlarınızı görmek için lütfen çıkış yapıp "Resmi Bağlantı" seçeneğini kullanın.'
                : 'Due to Microsoft security protocols, your real library cannot be accessed without credentials (by only typing a Gamertag). Therefore, sample games are listed for testing. To see your real games, please log out and use the "Official Connection" option.'}
            </p>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: t('library.filter.all'), value: 'all' },
            { label: t('library.filter.gamepass'), value: 'gamepass' },
            { label: t('library.filter.owned'), value: 'owned' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer',
              background: filter === f.value ? '#107C10' : 'var(--bg-input)',
              color:      filter === f.value ? '#fff'    : 'var(--text-2)',
              fontWeight: filter === f.value ? 600       : 400,
            }}>{f.label}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--bg-card)' }}>
          <option value="recent">{t('library.sort.recent')}</option>
          <option value="name">{t('library.sort.name')}</option>
          <option value="score">{t('library.sort.score')}</option>
        </select>
        <SearchBox value={search} onChange={setSearch} placeholder={t('library.searchXboxPlaceholder')} />
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        {t('library.showingGames').split('{count}').map((part, i) => (
          <span key={i}>
            {part}
            {i === 0 && <span style={{ fontWeight: 600, color: 'var(--text)' }}>{filtered.length}</span>}
          </span>
        ))}
      </p>

      {filtered.length === 0
        ? <EmptyState />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.map(game => (
              <XboxGameRow key={game.titleId} game={game} />
            ))}
          </div>
      }
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEAM BİLEŞENLERİ
// ─────────────────────────────────────────────────────────────────────────────
function SteamProfileHeader({ steamUser, library, totalValue, pricesLoading }) {
  const { t, formatPrice } = useLanguage();
  return (
    <div className="premium-dashboard-card" style={{ 
      background: 'linear-gradient(135deg, rgba(27, 40, 56, 0.7), rgba(42, 71, 94, 0.3))', 
      border: '1px solid rgba(26, 159, 255, 0.25)', 
      padding: '24px 28px', 
      marginBottom: 20,
      boxShadow: '0 8px 32px rgba(27, 40, 56, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {steamUser.avatar ? (
          <div style={{
            position: 'relative', width: 68, height: 68, borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(26, 159, 255, 0.5)', boxShadow: '0 0 16px rgba(26, 159, 255, 0.3)', flexShrink: 0
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={steamUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 68, height: 68, borderRadius: 14, background: '#1a9fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {steamUser.name?.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 10.5, color: '#1a9fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {t('library.steam')}
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 4 }}>{steamUser.name}</h2>
          <a href={steamUser.profileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#5eb7ff', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {t('library.viewProfile')} <span>↗</span>
          </a>
        </div>
        {library && (
          <div className="library-profile-stats" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: t('library.stats.totalGames'), value: library.total },
              { label: t('library.stats.played'),     value: library.played },
              { label: t('library.stats.totalHours'), value: `${library.totalHours.toLocaleString()}${t('library.hours').toLowerCase().slice(0, 1)}` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 70 }}>
                <p className="glowing-stat-number" style={{ fontSize: 24, color: '#fff' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
              </div>
            ))}
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              {pricesLoading && !totalValue ? (
                <>
                  <p className="glowing-stat-number" style={{ fontSize: 24, color: '#4ade80', fontStyle: 'italic' }}>…</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('library.value')}</p>
                </>
              ) : totalValue ? (
                <>
                  <p className="glowing-stat-number" style={{ fontSize: 24, color: '#4ade80', background: 'linear-gradient(135deg, #4ade80 30%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {formatPrice(totalValue.sum)}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('library.value')}</p>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {totalValue && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          ⚠️ {t('library.disclaimer').replace('{count}', totalValue.counted)}
        </p>
      )}
    </div>
  );
}

function GameRow({ game, rank, price, pricesLoading }) {
  const { t, formatPrice, lang } = useLanguage();
  const lastPlayed = game.lastPlayed ? formatLastPlayed(game.lastPlayed, t) : null;
  const hourSymbol = lang === 'tr' ? 's' : 'h';

  return (
    <div
      className="game-row"
      onMouseEnter={e => e.currentTarget.style.borderColor = '#1a9fff'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {rank && (
        <span className="game-row-rank">
          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
        </span>
      )}
      <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
        <div className="game-row-cover">
          <GameImage
            game={game}
            alt={game.name}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </a>
      <div className="game-row-details">
        <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
          {game.hoursRecent > 0 && <span style={{ fontSize: 11, color: '#1a9fff' }}>{t('library.playedRecent').replace('{hours}', game.hoursRecent)}</span>}
          {lastPlayed && !game.hoursRecent && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('library.lastPlayedLabel').replace('{date}', lastPlayed)}</span>}
        </div>
      </div>
      <a href={`/api/game-lookup?name=${encodeURIComponent(game.name)}`} title="Gamerisen'de görüntüle" className="game-row-actions"
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
      >🎮 Gamerisen</a>
      <div className="game-row-price-score">
        {pricesLoading && !price
          ? <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>…</p>
          : price?.isFree
            ? <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>{t('library.free')}</p>
            : price?.unavailable
              ? <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{t('library.noPrice')}</p>
              : price
                ? <>
                    {price.discount > 0 && <p style={{ fontSize: 10, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 1 }}>{formatPrice(price.original)}</p>}
                    <p style={{ fontSize: 13, fontWeight: 700, color: price.discount > 0 ? '#4ade80' : 'var(--text)' }}>
                      {formatPrice(price.current)}
                      {price.discount > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: '#16a34a', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>-{price.discount}%</span>}
                    </p>
                  </>
                : null
        }
      </div>
      <div className="game-row-hours">
        {game.hours > 0
          ? <><p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{game.hours}{hourSymbol}</p><p style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('library.hoursPlayed')}</p></>
          : <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{t('library.notPlayed')}</p>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// XBOX BİLEŞENLERİ
// ─────────────────────────────────────────────────────────────────────────────
function XboxProfileHeader({ xboxUser, library, onLogout }) {
  const { t, lang } = useLanguage();
  const hasGamePass = xboxUser.gamepassType === 'ultimate' || xboxUser.gamepassType === 'pc' || (library && library.gamePassCount > 0);
  const gpText = xboxUser.gamepassType === 'ultimate' 
    ? t('library.xbox.ultimate') 
    : xboxUser.gamepassType === 'pc'
      ? t('library.xbox.pc')
      : (library && library.gamePassCount > 0)
        ? t('library.xbox.gp')
        : t('library.xbox.member');

  return (
    <div className="premium-dashboard-card" style={{ 
      background: 'linear-gradient(135deg, rgba(14, 77, 14, 0.7), rgba(16, 124, 16, 0.3))', 
      border: '1px solid rgba(16, 124, 16, 0.3)', 
      padding: '24px 28px', 
      marginBottom: 20,
      boxShadow: '0 8px 32px rgba(16, 124, 16, 0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {xboxUser.avatar ? (
          <div style={{
            position: 'relative', width: 68, height: 68, borderRadius: 14, overflow: 'hidden',
            border: '2px solid rgba(16, 124, 16, 0.5)', boxShadow: '0 0 16px rgba(16, 124, 16, 0.3)', flexShrink: 0
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={xboxUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 68, height: 68, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XboxLogo size={36} color="#fff" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 10.5, color: '#107C10', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {t('library.xbox')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{xboxUser.gamertag}</h2>
            {hasGamePass ? (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                background: '#fff', color: '#107C10',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                🟢 {gpText}
              </span>
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                ⚪ {gpText}
              </span>
            )}
          </div>
          <a href={`https://www.xbox.com/${lang === 'tr' ? 'tr-TR' : 'en-US'}/play/user/${xboxUser.gamertag}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: 6 }}>
            {t('library.viewProfile')} ↗
          </a>
        </div>
        {library && (
          <div className="library-profile-stats" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: t('library.stats.played') + ' ' + t('library.games'),   value: library.total },
              { label: 'Game Pass',      value: library.gamePassCount },
              { label: 'Gamerscore',     value: library.totalGamerscore?.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US') },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 70 }}>
                <p className="glowing-stat-number" style={{ fontSize: 24, color: '#fff' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
        <button 
          onClick={onLogout} 
          style={{ 
            padding: '8px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, 
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', 
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          {t('nav.logout')}
        </button>
      </div>
      {library && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          {t('library.xbox.disclaimer')}
        </p>
      )}
    </div>
  );
}

function XboxGameRow({ game }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const lastPlayed = game.lastPlayed ? formatLastPlayed(game.lastPlayed, t) : null;
  const pct = game.totalAchievements > 0
    ? Math.round((game.currentAchievements / game.totalAchievements) * 100)
    : 0;

  return (
    <div
      className="premium-dashboard-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 18px',
        borderRadius: 12,
        borderColor: hovered ? '#107C10' : 'var(--border)',
        boxShadow: hovered ? '0 8px 24px -8px rgba(16, 124, 16, 0.25), 0 0 0 1px rgba(16, 124, 16, 0.15)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
        background: hovered ? 'linear-gradient(135deg, rgba(16, 124, 16, 0.02), rgba(255, 255, 255, 0.01))' : 'var(--bg-card)'
      }}
    >
      <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
        <div className="game-row-cover" style={{ 
          border: '1px solid var(--border)', 
          transform: hovered ? 'scale(1.04)' : 'none', 
          transition: 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' 
        }}>
          <GameImage
            game={game}
            alt={game.name}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </a>

      <div className="game-row-details">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <p style={{ 
              fontSize: 14.5, 
              fontWeight: 600, 
              color: hovered ? '#107C10' : 'var(--text)', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              maxWidth: 220,
              transition: 'color 0.2s'
            }}>{game.name}</p>
          </a>
          {game.isGamePass && (
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#107C10', color: '#fff', whiteSpace: 'nowrap' }}>Game Pass</span>
          )}
        </div>
        {lastPlayed && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Son: {lastPlayed}</span>}
      </div>

      <a 
        href={`/api/game-lookup?name=${encodeURIComponent(game.name)}`} 
        title="Gamerisen'de görüntüle"
        className="game-row-actions"
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 11.5,
          fontWeight: 700,
          background: hovered ? 'linear-gradient(135deg, var(--accent) 0%, #ff8066 100%)' : 'var(--bg-input)',
          border: '1px solid var(--border)',
          color: hovered ? '#fff' : 'var(--text-3)',
          transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
          boxShadow: hovered ? '0 4px 12px var(--accent-glow)' : 'none'
        }}
      >
        🎮 Gamerisen
      </a>

      {game.totalAchievements > 0 && (
        <div className="game-row-price-score" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
            {game.currentGamerscore}G
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--bg-input)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#107C10', borderRadius: 2 }} />
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{pct}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORTAK YARDIMCI BİLEŞENLER
// ─────────────────────────────────────────────────────────────────────────────
function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '7px 14px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', background: 'transparent' }} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>}
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ height: 68, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
      <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
      <p style={{ fontSize: 15, fontWeight: 600 }}>{t('games.noResults')}</p>
    </div>
  );
}

function ErrorBox({ error }) {
  const { t } = useLanguage();
  return (
    <div style={{ marginTop: 32, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '24px 28px', textAlign: 'center' }}>
      <p style={{ fontSize: 36, marginBottom: 12 }}>🔒</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
        {error.private ? t('library.profilePrivate') : t('library.xbox.loadFailed')}
      </p>
      <p style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.6 }}>
        {error.private
          ? t('library.profilePrivateDesc')
          : error.error
        }
      </p>
      {error.private && (
        <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#1b2838', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          {t('library.steamSettings')}
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO BİLEŞENLERİ
// ─────────────────────────────────────────────────────────────────────────────
function SteamLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 233 233" fill={color}>
      <path d="M116.5 0C52.1 0 0 52.1 0 116.5c0 57.5 41.8 105.3 96.8 114.5l-38-91.1c-5.5-2.4-9.6-7.5-10.5-13.8-1.6-11.4 6.4-21.9 17.8-23.5 11.4-1.6 21.9 6.4 23.5 17.8.7 4.9-.4 9.7-2.9 13.5l38.2 91.5c.9 0 1.9.1 2.8.1 64.4 0 116.5-52.1 116.5-116.5C233 52.1 180.9 0 116.5 0z"/>
      <path d="M63.5 127.5c0 9.7 7.9 17.6 17.6 17.6s17.6-7.9 17.6-17.6-7.9-17.6-17.6-17.6-17.6 7.9-17.6 17.6z"/>
      <path d="M145 74.5c-14.6 0-26.5 11.9-26.5 26.5s11.9 26.5 26.5 26.5 26.5-11.9 26.5-26.5S159.6 74.5 145 74.5zm0 44.2c-9.8 0-17.7-7.9-17.7-17.7s7.9-17.7 17.7-17.7 17.7 7.9 17.7 17.7-7.9 17.7-17.7 17.7z"/>
    </svg>
  );
}

function XboxLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M5.26 3.31C6.93 2.14 9.02 1.5 12 1.5s5.07.64 6.74 1.81c.41.28.45.87.08 1.2C17.49 5.65 15.6 8.38 12 12c-3.6-3.62-5.49-6.35-6.82-7.49-.37-.33-.33-.92.08-1.2zM2.09 6.44C.79 8.12 0 10.2 0 12.5 0 17.75 4.28 22 9.5 22c1.95 0 3.76-.6 5.25-1.62-1.58-1.34-4.74-4.56-7.98-8.7-1.34-1.73-2.9-3.84-4.68-5.24zm19.82 0c-1.78 1.4-3.34 3.51-4.68 5.24-3.24 4.14-6.4 7.36-7.98 8.7C10.74 21.4 12.55 22 14.5 22 19.72 22 24 17.75 24 12.5c0-2.3-.79-4.38-2.09-6.06z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────────────────────
function formatLastPlayed(ts, t) {
  if (!ts || ts === 0) return null;
  const diffDays = Math.floor((Date.now() - ts * 1000) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('library.today');
  if (diffDays === 1) return t('library.yesterday');
  if (diffDays < 7)  return t('library.daysAgo').replace('{days}', diffDays);
  if (diffDays < 30) return t('library.weeksAgo').replace('{weeks}', Math.floor(diffDays / 7));
  if (diffDays < 365) return t('library.monthsAgo').replace('{months}', Math.floor(diffDays / 30));
  return t('library.yearsAgo').replace('{years}', Math.floor(diffDays / 365));
}

// ─────────────────────────────────────────────────────────────────────────────
// XBOX BAĞLANTI MODALI
// ─────────────────────────────────────────────────────────────────────────────
function XboxConnectModal({ onClose, xboxError, setXboxError }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }} onClick={onClose}>
      <div 
        className="premium-dashboard-card" 
        style={{
          background: 'var(--bg-card)', border: '1px solid rgba(16, 124, 16, 0.3)',
          borderRadius: 20, maxWidth: 460, width: '100%', padding: '32px 36px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 32px rgba(16, 124, 16, 0.1)', position: 'relative',
          textAlign: 'left',
          animation: 'fadeIn 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Kapat Butonu */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute', top: 22, right: 22, background: 'none', border: 'none',
            color: 'var(--text-3)', fontSize: 26, cursor: 'pointer', outline: 'none',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#107C10', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 4px 20px rgba(16,124,16,0.4)', border: '2px solid rgba(255,255,255,0.1)' }}>
            <XboxLogo size={32} />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>{t('library.xbox.connectTitle')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{t('library.xbox.connectDesc')}</p>
        </div>

        {/* Hata Uyarısı */}
        {xboxError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid rgba(239, 68, 68, 0.2)', borderRadius: 12,
            padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>{t('library.xboxError')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{xboxError}</p>
            </div>
            <button onClick={() => setXboxError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>
        )}

        {/* Seçenek 1: Resmi Bağlantı */}
        <div 
          className="premium-dashboard-card"
          style={{
            background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '16px 20px', marginBottom: 20, cursor: 'pointer', transition: 'all 0.25s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#107C10'; e.currentTarget.style.background = 'rgba(16, 124, 16, 0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
          onClick={() => {
            setLoading(true);
            window.location.href = '/api/auth/xbox';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🔑</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('library.xbox.connectOAuth')}</h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {t('library.xbox.connectOAuthDesc')}
          </p>
        </div>

        {/* Seçenek 2: Gamertag Simülasyonu */}
        <div 
          className="premium-dashboard-card"
          style={{
            background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 12,
            padding: '20px 24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('library.xbox.connectMock')}</h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 16 }}>
            {t('library.xbox.connectMockDesc')}
          </p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (loading) return;
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            const gamertag = formData.get('gamertag');
            const gamepassType = formData.get('gamepassType');
            
            try {
              const res = await fetch('/api/auth/xbox/mock-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gamertag, gamepassType })
              });
              const data = await res.json();
              if (data.ok) {
                window.location.reload();
              } else {
                setXboxError(data.error || t('library.xbox.connectMockFailed'));
                setLoading(false);
              }
            } catch (err) {
              setXboxError(err.message);
              setLoading(false);
            }
          }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('library.xbox.connectMockLabel')}</label>
              <input name="gamertag" required defaultValue="MasterChief117" placeholder={t('library.xbox.connectMockPlaceholder')} className="premium-glass-input" />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('library.xbox.connectMockGP')}</label>
              <select name="gamepassType" className="premium-glass-input" style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m2 4 4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px' }}>
                <option value="ultimate">{t('library.xbox.connectMockGPU')}</option>
                <option value="pc">{t('library.xbox.connectMockGPPC')}</option>
                <option value="none">{t('library.xbox.connectMockGPNone')}</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#107C10',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,124,16,0.3)',
                opacity: loading ? 0.6 : 1, transition: 'all 0.25s'
              }}
              onMouseEnter={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,124,16,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,124,16,0.3)'; }}
            >
              {loading ? t('library.xbox.connectMockSubmitting') : t('library.xbox.connectMockSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EpicLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M10.82 17.653c-1.503 0-2.812-1.026-3.08-2.476-.492-2.348 1.488-4.364 3.86-4.116 1.107.13 2.052.793 2.564 1.777l1.96-1.157C15.228 10.02 13.565 9 11.59 9c-3.157 0-5.748 2.454-6.027 5.568-.316 3.518 2.705 6.485 6.273 6.136 2.23-.217 4.15-1.534 5.094-3.522l-1.925-1.092c-.67 1.43-2.186 2.37-3.87 2.37M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12m-6.49-1.956h-2.19v6.52h2.19z"/>
    </svg>
  );
}
