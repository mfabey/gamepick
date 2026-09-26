'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { libraryStatus } from '../lib/profile-stats.mjs';
import ProfileDashboard from './ProfileDashboard';
import './profile.css';

export default function ProfilePage() {
  const { user, steamUser, steamAccounts: rawSteamAccounts, xboxUser, ready, steamLogoutAccount, xboxLogout, changePassword, deleteAccount } = useAuth();
  const { lang } = useLanguage();
  const router = useRouter();
  const hasSession = !!(user || steamUser || xboxUser);
  const steamAccounts = useMemo(() => {
    const accounts = Array.isArray(rawSteamAccounts) && rawSteamAccounts.length ? rawSteamAccounts : steamUser ? [steamUser] : [];
    return accounts.filter((a, i, all) => a?.steamId && all.findIndex(b => b?.steamId === a.steamId) === i);
  }, [rawSteamAccounts, steamUser]);
  const [libraries, setLibraries] = useState({ key: '', sources: [], loading: true });
  const [revision, setRevision] = useState(0);
  const [wishlistData, setWishlistData] = useState({ key: '', items: [], status: 'loading' });
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [wishlistError, setWishlistError] = useState(false);
  const sessionKey = JSON.stringify([user?.uid, steamAccounts.map(a => a.steamId), xboxUser?.xuid, xboxUser?.gamertag, xboxUser?.isMock]);
  const baseSources = useMemo(() => [
    ...steamAccounts.map(account => ({ id: String(account.steamId), platform: 'steam', account, status: 'loading' })),
    ...(xboxUser ? [{ id: 'xbox', platform: 'xbox', account: xboxUser, status: xboxUser.isMock ? 'demo' : 'loading' }] : []),
  ], [steamAccounts, xboxUser]);
  const current = libraries.key === sessionKey;
  const sources = current ? libraries.sources : baseSources;
  const loading = !current || libraries.loading;
  const wishlistKey = user?.uid || sessionKey;
  const wishlist = wishlistData.key === wishlistKey ? wishlistData.items : [];
  const wishlistState = wishlistData.key === wishlistKey ? wishlistData.status : 'loading';

  useEffect(() => { if (ready && !hasSession) router.push('/login'); }, [ready, hasSession, router]);
  useEffect(() => {
    if (!ready || !hasSession) return;
    const controller = new AbortController();
    setLibraries({ key: sessionKey, sources: baseSources, loading: true });
    Promise.all(baseSources.map(async source => {
      if (source.status === 'demo') return source;
      try {
        const res = await fetch(source.platform === 'steam' ? '/api/oyun?steamId=' + encodeURIComponent(source.id) : '/api/xbox-library', { signal: controller.signal });
        const data = await res.json();
        return { ...source, data, status: res.ok ? libraryStatus(data) : 'error' };
      } catch { return { ...source, status: 'error' }; }
    })).then(results => { if (!controller.signal.aborted) setLibraries({ key: sessionKey, sources: results, loading: false }); });
    return () => controller.abort();
  }, [ready, hasSession, sessionKey, baseSources, revision]);

  useEffect(() => {
    if (!ready || !hasSession) return;
    const controller = new AbortController();
    setWishlistData({ key: wishlistKey, items: [], status: 'loading' }); setWishlistError(false);
    const load = async () => {
      try {
        let items;
        if (user?.uid) {
          const res = await fetch('/api/user/data', { signal: controller.signal });
          const data = await res.json();
          if (!res.ok || !Array.isArray(data.wishlist)) throw new Error('Wishlist unavailable');
          items = data.wishlist;
        } else {
          const stored = JSON.parse(localStorage.getItem('gamerisen_wishlist') || localStorage.getItem('gamepick_wishlist') || '[]');
          items = Array.isArray(stored) ? stored : [];
        }
        if (!controller.signal.aborted) setWishlistData({ key: wishlistKey, items: items.filter(g => g && typeof g === 'object' && g.name), status: 'ready' });
      } catch { if (!controller.signal.aborted) setWishlistData({ key: wishlistKey, items: [], status: 'error' }); }
    };
    load();
    return () => controller.abort();
  }, [ready, hasSession, user?.uid, wishlistKey, revision]);

  const removeFromWishlist = async game => {
    if (wishlistBusy) return;
    setWishlistBusy(true); setWishlistError(false);
    const updated = wishlist.filter(g => g !== game);
    try {
      if (user?.uid) {
        const res = await fetch('/api/user/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wishlist: updated, overwriteWishlist: true }) });
        if (!res.ok) throw new Error('Save failed');
      }
      try { localStorage.setItem('gamerisen_wishlist', JSON.stringify(updated)); } catch {}
      setWishlistData({ key: wishlistKey, items: updated, status: 'ready' });
    } catch { setWishlistError(true); }
    finally { setWishlistBusy(false); }
  };
  if (!ready || !hasSession) return <main className="profile-page"><p className="profile-empty" role="status">{lang === 'tr' ? 'Profilin yükleniyor…' : 'Loading your profile…'}</p></main>;
  return <ProfileDashboard user={user} steamUser={steamUser} xboxUser={xboxUser} sources={sources} loading={loading} wishlist={wishlist} wishlistState={wishlistState} wishlistBusy={wishlistBusy} wishlistError={wishlistError}
    onRetry={() => setRevision(v => v + 1)} onRemove={removeFromWishlist}
    onDisconnect={async source => { if (source.platform === 'steam') await steamLogoutAccount(source.id); else await xboxLogout(); }}
    changePassword={changePassword} deleteAccount={deleteAccount} lang={lang} />;
}
