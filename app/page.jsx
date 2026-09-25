'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GameCard from './components/GameCard';
import GameImage from './components/GameImage';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';

export default function Home() {
  const { user } = useAuth();
  const router   = useRouter();
  const { t, lang } = useLanguage();

  // Arama
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);

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
    router.push(game.rawgSlug ? `/game/${game.rawgSlug}` : `/game/${game.id}`);
  };

  // Sinematik vitrin için dinamik fırsat oyunları havuzu
  const showcaseGames = useMemo(() => {
    const pool = (saleGames.length >= 4 ? saleGames : popularGames).filter(g => g && g.name);
    return pool.slice(0, 5);
  }, [saleGames, popularGames]);

  return (
    <div className="home-page">
      <section className="discovery-bar container" aria-labelledby="home-title">
        <div className="discovery-intro">
          <p className="eyebrow">{lang === 'tr' ? 'OYUNLAR · FIRSATLAR · TOPLULUK' : 'GAMES · DEALS · COMMUNITY'}</p>
          <h1 id="home-title">{lang === 'tr' ? 'Oynamaya değer.' : 'Worth playing.'}</h1>
          <p>{lang === 'tr' ? 'Sıradaki oyununu bul, fiyatları karşılaştır, deneyimini paylaş.' : 'Find your next game, compare prices, share your experience.'}</p>
        </div>
          <div className="discovery-search" ref={wrapperRef} style={{ width: '100%', maxWidth: 640, position: 'relative', margin: '0 auto' }}>
            <form onSubmit={handleSearch} role="search">
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
                <input aria-label={lang === 'tr' ? 'Oyun ara' : 'Search games'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSug(true); }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSug(false); }}
                  placeholder={lang === 'tr' ? 'Oyun adı ile ara…' : 'Search by game title…'}
                  autoComplete="off"
                  style={{
                    flex: 1, border: 'none', outline: 'none', fontSize: 17,
                    color: 'var(--text)', background: 'transparent', caretColor: 'var(--accent)',
                  }}
                />
                {query && (
                  <button aria-label={lang === 'tr' ? 'Aramayı temizle' : 'Clear search'} type="button" onClick={() => { setQuery(''); setSuggestions([]); setShowSug(false); }}
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
                  <button key={g.id} onClick={() => handleSugClick(g)}
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
                  <button onClick={handleSearch} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    "{query}" {t('hero.allResults')}
                  </button>
                </div>
              </div>
            )}
          </div>

      </section>
      <div className="container">
        <nav className="browse-links" aria-label={lang === 'tr' ? 'Oyun koleksiyonları' : 'Game collections'}>
          <span>{lang === 'tr' ? 'GÖZ AT' : 'BROWSE'}</span>
          {(lang === 'tr' ? ['Popüler oyunlar', 'İndirimler', 'Yeni çıkanlar', 'En yüksek puanlı'] : ['Popular games', 'Deals', 'New releases', 'Top rated']).map((label, i) => (
            <Link key={label} href={`/games?section=${['popular', 'sale', 'new', 'topscore'][i]}`}>{label}</Link>
          ))}
          <Link href="/discover" className="browse-discover">{lang === 'tr' ? 'Sana göre bir oyun' : 'Find your next favorite'} ↗</Link>
        </nav>
        <CinematicShowcase games={showcaseGames} loading={loadingPop || loadingSale} />
        <div className="home-shortcuts">
          <Link href="/games?section=sale"><span className="shortcut-index">01</span><span><strong>{lang === 'tr' ? 'Doğru oyuna, iyi fiyat.' : 'Great games. Better prices.'}</strong><small>{lang === 'tr' ? 'Mağazalardaki fırsatları karşılaştır' : 'Compare deals across stores'}</small></span><span aria-hidden="true">↗</span></Link>
          <Link href="/reviews"><span className="shortcut-index">02</span><span><strong>{lang === 'tr' ? 'Oyuncudan oyuncuya.' : 'From one player to another.'}</strong><small>{lang === 'tr' ? 'İncelemeleri oku, sohbete katıl' : 'Read reviews, join the conversation'}</small></span><span aria-hidden="true">↗</span></Link>
          <Link href={user ? '/library' : '/signup'}><span className="shortcut-index">03</span><span><strong>{lang === 'tr' ? 'Koleksiyonun burada.' : 'Your collection lives here.'}</strong><small>{lang === 'tr' ? 'Kütüphaneni tek yerden takip et' : 'Keep track of your game library'}</small></span><span aria-hidden="true">↗</span></Link>
        </div>
        {/* Bu Hafta Trend — Yayıncıların oynadığı popüler oyunlar */}
        <Section
          title={lang === 'tr' ? 'Bu Hafta Trend' : 'Trending This Week'}
          subtitle={lang === 'tr' ? 'Yayıncıların en çok oynadığı yapımlar' : 'Popular games played by streamers'}
          href="/games?section=popular"
          games={trendGames}
          loading={loadingTrend}
          badge={lang === 'tr' ? 'CANLI' : 'LIVE'}
          cardWidth={188}
        />

        {/* Yeni Çıkanlar */}
        <Section
          title={lang === 'tr' ? 'Yeni Çıkanlar' : 'New Releases'}
          subtitle={lang === 'tr' ? 'Taze çıkmış, denemeye değer' : 'Freshly released, worth a try'}
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
          cardWidth={188}
        />

        {/* İndirimdekiler */}
        <Section
          title={lang === 'tr' ? 'İndirimde' : 'On Sale'}
          subtitle={lang === 'tr' ? 'Şu an en iyi fırsatlar' : 'Best deals right now'}
          href="/games?section=sale"
          games={saleGames}
          loading={loadingSale}
          cardWidth={188}
        />

        {/* Haberler — oyunların altında ayrı bölme */}
        <HomeNews />

        {/* CTA */}
        <div className="library-invite" style={{
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

    </div>
  );
}

