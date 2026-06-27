'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GameCard from './components/GameCard';
import GameImage from './components/GameImage';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { FALLBACK_GAMES } from './lib/fallback-games';

const PLACEHOLDER_GAMES = [
  'Elden Ring', 'GTA V', 'Cyberpunk 2077', 'Red Dead Redemption 2',
  'The Witcher 3', "Baldur's Gate 3", 'God of War', 'Hollow Knight',
];

// Anasayfa haber özeti (tam liste /news sayfasında)
const HOME_NEWS = [
  { cat: 'İndirimler', date: '27 Haz 2026', art: 'linear-gradient(145deg,#6b4f1d 0%,#b8860b 55%,#1c1407 100%)', title: 'Steam Yaz İndirimleri başladı: 13.000+ oyunda dev fırsatlar' },
  { cat: 'Çıkışlar', date: '26 Haz 2026', art: 'linear-gradient(145deg,#0d2b4a 0%,#1f8a8f 65%,#06121f 100%)', title: 'Hollow Knight: Silksong için çıkış tarihi nihayet doğrulandı' },
  { cat: 'Güncellemeler', date: '24 Haz 2026', art: 'linear-gradient(145deg,#0f5e63 0%,#c0286b 60%,#1a0a24 100%)', title: 'Cyberpunk 2077’ye sürpriz 2.3 yaması: yeni araçlar ve foto modu' },
  { cat: 'Endüstri', date: '22 Haz 2026', art: 'linear-gradient(145deg,#6b1a1a 0%,#3a4654 70%,#160a0a 100%)', title: 'FromSoftware yeni IP’sini duyurdu: George R. R. Martin yine sahnede' },
];

