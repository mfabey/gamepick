const fs = require('fs');

const path = 'app/library/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. imports ve LibraryPage
const topSection = `'use client';
// Gamerisen Library Page - Version 2.0.0 (Multi-Steam Account Support)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import GameImage from '../components/GameImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// ANA SAYFA
// ─────────────────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const { user, steamAccounts = [], steamUser, steamLogoutAccount, xboxUser, xboxLogout } = useAuth();
  const { lang, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState(() => {
    if (steamAccounts.length > 0) return \`steam_\${steamAccounts[0].steamId}\`;
    return 'steam';
  });
  const [showXboxModal, setShowXboxModal] = useState(false);
  const [xboxError, setXboxError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (steamAccounts.length > 0) {
      const valid = steamAccounts.some(a => \`steam_\${a.steamId}\` === activeTab);
      if (!valid && activeTab !== 'merged') setActiveTab(\`steam_\${steamAccounts[0].steamId}\`);
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
      <div className="container" style={{ paddingTop: 80, paddingBottom: 60, maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎮</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {t('library.connect')}
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          {t('library.connectDesc')}
        </p>

        {!showXboxModal && xboxError && (
          <div style={{
            background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left'
          }}>
            <span style={{ fontSize: 18 }}>❌</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>{t('library.xboxError')}</p>
              <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{xboxError}</p>
            </div>
            <button onClick={() => setXboxError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 20, padding: 0 }}>×</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, background: '#1b2838', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(27,40,56,0.4)', transition: 'all 0.15s' }}>
              <SteamLogo size={26} />
              {t('library.steamLogin')}
            </div>
          </a>
          <div onClick={() => setShowXboxModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, background: '#107C10', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,124,16,0.4)', transition: 'all 0.15s' }}>
            <XboxLogo size={26} />
            {t('library.xboxLogin')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 32px', borderRadius: 12, background: '#2A2A2A', color: '#fff', opacity: 0.6, fontSize: 16, fontWeight: 700, cursor: 'not-allowed' }}>
            <EpicLogo size={26} />
            Epic Games
            <span style={{ fontSize: 11, background: '#fff', color: '#000', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>{lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', textAlign: 'left', fontSize: 13, color: 'var(--text-3)', marginTop: 24 }}>
          <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>{t('library.req.title')}</p>
          <p style={{ marginBottom: 4 }}>{t('library.req.steam')}</p>
          <p style={{ marginBottom: 4 }}>{t('library.req.xbox')}</p>
          <p>{t('library.req.gp')}</p>
        </div>

        {showXboxModal && <XboxConnectModal onClose={() => setShowXboxModal(false)} xboxError={xboxError} setXboxError={setXboxError} />}
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {steamAccounts.map(account => (
          <div key={\`steam_\${account.steamId}\`} style={{ display: 'flex' }}>
            <button onClick={() => setActiveTab(\`steam_\${account.steamId}\`)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: activeTab === \`steam_\${account.steamId}\` ? '#1b2838' : 'var(--bg-card)',
              color:      activeTab === \`steam_\${account.steamId}\` ? '#fff' : 'var(--text-2)',
            }}>
              <SteamLogo size={16} color={activeTab === \`steam_\${account.steamId}\` ? '#fff' : '#1a9fff'} />
              Steam <span style={{ fontSize: 11, opacity: 0.75 }}>{account.name?.slice(0, 14)}</span>
            </button>
            <button onClick={() => handleRemoveSteamAccount(account.steamId)} disabled={removingId === account.steamId} style={{
              background: activeTab === \`steam_\${account.steamId}\` ? '#1b2838' : 'var(--bg-card)',
              color: activeTab === \`steam_\${account.steamId}\` ? '#aaa' : 'var(--text-3)',
              border: 'none', borderTopRightRadius: 10, borderBottomRightRadius: 10, padding: '0 10px',
              cursor: 'pointer', fontSize: 16, borderLeft: \`1px solid \${activeTab === \`steam_\${account.steamId}\` ? '#2a3f5a' : 'var(--border)'}\`,
            }} title="Hesabı Çıkar">
              {removingId === account.steamId ? '...' : '×'}
            </button>
          </div>
        ))}
        
        <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px dashed #1a9fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: 'transparent', color: '#1a9fff',
          }}>
            + Hesap Ekle
          </button>
        </a>

        {steamAccounts.length > 1 && (
          <button onClick={() => setActiveTab('merged')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            background: activeTab === 'merged' ? '#6b21a8' : 'var(--bg-card)', color: activeTab === 'merged' ? '#fff' : 'var(--text-2)', marginLeft: 'auto',
          }}>
            🌟 Birleşik
          </button>
        )}

        {hasXbox ? (
          <button onClick={() => setActiveTab('xbox')} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginLeft: steamAccounts.length <= 1 ? 'auto' : 0,
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            background: activeTab === 'xbox' ? '#107C10' : 'var(--bg-card)', color: activeTab === 'xbox' ? '#fff' : 'var(--text-2)',
          }}>
            <XboxLogo size={16} color={activeTab === 'xbox' ? '#fff' : '#107C10'} />
            Xbox <span style={{ fontSize: 11, opacity: 0.75 }}>{xboxUser.gamertag?.slice(0, 14)}</span>
          </button>
        ) : (
          <button onClick={() => setShowXboxModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginLeft: steamAccounts.length <= 1 ? 'auto' : 0,
            padding: '10px 16px', borderRadius: 10, border: '1px dashed #107C10', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: 'transparent', color: '#107C10',
          }}>
            + Xbox Bağla
          </button>
        )}
      </div>

      {steamAccounts.map(account => 
        activeTab === \`steam_\${account.steamId}\` && (
          <SteamLibrary key={account.steamId} steamAccount={account} />
        )
      )}
      
      {activeTab === 'merged' && steamAccounts.length > 1 && <MergedLibrary />}
      {activeTab === 'xbox' && hasXbox && <XboxLibrary xboxUser={xboxUser} onLogout={xboxLogout} />}
      {showXboxModal && <XboxConnectModal onClose={() => setShowXboxModal(false)} xboxError={xboxError} setXboxError={setXboxError} />}
    </div>
  );
}`;

