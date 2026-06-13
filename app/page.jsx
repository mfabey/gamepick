'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

const HERO_GAMES = [
  { name: "The Witcher 3", image: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4e611f10db81302.jpg" },
  { name: "GTA V", image: "https://media.rawg.io/media/games/456/456fc5a117526af7a641f117abd0246f.jpg" },
  { name: "Red Dead Redemption 2", image: "https://media.rawg.io/media/games/511/511c4fc52d83e069060d4c3611cf2d9c.jpg" },
  { name: "Portal 2", image: "https://media.rawg.io/media/games/328/328361552bcfde94670e178eebde6c28.jpg" },
  { name: "Skyrim", image: "https://media.rawg.io/media/games/7a2/7a211ae2e2c5e11e5fcf72c5a046c4f7.jpg" },
  { name: "Cyberpunk 2077", image: "https://media.rawg.io/media/games/26d/26d4437715ebd6013feaff2b6f327c07.jpg" },
  { name: "Elden Ring", image: "https://media.rawg.io/media/games/5ec/5ec18302c3ef9ab126e03411a7779905.jpg" },
  { name: "Minecraft", image: "https://media.rawg.io/media/games/b4e/b4e4f73d563fd4b6b243f7c750d107a0.jpg" },
  { name: "Hades", image: "https://media.rawg.io/media/games/1f4/1f47a5531101d67683d0a47f4d4ce5e5.jpg" },
  { name: "God of War", image: "https://media.rawg.io/media/games/4be/4be5a6430164ed024040a1acda4ca51a.jpg" },
];

const SCROLL_GAMES_LEFT = [...HERO_GAMES, ...HERO_GAMES];
const SCROLL_GAMES_RIGHT = [...HERO_GAMES.slice().reverse(), ...HERO_GAMES.slice().reverse()];

export default function Home() {
  const { user } = useAuth();
  const [saleGames,    setSaleGames]    = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [newGames,     setNewGames]     = useState([]);
  const [topGames,     setTopGames]     = useState([]);
  const [loadingSale,  setLoadingSale]  = useState(true);
  const [loadingPop,   setLoadingPop]   = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingTop,   setLoadingTop]   = useState(true);

  const fetchSection = useCallback(async (section, setter, loadingSetter) => {
    loadingSetter(true);
    try {
      const res  = await fetch(`/api/games?section=${section}&num=12&rotate=true`);
      const data = await res.json();
      setter(data.results || []);
    } catch {}
    finally { loadingSetter(false); }
  }, []);

  useEffect(() => {
    fetchSection('sale',     setSaleGames,    setLoadingSale);
    fetchSection('popular',  setPopularGames, setLoadingPop);
    fetchSection('new',      setNewGames,     setLoadingNew);
    fetchSection('topscore', setTopGames,     setLoadingTop);
  }, [fetchSection]);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Hero */}
      <div style={{
        background: 'var(--hero-bg)',
        borderBottom: '1px solid var(--border)',
        padding: '60px 0 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Sol kayan sütun */}
        <div className="hero-scroll-col left desktop-only">
          <div className="hero-scroll-track">
            {SCROLL_GAMES_LEFT.map((g, idx) => (
              <div key={idx} className="hero-scroll-card">
                <img src={g.image} alt={g.name} />
              </div>
            ))}
          </div>
        </div>

        {/* Sağ kayan sütun */}
        <div className="hero-scroll-col right desktop-only">
          <div className="hero-scroll-track">
            {SCROLL_GAMES_RIGHT.map((g, idx) => (
              <div key={idx} className="hero-scroll-card">
                <img src={g.image} alt={g.name} />
              </div>
            ))}
          </div>
        </div>

        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            borderRadius: 999, padding: '4px 14px', marginBottom: 18,
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          }}>
            ✦ Yapay Zeka Destekli Oyun Keşfi
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14, color: 'var(--text)', lineHeight: 1.15 }}>
            Doğru Oyun,<br />
            <span style={{ color: 'var(--accent)' }}>En İyi Fiyat</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 17, maxWidth: 520, margin: '0 auto 28px' }}>
            Binlerce oyunu tek ekranda keşfet.
            Ruh haline göre AI önerisi al.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/games" className="btn btn-red" style={{ fontSize: 14, padding: '12px 28px' }}>
              Oyunları Keşfet →
            </Link>
            {!user && (
              <Link href="/signup" className="btn btn-ghost" style={{ fontSize: 14, padding: '12px 28px' }}>
                Ücretsiz Üye Ol
              </Link>
            )}
            {user && (
              <Link href="/library" className="btn btn-ghost" style={{ fontSize: 14, padding: '12px 28px' }}>
                Kütüphanem →
              </Link>
            )}
          </div>

          {/* Stat çubukları */}
          <div style={{
            display: 'flex', gap: 32, justifyContent: 'center',
            marginTop: 40, flexWrap: 'wrap',
          }}>
            {[['500K+', 'Oyun'], ['Puan & Yorum', 'Metacritic Verisi'], ['AI', 'Kişisel Öneri']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{n}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40 }}>

        {/* İndirim Fırsatları */}
        <Section
          title="🏷️ İndirim Fırsatları"
          subtitle="En ucuz fiyatlı platform teklifleri"
          href="/games?section=sale"
          games={saleGames}
          loading={loadingSale}
        />

        {/* Popüler */}
        <Section
          title="💥 Popüler Oyunlar"
          subtitle="Oyuncuların en çok oynadığı oyunlar"
          href="/games?section=popular"
          games={popularGames}
          loading={loadingPop}
        />

        {/* Yeni Çıkanlar */}
        <Section
          title="🗓️ Yeni Çıkanlar"
          subtitle="Son dönemde yayınlanan oyunlar"
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
        />

        {/* En Yüksek Puanlı */}
        <Section
          title="⭐ En Yüksek Puanlı"
          subtitle="Metacritic'e göre en iyi oyunlar"
          href="/games?section=topscore"
          games={topGames}
          loading={loadingTop}
        />

        {/* CTA - kütüphane */}
        <div style={{
          marginTop: 32,
          background: 'var(--cta-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: 16, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              ✦ Tek Kütüphane
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Oyunlarını tek yerden yönet
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Oyun listenini oluştur, takip et ve AI önerileri al.
            </p>
          </div>
          <Link href={user ? '/library' : '/signup'} className="btn btn-red" style={{ whiteSpace: 'nowrap', padding: '12px 24px' }}>
            {user ? 'Kütüphaneyi Aç →' : 'Hemen Başla →'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, href, games, loading }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</p>}
        </div>
        <Link href={href} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          Tümünü gör →
        </Link>
      </div>
      <div className="scroll-row">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : games.length === 0
            ? <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Yüklenemedi.</p>
            : games.map(g => <GameCard key={g.id} game={g} compact />)
        }
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      flexShrink: 0, width: 160, borderRadius: 14,
      background: 'var(--bg-card)', border: '1.5px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ height: 90, background: 'var(--bg-input)' }} />
      <div style={{ padding: '9px 11px' }}>
        <div style={{ height: 11, background: 'var(--border)', borderRadius: 4, marginBottom: 7 }} />
        <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}
