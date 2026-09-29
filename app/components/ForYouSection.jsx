'use client';

import { useEffect, useMemo, useState } from 'react';
import GameCard from './GameCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { loadWebTaste, readWebTaste, recordWebTaste, saveWebLibraryTaste } from '../lib/web-taste';
// One dependency-free ranking engine for both clients; keeping it under mobile
// also lets EAS bundle it without files outside the mobile project.
import { genreSlugsFor, rankCandidates, normalizeName } from '../../mobile/src/services/recommend';
import { profileWeights, libraryWeights } from '../../mobile/src/services/recommendProfile';
import styles from './ForYouSection.module.css';

const CHOICES = [['Action', 'Aksiyon'], ['RPG', 'Rol yapma'], ['Strategy', 'Strateji'], ['Indie', 'Bağımsız'], ['Adventure', 'Macera'], ['Simulation', 'Simülasyon']];

export default function ForYouSection() {
  const { user, ready, steamAccounts, ownedGames, xboxOwnedGames } = useAuth();
  const { lang } = useLanguage();
  const tr = lang === 'tr';
  const uid = user?.uid || null;
  const owner = uid || 'guest';
  const [taste, setTaste] = useState({ owner: null, profile: {} });
  const [pool, setPool] = useState({ key: null, games: [], loading: true });
  const [revision, setRevision] = useState(0);
  const [day, setDay] = useState(() => Math.floor(Date.now() / 86400000));
  const [choosing, setChoosing] = useState(false);
  const profile = taste.owner === owner ? taste.profile : {};
  const weights = useMemo(() => profileWeights(profile), [profile]);
  const personal = Object.keys(weights).length > 0;
  const slugs = genreSlugsFor(Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([name]) => name));
  const slugKey = slugs.sort().join(',');
  const queryKey = `${owner}:${day}:${slugKey}:${revision}`;
  const accountKey = (steamAccounts || []).map(a => a.steamId).sort().join(',');

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    let lastRefresh = 0;
    const refresh = async () => {
      if (Date.now() - lastRefresh < 30000) return;
      lastRefresh = Date.now();
      setDay(Math.floor(Date.now() / 86400000));
      const next = await loadWebTaste(uid, controller.signal);
      if (!controller.signal.aborted) setTaste({ owner, profile: next });
    };
    const changed = event => {
      if (event.detail.uid === uid) setTaste({ owner, profile: event.detail.profile });
    };
    setTaste({ owner, profile: readWebTaste(uid) });
    setChoosing(false);
    window.addEventListener('gamerisen:taste', changed);
    window.addEventListener('focus', refresh);
    refresh();
    return () => {
      controller.abort();
      window.removeEventListener('gamerisen:taste', changed);
      window.removeEventListener('focus', refresh);
    };
  }, [ready, uid, owner, revision]);

  useEffect(() => {
    if (!ready || !accountKey || taste.owner !== owner) return;
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      const lists = await Promise.all(accountKey.split(',').map(async steamId => {
        const res = await fetch(`/api/oyun?steamId=${encodeURIComponent(steamId)}`, { signal });
        if (!res.ok) throw new Error('Library unavailable');
        return (await res.json()).games || [];
      }));
      const unique = new Map();
      for (const game of lists.flat()) {
        if (game.appid && (!unique.has(game.appid) || game.hours > unique.get(game.appid).hours)) unique.set(game.appid, game);
      }
      const top = [...unique.values()].sort((a, b) => (b.hours || 0) - (a.hours || 0)).slice(0, 25);
      if (!top.length) return;
      const sig = top.map(g => g.appid).sort((a, b) => a - b).join(',');
      if (readWebTaste(uid).library?.sig === sig) return;
      const res = await fetch(`/api/steam-genres?appids=${top.map(g => g.appid).join(',')}`, { signal });
      if (!res.ok) return;
      const genres = libraryWeights(top, await res.json());
      if (!signal.aborted && Object.keys(genres).length) await saveWebLibraryTaste(uid, { genres, sig, updatedAt: Date.now() });
    })().catch(() => {});
    return () => controller.abort();
  }, [ready, uid, owner, accountKey, taste.owner]);

  useEffect(() => {
    if (!ready || taste.owner !== owner) return;
    const controller = new AbortController();
    setPool({ key: queryKey, games: [], loading: true });
    fetch(`/api/for-you?genres=${encodeURIComponent(slugKey)}&num=20&day=${day}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('Recommendations unavailable'); return res.json(); })
      .then(data => {
        if (!controller.signal.aborted) setPool({ key: queryKey, games: Array.isArray(data.results) ? data.results : [], loading: false });
      })
      .catch(() => { if (!controller.signal.aborted) setPool({ key: queryKey, games: [], loading: false }); });
    return () => controller.abort();
  }, [ready, owner, taste.owner, queryKey, slugKey, day]);

  const games = useMemo(() => rankCandidates(pool.games, {
    genreWeights: weights,
    ownedNames: new Set([...(ownedGames || []), ...(xboxOwnedGames || [])].map(normalizeName)),
    limit: 12,
  }), [pool.games, weights, ownedGames, xboxOwnedGames]);
  const loading = !ready || pool.key !== queryKey || pool.loading;

  return (
    <section className={`catalog-section ${styles.section}`} aria-labelledby="for-you-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{tr ? 'SIRADAKİ OYUNUN' : 'YOUR NEXT GAME'}</p>
          <h2 id="for-you-title">{tr ? 'Senin için' : 'For you'}</h2>
          <p className={styles.description}>{personal
            ? (tr ? 'Oynadıklarından ve ilgi duyduğun türlerden yola çıkarak.' : 'Based on your library and the genres you enjoy.')
            : (tr ? 'Başlangıç önerileri. Sevdiğin türü seç, sana göre şekillensin.' : 'A starting selection. Choose a genre to make it yours.')}</p>
        </div>
        {personal && (
          <div className={styles.actions}>
            <button type="button" aria-expanded={choosing} onClick={() => setChoosing(v => !v)}>{tr ? 'Tercihlerim' : 'My interests'}</button>
          </div>
        )}
      </div>
      {(!personal || choosing) && <div className={styles.choices} aria-label={tr ? 'Sevdiğin türler' : 'Genres you enjoy'}>
        {CHOICES.map(([genre, label]) => <button key={genre} type="button" disabled={!ready || taste.owner !== owner} aria-pressed={!!weights[genre]}
          onClick={() => recordWebTaste(uid, [genre], 'pick')}>{tr ? label : genre}</button>)}
      </div>}
      <div className={`scroll-row ${styles.row}`} role="region" aria-label={tr ? 'Sana önerilen oyunlar' : 'Recommended games'} tabIndex={0} aria-busy={loading}>
        {loading ? Array.from({ length: 6 }, (_, i) => <div className={styles.skeleton} key={i} />)
          : games.length ? games.map(game => <GameCard key={game.id} game={game} compact cardWidth={188} />)
            : <div className={styles.empty} role="status">
              <p>{tr ? 'Öneriler şu an yüklenemedi. Yeniden deneyebilirsin.' : 'Recommendations could not be loaded. Please try again.'}</p>
              <button type="button" onClick={() => setRevision(n => n + 1)}>{tr ? 'Tekrar dene' : 'Try again'}</button>
            </div>}
      </div>
    </section>
  );
}
