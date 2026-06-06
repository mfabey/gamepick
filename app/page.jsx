'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import GameCard from './components/GameCard';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [freeGames,    setFreeGames]    = useState([]);
  const [newGames,     setNewGames]     = useState([]);
  const [trendGames,   setTrendGames]   = useState([]);
  const [loadingFree,  setLoadingFree]  = useState(true);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);

  const fetchPrices = useCallback(async (list, setter) => {
    list.forEach(async (game) => {
      try {
        const res  = await fetch(`/api/prices?title=${encodeURIComponent(game.name)}`);
        const data = await res.json();
        const bestPrice = data.gamePass ? null : (data.steam || data.epic || null);
        setter(prev => prev.map(g =>
          g.id === game.id
            ? { ...g, price: bestPrice, gamePass: data.gamePass, onSale: (data.steamOriginal || 0) > (data.steam || 0) }
            : g
        ));
      } catch {}
    });
  }, []);

  const fetchSection = useCallback(async (section, setter, loadingSetter) => {
    loadingSetter(true);
    try {
      const res  = await fetch(`/api/games?section=${section}&page_size=10`);
      const data = await res.json();
      const results = data.results || [];
      setter(results);
      fetchPrices(results, setter);
    } catch {}
    finally { loadingSetter(false); }
  }, [fetchPrices]);

  useEffect(() => {
    fetchSection('free',     setFreeGames,  setLoadingFree);
    fetchSection('new',      setNewGames,   setLoadingNew);
    fetchSection('trending', setTrendGames, setLoadingTrend);
  }, [fetchSection]);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #fff 0%, #fef2f2 60%, #fff 100%)',
        borderBottom: '1px solid #f0f0f0',
        padding: '60px 0 48px',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 999, padding: '4px 14px', marginBottom: 18,
            fontSize: 12, fontWeight: 600, color: '#DC2626',
          }}>
            ✦ Yapay Zeka Destekli Oyun Keşfi
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14, color: '#1a1a1a', lineHeight: 1.15 }}>
            Doğru Oyun,<br />
            <span style={{ color: '#DC2626' }}>En İyi Fiyat</span>
          </h1>
          <p style={{ color: '#888', fontSize: 17, maxWidth: 520, margin: '0 auto 28px' }}>
            Steam, Epic ve Xbox fiyatlarını tek ekranda gör.
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
            {[['500K+', 'Oyun'], ['3 Platform', 'Fiyat Karşılaştırma'], ['AI', 'Kişisel Öneri']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#DC2626' }}>{n}</p>
                <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40 }}>

        {/* Bu Hafta Ücretsiz */}
        <Section
          title="🎮 Bu Hafta Ücretsiz"
          subtitle="Ücretsiz oynayabileceğin oyunlar"
          href="/games?section=free"
          games={freeGames}
          loading={loadingFree}
          isFreeSection
        />

        {/* Yeni Çıkanlar */}
        <Section
          title="🗓️ Yeni Çıkanlar"
          subtitle="Son 4 ayda yayınlanan oyunlar"
          href="/games?section=new"
          games={newGames}
          loading={loadingNew}
        />

        {/* Bu Hafta Trend */}
        <Section
          title="💥 Bu Hafta Trend"
          subtitle="Şu an en çok konuşulan oyunlar"
          href="/games?section=trending"
          games={trendGames}
          loading={loadingTrend}
        />

        {/* CTA - kütüphane */}
        <div style={{
          marginTop: 32,
          background: 'linear-gradient(135deg, #FEF2F2, #fff)',
          border: '1px solid #FECACA',
          borderRadius: 16, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              ✦ Tek Kütüphane
            </p>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
              Steam, Epic ve Xbox'ı birleştir
            </h3>
            <p style={{ fontSize: 14, color: '#666' }}>
              Tüm hesaplarını bağla, oyunlarını tek bir yerden yönet.
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

function Section({ title, subtitle, href, games, loading, isFreeSection }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{subtitle}</p>}
        </div>
        <Link href={href} style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
          Tümünü gör →
        </Link>
      </div>
      <div className="scroll-row">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : games.length === 0
            ? <p style={{ color: '#ccc', fontSize: 14 }}>Yüklenemedi.</p>
            : games.map(g => (
                <GameCard key={g.id} game={isFreeSection ? { ...g, isFree: true } : g} compact />
              ))
        }
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      flexShrink: 0, width: 160, borderRadius: 14,
      background: '#fff', border: '1.5px solid #ebebeb', overflow: 'hidden',
    }}>
      <div style={{ height: 90, background: '#f5f5f5' }} />
      <div style={{ padding: '9px 11px' }}>
        <div style={{ height: 11, background: '#f0f0f0', borderRadius: 4, marginBottom: 7 }} />
        <div style={{ height: 10, background: '#f5f5f5', borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}