export default function Home() {
  const { user } = useAuth();
  const router   = useRouter();
  const { t } = useLanguage();

  // Arama
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);

  // Typewriter placeholder
  const [phIndex, setPhIndex] = useState(0);
  const [phText,  setPhText]  = useState('');
  const [phPhase, setPhPhase] = useState('typing');

  // Bölüm verileri
  const [trendGames,   setTrendGames]   = useState([]);
  const [popularGames, setPopularGames] = useState([]); // hero arka plan için
  const [newGames,     setNewGames]     = useState([]);
  const [saleGames,    setSaleGames]    = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingPop,   setLoadingPop]   = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingSale,  setLoadingSale]  = useState(true);

  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  const fetchSection = useCallback(async (section, setter, loadingSetter, num = 16) => {
    loadingSetter(true);
    try {
      const res  = await fetch(`/api/games?section=${section}&num=${num}&rotate=true`);
      const data = await res.json();
      setter(data.results || []);
    } catch {}
    finally { loadingSetter(false); }
  }, []);

  // Gerçek zamanlı trending verisi (SteamSpy + RAWG)
  useEffect(() => {
    setLoadingTrend(true);
    fetch('/api/trending')
      .then(r => r.json())
      .then(d => setTrendGames(d.results || []))
      .catch(() => {})
      .finally(() => setLoadingTrend(false));
  }, []);

  useEffect(() => {
    fetchSection('popular',  setPopularGames, setLoadingPop);
    fetchSection('new',      setNewGames,     setLoadingNew);
    fetchSection('sale',     setSaleGames,    setLoadingSale);
  }, [fetchSection]);

  // ── Typewriter animasyonu ────────────────────────────────────────────────
  useEffect(() => {
    const target = PLACEHOLDER_GAMES[phIndex];
    let t;
    if (phPhase === 'typing') {
      if (phText.length < target.length) {
        t = setTimeout(() => setPhText(target.slice(0, phText.length + 1)), 70);
      } else {
        t = setTimeout(() => setPhPhase('pause'), 1800);
      }
    } else if (phPhase === 'pause') {
      t = setTimeout(() => setPhPhase('erasing'), 400);
    } else {
      if (phText.length > 0) {
        t = setTimeout(() => setPhText(phText.slice(0, -1)), 35);
      } else {
        setPhIndex(i => (i + 1) % PLACEHOLDER_GAMES.length);
        setPhPhase('typing');
      }
    }
    return () => clearTimeout(t);
  }, [phText, phPhase, phIndex]);

  // ── Autocomplete ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res  = await fetch(`/api/games?q=${encodeURIComponent(q)}&num=6`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSug(true);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const fn = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = e => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSug(false);
    router.push(`/games?q=${encodeURIComponent(q)}`);
  };

  const handleSugClick = game => {
    setShowSug(false);
    router.push(game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`);
  };

  // Hero arka plan: trending + popular karışık, her açılışta farklı sıra (tekilleştirilmiş)
  const heroPool = useMemo(() => {
    const combined = [...trendGames, ...popularGames];
    const cleaned = combined.filter(g => g && g.name);
    const uniqueMap = new Map();

    const addGameToMap = (game) => {
      const nameKey = game.name
        .toLowerCase()
        .replace(/&amp;/g, 'and')
        .replace(/[™®©]/g, '')
        .trim()
        .replace(/[^a-z0-9]/g, '');

      const existing = uniqueMap.get(nameKey);
      if (existing) {
        // Eğer aynı isimde oyun varsa, görseli olan/daha zengin olanı tercih et
        const existingHasImg = existing.image && !existing.image.includes('placeholder') && !existing.image.includes('capsule') && !existing.image.includes('logo');
        const currentHasImg = game.image && !game.image.includes('placeholder') && !game.image.includes('capsule') && !game.image.includes('logo');
        if (!existingHasImg && currentHasImg) {
          uniqueMap.set(nameKey, game);
        }
      } else {
        uniqueMap.set(nameKey, game);
      }
    };

    // Önce API'den gelen güncel oyunları ekle
    for (const game of cleaned) {
      addGameToMap(game);
    }

    // Eğer tekil oyun sayısı 24'ten az ise, yerel yüksek kaliteli fallback oyun listesiyle doldur
    if (uniqueMap.size < 24) {
      const fallbacks = FALLBACK_GAMES || [];
      for (const game of fallbacks) {
        if (uniqueMap.size >= 24) break;
        addGameToMap(game);
      }
    }

    const arr = Array.from(uniqueMap.values());
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [trendGames, popularGames]);

  const PANELS = 24;
  const heroTiles = useMemo(
    () => heroPool
      ? Array.from({ length: PANELS }, (_, i) => heroPool[i % heroPool.length])
      : null,
    [heroPool]
  );

  // Kayan kapak şeridi — yalnızca heroTiles değişince yeniden oluşur,
  // typewriter/arama state güncellemelerinde ~38 Image yeniden render edilmez
  const heroStrip = useMemo(() => {
    if (!heroTiles) return null;
    return (
      <div style={{ marginTop: 54, WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)' }}>
        <div className="hero-strip" style={{ display: 'flex', gap: 16, width: 'max-content', padding: '6px 0 12px' }}>
          {[...heroTiles, ...heroTiles].map((g, i) => (
            <Link key={i} href={g.rawgSlug ? `/game/rawg/${g.rawgSlug}` : `/game/rawg/${g.id}`}
              style={{ width: 280, aspectRatio: '16 / 9', borderRadius: 16, position: 'relative', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-input)', boxShadow: '0 10px 28px rgba(74,52,28,0.16)' }}>
              <GameImage game={g} alt="" fill style={{ objectFit: 'cover' }} isVertical={false} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 13, background: 'linear-gradient(to top, rgba(8,8,16,0.62), transparent 58%)' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{g.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }, [heroTiles]);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ══ HERO: arama ══ */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '52px 0 12px', background: 'var(--hero-bg)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', boxShadow: 'var(--shadow)', marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px rgba(47,158,107,0.2)' }} /> {t('hero.badge')}
          </span>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px, 4.4vw, 54px)', lineHeight: 1.04, letterSpacing: '-1.5px', color: 'var(--text)', marginBottom: 16, textWrap: 'balance' }}>
            {t('hero.title')}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.55 }}>
            {t('hero.subtitle')}
          </p>

          <div ref={wrapperRef} style={{ width: '100%', maxWidth: 640, position: 'relative', margin: '0 auto' }}>
            <form onSubmit={handleSearch}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-hover)',
                borderRadius: 16, height: 66, padding: '0 8px 0 22px',
                boxShadow: '0 12px 40px rgba(74,52,28,0.10)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSug(true); }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSug(false); }}
                  placeholder={query ? '' : (phText ? phText + '▍' : t('hero.searchPlaceholder'))}
                  autoComplete="off"
                  style={{
                    flex: 1, border: 'none', outline: 'none', fontSize: 17,
                    color: 'var(--text)', background: 'transparent', caretColor: 'var(--accent)',
                  }}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>
                    ×
                  </button>
                )}
                <button type="submit" style={{
                  flexShrink: 0, height: 50, padding: '0 26px', borderRadius: 11,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {t('hero.search')}
                </button>
              </div>
            </form>

            {/* Autocomplete */}
            {showSug && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16, overflow: 'hidden', zIndex: 100,
                boxShadow: 'var(--shadow-lg)',
                textAlign: 'left',
              }}>
                {sugLoading ? (
                  <div style={{ padding: '14px 20px', color: 'var(--text-3)', fontSize: 13 }}>{t('hero.searching')}</div>
                ) : suggestions.map(g => (
                  <button key={g.id} onMouseDown={() => handleSugClick(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {g.image
                      ? <img src={g.image} alt="" style={{ width: 50, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      : <div style={{ width: 50, height: 32, borderRadius: 6, background: 'var(--bg-input)', flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        {(g.genres || []).slice(0, 2).join(' • ')}
                        {g.metacritic ? ` • ⭐ ${g.metacritic}` : ''}
                      </p>
                    </div>
                    {g.isFree && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>{t('card.free')}</span>}
                  </button>
                ))}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                  <button onMouseDown={handleSearch} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    "{query}" {t('hero.allResults')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hızlı linkler */}
          <div style={{
            display: 'flex', gap: 9, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center',
            opacity: query ? 0 : 1,
            pointerEvents: query ? 'none' : 'auto',
            transition: 'opacity 0.25s ease',
          }}>
            {[t('hero.quick.popular'), t('hero.quick.sale'), t('hero.quick.new'), t('hero.quick.best')].map((label, i) => {
              const sections = ['popular', 'sale', 'new', 'topscore'];
              return (
                <Link key={label} href={`/games?section=${sections[i]}`}
                  style={{
                    padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    background: 'var(--bg-card)',
                    color: 'var(--text-2)', border: '1px solid var(--border)',
                    boxShadow: '0 1px 4px rgba(74,52,28,0.04)',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Kapak şeridi kaldırıldı — sayfa doğrudan sinematik vitrinle başlıyor (prototip düzeni) */}
      </section>

      {/* ══ İÇERİK BÖLÜMLERİ ══════════════════════════════════════════════════ */}
      <div className="container" style={{ paddingTop: 48 }}>

        {/* Sinematik vitrin */}
        <CinematicShowcase games={(trendGames.length ? trendGames : popularGames).slice(0, 6)} />

        {/* Bu Hafta Trend — Yayıncıların oynadığı popüler oyunlar */}
        <Section
          title={t('section.trending.title')}
          subtitle={t('section.trending.subtitle')}
          href="/games?section=popular"
          games={trendGames}
          loading={loadingTrend}
          badge={t('section.trending.badge')}
        />

        {/* Yeni Çıkanlar */}
        <Section
          title={t('section.new.title')}
          subtitle={t('section.new.subtitle')}
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
        />

        {/* İndirimdekiler */}
        <Section
          title={t('section.sale.title')}
          subtitle={t('section.sale.subtitle')}
          href="/games?section=sale"
          games={saleGames}
          loading={loadingSale}
        />

        {/* Haberler — oyunların altında ayrı bölme */}
        <HomeNews />

        {/* CTA */}
        <div style={{
          marginTop: 16, marginBottom: 8,
          background: 'var(--cta-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: 16, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {t('cta.badge')}
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {t('cta.title')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {t('cta.desc')}
            </p>
          </div>
          <Link href={user ? '/library' : '/signup'} className="btn btn-red" style={{ whiteSpace: 'nowrap', padding: '12px 24px' }}>
            {user ? t('cta.open') : t('cta.start')}
          </Link>
        </div>
      </div>

      <style>{`
        /* Glow animasyonlu başlık */
        .hero-glow-title {
          font-size: clamp(32px, 6vw, 58px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -1px;
          margin-bottom: 32px;
          text-align: center;
          animation: glow-pulse 3s ease-in-out infinite;
          text-shadow:
            0 0 20px rgba(255,255,255,0.4),
            0 0 60px rgba(232,68,46,0.3),
            0 2px 8px rgba(0,0,0,0.8);
        }
        @keyframes glow-pulse {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(255,255,255,0.4),
              0 0 60px rgba(232,68,46,0.3),
              0 2px 8px rgba(0,0,0,0.8);
          }
          50% {
            text-shadow:
              0 0 30px rgba(255,255,255,0.7),
              0 0 90px rgba(232,68,46,0.6),
              0 0 120px rgba(200,48,30,0.3),
              0 2px 8px rgba(0,0,0,0.8);
          }
        }

        /* Arama çubuğu küçükten büyüme animasyonu */
        .search-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes scale-in {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        /* Cursor blink */
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Canlı badge */
        @keyframes pulse-badge {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }

        /* Kapak şeridi kayma */
        .hero-strip {
          animation: hero-strip-scroll 48s linear infinite;
          will-change: transform;
        }
        @keyframes hero-strip-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-7104px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-strip { animation: none; }
        }
        @media (max-width: 860px) {
          .showcase-grid { grid-template-columns: 1fr !important; }
          .showcase-thumbs { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sürükleyerek kaydırma satırı ─────────────────────────────────────────────
function ScrollRow({ children }) {
  const rowRef = useRef(null);
  const drag   = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  useEffect(() => {
    const el = rowRef.current;

    const onMove = e => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 3) drag.current.moved = true;
      if (el) el.scrollLeft = drag.current.scrollLeft - dx;
    };

    const onUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const onWheel = e => {
      if (!el) return;
      const dy = e.deltaY;
      const dx = e.deltaX;

      // Sadece dikey tekerlek hareketinde yatay kaydırma yap (trackpad yatay kaydırmasını engelleme)
      if (Math.abs(dy) > Math.abs(dx)) {
        const isScrollingLeft = dy < 0;
        const canScrollLeft = el.scrollLeft > 0;
        const canScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth - 2);

        // Satırın en başına veya en sonuna gelinmemişse dikey sayfa kaydırmasını engelle, satırı kaydır
        if ((isScrollingLeft && canScrollLeft) || (!isScrollingLeft && canScrollRight)) {
          e.preventDefault();
          el.scrollLeft += dy;
        }
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    if (el) el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (el) el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const onMouseDown = e => {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const onClickCapture = e => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      ref={rowRef}
      className="scroll-row"
      style={{ cursor: 'grab', scrollbarWidth: 'none' }}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}

// ── Yatay scroll bölüm ────────────────────────────────────────────────────────
const Section = memo(function Section({ title, subtitle, href, games, loading, badge }) {
  const { t } = useLanguage();
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                background: 'rgba(220,60,60,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(220,60,60,0.3)',
                letterSpacing: '0.05em', animation: 'pulse-badge 2s ease-in-out infinite',
              }}>
                ● {badge}
              </span>
            )}
          </div>
          {subtitle && <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 4 }}>{subtitle}</p>}
        </div>
        <Link href={href} style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {t('section.all')}
        </Link>
      </div>
      <ScrollRow>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : games.length === 0
            ? <p style={{ color: 'var(--text-3)', fontSize: 14 }}>{t('section.failed')}</p>
            : games.map(g => <GameCard key={g.id} game={g} compact />)
        }
      </ScrollRow>
    </div>
  );
});

