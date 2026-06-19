'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function NewsPage() {
  const { lang } = useLanguage();
  
  const CATS = lang === 'tr'
    ? ['Tümü', 'İndirimler', 'Çıkışlar', 'Güncellemeler', 'Endüstri', 'İncelemeler']
    : ['All', 'Sales', 'Releases', 'Updates', 'Industry', 'Reviews'];

  const [catIdx, setCatIdx]   = useState(0);
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/news?lang=' + lang)
      .then(r => r.json())
      .then(d => { if (alive) { setNews(d.results || []); setError(!(d.results || []).length); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [lang]);

  const activeCat = CATS[catIdx];
  const filtered = catIdx === 0 ? news : news.filter(n => n.cat === activeCat);
  const featured = filtered.find(n => n.featured) || filtered[0] || null;
  const rest = filtered.filter(n => n !== featured);

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '58px 0 28px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="news-hero-container">
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
            {lang === 'tr' ? '● Güncel · Oyun Dünyası' : '● Live · Gaming World'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(36px,4.6vw,56px)', lineHeight: 1.04, letterSpacing: '-1.5px', color: 'var(--text)', marginBottom: 14 }}>
            {lang === 'tr' ? 'Oyun Haberleri' : 'Gaming News'}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, marginBottom: 26 }}>
            {lang === 'tr'
              ? 'İndirimler, çıkış tarihleri ve sektörden son gelişmeler — büyük oyun kaynaklarından canlı akış.'
              : 'Sales, release dates, and latest industry developments — live feed from major gaming sources.'}
          </p>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {CATS.map((c, i) => {
              const active = i === catIdx;
              return (
                <button key={c} onClick={() => setCatIdx(i)} style={{
                  display: 'inline-flex', alignItems: 'center', padding: '9px 17px', borderRadius: 999,
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border-hover)',
                  background: active ? 'var(--accent)' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-2)',
                  fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                  boxShadow: active ? '0 6px 16px var(--accent-glow)' : 'none',
                  transition: 'all 0.15s',
                }}>{c}</button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="news-main-container">

        {/* ── Yükleniyor ── */}
        {loading ? (
          <NewsSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 40, marginBottom: 14 }}>📰</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
              {lang === 'tr' ? 'Haberler şu an yüklenemedi' : 'Failed to load news'}
            </p>
            <p style={{ fontSize: 14 }}>
              {lang === 'tr' ? 'Birazdan tekrar dene' : 'Please try again later'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Öne çıkan ── */}
            {featured && (
              <a href={featured.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <article className="news-featured-card">
                  <div style={{ position: 'relative', minHeight: 312, background: featured.art, overflow: 'hidden' }}>
                    {featured.image
                      ? <img src={featured.image} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ position: 'absolute', right: -12, bottom: -34, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 230, lineHeight: 1, color: 'rgba(255,255,255,0.15)', userSelect: 'none' }}>{featured.mono}</span>}
                    <span style={{ position: 'absolute', left: 20, top: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>
                      {lang === 'tr' ? '✦ ÖNE ÇIKAN' : '✦ FEATURED'}
                    </span>
                  </div>
                  <div className="news-featured-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-3)', marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 11px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>{featured.cat}</span>
                      {featured.source && <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{featured.source}</span>}
                      <span>{featured.date}</span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(24px,2.5vw,32px)', lineHeight: 1.16, letterSpacing: '-0.8px', color: 'var(--text)', marginBottom: 14, textWrap: 'balance' }}>{featured.title}</h2>
                    {featured.excerpt && <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-2)', marginBottom: 24 }}>{featured.excerpt}</p>}
                    <span className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                      {lang === 'tr' ? 'Haberi oku →' : 'Read article →'}
                    </span>
                  </div>
                </article>
              </a>
            )}

            {/* ── Haber ızgarası ── */}
            <div className="news-grid">
              {rest.map(n => (
                <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <article className="card" style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', height: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 34px rgba(74,52,28,0.13)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ position: 'relative', height: 166, background: n.art, overflow: 'hidden' }}>
                      {n.image
                        ? <img src={n.image} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ position: 'absolute', right: -8, bottom: -24, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 128, lineHeight: 1, color: 'rgba(255,255,255,0.16)', userSelect: 'none' }}>{n.mono}</span>}
                      <span style={{ position: 'absolute', left: 14, top: 14, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.94)', color: '#241d14', fontSize: 11.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{n.cat}</span>
                    </div>
                    <div style={{ padding: '18px 20px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>
                        {n.source && <><span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{n.source}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} /></>}
                        <span>{n.date}</span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18.5, lineHeight: 1.25, letterSpacing: '-0.4px', color: 'var(--text)', marginBottom: 9, textWrap: 'pretty' }}>{n.title}</h3>
                      {n.excerpt && <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.excerpt}</p>}
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>
                        {lang === 'tr' ? 'Devamını oku →' : 'Read more →'}
                      </span>
                    </div>
                  </article>
                </a>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Bu kategoride henüz haber yok' : 'No news in this category yet'}
                </p>
                <p style={{ fontSize: 14 }}>
                  {lang === 'tr' ? 'Başka bir kategoriye göz at' : 'Browse another category'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <>
      <div className="news-featured-card" style={{ borderStyle: 'solid' }}>
        <div style={{ minHeight: 312, background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div className="news-featured-content">
          <div style={{ height: 20, width: 120, background: 'var(--bg-input)', borderRadius: 6, marginBottom: 18 }} />
          <div style={{ height: 28, background: 'var(--bg-input)', borderRadius: 6, marginBottom: 10 }} />
          <div style={{ height: 28, width: '70%', background: 'var(--bg-input)', borderRadius: 6, marginBottom: 22 }} />
          <div style={{ height: 14, background: 'var(--bg-input)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: '85%', background: 'var(--bg-input)', borderRadius: 4 }} />
        </div>
      </div>
      <div className="news-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ height: 166, background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ padding: '18px 20px 20px' }}>
              <div style={{ height: 12, width: 100, background: 'var(--bg-input)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 18, background: 'var(--bg-input)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 18, width: '60%', background: 'var(--bg-input)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </>
  );
}
