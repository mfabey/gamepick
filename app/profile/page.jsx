'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GameImage from '../components/GameImage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ProfilePage() {
  const { 
    user, 
    steamUser, 
    xboxUser, 
    ownedGames, 
    xboxOwnedGames, 
    gamePassGames, 
    ready, 
    steamLogout, 
    xboxLogout 
  } = useAuth();
  
  const { lang } = useLanguage();
  const router = useRouter();
  
  const [wishlist, setWishlist] = useState([]);
  const [epicConn, setEpicConn] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (ready && !user) {
      router.push('/login');
    }
  }, [ready, user, router]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('gamepick_wishlist') || '[]');
    setWishlist(stored);
    setEpicConn(localStorage.getItem('gp_epic') === '1');
  }, []);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(w => w.id !== id);
    localStorage.setItem('gamepick_wishlist', JSON.stringify(updated));
    setWishlist(updated);
  };

  const toggleEpic = () => {
    const next = !epicConn;
    setEpicConn(next);
    localStorage.setItem('gp_epic', next ? '1' : '0');
  };

  if (!ready || !user) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
        {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
      </div>
    );
  }

  // Get name initials
  const nameParts = user.name ? user.name.split(' ') : [];
  const initials = nameParts.length > 0 
    ? nameParts.map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  // Connected accounts game sizes
  const steamGamesCount = steamUser ? ownedGames.size : 0;
  const xboxGamesCount = xboxUser ? (xboxOwnedGames.size + gamePassGames.size) : 0;
  const epicGamesCount = epicConn ? 32 : 0;

  const totalConnectedGames = steamGamesCount + xboxGamesCount + epicGamesCount;

  // Mock genre stats based on connected library
  const getGenreStats = () => {
    if (totalConnectedGames === 0) {
      return [
        { label: lang === 'tr' ? 'RPG' : 'RPG', pct: 0 },
        { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: 0 },
        { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: 0 },
        { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: 0 },
        { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: 0 },
      ];
    }
    return [
      { label: lang === 'tr' ? 'RPG' : 'RPG', pct: 38 },
      { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: 27 },
      { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: 18 },
      { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: 12 },
      { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: 5  },
    ];
  };

  const genreStats = getGenreStats();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Başlık / User Card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--accent)',
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{user.name}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {lang === 'tr' ? 'GamePick Üyesi' : 'GamePick Member'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

        {/* Bağlı hesaplar */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {lang === 'tr' ? 'Bağlı Hesaplar' : 'Connected Accounts'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Steam */}
            <AccountCard
              name="Steam"
              status={
                steamUser 
                  ? (lang === 'tr' ? `Bağlı — ${steamGamesCount} oyun` : `Connected — ${steamGamesCount} games`) 
                  : (lang === 'tr' ? 'Bağlı değil' : 'Not connected')
              }
              connected={!!steamUser}
              color="#1a9fff"
              initials="STM"
              onToggle={() => {
                if (steamUser) {
                  steamLogout();
                } else {
                  window.location.href = '/api/auth/steam';
                }
              }}
              lang={lang}
            />
            {/* Epic Games */}
            <AccountCard
              name="Epic Games"
              status={
                epicConn 
                  ? (lang === 'tr' ? `Bağlı — ${epicGamesCount} oyun` : `Connected — ${epicGamesCount} games`) 
                  : (lang === 'tr' ? 'Bağlı değil' : 'Not connected')
              }
              connected={epicConn}
              color="#DC2626"
              initials="EPC"
              onToggle={toggleEpic}
              lang={lang}
            />
            {/* Xbox */}
            <AccountCard
              name="Xbox / Game Pass"
              status={
                xboxUser 
                  ? (lang === 'tr' ? `Bağlı — ${xboxGamesCount} oyun` : `Connected — ${xboxGamesCount} games`) 
                  : (lang === 'tr' ? 'Bağlı değil' : 'Not connected')
              }
              connected={!!xboxUser}
              color="#16a34a"
              initials="XBX"
              onToggle={() => {
                if (xboxUser) {
                  xboxLogout();
                } else {
                  window.location.href = '/api/auth/xbox';
                }
              }}
              lang={lang}
            />
          </div>
        </div>

        {/* AI analiz */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {lang === 'tr' ? 'AI Oyuncu Analizi' : 'AI Player Analysis'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            <StatCard 
              number={steamGamesCount.toString()} 
              label={lang === 'tr' ? 'Steam Oyunu' : 'Steam Games'} 
            />
            <StatCard 
              number={steamUser ? "2.4s" : "0s"} 
              label={lang === 'tr' ? 'Ort. Oynama' : 'Avg. Playtime'} 
            />
            <StatCard 
              number={steamUser ? "%78" : "%0"}  
              label={lang === 'tr' ? 'Tamamlama' : 'Completion'} 
            />
          </div>

          <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>
              {lang === 'tr' ? 'En çok oynadığın türler' : 'Your top played genres'}
            </p>
            {genreStats.map(g => (
              <div key={g.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--text-2)' }}>
                  <span>{g.label}</span><span>{g.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>
              ✦ {lang === 'tr' ? 'AI Yorumu' : 'AI Feedback'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
              {totalConnectedGames === 0 ? (
                lang === 'tr'
                  ? 'Henüz bağlı bir kütüphaneniz yok. Steam veya Xbox hesabınızı bağlayarak AI kütüphane analizinizi alabilirsiniz!'
                  : 'You do not have a connected library yet. Connect your Steam or Xbox account to get your AI library analysis!'
              ) : (
                lang === 'tr'
                  ? 'Uzun soluklu single-player RPG\'leri tercih eden, hikayeye önem veren bir profil. Yüksek zorluk eğilimi var. Multiplayer oranı düşük — solo deneyimlere odaklanıyorsunuz.'
                  : 'A profile that prefers long-term single-player RPGs, valuing story depth. Tends to enjoy higher difficulty curves. Low multiplayer ratio — focusing heavily on solo experiences.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* İstek listesi */}
      <div>
        <h2 className="section-title" style={{ fontSize: 16 }}>
          {lang === 'tr' ? 'İstek Listesi' : 'Wishlist'}{' '}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-3)' }}>
            — {wishlist.length} {lang === 'tr' ? 'oyun takip ediliyor' : 'games tracked'}
          </span>
        </h2>

        {wishlist.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 12 }}>
              {lang === 'tr' ? 'Henüz istek listesinde oyun yok.' : 'No games in your wishlist yet.'}
            </p>
            <Link href="/" style={{
              display: 'inline-block', padding: '9px 20px', borderRadius: 10,
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600,
            }}>
              {lang === 'tr' ? 'Oyun Keşfet →' : 'Explore Games →'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {wishlist.map(game => (
              <WishlistItem key={game.id} game={game} onRemove={() => removeFromWishlist(game.id)} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {/* Günlük öneri */}
      <div style={{ marginTop: 32 }}>
        <h2 className="section-title" style={{ fontSize: 16 }}>
          {lang === 'tr' ? 'Günlük Öneri' : 'Daily Recommendation'}
        </h2>
        <div className="card" style={{
          padding: '16px 20px',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                ✦ {lang === 'tr' ? 'Bugün için öneri' : 'Recommendation for today'}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>Hades</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {lang === 'tr'
                  ? 'Yorucu bir günün ardından, 20 dakikalık hızlı seanslarıyla mükemmel. Game Pass\'te ücretsiz.'
                  : 'Perfect for quick 20-minute sessions after a long day. Free on Game Pass.'}
              </p>
            </div>
            <Link href="/game/3612" style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {lang === 'tr' ? 'İncele →' : 'View →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ name, status, connected, color, initials, onToggle, lang }) {
  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</p>
          <p style={{ fontSize: 12, color: connected ? 'var(--green)' : 'var(--text-3)' }}>{status}</p>
        </div>
      </div>
      <button onClick={onToggle} style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: connected ? '1px solid var(--border)' : '1px solid var(--accent-border)',
        background: connected ? 'var(--bg-input)' : 'var(--accent-bg)',
        color: connected ? 'var(--text-3)' : 'var(--accent)',
        cursor: 'pointer',
      }}>
        {connected 
          ? (lang === 'tr' ? 'Kes' : 'Disconnect') 
          : (lang === 'tr' ? 'Bağla' : 'Connect')}
      </button>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{number}</p>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</p>
    </div>
  );
}

function WishlistItem({ game, onRemove, lang }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: 'var(--bg-input)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'var(--text-3)',
        flexShrink: 0, overflow: 'hidden', position: 'relative',
      }}>
        <GameImage game={game} fill sizes="40px" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/game/${game.id}`}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {game.name}
          </p>
        </Link>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Fiyat alarmı aktif' : 'Price alert active'}
        </p>
      </div>
      <button onClick={onRemove} style={{
        background: 'none', border: 'none',
        color: 'var(--text-3)', fontSize: 18, cursor: 'pointer',
        flexShrink: 0, padding: '4px 8px',
      }} title={lang === 'tr' ? 'Kaldır' : 'Remove'}>
        ×
      </button>
    </div>
  );
}