// ── Sinematik vitrin (oyun afişinden atmosfer) ───────────────────────────────
function CinematicShowcase({ games }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const list = (games || []).filter(g => g && g.name).slice(0, 6);

  useEffect(() => {
    if (list.length < 2) return;
    const iv = setInterval(() => setActive(a => (a + 1) % list.length), 6000);
    return () => clearInterval(iv);
  }, [list.length]);

  if (list.length === 0) {
    return <div style={{ height: 454, borderRadius: 26, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 40 }} />;
  }

  const g = list[active] || list[0];
  const href = g.rawgSlug ? `/game/rawg/${g.rawgSlug}` : `/game/rawg/${g.id}`;
  const mcColor = g.metacritic >= 80 ? '#4ade80' : g.metacritic >= 60 ? '#fbbf24' : '#f87171';

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 226px', gap: 18, alignItems: 'stretch', marginBottom: 44 }} className="showcase-grid">
      {/* Ana sahne */}
      <Link href={href} style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', minHeight: 454, boxShadow: '0 40px 90px -36px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
        <GameImage key={g.id} game={g} alt={g.name} fill style={{ objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(6,7,9,0.94) 8%, rgba(6,7,9,0.6) 42%, rgba(6,7,9,0.12) 78%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,7,9,0.85), transparent 46%)' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, padding: '40px 44px', maxWidth: 620 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, background: 'color-mix(in srgb, var(--accent) 26%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', marginBottom: 16 }}>✦ {t('section.trending.badge') || 'ÖNE ÇIKAN'}</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(30px,4vw,52px)', lineHeight: 1.02, letterSpacing: '-1.4px', color: '#fff', marginBottom: 14, textWrap: 'balance' }}>{g.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {g.metacritic ? <span style={{ fontSize: 12.5, fontWeight: 800, padding: '4px 9px', borderRadius: 8, background: 'rgba(8,10,14,0.6)', border: '1px solid rgba(255,255,255,0.14)', color: mcColor }}>{g.metacritic} Metacritic</span> : null}
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{(g.genres || []).slice(0, 3).join(' · ')}</span>
          </div>
          <span className="btn btn-red" style={{ padding: '13px 26px', fontSize: 15 }}>{t('section.all') || 'İncele'} →</span>
        </div>
      </Link>
      {/* Dikey küçük resimler */}
      <div className="showcase-thumbs" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((it, i) => {
          const on = i === active;
          return (
            <button key={it.id} onClick={() => setActive(i)} style={{ position: 'relative', flex: 1, minHeight: 0, border: 'none', padding: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-input)', opacity: on ? 1 : 0.62, boxShadow: on ? '0 14px 30px -12px var(--accent-glow)' : '0 8px 18px -12px rgba(0,0,0,0.6)', transition: 'opacity 0.25s, box-shadow 0.25s, transform 0.25s', outline: on ? '2px solid var(--accent)' : 'none', outlineOffset: -2 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <GameImage game={it} alt="" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,7,9,0.85), transparent 60%)' }} />
              <span style={{ position: 'absolute', left: 12, right: 12, bottom: 10, fontSize: 12.5, fontWeight: 700, lineHeight: 1.15, color: '#fff', textAlign: 'left', textShadow: '0 1px 5px rgba(0,0,0,0.6)' }}>{it.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Anasayfa haber bölmesi ───────────────────────────────────────────────────
function HomeNews() {
  const { t } = useLanguage();
  return (
    <div style={{ marginTop: 8, marginBottom: 48, paddingTop: 34, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{t('nav.news') || 'Oyun Haberleri'}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 4 }}>İndirimler, çıkışlar ve sektörden son gelişmeler</p>
        </div>
        <Link href="/news" style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('section.all') || 'Tümünü gör'} →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20 }}>
        {HOME_NEWS.map((n, i) => (
          <Link key={i} href="/news" className="gr-glass" style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s', display: 'block' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
            <div style={{ position: 'relative', height: 148, background: n.art }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,7,9,0.6), transparent 60%)' }} />
              <span style={{ position: 'absolute', left: 13, top: 13, padding: '4px 11px', borderRadius: 999, background: 'rgba(8,10,14,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.16)', fontSize: 11, fontWeight: 700, color: '#fff' }}>{n.cat}</span>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 7 }}>{n.date}</p>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.3px', color: 'var(--text)', textWrap: 'balance' }}>{n.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      flexShrink: 0, width: 232, borderRadius: 12,
      background: 'var(--bg-card)', border: '1.5px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ height: 130, background: 'var(--bg-input)' }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ height: 14, background: 'var(--border)', borderRadius: 4, marginBottom: 9 }} />
        <div style={{ height: 12, background: 'var(--bg-input)', borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}
