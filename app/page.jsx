'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [popularGames, setPopularGames] = useState([]);
  const [newGames,     setNewGames]     = useState([]);
  const [topGames,     setTopGames]     = useState([]);
  const [loadingPop,   setLoadingPop]   = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingTop,   setLoadingTop]   = useState(true);

  const fetchSection = useCallback(async (section, setter, loadingSetter) => {
    loadingSetter(true);
    try {
      const res  = await fetch(`/api/games?section=${section}&num=12`);
      const data = await res.json();
      setter(data.results || []);
    } catch {}
    finally { loadingSetter(false); }
  }, []);

  useEffect(() => {
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
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
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
