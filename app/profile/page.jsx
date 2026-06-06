'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GENRE_STATS = [
  { label: 'RPG',          pct: 38 },
  { label: 'Aksiyon',      pct: 27 },
  { label: 'Strateji',     pct: 18 },
  { label: 'Simülasyon',   pct: 12 },
  { label: 'Indie',        pct: 5  },
];

export default function ProfilePage() {
  const [wishlist,   setWishlist]   = useState([]);
  const [steamConn,  setSteamConn]  = useState(false);
  const [epicConn,   setEpicConn]   = useState(false);
  const [xboxConn,   setXboxConn]   = useState(true);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
    setWishlist(stored);
    setSteamConn(localStorage.getItem('gp_steam') === '1');
    setEpicConn(localStorage.getItem('gp_epic')  === '1');
    setXboxConn(localStorage.getItem('gp_xbox')  !== '0');
  }, []);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(w => w.id !== id);
    localStorage.setItem('gamepick_wishlist', JSON.stringify(updated));
    setWishlist(updated);
  };

  const toggleService = (service) => {
    if (service === 'steam') {
      const next = !steamConn;
      setSteamConn(next);
      localStorage.setItem('gp_steam', next ? '1' : '0');
    } else if (service === 'epic') {
      const next = !epicConn;
      setEpicConn(next);
      localStorage.setItem('gp_epic', next ? '1' : '0');
    } else {
      const next = !xboxConn;
      setXboxConn(next);
      localStorage.setItem('gp_xbox', next ? '1' : '0');
    }
  };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(123,110,232,0.15)',
          border: '1px solid rgba(123,110,232,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#a594f9',
        }}>
          FK
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Furkan K.</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>GamePick üyesi</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

        {/* Bağlı hesaplar */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>Bağlı hesaplar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AccountCard
              name="Steam"
              status={steamConn ? 'Bağlı — 148 oyun' : 'Bağlı değil'}
              connected={steamConn}
              color="#1a9fff"
              initials="STM"
              onToggle={() => toggleService('steam')}
            />
            <AccountCard
              name="Epic Games"
              status={epicConn ? 'Bağlı — 32 oyun' : 'Bağlı değil'}
              connected={epicConn}
              color="#7B6EE8"
              initials="EPC"
              onToggle={() => toggleService('epic')}
            />
            <AccountCard
              name="Xbox / Game Pass"
              status={xboxConn ? 'Bağlı — Game Pass Ultimate' : 'Bağlı değil'}
              connected={xboxConn}
              color="#4ade80"
              initials="XBX"
              onToggle={() => toggleService('xbox')}
            />
          </div>
        </div>

        {/* AI analiz */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>AI oyuncu analizi</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            <StatCard number="148" label="Steam oyunu" />
            <StatCard number="2.4s" label="Ort. oynama" />
            <StatCard number="%78"  label="Tamamlama" />
          </div>

          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 10 }}>
              En çok oynadığın türler
            </p>
            {GENRE_STATS.map(g => (
              <div key={g.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'rgba(255,255,255,0.6)' }}>
                  <span>{g.label}</span><span>{g.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.pct}%`, background: '#7B6EE8', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 8 }}>
              ✦ AI yorumu
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
              Uzun soluklu single-player RPG'leri tercih eden, hikayeye önem veren bir profil.
              Yüksek zorluk eğilimi var. Multiplayer oranı düşük — solo deneyimlere odaklanıyorsunuz.
            </p>
          </div>
        </div>
      </div>

      {/* İstek listesi */}
      <div>
        <h2 className="section-title" style={{ fontSize: 16 }}>
          İstek listesi{' '}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>
            — {wishlist.length} oyun takip ediliyor
          </span>
        </h2>

        {wishlist.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 12 }}>
              Henüz istek listesinde oyun yok.
            </p>
            <Link href="/" style={{
              display: 'inline-block', padding: '9px 20px', borderRadius: 10,
              background: 'rgba(123,110,232,0.15)', border: '1px solid rgba(123,110,232,0.3)',
              color: '#a594f9', fontSize: 13, fontWeight: 600,
            }}>
              Oyun Keşfet →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {wishlist.map(game => (
              <WishlistItem key={game.id} game={game} onRemove={() => removeFromWishlist(game.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Günlük öneri */}
      <div style={{ marginTop: 32 }}>
        <h2 className="section-title" style={{ fontSize: 16 }}>Günlük öneri</h2>
        <div className="card" style={{
          padding: '16px 20px',
          background: 'rgba(123,110,232,0.06)',
          border: '1px solid rgba(123,110,232,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#7B6EE8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                ✦ Bugün için öneri
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Hades</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Yorucu bir günün ardından, 20 dakikalık hızlı seanslarıyla mükemmel.
                Game Pass'te ücretsiz.
              </p>
            </div>
            <Link href="/game/3612" style={{
              padding: '9px 18px', borderRadius: 10,
              background: '#7B6EE8', color: '#fff',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              İncele →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ name, status, connected, color, initials, onToggle }) {
  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: `${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>{name}</p>
          <p style={{ fontSize: 12, color: connected ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>{status}</p>
        </div>
      </div>
      <button onClick={onToggle} style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: connected ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(123,110,232,0.4)',
        background: connected ? 'rgba(255,255,255,0.05)' : 'rgba(123,110,232,0.12)',
        color: connected ? 'rgba(255,255,255,0.5)' : '#a594f9',
        cursor: 'pointer',
      }}>
        {connected ? 'Kes' : 'Bağla'}
      </button>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>{number}</p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</p>
    </div>
  );
}

function WishlistItem({ game, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: '#1f1f1f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
        flexShrink: 0, overflow: 'hidden', position: 'relative',
      }}>
        {game.image ? (
          <img src={game.image} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          game.name?.slice(0, 2).toUpperCase()
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/game/${game.id}`}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {game.name}
          </p>
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Fiyat alarmı aktif</p>
      </div>
      <button onClick={onRemove} style={{
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.25)', fontSize: 18, cursor: 'pointer',
        flexShrink: 0, padding: '4px 8px',
      }} title="Kaldır">
        ×
      </button>
    </div>
  );
}
