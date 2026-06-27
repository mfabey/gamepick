'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const CATS_TR = ['Tümü', 'İndirimler', 'Çıkışlar', 'Güncellemeler', 'Endüstri', 'İncelemeler'];
const CATS_EN = ['All', 'Sales', 'Releases', 'Updates', 'Industry', 'Reviews'];

export default function NewsPage() {
  const { lang, t } = useLanguage();
  const [cat, setCat] = useState(lang === 'tr' ? 'Tümü' : 'All');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const CATS = lang === 'tr' ? CATS_TR : CATS_EN;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/news?lang=${lang}`)
      .then(r => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.json();
      })
      .then(data => {
        setNews(data.results || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [lang]);

  // Reset category when language changes
  useEffect(() => {
    setCat(lang === 'tr' ? 'Tümü' : 'All');
  }, [lang]);

  const allCat = lang === 'tr' ? 'Tümü' : 'All';
  const filtered = cat === allCat ? news : news.filter(n => n.cat === cat);
  const featured = filtered.find(n => n.featured) || filtered[0] || null;
  const rest = filtered.filter(n => n !== featured);

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '58px 0 28px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 36px' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
            ● {lang === 'tr' ? 'Güncel · Oyun Dünyası' : 'Latest · Gaming World'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(36px,4.6vw,56px)', lineHeight: 1.04, letterSpacing: '-1.5px', color: 'var(--text)', marginBottom: 14 }}>
            {lang === 'tr' ? 'Oyun Haberleri' : 'Gaming News'}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, marginBottom: 26 }}>
            {lang === 'tr'
              ? 'İndirimler, çıkış tarihleri ve sektörden son gelişmeler — hepsi tek akışta, abartısız ve hızlı.'
              : 'Sales, release dates and the latest from the industry — all in one feed, no fluff.'}
          </p>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {CATS.map(c => {
              const active = c === cat;
              return (
                <button key={c} onClick={() => setCat(c)} style={{
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

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '34px 36px 0' }}>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(322px,1fr))', gap: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                borderRadius: 18, overflow: 'hidden',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
              }}>
                <div style={{ height: 166, background: 'var(--bg-input)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: '18px 20px 20px' }}>
                  <div style={{ height: 12, width: '40%', background: 'var(--bg-input)', borderRadius: 6, marginBottom: 10, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 16, width: '90%', background: 'var(--bg-input)', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 12, width: '70%', background: 'var(--bg-input)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
              {lang === 'tr' ? 'Haberler yüklenemedi' : 'Failed to load news'}
            </p>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              {lang === 'tr' ? 'Bir sorun oluştu, lütfen tekrar dene.' : 'Something went wrong, please try again.'}
            </p>
            <button
              onClick={() => { setLoading(true); setError(false); fetch(`/api/news?lang=${lang}`).then(r => r.json()).then(data => { setNews(data.results || []); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }}
              style={{
                padding: '10px 22px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              {lang === 'tr' ? 'Tekrar Dene' : 'Retry'}
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <>
            {/* ── Öne çıkan ── */}
            {featured && (
              <article style={{ display: 'grid', gridTemplateColumns: '1.08fr 1fr', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden', background: 'var(--bg-card)', marginBottom: 38, boxShadow: 'var(--shadow-lg)', cursor: 'pointer' }}
                onClick={() => featured.url && window.open(featured.url, '_blank')}
              >
                <div style={{ position: 'relative', minHeight: 312, background: featured.art, overflow: 'hidden' }}>
                  {featured.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={featured.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                  )}
                  <span style={{ position: 'absolute', right: -12, bottom: -34, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 230, lineHeight: 1, color: 'rgba(255,255,255,0.15)', userSelect: 'none' }}>{featured.mono}</span>
                  <span style={{ position: 'absolute', left: 20, top: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>
                    ✦ {lang === 'tr' ? 'ÖNE ÇIKAN' : 'FEATURED'}
                  </span>
                  {featured.source && (
                    <span style={{ position: 'absolute', left: 20, bottom: 16, padding: '5px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
                      {featured.source}
                    </span>
                  )}
                </div>
                <div style={{ padding: '40px 42px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
                    <span style={{ padding: '4px 11px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>{featured.cat}</span>
                    <span>{featured.date}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} /><span>{featured.read} {lang === 'tr' ? 'okuma' : 'read'}</span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(24px,2.5vw,32px)', lineHeight: 1.16, letterSpacing: '-0.8px', color: 'var(--text)', marginBottom: 14, textWrap: 'balance' }}>{featured.title}</h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-2)', marginBottom: 24 }}>{featured.excerpt}</p>
                  <span className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                    {lang === 'tr' ? 'Haberi oku →' : 'Read article →'}
                  </span>
                </div>
              </article>
            )}

            {/* ── Haber ızgarası ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(322px,1fr))', gap: 24 }}>
              {rest.map(n => (
                <article key={n.id} className="card" style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                  onClick={() => n.url && window.open(n.url, '_blank')}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 34px rgba(74,52,28,0.13)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'relative', height: 166, background: n.art, overflow: 'hidden' }}>
                    {n.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={n.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                    )}
                    <span style={{ position: 'absolute', right: -8, bottom: -24, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 128, lineHeight: 1, color: 'rgba(255,255,255,0.16)', userSelect: 'none' }}>{n.mono}</span>
                    <span style={{ position: 'absolute', left: 14, top: 14, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.94)', color: '#241d14', fontSize: 11.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{n.cat}</span>
                    {n.source && (
                      <span style={{ position: 'absolute', right: 14, top: 14, padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10.5, fontWeight: 600 }}>
                        {n.source}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '18px 20px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>
                      <span>{n.date}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} /><span>{n.read} {lang === 'tr' ? 'okuma' : 'read'}</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18.5, lineHeight: 1.25, letterSpacing: '-0.4px', color: 'var(--text)', marginBottom: 9, textWrap: 'pretty' }}>{n.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', marginBottom: 14 }}>{n.excerpt}</p>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>
                      {lang === 'tr' ? 'Devamını oku →' : 'Read more →'}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Bu kategoride henüz haber yok' : 'No news in this category yet'}
                </p>
                <p style={{ fontSize: 14 }}>
                  {lang === 'tr' ? 'Başka bir kategoriye göz at' : 'Try another category'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
