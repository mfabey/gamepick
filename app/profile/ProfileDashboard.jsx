'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { summarizeProfile } from '../lib/profile-stats.mjs';
import { ChangePasswordCard, DeleteAccountCard } from './SettingsCards';
import { LOGO_SRC } from '../lib/logo';

function ProfileImage({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <span className={'profile-image ' + className}>
    {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> :
      <span aria-hidden="true">{String(name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}</span>}
  </span>;
}

function ProfileStat({ label, value, note, unit }) {
  return <div className="profile-stat"><dt>{label}</dt><dd>{value}<small>{unit}</small></dd><p>{note}</p></div>;
}

function SourceCard({ source, lang, onDisconnect }) {
  const tr = lang === 'tr';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const status = {
    loading: tr ? 'Kütüphane yükleniyor…' : 'Loading library…',
    ready: tr ? 'Kütüphane alındı' : 'Library received',
    partial: tr ? 'Kütüphanenin bir bölümü alındı' : 'Part of the library received',
    unavailable: tr ? 'Oyun bilgilerine erişilemiyor' : 'Game data unavailable',
    error: tr ? 'Kütüphane yüklenemedi' : 'Library could not be loaded',
    demo: tr ? 'Örnek bağlantı · istatistiklere dahil değil' : 'Demo connection · excluded from statistics',
  }[source.status];
  const disconnect = async () => {
    setBusy(true); setError(false);
    try { await onDisconnect(source); } catch { setError(true); }
    finally { setBusy(false); }
  };
  return <div className="profile-source">
    <div className="profile-source-identity"><ProfileImage src={source.account.avatar} name={source.platform} />
      <div><strong>{source.platform === 'steam' ? 'Steam' : 'Xbox'}</strong><p>{source.account.name || source.account.gamertag || source.id}</p></div>
    </div>
    <p className="profile-source-status">{status}</p>
    {source.status === 'ready' && <p className="profile-source-detail">{source.data.games.length} {tr ? 'oyun kaydı' : 'game records'}{source.data.cached ? (tr ? ' · Önbellekten' : ' · Cached') : ''}</p>}
    <div className="profile-source-actions">
      <button className="profile-text-button" disabled={busy} onClick={disconnect}>{busy ? (tr ? 'İşleniyor…' : 'Working…') : (tr ? 'Bağlantıyı kes' : 'Disconnect')}</button>
      {source.status !== 'demo' && <a className="profile-text-button" target="_blank" rel="noopener noreferrer" href={source.platform === 'steam' ? 'https://steamcommunity.com/profiles/' + encodeURIComponent(source.id) : 'https://live.xbox.com/Profile?Gamertag=' + encodeURIComponent(source.account.gamertag || '')}>{tr ? 'Profili aç' : 'View profile'} ↗</a>}
    </div>
    {error && <p role="alert">{tr ? 'Bağlantı kesilemedi. Tekrar deneyin.' : 'Could not disconnect. Try again.'}</p>}
  </div>;
}

export default function ProfileDashboard({ user, steamUser, xboxUser, sources, loading, wishlist, wishlistState, wishlistBusy, wishlistError, onRetry, onRemove, onDisconnect, changePassword, deleteAccount, lang }) {
  const tr = lang === 'tr';
  const format = value => value == null ? '—' : new Intl.NumberFormat(tr ? 'tr-TR' : 'en-US', { maximumFractionDigits: 1 }).format(value);
  const stats = summarizeProfile(sources);
  const name = user?.displayName || user?.name || user?.username || steamUser?.name || xboxUser?.gamertag || (tr ? 'Oyuncu' : 'Player');
  const hasSteam = sources.some(s => s.platform === 'steam');
  const hasXbox = sources.some(s => s.platform === 'xbox');
  const steamNote = !hasSteam ? (tr ? 'Steam hesabını bağla' : 'Connect Steam') : stats.steamCount == null ? (tr ? 'Veri alınamadı' : 'Data unavailable') : stats.steamPartial ? (tr ? 'Erişilebilen Steam hesapları' : 'Available Steam accounts') : (tr ? 'Bağlı Steam hesaplarından' : 'From connected Steam accounts');
  const failed = sources.some(s => ['error', 'unavailable', 'partial'].includes(s.status));
  const admin = ['batuta', 'test'].includes(String(user?.username || '').replace(/^@/, '').toLowerCase().trim());
  const avatarSrc = admin ? (user?.avatar || LOGO_SRC) : (user?.avatar || steamUser?.avatar || xboxUser?.avatar);
  return <main className="profile-page">
    <div className="container">
      <div className="profile-page-heading"><div><p className="eyebrow">GAMERISEN / {tr ? 'HESABIM' : 'MY ACCOUNT'}</p><h1>{tr ? 'Oyuncu profilin.' : 'Your player profile.'}</h1><p>{tr ? 'Kütüphanelerin, oyun süren ve kaydettiğin oyunlar bir arada.' : 'Your libraries, playtime and saved games in one place.'}</p></div>
        <button className="profile-button profile-secondary" disabled={loading} onClick={onRetry}>{loading ? (tr ? 'Yenileniyor…' : 'Refreshing…') : (tr ? 'Verileri yenile' : 'Refresh data')}</button>
      </div>
      <section className="profile-identity profile-panel" aria-label={tr ? 'Profil bilgileri' : 'Profile details'}>
        <ProfileImage className="profile-avatar" src={avatarSrc} name={name} />
        <div className="profile-identity-copy"><h2>{name}</h2>{user?.username && <p className="profile-handle">@{user.username}</p>}{user?.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-badges">{sources.map(s => <span key={s.id}>{s.platform === 'steam' ? 'Steam' : 'Xbox'} · {s.account.name || s.account.gamertag || (tr ? 'Bağlı' : 'Connected')}</span>)}</div>
        </div>
        <div className="profile-identity-actions"><Link className="profile-button" href="/library">{tr ? 'Kütüphanem' : 'My library'} <span aria-hidden="true">↗</span></Link>
          {user?.username && <Link className="profile-text-button" href={'/u/' + user.username}>{tr ? 'Herkese açık profil' : 'Public profile'} ↗</Link>}
          {admin && <Link className="profile-text-button" href="/admin">{tr ? 'Yönetim paneli' : 'Admin panel'}</Link>}
        </div>
      </section>
      {!user && <p className="profile-notice">{tr ? 'Hesap ayarlarını kullanmak için Gamerisen hesabına giriş yap.' : 'Sign in to Gamerisen to manage your account settings.'} <Link href="/login">{tr ? 'Giriş yap' : 'Sign in'} →</Link></p>}
      {failed && !loading && <p className="profile-notice" role="status">{tr ? 'Bazı kütüphanelere erişilemedi. Aşağıdaki değerler yalnızca alınabilen kayıtları içerir. Gizlilik ayarlarını veya hesap bağlantılarını kontrol edip yeniden deneyebilirsin.' : 'Some libraries are unavailable. Values below only include received records. Check privacy settings or account connections and try again.'}</p>}
      <dl className="profile-stats" aria-busy={loading}>
        <ProfileStat label={tr ? 'Steam oyunları' : 'Steam games'} value={loading && hasSteam ? '…' : format(stats.steamCount)} note={steamNote} />
        <ProfileStat label={tr ? 'Steam oyun süresi' : 'Steam playtime'} value={loading && hasSteam ? '…' : format(stats.totalHours)} unit={stats.totalHours != null ? (tr ? 'saat' : 'hrs') : ''} note={steamNote} />
        <ProfileStat label={tr ? 'Son 14 gün · Steam' : 'Last 14 days · Steam'} value={loading && hasSteam ? '…' : format(stats.recentHours)} unit={stats.recentHours != null ? (tr ? 'saat' : 'hrs') : ''} note={tr ? 'Steam’in bildirdiği iki haftalık süre' : 'Two-week playtime reported by Steam'} />
        <ProfileStat label={tr ? 'Xbox oyun geçmişi' : 'Xbox game history'} value={loading && hasXbox ? '…' : format(stats.xboxCount)} note={!hasXbox ? (tr ? 'Xbox hesabını bağla' : 'Connect Xbox') : xboxUser?.isMock ? (tr ? 'Örnek veriler dahil edilmez' : 'Demo data is excluded') : stats.xboxCount == null ? (tr ? 'Veri alınamadı' : 'Data unavailable') : (tr ? 'Oynanan oyun kayıtları · sahiplik değildir' : 'Played game records · not ownership')} />
      </dl>
      <p className="profile-data-note">{tr ? 'Süreler Steam’den saat olarak alınır; günlük dağılım tahmin edilmez. Birden çok Steam hesabındaki aynı oyun bir kez sayılır, süreleri toplanır. Xbox oyun geçmişi ayrı gösterilir.' : 'Playtime is reported by Steam in hours; daily activity is not estimated. A game across multiple Steam accounts is counted once and its playtime is added. Xbox history is shown separately.'}</p>
      <div className="profile-layout">
        <div className="profile-content">
          <section className="profile-panel">
            <div className="profile-section-heading"><div><p className="eyebrow">STEAM</p><h2>{tr ? 'Son oynadıkların' : 'Recently played'}</h2><p>{tr ? 'Son 14 gündeki oyun sürene göre.' : 'By playtime over the last 14 days.'}</p></div><Link className="profile-text-button" href="/library">{tr ? 'Tüm kütüphane' : 'Full library'} ↗</Link></div>
            {loading && hasSteam ? <p className="profile-empty" role="status">{tr ? 'Oyun süreleri yükleniyor…' : 'Loading playtime…'}</p> :
              stats.recentGames.length ? <ol className="profile-game-list">{stats.recentGames.slice(0, 5).map(game => <li key={game.appid}>
                <ProfileImage src={game.image} name={game.name} className="profile-game-art" />
                <div className="profile-game-copy"><Link href={'/game/' + game.appid}>{game.name}</Link><div className="profile-playtime-track" aria-hidden="true"><span style={{ width: (game.hoursRecent / stats.recentGames[0].hoursRecent * 100) + '%' }} /></div></div>
                <span className="profile-game-time">{format(game.hoursRecent)} <small>{tr ? 'saat' : 'hrs'}</small></span>
              </li>)}</ol> : <div className="profile-empty"><h3>{!hasSteam ? (tr ? 'Oyun geçmişini buraya getir.' : 'Bring your play history here.') : stats.recentHours == null ? (tr ? 'Oyun süresi bilgisi alınamadı.' : 'Playtime is unavailable.') : (tr ? 'Son 14 gün için oynama kaydı yok.' : 'No playtime recorded in the last 14 days.')}</h3><p>{!hasSteam ? (tr ? 'Steam hesabını bağladığında, platformun paylaştığı süreler burada görünür.' : 'Connect Steam to see the playtime shared by the platform.') : (tr ? 'Yalnızca Steam’in paylaştığı kayıtlar gösterilir.' : 'Only records shared by Steam are shown.')}</p></div>}
          </section>
          {stats.achievementTotal > 0 && <section className="profile-panel"><div className="profile-section-heading"><div><p className="eyebrow">XBOX</p><h2>{tr ? 'Kazanılan başarımlar' : 'Achievements earned'}</h2></div><strong>{format(stats.achievementCurrent)} / {format(stats.achievementTotal)}</strong></div><p className="profile-muted">{stats.achievementGames} {tr ? 'oyunun paylaşılmış başarım verisi. Bu oran oyun bitirme oranı değildir.' : 'games with shared achievement data. This is not a game completion rate.'}</p></section>}
          <section className="profile-panel">
            <div className="profile-section-heading"><div><p className="eyebrow">{tr ? 'KAYDETTİKLERİN' : 'SAVED BY YOU'}</p><h2>{tr ? 'İstek listesi' : 'Wishlist'}</h2></div>{wishlistState === 'ready' && <span className="profile-muted">{wishlist.length} {tr ? 'oyun' : 'games'}</span>}</div>
            {wishlistError && <p className="profile-notice" role="alert">{tr ? 'Değişiklik kaydedilemedi. Tekrar deneyin.' : 'Could not save changes. Please try again.'}</p>}
            {wishlistState !== 'ready' ? <p className="profile-empty" role="status">{wishlistState === 'loading' ? (tr ? 'İstek listen yükleniyor…' : 'Loading your wishlist…') : (tr ? 'İstek listesi alınamadı. Verileri yenileyerek tekrar deneyebilirsin.' : 'Wishlist unavailable. Refresh data to try again.')}</p> :
              wishlist.length ? <ul className="profile-game-list">{wishlist.map((game, i) => <li key={game.id || game.appid || i}><ProfileImage className="profile-game-art" src={game.image} name={game.name} /><div className="profile-game-copy"><Link href={'/game/' + (game.slug || game.rawgSlug || game.appid || game.id)}>{game.name}</Link><p>{tr ? 'İstek listene kaydedildi' : 'Saved to your wishlist'}</p></div><button className="profile-remove" disabled={wishlistBusy} onClick={() => onRemove(game)} aria-label={(tr ? 'İstek listesinden kaldır: ' : 'Remove from wishlist: ') + game.name}>×</button></li>)}</ul> :
              <div className="profile-empty"><h3>{tr ? 'Sıradaki oyununa yer aç.' : 'Make room for your next game.'}</h3><p>{tr ? 'Kaydettiğin oyunları burada bulacaksın.' : 'The games you save will appear here.'}</p><Link className="profile-button profile-secondary" href="/games">{tr ? 'Oyunlara göz at' : 'Browse games'} →</Link></div>}
          </section>
        </div>
        <aside className="profile-panel profile-connections"><div className="profile-section-heading"><div><p className="eyebrow">{tr ? 'PLATFORMLAR' : 'PLATFORMS'}</p><h2>{tr ? 'Bağlı hesaplar' : 'Connected accounts'}</h2><p>{tr ? 'Kütüphane verilerinin kaynakları.' : 'The sources of your library data.'}</p></div></div>
          {sources.map(source => <SourceCard key={source.id} source={source} lang={lang} onDisconnect={onDisconnect} />)}
          {sources.filter(s => s.platform === 'steam').length < 5 && <a className="profile-button profile-secondary" href="/api/auth/steam">+ {tr ? 'Steam hesabı bağla' : 'Connect Steam'}</a>}
          {!hasXbox && <a className="profile-button profile-secondary" href="/api/auth/xbox">+ {tr ? 'Xbox hesabı bağla' : 'Connect Xbox'}</a>}
          <p className="profile-data-note">{tr ? 'Gizli kütüphaneler veya süresi dolmuş bağlantılar nedeniyle bazı veriler alınamayabilir. “—” veri bulunmadığını belirtir; sıfır anlamına gelmez.' : 'Private libraries or expired connections may prevent data access. “—” means data is unavailable, not zero.'}</p>
        </aside>
      </div>
      {user && <section className="profile-settings"><div className="profile-section-heading"><div><p className="eyebrow">{tr ? 'HESABIN' : 'YOUR ACCOUNT'}</p><h2>{tr ? 'Hesap ayarları' : 'Account settings'}</h2></div></div><div className="profile-settings-grid"><ChangePasswordCard changePassword={changePassword} lang={lang} /><DeleteAccountCard deleteAccount={deleteAccount} lang={lang} /></div></section>}
    </div>
  </main>;
}