// ── Sürükleyerek kaydırma satırı ─────────────────────────────────────────────
function ScrollRow({ children, label }) {
  const rowRef = useRef(null);
  const drag   = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false, velX: 0, lastX: 0, lastT: 0 });
  const raf    = useRef(null);

  useEffect(() => {
    const el = rowRef.current;

    const onMove = e => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > 3) drag.current.moved = true;
      if (el) el.scrollLeft = drag.current.scrollLeft - dx;

      // Momentum için hız hesapla
      const now = Date.now();
      const dt = now - drag.current.lastT;
      if (dt > 0) {
        drag.current.velX = (e.clientX - drag.current.lastX) / dt;
      }
      drag.current.lastX = e.clientX;
      drag.current.lastT = now;
    };

    const onUp = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Momentum kaydırma
      let velocity = drag.current.velX * 12;
      const decel = () => {
        if (Math.abs(velocity) < 0.3 || !el) return;
        el.scrollLeft -= velocity;
        velocity *= 0.92;
        raf.current = requestAnimationFrame(decel);
      };
      decel();
    };

    const onAuxClick = e => {
      if (e.button === 1) { e.preventDefault(); }
    };
    const onMidDown = e => {
      if (e.button === 1) { e.preventDefault(); }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    if (el) {
      el.addEventListener('auxclick', onAuxClick);
      el.addEventListener('mousedown', onMidDown);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (el) {
        el.removeEventListener('auxclick', onAuxClick);
        el.removeEventListener('mousedown', onMidDown);
      }
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const onMouseDown = e => {
    // Sadece sol tıkla sürükleme (button 0)
    if (e.button !== 0) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    const el = rowRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false, velX: 0, lastX: e.clientX, lastT: Date.now() };
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
      role="region"
      aria-label={label}
      tabIndex={0}
      style={{ cursor: 'grab', scrollbarWidth: 'none' }}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}

// ── Yatay scroll bölüm ────────────────────────────────────────────────────────
const Section = memo(function Section({ title, subtitle, href, games, loading, badge, cardWidth }) {
  const { t, lang } = useLanguage();
  return (
    <section className="catalog-section">
      <div className="section-heading">
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
          {lang === 'tr' ? 'Tümünü gör →' : 'See all →'}
        </Link>
      </div>
      <ScrollRow label={title}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : games.length === 0
            ? <p style={{ color: 'var(--text-3)', fontSize: 14 }}>{t('section.failed')}</p>
            : games.map(g => <GameCard key={g.id} game={g} compact cardWidth={cardWidth} />)
        }
      </ScrollRow>
    </section>
  );
});