const steamLibSection = `function SteamLibrary({ steamAccount }) {
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
    fetch(\`/api/oyun?steamId=\${steamAccount.steamId}\`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d); return; } setLibrary(d); })
      .catch(e => setError({ error: e.message }))
      .finally(() => setLoading(false));
  }, [steamAccount]);

  useEffect(() => {
    if (!library?.games?.length) return;
    const appids = library.games.map(g => g.appid).join(',');
    setPricesLoading(true);
    fetch(\`/api/steam-prices?appids=\${appids}\`)
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
}`;

const regex = /'use client';[\s\S]*?(?=function XboxLibrary)/;
content = content.replace(regex, topSection + '\\n\\n' + steamLibSection + '\\n\\n');

// Also update SteamProfileHeader to remove onLogout
content = content.replace(regex, topSection + '\n\n' + steamLibSection + '\n\n');

content = content.replace(/function SteamProfileHeader\(\{ steamUser, library, totalValue, pricesLoading, onLogout \}\)/g, 'function SteamProfileHeader({ steamUser, library, totalValue, pricesLoading })');
content = content.replace(/<button onClick=\{onLogout\}[\s\S]*?<\/button>/, '');

if (!content.includes('function EpicLogo')) {
  content += "\nfunction EpicLogo({ size = 24, color = '#fff' }) {\n  return (\n    <svg width={size} height={size} viewBox=\"0 0 24 24\" fill={color} xmlns=\"http://www.w3.org/2000/svg\">\n      <path d=\"M10.82 17.653c-1.503 0-2.812-1.026-3.08-2.476-.492-2.348 1.488-4.364 3.86-4.116 1.107.13 2.052.793 2.564 1.777l1.96-1.157C15.228 10.02 13.565 9 11.59 9c-3.157 0-5.748 2.454-6.027 5.568-.316 3.518 2.705 6.485 6.273 6.136 2.23-.217 4.15-1.534 5.094-3.522l-1.925-1.092c-.67 1.43-2.186 2.37-3.87 2.37M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12m-6.49-1.956h-2.19v6.52h2.19z\"/>\n    </svg>\n  );\n}\n";
}

const gameRowRegex = /(<div style=\{\{ flex: 1 \}\}>\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: 6 \}\}>\s*<span style=\{\{ fontSize: 16, fontWeight: 700 \}\}>\{game\.name\}<\/span>)/;
if (content.match(gameRowRegex)) {
  const accountAvatarsHtml = "\n                {game.accounts && game.accounts.length > 0 && (\n                  <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>\n                    {game.accounts.map(acc => acc.avatar && (\n                      <img key={acc.steamId} src={acc.avatar} alt={acc.name} title={acc.name} style={{ width: 20, height: 20, borderRadius: '50%' }} />\n                    ))}\n                  </div>\n                )}";
  content = content.replace(gameRowRegex, "$1" + accountAvatarsHtml);
}

fs.writeFileSync(path, content, 'utf8');
console.log('LibraryPage updated successfully.');
