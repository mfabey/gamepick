'use client';
// Gamerisen Library Page - Version 3.0.0 (Platform pages: Steam / Xbox / Epic)
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

  const hasSteam = steamAccounts.length > 0;
  const hasXbox  = !!xboxUser;
  const hasAny   = hasSteam || hasXbox;

  const [platform, setPlatform]           = useState('steam');   // 'steam' | 'xbox' | 'epic'
  const [steamView, setSteamView]         = useState('all');     // 'all' | steamId
  const [showXboxModal, setShowXboxModal] = useState(false);
  const [xboxError, setXboxError]         = useState(null);
  const [removingId, setRemovingId]       = useState(null);

  // Steam: her hesabın kütüphanesi + birleşik fiyatlar
  const [steamLibs, setSteamLibs]               = useState({});  // steamId -> {games,total,played,totalHours} | {error}
  const [steamLoading, setSteamLoading]         = useState(false);
  const [steamPrices, setSteamPrices]           = useState({});
  const [steamPricesLoading, setSteamPricesLoading] = useState(false);

  // Xbox
  const [xboxLib, setXboxLib]                 = useState(null);
  const [xboxLoading, setXboxLoading]         = useState(false);
  const [xboxErr, setXboxErr]                 = useState(null);
  const [xboxValue, setXboxValue]             = useState(null);   // {sum, counted}
  const [xboxValueLoading, setXboxValueLoading] = useState(false);

  const steamIdsKey = steamAccounts.map(a => a.steamId).join(',');

  // Varsayılan platform: bağlı olana göre
  useEffect(() => {
    if (!hasSteam && hasXbox) setPlatform('xbox');
  }, [hasSteam, hasXbox]);

  // steamView geçerliliğini koru
  useEffect(() => {
    if (steamView !== 'all' && !steamAccounts.some(a => a.steamId === steamView)) setSteamView('all');
  }, [steamIdsKey, steamView]);

  // xbox_error parametresi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('xbox_error');
      if (err) {
        setXboxError(decodeURIComponent(err));
        window.history.replaceState({}, '', window.location.pathname);
        setShowXboxModal(true);
        setPlatform('xbox');
      }
    }
  }, []);

  // Tüm Steam hesaplarının kütüphanelerini çek
  useEffect(() => {
    if (steamAccounts.length === 0) { setSteamLibs({}); return; }
    let cancelled = false;
    setSteamLoading(true);
    Promise.all(steamAccounts.map(a =>
      fetch(`/api/oyun?steamId=${a.steamId}`)
        .then(r => r.json()).then(d => [a.steamId, d])
        .catch(e => [a.steamId, { error: e.message, games: [] }])
    )).then(entries => {
      if (cancelled) return;
      const map = {};
      entries.forEach(([id, d]) => { map[id] = d; });
      setSteamLibs(map);
    }).finally(() => { if (!cancelled) setSteamLoading(false); });
    return () => { cancelled = true; };
  }, [steamIdsKey]);

  // Birleşik appid listesi için fiyatlar
  useEffect(() => {
    const appids = new Set();
    Object.values(steamLibs).forEach(lib => (lib?.games || []).forEach(g => appids.add(g.appid)));
    if (appids.size === 0) { setSteamPrices({}); return; }
    let cancelled = false;
    setSteamPricesLoading(true);
    fetch(`/api/steam-prices?appids=${[...appids].join(',')}`)
      .then(r => r.json()).then(d => { if (!cancelled) setSteamPrices(d || {}); })
      .catch(() => {}).finally(() => { if (!cancelled) setSteamPricesLoading(false); });
    return () => { cancelled = true; };
  }, [steamLibs]);

  // Xbox kütüphanesi
  useEffect(() => {
    if (!xboxUser) { setXboxLib(null); setXboxErr(null); return; }
    let cancelled = false;
    setXboxLoading(true); setXboxErr(null);
    fetch('/api/xbox-library')
      .then(r => r.json())
      .then(d => { if (cancelled) return; if (d.error) setXboxErr(d); else setXboxLib(d); })
      .catch(e => { if (!cancelled) setXboxErr({ error: e.message }); })
      .finally(() => { if (!cancelled) setXboxLoading(false); });
    return () => { cancelled = true; };
  }, [xboxUser]);

  // Xbox değeri: sahip olunan (Game Pass olmayan) oyunlar için mağaza fiyatı (isim eşleşmesi, sınırlı)
  useEffect(() => {
    const owned = (xboxLib?.games || []).filter(g => !g.isGamePass);
    if (owned.length === 0) { setXboxValue(null); return; }
    let cancelled = false;
    setXboxValueLoading(true);
    const capped = owned.slice(0, 50);
    Promise.all(capped.map(g =>
      fetch(`/api/card-price?name=${encodeURIComponent(g.name)}&hasSteam=true`)
        .then(r => r.json()).catch(() => null)
    )).then(results => {
      if (cancelled) return;
      let sum = 0, counted = 0;
      results.forEach(p => { if (p && p.price != null && !p.isFree && p.original > 0) { sum += p.original; counted++; } });
      setXboxValue(counted > 0 ? { sum, counted } : null);
    }).finally(() => { if (!cancelled) setXboxValueLoading(false); });
    return () => { cancelled = true; };
  }, [xboxLib]);

  // Steam birleşik istatistikler (benzersiz oyunlar, toplam saat, toplam değer)
  const steamCombined = useMemo(() => {
    const gameMap = new Map();
    let totalHours = 0;
    steamAccounts.forEach(a => {
      const lib = steamLibs[a.steamId];
      if (!lib?.games) return;
      totalHours += lib.totalHours || 0;
      lib.games.forEach(g => {
        const ex = gameMap.get(g.appid);
        if (ex) {
          ex.hours = Math.max(ex.hours, g.hours);
          if (!ex._owner.split(', ').includes(a.name)) ex._owner = `${ex._owner}, ${a.name}`;
        } else {
          gameMap.set(g.appid, { ...g, _owner: a.name });
        }
      });
    });
    const games = [...gameMap.values()].sort((x, y) => y.hours - x.hours);
    let sum = 0, counted = 0;
    games.forEach(g => { const p = steamPrices[g.appid]; if (p && !p.isFree && p.original > 0) { sum += p.original; counted++; } });
    return { games, totalGames: games.length, totalHours: parseFloat(totalHours.toFixed(1)), value: counted > 0 ? { sum, counted } : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamLibs, steamPrices, steamIdsKey]);

  // Genel toplam (tüm platformlar)
  const grand = useMemo(() => {
    const steamVal = steamCombined.value?.sum || 0;
    const xboxVal  = xboxValue?.sum || 0;
    return {
      games: steamCombined.totalGames + (xboxLib?.total || 0),
      hours: steamCombined.totalHours,
      value: steamVal + xboxVal,
      hasValue: (steamCombined.value != null) || (xboxValue != null),
    };
  }, [steamCombined, xboxLib, xboxValue]);

  const handleRemoveSteamAccount = async (steamId) => {
    setRemovingId(steamId);
    if (steamLogoutAccount) await steamLogoutAccount(steamId);
    setRemovingId(null);
  };

  // ── Giriş yapılmamış ──
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 80 }}>
      <style>{`
        .pv-wrap .pv-kurus { display:inline-block; max-width:0; overflow:hidden; opacity:0; transition: max-width .45s cubic-bezier(.2,.8,.2,1), opacity .45s ease; vertical-align:baseline; white-space:nowrap; }
        .pv-wrap:hover .pv-kurus { max-width:6ch; opacity:.4; }
      `}</style>

      {/* Üst başlık + platform sekmeleri */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 18 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 3 }}>{t('library.title')}</h1>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{t('library.subtitle')}</p>
            </div>
            <Link href="/profile" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', textDecoration: 'none', padding: '8px 0' }}>
              {lang === 'tr' ? '← Profil' : '← Profile'}
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            <PlatformTab active={platform === 'steam'} onClick={() => setPlatform('steam')} color="#1a9fff" label="Steam" count={steamAccounts.length}
              icon={<SteamLogo size={16} color={platform === 'steam' ? '#1a9fff' : 'currentColor'} />} />
            <PlatformTab active={platform === 'xbox'} onClick={() => setPlatform('xbox')} color="#4ade80" label="Xbox" count={hasXbox ? 1 : 0}
              icon={<XboxLogo size={15} color={platform === 'xbox' ? '#4ade80' : 'currentColor'} />} />
            <PlatformTab active={platform === 'epic'} onClick={() => setPlatform('epic')} color="#c7c7c7" label="Epic Games" soonLabel={lang === 'tr' ? 'Yakında' : 'Soon'}
              icon={<EpicLogo size={15} color={platform === 'epic' ? '#fff' : 'currentColor'} />} />
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1200, paddingTop: 32 }}>

        {/* ── STEAM ── */}
        {platform === 'steam' && (
          !hasSteam ? <ConnectPrompt platform="steam" lang={lang} t={t} /> : (
            <>
              {/* Profil seçici */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                <ProfileChip active={steamView === 'all'} onClick={() => setSteamView('all')} accent="#1a9fff" icon="✦"
                  label={lang === 'tr' ? 'Genel' : 'Overview'} sub={`${steamAccounts.length} ${lang === 'tr' ? 'hesap' : 'accounts'}`} />
                {steamAccounts.map(a => (
                  <ProfileChip key={a.steamId} active={steamView === a.steamId} onClick={() => setSteamView(a.steamId)} accent="#1a9fff"
                    avatar={a.avatar} label={a.name}
                    sub={steamLibs[a.steamId]?.games ? `${steamLibs[a.steamId].total} ${lang === 'tr' ? 'oyun' : 'games'}` : '…'}
                    onRemove={() => handleRemoveSteamAccount(a.steamId)} removing={removingId === a.steamId} />
                ))}
                <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 56, gap: 6, padding: '0 16px', borderRadius: 14, border: '1.5px dashed rgba(26,159,255,0.4)', color: '#1a9fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    + {lang === 'tr' ? 'Hesap Ekle' : 'Add Account'}
                  </div>
                </a>
              </div>

              {steamView === 'all' ? (
                <>
                  <SteamCombinedHeader accounts={steamAccounts} combined={steamCombined} pricesLoading={steamPricesLoading} />
                  {steamLoading ? <SkeletonList /> : <SteamGamesGrid games={steamCombined.games} prices={steamPrices} pricesLoading={steamPricesLoading} showOwner />}
                </>
              ) : (() => {
                const acc = steamAccounts.find(a => a.steamId === steamView);
                const lib = steamLibs[steamView];
                const accValue = computeSteamValue(lib?.games, steamPrices);
                return (
                  <>
                    <SteamProfileHeader steamUser={acc} library={lib && !lib.error && lib.games ? lib : null} totalValue={accValue} pricesLoading={steamPricesLoading} />
                    {steamLoading ? <SkeletonList /> : lib?.error ? <ErrorBox error={lib} /> : <SteamGamesGrid games={lib?.games || []} prices={steamPrices} pricesLoading={steamPricesLoading} />}
                  </>
                );
              })()}
            </>
          )
        )}

        {/* ── XBOX ── */}
        {platform === 'xbox' && (
          !hasXbox
            ? <ConnectPrompt platform="xbox" lang={lang} t={t} onConnect={() => setShowXboxModal(true)} />
            : <XboxLibrary xboxUser={xboxUser} library={xboxLib} loading={xboxLoading} error={xboxErr} value={xboxValue} valueLoading={xboxValueLoading} onLogout={xboxLogout} />
        )}

        {/* ── EPIC ── */}
        {platform === 'epic' && <ConnectPrompt platform="epic" lang={lang} t={t} />}

        {/* ── Genel Toplam ── */}
        {hasAny && <GrandTotalSummary grand={grand} loading={steamLoading || steamPricesLoading || xboxLoading || xboxValueLoading} />}
      </div>

      {showXboxModal && <XboxConnectModal onClose={() => setShowXboxModal(false)} xboxError={xboxError} setXboxError={setXboxError} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI HESAPLAMA
// ─────────────────────────────────────────────────────────────────────────────
function computeSteamValue(games, prices) {
  if (!games) return null;
  let sum = 0, counted = 0;
  for (const g of games) {
    const p = prices[g.appid];
    if (p && !p.isFree && p.original > 0) { sum += p.original; counted++; }
  }
  return counted > 0 ? { sum, counted } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SEKMESİ
// ─────────────────────────────────────────────────────────────────────────────
function PlatformTab({ active, onClick, color, label, icon, count, soonLabel }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexShrink: 0,
      border: 'none', borderBottom: `2px solid ${active ? color : 'transparent'}`,
      background: 'transparent', cursor: 'pointer',
      color: active ? color : 'var(--text-3)', fontSize: 14, fontWeight: active ? 700 : 500,
      transition: 'all .18s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-3)'; }}
    >
      {icon}{label}
      {count > 0 && <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: active ? color : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-3)' }}>{count}</span>}
      {soonLabel && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: 'var(--bg-input)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{soonLabel}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFİL ÇİPİ (hesap seçici)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileChip({ active, onClick, accent, avatar, icon, label, sub, onRemove, removing }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14,
      border: `1.5px solid ${active ? accent : 'var(--border)'}`,
      background: active ? `${accent}14` : 'var(--bg-card)',
      boxShadow: active ? `0 4px 16px ${accent}22` : 'none',
      cursor: 'pointer', transition: 'all .2s',
    }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{icon || label?.slice(0, 1).toUpperCase()}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>}
      </div>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} disabled={removing} title="×"
          style={{ marginLeft: 2, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 2 }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >{removing ? '…' : '×'}</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BAĞLANTI / YAKINDA EKRANI
// ─────────────────────────────────────────────────────────────────────────────
function ConnectPrompt({ platform, lang, t, onConnect }) {
  if (platform === 'epic') {
    return (
      <div style={{ textAlign: 'center', padding: '72px 24px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <EpicLogo size={36} color="var(--text-3)" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Epic Games</h2>
        <p style={{ fontSize: 14.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
          {lang === 'tr'
            ? 'Epic Games kütüphane entegrasyonu çok yakında! Yakında Epic hesabınızı bağlayıp oyunlarınızı ve değerini burada görebileceksiniz.'
            : 'Epic Games library integration is coming soon! Soon you will be able to connect your Epic account and see your games and value here.'}
        </p>
        <span style={{ display: 'inline-block', marginTop: 20, padding: '8px 18px', borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 700 }}>
          🔜 {lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
        </span>
      </div>
    );
  }
  const isSteam = platform === 'steam';
  const color = isSteam ? '#1a9fff' : '#107C10';
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: `${color}1a`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        {isSteam ? <SteamLogo size={36} color={color} /> : <XboxLogo size={36} color={color} />}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{isSteam ? 'Steam' : 'Xbox'}</h2>
      <p style={{ fontSize: 14.5, color: 'var(--text-3)', marginBottom: 24, lineHeight: 1.6 }}>
        {isSteam
          ? (lang === 'tr' ? 'Steam hesabını bağla; kütüphaneni, oyun sürelerini ve kütüphane değerini gör.' : 'Connect your Steam account to see your library, playtime and library value.')
          : (lang === 'tr' ? 'Xbox hesabını bağla; oyunlarını ve Game Pass içeriğini gör.' : 'Connect your Xbox account to see your games and Game Pass content.')}
      </p>
      {isSteam ? (
        <a href="/api/auth/steam" style={{ textDecoration: 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #1b2838, #2a475e)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(27,40,56,0.3)' }}>
            <SteamLogo size={20} /> {t('library.steamLogin')}
          </span>
        </a>
      ) : (
        <button onClick={onConnect} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0e4d0e, #107C10)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,124,16,0.3)' }}>
          <XboxLogo size={20} /> {t('library.xboxLogin')}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEAM BİRLEŞİK BAŞLIK (Genel görünüm)
// ─────────────────────────────────────────────────────────────────────────────
function SteamCombinedHeader({ accounts, combined, pricesLoading }) {
  const { lang, t } = useLanguage();
  return (
    <div style={{ marginBottom: 24, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(26,159,255,0.18)', boxShadow: '0 4px 24px rgba(27,40,56,0.25)' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #1a9fff 0%, #5eb7ff 50%, transparent 100%)' }} />
      <div style={{ background: 'linear-gradient(135deg, rgba(27,40,56,0.85) 0%, rgba(15,20,30,0.6) 100%)', padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {/* Avatar yığını */}
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {accounts.slice(0, 4).map((a, i) => (
              a.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img key={a.steamId} src={a.avatar} alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover', border: '2px solid #0f141e', marginLeft: i ? -16 : 0, boxShadow: '0 0 10px rgba(26,159,255,0.2)' }} />
                : <div key={a.steamId} style={{ width: 54, height: 54, borderRadius: 12, background: '#1a9fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '2px solid #0f141e', marginLeft: i ? -16 : 0 }}>{a.name?.slice(0, 1).toUpperCase()}</div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 10, color: '#1a9fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{lang === 'tr' ? 'Birleşik Steam' : 'Combined Steam'}</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 4 }}>{accounts.length} {lang === 'tr' ? 'Hesap' : 'Accounts'}</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{accounts.map(a => a.name).join(' · ')}</p>
          </div>
          {/* İstatistikler */}
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {[
              { label: t('library.stats.totalGames'), value: combined.totalGames.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'), color: '#fff', min: 90 },
              { label: t('library.stats.totalHours'), value: `${combined.totalHours.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}${lang === 'tr' ? 's' : 'h'}`, color: 'var(--accent)', min: 110 },
            ].map((s, i) => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: s.min, padding: '0 16px', borderLeft: i ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
            <div style={{ textAlign: 'center', minWidth: 120, padding: '0 16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              {pricesLoading && !combined.value
                ? <p style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 5, fontStyle: 'italic' }}>…</p>
                : <p style={{ lineHeight: 1, marginBottom: 5 }}><PriceValue tryAmount={combined.value?.sum ?? null} size={24} color="#4ade80" /></p>}
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'tr' ? 'Toplam Değer' : 'Total Value'}</p>
            </div>
          </div>
        </div>
        {combined.value && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            ⚠️ {t('library.disclaimer').replace('{count}', combined.value.counted)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEAM OYUN GRID (filtre + sıralama + arama)
// ─────────────────────────────────────────────────────────────────────────────
function SteamGamesGrid({ games, prices, pricesLoading, showOwner }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('hours');
  const [filter, setFilter] = useState('all');

  const filtered = (games || [])
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
      {filtered.length === 0 ? <EmptyState /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
          {filtered.map((game, i) => <GameRow key={game.appid} game={game} rank={sort === 'hours' ? i + 1 : null} price={prices[game.appid]} pricesLoading={pricesLoading} accountLabel={showOwner ? game._owner : null} />)}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEAM PROFİL BAŞLIĞI (tek hesap)
// ─────────────────────────────────────────────────────────────────────────────
function SteamProfileHeader({ steamUser, library, totalValue, pricesLoading }) {
  const { t } = useLanguage();
  return (
    <div style={{ marginBottom: 24, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(26,159,255,0.18)', boxShadow: '0 4px 24px rgba(27,40,56,0.25)' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #1a9fff 0%, #5eb7ff 50%, transparent 100%)' }} />
      <div style={{ background: 'linear-gradient(135deg, rgba(27,40,56,0.85) 0%, rgba(15,20,30,0.6) 100%)', padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {steamUser.avatar ? (
            <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(26,159,255,0.5)', boxShadow: '0 0 14px rgba(26,159,255,0.25)', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={steamUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: 12, background: '#1a9fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {steamUser.name?.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 10, color: '#1a9fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              {t('library.steam')}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 5 }}>{steamUser.name}</h2>
            <a href={steamUser.profileUrl || `https://steamcommunity.com/profiles/${steamUser.steamId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(94,183,255,0.85)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {t('library.viewProfile')} ↗
            </a>
          </div>
          {library && (
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                { label: t('library.stats.totalGames'), value: library.total, color: '#fff' },
                { label: t('library.stats.played'), value: library.played, color: '#fff' },
                { label: t('library.stats.totalHours'), value: `${library.totalHours.toLocaleString()}${t('library.hours').toLowerCase().slice(0, 1)}`, color: 'var(--accent)' },
              ].map((s, i) => (
                <div key={s.label} style={{ textAlign: 'center', minWidth: 76, padding: '0 16px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                </div>
              ))}
              <div style={{ textAlign: 'center', minWidth: 100, padding: '0 16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                {pricesLoading && !totalValue
                  ? <p style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 5, fontStyle: 'italic' }}>…</p>
                  : <p style={{ lineHeight: 1, marginBottom: 5 }}><PriceValue tryAmount={totalValue?.sum ?? null} size={22} color="#4ade80" /></p>}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('library.value')}</p>
              </div>
            </div>
          )}
        </div>
        {totalValue && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            ⚠️ {t('library.disclaimer').replace('{count}', totalValue.counted)}
          </p>
        )}
      </div>
    </div>
  );
}

function GameRow({ game, rank, price, pricesLoading, accountLabel }) {
  const { t, formatPrice, lang } = useLanguage();
  const lastPlayed = game.lastPlayed ? formatLastPlayed(game.lastPlayed, t) : null;
  const hourSymbol = lang === 'tr' ? 's' : 'h';

  return (
    <div className="premium-game-card" style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      background: 'var(--bg-card)',
      border: '1px solid rgba(255,255,255,0.05)',
      aspectRatio: '3/4',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px)';
      e.currentTarget.style.boxShadow = '0 16px 40px var(--accent-glow)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    }}>
      {/* Background Cover */}
      <a href={game.storeUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
        <GameImage
          game={game}
          alt={game.name}
          fill
          isVertical
          style={{ objectFit: 'cover', transition: 'transform 0.5s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        {/* Gradient Overlay for Text Readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          pointerEvents: 'none'
        }} />
      </a>

      {/* Rank Badge */}
      {rank && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 14, fontWeight: 800, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 2
        }}>
          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
        </div>
      )}

      {/* Price Badge */}
      <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 2
      }}>
        {pricesLoading && !price
          ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>…</span>
          : price?.isFree
            ? <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 800 }}>{t('library.free')}</span>
            : price?.unavailable
              ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('library.noPrice')}</span>
              : price
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {price.discount > 0 && <span style={{ fontSize: 11, background: '#16a34a', color: '#fff', borderRadius: 4, padding: '2px 4px', fontWeight: 800 }}>-{price.discount}%</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {price.discount > 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', textDecoration: 'line-through', lineHeight: 1 }}>{formatPrice(price.original)}</span>}
                      <span style={{ fontSize: 14, fontWeight: 800, color: price.discount > 0 ? '#4ade80' : '#fff', lineHeight: 1, marginTop: price.discount > 0 ? 2 : 0 }}>{formatPrice(price.current)}</span>
                    </div>
                  </div>
                : null
        }
      </div>

      {/* Bottom Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 16px 16px', pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 2
      }}>
        {accountLabel && (
          <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: '#cfe8ff', background: 'rgba(26,159,255,0.28)', border: '1px solid rgba(26,159,255,0.45)', padding: '2px 8px', borderRadius: 6, backdropFilter: 'blur(4px)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {accountLabel}
          </span>
        )}
        <h3 style={{
          fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {game.name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {game.hours > 0 ? (
               <>
                 <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', textShadow: '0 2px 10px var(--accent-glow)', lineHeight: 1 }}>
                   {game.hours}<span style={{ fontSize: 12, marginLeft: 2 }}>{hourSymbol}</span>
                 </span>
                 <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{t('library.hoursPlayed')}</span>
               </>
            ) : (
               <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 12 }}>{t('library.notPlayed')}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {game.hoursRecent > 0 && <span style={{ fontSize: 11, color: '#1a9fff', fontWeight: 700 }}>{t('library.playedRecent').replace('{hours}', game.hoursRecent)}</span>}
            {lastPlayed && !game.hoursRecent && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{t('library.lastPlayedLabel').replace('{date}', lastPlayed)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// XBOX BİLEŞENLERİ
// ─────────────────────────────────────────────────────────────────────────────
function XboxLibrary({ xboxUser, library, loading, error, value, valueLoading, onLogout }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('recent');
  const [filter, setFilter] = useState('all'); // all | gamepass | owned

  if (loading) return (
    <>
      <XboxProfileHeader xboxUser={xboxUser} library={null} value={null} valueLoading={false} onLogout={onLogout} />
      <SkeletonList />
    </>
  );

  if (error) return (
    <>
      <XboxProfileHeader xboxUser={xboxUser} library={null} value={null} valueLoading={false} onLogout={onLogout} />
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
      <XboxProfileHeader xboxUser={xboxUser} library={library} value={value} valueLoading={valueLoading} onLogout={onLogout} />

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
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
            {filtered.map(game => (
              <XboxGameRow key={game.titleId} game={game} />
            ))}
          </div>
      }
    </>
  );
}

function XboxProfileHeader({ xboxUser, library, value, valueLoading, onLogout }) {
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
    <div style={{ marginBottom: 24, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(16,124,16,0.22)', boxShadow: '0 4px 24px rgba(16,124,16,0.12)' }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #107C10 0%, #4ade80 50%, transparent 100%)' }} />
      <div style={{ background: 'linear-gradient(135deg, rgba(14,50,14,0.85) 0%, rgba(10,25,10,0.6) 100%)', padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {/* Avatar */}
          {xboxUser.avatar ? (
            <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(16,124,16,0.5)', boxShadow: '0 0 14px rgba(16,124,16,0.25)', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={xboxUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: 12, background: 'rgba(16,124,16,0.3)', border: '2px solid rgba(16,124,16,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XboxLogo size={32} color="#4ade80" />
            </div>
          )}
          {/* Name */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 10, color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              {t('library.xbox')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>{xboxUser.gamertag}</h2>
              {hasGamePass ? (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#107C10', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  ● {gpText}
                </span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {gpText}
                </span>
              )}
            </div>
            <a href={`https://www.xbox.com/${lang === 'tr' ? 'tr-TR' : 'en-US'}/play/user/${xboxUser.gamertag}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(74,222,128,0.75)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {t('library.viewProfile')} ↗
            </a>
          </div>
          {/* Stats */}
          {library && (
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                { label: t('library.stats.played') + ' ' + t('library.games'), value: library.total, color: '#fff' },
                { label: 'Game Pass', value: library.gamePassCount, color: '#4ade80' },
                { label: 'Gamerscore', value: library.totalGamerscore?.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'), color: '#fff' },
              ].map((s, i) => (
                <div key={s.label} style={{ textAlign: 'center', minWidth: 76, padding: '0 16px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                </div>
              ))}
              {/* Kütüphane değeri (sahip olunan oyunların tahmini mağaza değeri) */}
              <div style={{ textAlign: 'center', minWidth: 100, padding: '0 16px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {valueLoading && !value
                  ? <p style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', lineHeight: 1, marginBottom: 5, fontStyle: 'italic' }}>…</p>
                  : <p style={{ lineHeight: 1, marginBottom: 5 }}><PriceValue tryAmount={value?.sum ?? null} size={22} color="#4ade80" /></p>}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('library.value')}</p>
              </div>
            </div>
          )}
          {/* Logout */}
          <button
            onClick={onLogout}
            style={{ padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            {t('nav.logout')}
          </button>
        </div>
        {(library || value) && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {value
              ? (lang === 'tr'
                  ? `≈ Değer, eşleşen ${value.counted} oyunun mağaza fiyatına göre tahminidir. ${t('library.xbox.disclaimer')}`
                  : `≈ Value is estimated from store prices of ${value.counted} matched games. ${t('library.xbox.disclaimer')}`)
              : t('library.xbox.disclaimer')}
          </p>
        )}
      </div>
    </div>
  );
}

function XboxGameRow({ game }) {
  const { lang, t } = useLanguage();
  const hourSymbol = lang === 'tr' ? 's' : 'h';
  const lastPlayed = game.lastPlayed ? formatLastPlayed(game.lastPlayed, t) : null;

  return (
    <div className="premium-game-card" style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      background: 'var(--bg-card)',
      border: '1px solid rgba(255,255,255,0.05)',
      aspectRatio: '3/4',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px)';
      e.currentTarget.style.boxShadow = '0 16px 40px rgba(22, 163, 74, 0.4)'; // Xbox green glow
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    }}>
      <a href={`https://www.xbox.com/games/store/p/${game.titleId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
        {(game.displayImage || game.image) ? (
           // eslint-disable-next-line @next/next/no-img-element
           <img src={game.displayImage || game.image} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
        ) : (
           <div style={{ width: '100%', height: '100%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <XboxLogo size={48} color="var(--text-3)" />
           </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          pointerEvents: 'none'
        }} />
      </a>

      {game.isGamePass && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: '#107c10', color: '#fff',
          padding: '4px 10px', borderRadius: '10px', fontSize: 11, fontWeight: 800,
          boxShadow: '0 4px 12px rgba(16, 124, 16, 0.5)', zIndex: 2
        }}>
          GAME PASS
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 16px 16px', pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2
      }}>
        <h3 style={{
          fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {game.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#4ade80', textShadow: '0 2px 10px rgba(74,222,128,0.4)', lineHeight: 1 }}>
              {game.currentGamerscore ?? 0}<span style={{ fontSize: 11, marginLeft: 3 }}>G</span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Gamerscore</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {lastPlayed && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{lastPlayed}</span>}
            {game.totalAchievements > 0 && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{game.currentAchievements ?? 0}/{game.totalAchievements} 🏆</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARA DEĞERİ (kuruş hover ile)
// ─────────────────────────────────────────────────────────────────────────────
function PriceValue({ tryAmount, size = 26, weight = 800, color = '#4ade80' }) {
  const { lang, rate } = useLanguage();
  if (tryAmount == null) return <span style={{ fontSize: size, fontWeight: weight, color }}>—</span>;

  let intStr, fracStr, prefix = '', suffix = '';
  if (lang === 'tr') {
    const intPart = Math.floor(tryAmount);
    const fr = Math.round((tryAmount - intPart) * 100);
    intStr = intPart.toLocaleString('tr-TR');
    fracStr = ',' + String(fr).padStart(2, '0');
    suffix = '\u20BA';
  } else {
    const usd = tryAmount / (rate || 1);
    const intPart = Math.floor(usd);
    const c = Math.round((usd - intPart) * 100);
    intStr = intPart.toLocaleString('en-US');
    fracStr = '.' + String(c).padStart(2, '0');
    prefix = '$';
  }

  return (
    <span className="pv-wrap" style={{ fontSize: size, fontWeight: weight, color, letterSpacing: '-0.5px', whiteSpace: 'nowrap', cursor: 'default' }}>
      {prefix}{intStr}<span className="pv-kurus">{fracStr}</span>{suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENEL TOPLAM (tüm bağlı hesaplar)
// ─────────────────────────────────────────────────────────────────────────────
function GrandTotalSummary({ grand, loading }) {
  const { lang } = useLanguage();
  const cards = [
    {
      label: lang === 'tr' ? 'Toplam Değer' : 'Total Value',
      node: <PriceValue tryAmount={grand.hasValue ? grand.value : null} size={34} color="#4ade80" />,
      grad: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(255,255,255,0.01))', border: 'rgba(74,222,128,0.22)',
    },
    {
      label: lang === 'tr' ? 'Toplam Oynama' : 'Total Hours',
      node: <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-1px' }}>{grand.hours.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}<span style={{ fontSize: 18, marginLeft: 2 }}>{lang === 'tr' ? 's' : 'h'}</span></span>,
      grad: 'linear-gradient(135deg, rgba(201,133,10,0.08), rgba(255,255,255,0.01))', border: 'rgba(201,133,10,0.22)',
    },
    {
      label: lang === 'tr' ? 'Toplam Oyun' : 'Total Games',
      node: <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }}>{grand.games.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>,
      grad: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(255,255,255,0.01))', border: 'rgba(99,102,241,0.22)',
    },
  ];
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {lang === 'tr' ? 'Tüm Hesaplar — Genel Toplam' : 'All Accounts — Grand Total'}
        </p>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div className="grand-total-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.grad, border: `1px solid ${c.border}`, borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ lineHeight: 1, marginBottom: 8 }}>{c.node}</div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
          </div>
        ))}
      </div>
      {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 12, fontStyle: 'italic' }}>{lang === 'tr' ? 'Hesaplanıyor…' : 'Calculating…'}</p>}
      <style>{`@media (max-width:640px){ .grand-total-grid{ grid-template-columns:1fr !important; } }`}</style>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px', marginTop: 24 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '3/4', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
