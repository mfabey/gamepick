'use client';

import { useState } from 'react';

const NEWS = [
  { id: 'n1', cat: 'İndirimler', featured: true, mono: 'S', date: '27 Haz 2026', read: '4 dk', art: 'linear-gradient(145deg,#6b4f1d 0%,#b8860b 55%,#1c1407 100%)', title: 'Steam Yaz İndirimleri başladı: 13.000+ oyunda dev fırsatlar', excerpt: 'Elden Ring, Baldur’s Gate 3 ve Cyberpunk 2077 dahil binlerce yapım tarihinin en düşük fiyatında. İndirimler 9 Temmuz’a kadar sürüyor — fiyat alarmların şimdiden çalışmaya başladı.' },
  { id: 'n2', cat: 'Çıkışlar', mono: 'S', date: '26 Haz 2026', read: '3 dk', art: 'linear-gradient(145deg,#0d2b4a 0%,#1f8a8f 65%,#06121f 100%)', title: 'Hollow Knight: Silksong için çıkış tarihi nihayet doğrulandı', excerpt: 'Team Cherry’nin yıllardır beklenen devam oyunu için geri sayım başladı. İşte fiyatı, platformları ve bilmen gereken her şey.' },
  { id: 'n3', cat: 'Güncellemeler', mono: 'C', date: '24 Haz 2026', read: '2 dk', art: 'linear-gradient(145deg,#0f5e63 0%,#c0286b 60%,#1a0a24 100%)', title: 'Cyberpunk 2077’ye sürpriz 2.3 yaması: yeni araçlar ve foto modu', excerpt: 'CD Projekt Red, oyuna dört yeni araç, genişletilmiş fotoğraf modu ve onlarca denge değişikliği getiren ücretsiz güncellemeyi yayınladı.' },
  { id: 'n4', cat: 'Endüstri', mono: 'F', date: '22 Haz 2026', read: '5 dk', art: 'linear-gradient(145deg,#6b1a1a 0%,#3a4654 70%,#160a0a 100%)', title: 'FromSoftware yeni IP’sini duyurdu: George R. R. Martin yine sahnede', excerpt: 'Elden Ring’in yaratıcıları, tamamen yeni bir evrende geçecek aksiyon-RPG’lerini tanıttı. İlk fragman beklentileri tavan yaptırdı.' },
  { id: 'n5', cat: 'İncelemeler', mono: 'E', date: '20 Haz 2026', read: '7 dk', art: 'linear-gradient(145deg,#1f3a52 0%,#7fa8c9 65%,#0a141d 100%)', title: 'Shadow of the Erdtree — bir yıl sonra dönüp baktık', excerpt: 'Yılın en çok konuşulan ek paketi zamana nasıl direndi? Zorluk dengesi, içerik bolluğu ve fiyat/performans dengesini yeniden değerlendirdik.' },
  { id: 'n6', cat: 'İndirimler', mono: 'E', date: '19 Haz 2026', read: '2 dk', art: 'linear-gradient(145deg,#7a1020 0%,#5a1f7a 60%,#1a0610 100%)', title: 'Epic Games Store’da bu hafta ücretsiz: iki sürpriz yapım', excerpt: 'Bu haftanın bedava oyunları kütüphanene eklemen için seni bekliyor. Kaçırmamak için fiyat alarmını “ücretsiz” olarak ayarla.' },
  { id: 'n7', cat: 'Çıkışlar', mono: 'B', date: '17 Haz 2026', read: '3 dk', art: 'linear-gradient(145deg,#3a1f5c 0%,#7d1f3a 60%,#160a1f 100%)', title: 'Baldur’s Gate 3 fiziksel koleksiyon sürümü ön siparişe açıldı', excerpt: 'Larian, üç diskli özel baskıyı sanat kitabı ve harita ile birlikte duyurdu. Sınırlı stok uyarısı şimdiden yapıldı.' },
  { id: 'n8', cat: 'Güncellemeler', mono: 'V', date: '15 Haz 2026', read: '2 dk', art: 'linear-gradient(145deg,#2f7d32 0%,#a3c93a 60%,#13361a 100%)', title: 'Stardew Valley 1.6 nihayet resmi Türkçe dil desteğiyle geldi', excerpt: 'ConcernedApe’in beklenen güncellemesi yeni festivaller, eşyalar ve tam Türkçe çeviri ile birlikte tüm platformlarda yayında.' },
];