// ── Sinematik vitrin (oyun afişinden atmosfer) ───────────────────────────────
// ── Sinematik vitrin (oyun afişinden atmosfer) ───────────────────────────────
function CinematicShowcase({ games, loading }) {
  const { t, lang, formatPrice } = useLanguage();
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);

  const promoItem = useMemo(() => ({
    id: 'willsavor-promo',
    name: lang === 'tr' ? "Willsavor'dan bir kahve molası !" : "A coffee break from Willsavor !",
    isPromo: true,
    promoUrl: 'https://www.willsavor.com/',
    promoImage: '/willsavor_banner.jpg',
    promoLogo: '/willsavor_logo.jpg',
    promoSubtitle: lang === 'tr'
      ? 'Gamerisen üyelerine özel, GAMER10 koduyla yüzde 10 indirimi hemen kap.'
      : 'Special for Gamerisen members, grab 10% discount immediately with code GAMER10.',
    discount: 10,
    genres: ['WillSavor Coffee Co.']
  }), [lang]);

  const list = useMemo(() => {
    const raw = (games || []).filter(g => g && g.name && g.id !== 'willsavor-promo');
    // Reklamı ilk sıraya koyup oyun indirimlerini gizlemek yerine, 3. sıraya (index 2) yerleştiriyoruz.
    return [...raw.slice(0, 2), promoItem, ...raw.slice(2)].slice(0, 6);
  }, [games, promoItem]);

  useEffect(() => {
    if (list.length < 2 || interacting || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const iv = setInterval(() => setActive(a => (a + 1) % list.length), 6000);
    return () => clearInterval(iv);
  }, [list.length, active, interacting]); // Reset timer when active game changes manually

  if (loading && !games.length) return <div className="showcase-loading" role="status">{lang === 'tr' ? 'Oyun vitrini hazırlanıyor…' : 'Loading featured games…'}</div>;
  const g = list[active] || list[0];
  const href = g.isPromo ? g.promoUrl : (g.rawgSlug ? `/game/${g.rawgSlug}` : `/game/${g.id}`);
  return (
    <section className="game-showcase" aria-label={lang === 'tr' ? 'Öne çıkanlar' : 'Featured games'} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
      <div className="showcase-stage">
        {g.isPromo ? <img className="showcase-art" src={g.promoImage} alt="" /> : <GameImage key={g.id} game={g} alt="" fill isHero style={{ objectFit: 'cover' }} />}
        <div className="showcase-shade" />
        <div className="showcase-copy">
          <p className="showcase-kicker"><span />{g.isPromo ? 'SPONSOR' : (lang === 'tr' ? 'VİTRİNDE' : 'IN THE SPOTLIGHT')}</p>
          <h2>{g.name}</h2>
          <p className="showcase-description">{g.isPromo ? g.promoSubtitle : (g.genres || []).slice(0, 3).join(' / ')}</p>
          <div className="showcase-actions">
            <Link href={href} target={g.isPromo ? '_blank' : undefined} rel={g.isPromo ? 'noopener noreferrer' : undefined} className="btn btn-red">{g.isPromo ? (lang === 'tr' ? 'Fırsatı gör' : 'View offer') : (lang === 'tr' ? 'Oyunu incele' : 'Explore game')} ↗</Link>
            {!g.isPromo && g.price != null && <span className="showcase-price">{g.discount > 0 && <del>{formatPrice(g.original)}</del>}<strong>{g.isFree ? t('card.free') : formatPrice(g.price)}</strong>{g.discount > 0 && <em>−{g.discount}%</em>}</span>}
          </div>
        </div>
      </div>
      <div className="showcase-list">
        <p className="showcase-list-title">{lang === 'tr' ? 'ÖNE ÇIKANLAR' : 'FEATURED'}<span>{list.length}</span></p>
        {list.map((it, i) => <button key={it.id} className={`showcase-item ${i === active ? 'is-selected' : ''}`} onClick={() => setActive(i)} aria-pressed={i === active}>
          <span className="showcase-item-art">{it.isPromo ? <img src={it.promoImage} alt="" /> : <GameImage game={it} alt="" fill style={{ objectFit: 'cover' }} />}</span>
          <span className="showcase-item-info"><strong>{it.name}</strong><small>{it.isPromo ? 'Sponsor' : it.discount > 0 ? (lang === 'tr' ? `%${it.discount} indirim` : `${it.discount}% off`) : (it.genres || []).slice(0, 1).join('')}</small></span>
          <span className="showcase-item-arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
    </section>
  );
}

// ── Anasayfa haber bölmesi ───────────────────────────────────────────────────
function HomeNews() {
  const { t, lang } = useLanguage();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news?lang=${lang}`)
      .then(r => r.json())
      .then(d => {
        if (d.results && Array.isArray(d.results)) {
          setNewsList(d.results.slice(0, 4));
        } else {
          setNewsList([]);
        }
      })
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, [lang]);

  return (
    <div style={{ marginTop: 8, marginBottom: 48, paddingTop: 34, borderTop: '1px solid var(--border)' }}>
      <div className="section-heading">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
            {lang === 'tr' ? 'Oyun Haberleri' : 'Gaming News'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 4 }}>
            {lang === 'tr' ? 'İndirimler, çıkışlar ve sektörden son gelişmeler' : 'Sales, releases and the latest from the industry'}
          </p>
        </div>
        <Link href="/news" style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {lang === 'tr' ? 'Tümünü gör →' : 'See all →'}
        </Link>
      </div>
      <div className="home-news-grid">
        {loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="news-skeleton" aria-hidden="true" />)}
        {!loading && !newsList.length && <p className="news-empty">{lang === 'tr' ? 'Haberler şu anda yüklenemedi. Tüm haberler sayfasını ziyaret edebilirsin.' : 'News is currently unavailable. You can visit the news page.'}</p>}
        {newsList.map((n, i) => (
          <a key={i} href={n.url || "/news"} target={n.url ? "_blank" : "_self"} rel="noopener noreferrer" className="news-card" style={{ borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s', display: 'block' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
            <div style={{ position: 'relative', height: 148, background: n.art, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
              {n.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={n.image} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,7,9,0.6), transparent 60%)', zIndex: 1 }} />
              <span style={{ position: 'absolute', left: 13, top: 13, padding: '4px 11px', borderRadius: 999, background: 'rgba(8,10,14,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.16)', fontSize: 11, fontWeight: 700, color: '#fff', zIndex: 2 }}>{n.cat || 'Haberler'}</span>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 7 }}>{n.date} {n.source ? `• ${n.source}` : ''}</p>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.3px', color: 'var(--text)', textWrap: 'balance' }}>{n.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      flexShrink: 0, width: 188, borderRadius: 8,
      background: 'var(--bg-card)', border: '1.5px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ aspectRatio: '3 / 4', background: 'var(--bg-input)' }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ height: 14, background: 'var(--border)', borderRadius: 4, marginBottom: 9 }} />
        <div style={{ height: 12, background: 'var(--bg-input)', borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}