const CATS = ['Tümü', 'İndirimler', 'Çıkışlar', 'Güncellemeler', 'Endüstri', 'İncelemeler'];

export default function NewsPage() {
  const [cat, setCat] = useState('Tümü');

  const filtered = cat === 'Tümü' ? NEWS : NEWS.filter(n => n.cat === cat);
  const featured = filtered.find(n => n.featured) || filtered[0] || null;
  const rest = filtered.filter(n => n !== featured);

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '58px 0 28px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 36px' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>● Güncel · Oyun Dünyası</p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(36px,4.6vw,56px)', lineHeight: 1.04, letterSpacing: '-1.5px', color: 'var(--text)', marginBottom: 14 }}>Oyun Haberleri</h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, marginBottom: 26 }}>İndirimler, çıkış tarihleri ve sektörden son gelişmeler — hepsi tek akışta, abartısız ve hızlı.</p>
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

        {/* ── Öne çıkan ── */}
        {featured && (
          <article style={{ display: 'grid', gridTemplateColumns: '1.08fr 1fr', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden', background: 'var(--bg-card)', marginBottom: 38, boxShadow: 'var(--shadow-lg)', cursor: 'pointer' }}>
            <div style={{ position: 'relative', minHeight: 312, background: featured.art, overflow: 'hidden' }}>
              <span style={{ position: 'absolute', right: -12, bottom: -34, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 230, lineHeight: 1, color: 'rgba(255,255,255,0.15)', userSelect: 'none' }}>{featured.mono}</span>
              <span style={{ position: 'absolute', left: 20, top: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>✦ ÖNE ÇIKAN</span>
            </div>
            <div style={{ padding: '40px 42px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
                <span style={{ padding: '4px 11px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>{featured.cat}</span>
                <span>{featured.date}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} /><span>{featured.read} okuma</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(24px,2.5vw,32px)', lineHeight: 1.16, letterSpacing: '-0.8px', color: 'var(--text)', marginBottom: 14, textWrap: 'balance' }}>{featured.title}</h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-2)', marginBottom: 24 }}>{featured.excerpt}</p>
              <span className="btn btn-red" style={{ alignSelf: 'flex-start' }}>Haberi oku →</span>
            </div>
          </article>
        )}

        {/* ── Haber ızgarası ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(322px,1fr))', gap: 24 }}>
          {rest.map(n => (
            <article key={n.id} className="card" style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 34px rgba(74,52,28,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'relative', height: 166, background: n.art, overflow: 'hidden' }}>
                <span style={{ position: 'absolute', right: -8, bottom: -24, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 128, lineHeight: 1, color: 'rgba(255,255,255,0.16)', userSelect: 'none' }}>{n.mono}</span>
                <span style={{ position: 'absolute', left: 14, top: 14, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.94)', color: '#241d14', fontSize: 11.5, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{n.cat}</span>
              </div>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}><span>{n.date}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} /><span>{n.read} okuma</span></div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18.5, lineHeight: 1.25, letterSpacing: '-0.4px', color: 'var(--text)', marginBottom: 9, textWrap: 'pretty' }}>{n.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', marginBottom: 14 }}>{n.excerpt}</p>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>Devamını oku →</span>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: 6 }}>Bu kategoride henüz haber yok</p>
            <p style={{ fontSize: 14 }}>Başka bir kategoriye göz at</p>
          </div>
        )}
      </div>
    </div>
  );
}
