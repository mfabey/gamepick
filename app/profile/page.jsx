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
    steamAccounts = [],
    steamLogoutAccount,
    xboxUser, 
    ownedGames, 
    xboxOwnedGames, 
    gamePassGames, 
    ready, 
    xboxLogout,
    changePassword,
    deleteAccount
  } = useAuth();
  
  const { lang } = useLanguage();
  const router = useRouter();
  
  const [wishlist, setWishlist] = useState([]);

  // Dynamic daily recommendation selector
  const getDailyRecommendation = () => {
    const RECOMMENDATIONS = [
      {
        name: 'Hades',
        slug: 'hades',
        descTr: 'Yorucu bir günün ardından, 20 dakikalık hızlı seanslarıyla mükemmel. Game Pass\'te ücretsiz.',
        descEn: 'Perfect for quick 20-minute sessions after a long day. Free on Game Pass.'
      },
      {
        name: 'Elden Ring',
        slug: 'elden-ring',
        descTr: 'Muhteşem açık dünyası ve derin oynanışıyla son yılların en iyi aksiyon RPG oyunu.',
        descEn: 'The best action RPG of recent years with its magnificent open world and deep gameplay.'
      },
      {
        name: 'The Witcher 3: Wild Hunt',
        slug: 'the-witcher-3-wild-hunt',
        descTr: 'Eşsiz hikaye anlatımı ve unutulmaz karakterleriyle Rivia\'lı Geralt\'ın efsanevi macerası.',
        descEn: 'The legendary adventure of Geralt of Rivia with unique storytelling and unforgettable characters.'
      },
      {
        name: 'Baldur\'s Gate 3',
        slug: 'baldurs-gate-3',
        descTr: 'Dungeons & Dragons evreninde geçen, seçimlerinizin dünyayı şekillendirdiği devasa bir rol yapma oyunu.',
        descEn: 'A massive role-playing game set in the Dungeons & Dragons universe, where your choices shape the world.'
      },
      {
        name: 'Red Dead Redemption 2',
        slug: 'red-dead-redemption-2',
        descTr: 'Vahşi Batı\'nın son dönemlerinde geçen, inanılmaz detay seviyesi ve duygusal hikayesiyle bir başyapıt.',
        descEn: 'A masterpiece set in the final years of the Wild West, with incredible level of detail and emotional story.'
      },
      {
        name: 'Cyberpunk 2077',
        slug: 'cyberpunk-2077',
        descTr: 'Night City\'nin neon ışıklı sokaklarında geçen, etkileyici görselliğe sahip fütüristik bir RPG.',
        descEn: 'A futuristic RPG set in the neon-lit streets of Night City with impressive visuals.'
      },
      {
        name: 'Hollow Knight',
        slug: 'hollow-knight',
        descTr: 'Görsel tasarımı, atmosferi ve zorlu oynanışıyla en beğenilen metroidvania oyunlarından biri.',
        descEn: 'One of the most acclaimed metroidvania games with its visual design, atmosphere, and challenging gameplay.'
      },
      {
        name: 'Celeste',
        slug: 'celeste',
        descTr: 'Zorlu platform bölümleri ve zihinsel sağlık üzerine odaklanan harika hikayesiyle bir bağımsız klasiği.',
        descEn: 'An indie classic with challenging platform stages and a wonderful story focusing on mental health.'
      },
      {
        name: 'Disco Elysium',
        slug: 'disco-elysium-the-final-cut',
        descTr: 'Eşsiz diyalog sistemi ve derin dedektiflik hikayesiyle rol yapma türüne yepyeni bir soluk getiren yapım.',
        descEn: 'A production that brings a breath of fresh air to the RPG genre with its unique dialogue system and deep detective story.'
      },
      {
        name: 'Portal 2',
        slug: 'portal-2',
        descTr: 'Zeka dolu bulmacaları ve harika mizahıyla tüm zamanların en iyi bulmaca oyunlarından biri.',
        descEn: 'One of the best puzzle games of all time with its clever puzzles and great humor.'
      }
    ];

    const today = new Date();
    let hash = today.getFullYear() * 37 + today.getMonth() * 13 + today.getDate();
    if (user && user.email) {
      for (let i = 0; i < user.email.length; i++) {
        hash += user.email.charCodeAt(i);
      }
    }
    const index = Math.abs(hash) % RECOMMENDATIONS.length;
    return RECOMMENDATIONS[index];
  };

  const recommended = getDailyRecommendation();




  // Redirect to login if not authenticated
  useEffect(() => {
    if (ready && !user) {
      router.push('/login');
    }
  }, [ready, user, router]);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem('gamerisen_wishlist') || 
      localStorage.getItem('gamepick_wishlist') || 
      '[]'
    );
    setWishlist(stored);
  }, []);

  const [steamLib, setSteamLib] = useState(null);
  const [xboxLib, setXboxLib] = useState(null);
  const [libsLoading, setLibsLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) return;
    
    setLibsLoading(true);
    const promises = [];
    
    if (steamUser) {
      promises.push(
        fetch('/api/oyun')
          .then(r => r.json())
          .then(d => setSteamLib(d))
          .catch(() => {})
      );
    } else {
      setSteamLib(null);
    }
    
    if (xboxUser) {
      promises.push(
        fetch('/api/xbox-library')
          .then(r => r.json())
          .then(d => setXboxLib(d))
          .catch(() => {})
      );
    } else {
      setXboxLib(null);
    }
    
    Promise.all(promises).finally(() => setLibsLoading(false));
  }, [ready, user, steamUser, xboxUser]);

  // AI recommendations block removed to avoid unused variables

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(w => w.id !== id);
    localStorage.setItem('gamerisen_wishlist', JSON.stringify(updated));
    setWishlist(updated);
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
    : (user.email || '').slice(0, 2).toUpperCase();

  // Connected accounts game sizes
  const steamGamesCount = steamUser ? (steamLib?.games?.length || (ownedGames?.size || 0) || 0) : 0;
  const xboxGamesCount = xboxUser ? (xboxLib?.games?.length || ((xboxOwnedGames?.size || 0) + (gamePassGames?.size || 0)) || 0) : 0;

  const totalConnectedGames = steamGamesCount + xboxGamesCount;

  // Dynamic average playtime calculator
  const getPlaytimeStat = () => {
    if (!steamUser) return "0s";
    if (libsLoading) return lang === 'tr' ? '...' : '...';
    if (!steamLib || !steamLib.games || steamLib.games.length === 0) return "0s";
    
    const played = steamLib.games.filter(g => g.hours > 0).length;
    const totalHours = steamLib.totalHours || 0;
    const avg = played > 0 ? (totalHours / played).toFixed(1) : "0.0";
    return `${avg}${lang === 'tr' ? 's' : 'h'}`;
  };

  // Dynamic achievement completion calculator
  const getCompletionStat = () => {
    if (libsLoading) return lang === 'tr' ? '...' : '...';
    
    let totalAch = 0;
    let currentAch = 0;
    
    if (xboxLib && xboxLib.games) {
      xboxLib.games.forEach(g => {
        totalAch += g.totalAchievements || 0;
        currentAch += g.currentAchievements || 0;
      });
    }
    
    if (totalAch > 0) {
      return `%${Math.round((currentAch / totalAch) * 100)}`;
    }
    
    if (steamLib && steamLib.games && steamLib.games.length > 0) {
      const played = steamLib.games.filter(g => g.hours > 0).length;
      const pct = Math.min(95, Math.max(10, Math.round((played / steamLib.games.length) * 80)));
      return `%${pct}`;
    }
    
    return "%0";
  };

  // Dynamic genre statistics generator
  const getDynamicGenreStats = (steamGamesList, xboxGamesList) => {
    const counts = { RPG: 0, Action: 0, Strategy: 0, Simulation: 0, Indie: 0 };
    let matchedCount = 0;

    const processGame = (name) => {
      const lower = name.toLowerCase();
      let matched = false;
      if (lower.includes('elden ring') || lower.includes('witcher') || lower.includes('baldur') || lower.includes('cyberpunk') || lower.includes('starfield') || lower.includes('skyrim') || lower.includes('fallout') || lower.includes('dark souls') || lower.includes('diablo') || lower.includes('persona') || lower.includes('mass effect')) {
        counts.RPG++;
        matched = true;
      }
      if (lower.includes('gta') || lower.includes('grand theft auto') || lower.includes('red dead') || lower.includes('halo') || lower.includes('doom') || lower.includes('call of duty') || lower.includes('battlefield') || lower.includes('counter-strike') || lower.includes('cs') || lower.includes('pubg') || lower.includes('rust') || lower.includes('sea of thieves') || lower.includes('apex') || lower.includes('tomb raider') || lower.includes('assassin')) {
        counts.Action++;
        matched = true;
      }
      if (lower.includes('forza') || lower.includes('fifa') || lower.includes('football manager') || lower.includes('euro truck') || lower.includes('assetto') || lower.includes('f1') || lower.includes('flight simulator') || lower.includes('sims') || lower.includes('city')) {
        counts.Simulation++;
        matched = true;
      }
      if (lower.includes('civilization') || lower.includes('hearts of iron') || lower.includes('europa') || lower.includes('age of') || lower.includes('starcraft') || lower.includes('total war') || lower.includes('stellaris') || lower.includes('crusader kings')) {
        counts.Strategy++;
        matched = true;
      }
      if (lower.includes('hades') || lower.includes('hollow knight') || lower.includes('celeste') || lower.includes('stardew') || lower.includes('lethal') || lower.includes('balatro') || lower.includes('terraria') || lower.includes('minecraft') || lower.includes('portal') || lower.includes('slay the spire') || lower.includes('dead cells') || lower.includes('vampire survivors')) {
        counts.Indie++;
        matched = true;
      }
      if (matched) matchedCount++;
    };

    steamGamesList.forEach(g => processGame(g.name));
    xboxGamesList.forEach(g => processGame(g.name));

    const total = counts.RPG + counts.Action + counts.Strategy + counts.Simulation + counts.Indie;
    if (total === 0) {
      if (libsLoading && (steamUser || xboxUser)) {
        return [
          { label: lang === 'tr' ? 'Yükleniyor...' : 'Loading...', pct: 0 }
        ];
      }
      return [
        { label: lang === 'tr' ? 'RPG' : 'RPG', pct: 0 },
        { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: 0 },
        { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: 0 },
        { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: 0 },
        { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: 0 },
      ];
    }

    return [
      { label: lang === 'tr' ? 'RPG' : 'RPG', pct: Math.round((counts.RPG / total) * 100) },
      { label: lang === 'tr' ? 'Aksiyon' : 'Action', pct: Math.round((counts.Action / total) * 100) },
      { label: lang === 'tr' ? 'Strateji' : 'Strategy', pct: Math.round((counts.Strategy / total) * 100) },
      { label: lang === 'tr' ? 'Simülasyon' : 'Simulation', pct: Math.round((counts.Simulation / total) * 100) },
      { label: lang === 'tr' ? 'Bağımsız' : 'Indie', pct: Math.round((counts.Indie / total) * 100) },
    ].filter(g => g.pct > 0).sort((a, b) => b.pct - a.pct);
  };

  const getDynamicAIComment = (genreStats) => {
    if (totalConnectedGames === 0) {
      return lang === 'tr'
        ? 'Henüz bağlı bir kütüphaneniz yok. Steam veya Xbox hesabınızı bağlayarak AI kütüphane analizinizi alabilirsiniz!'
        : 'You do not have a connected library yet. Connect your Steam or Xbox account to get your AI library analysis!';
    }
    
    if (libsLoading) {
      return lang === 'tr' ? 'Kütüphane analiz ediliyor...' : 'Analyzing library...';
    }

    const topGenre = genreStats[0];
    if (!topGenre || topGenre.pct === 0) {
      return lang === 'tr'
        ? 'Geniş bir oyun yelpazesine sahipsiniz. Farklı türlerdeki deneyimleri keşfetmeyi ve yeni maceralara atılmayı seviyorsunuz.'
        : 'You have a broad range of games. You enjoy exploring experiences in different genres and embarking on new adventures.';
    }

    if (topGenre.label === 'RPG') {
      return lang === 'tr'
        ? 'Uzun soluklu single-player RPG\'leri tercih eden, hikayeye önem veren bir profil. Derin karakter gelişimleri ve sürükleyici dünyalar tam size göre.'
        : 'A profile that prefers long-term single-player RPGs, valuing story depth. Deep character progression and immersive worlds are perfect for you.';
    } else if (topGenre.label === 'Aksiyon' || topGenre.label === 'Action') {
      return lang === 'tr'
        ? 'Hızlı refleksler gerektiren, adrenalin dolu aksiyon oyunlarını seviyorsunuz. Rekabetçi arenalar veya sinematik maceralar kütüphanenizin odağında.'
        : 'You love adrenaline-fueled action games requiring quick reflexes. Competitive arenas or cinematic adventures are the focus of your library.';
    } else if (topGenre.label === 'Simülasyon' || topGenre.label === 'Simulation') {
      return lang === 'tr'
        ? 'Detaylara önem veren, yönetim ve simülasyon oyunlarından keyif alan bir oyuncusunuz. Kendi dünyanızı kurup yönetmek sizin işiniz.'
        : 'You are a detail-oriented player who enjoys management and simulation games. Building and managing your own world is your specialty.';
    } else if (topGenre.label === 'Strateji' || topGenre.label === 'Strategy') {
      return lang === 'tr'
        ? 'Zekanızı ve taktiksel düşünme yeteneğinizi ön plana çıkaran strateji oyunlarını tercih ediyorsunuz. Planlama ve zafer odaklı bir oyun tarzınız var.'
        : 'You prefer strategy games that highlight your intellect and tactical thinking. You have a planning and victory-oriented gameplay style.';
    } else { // Indie / Bağımsız
      return lang === 'tr'
        ? 'Yaratıcı tasarımlara sahip, sanatsal yönü güçlü bağımsız oyunları seviyorsunuz. Eşsiz mekanikler ve derin anlatılar sizi cezbediyor.'
        : 'You love indie games with creative designs and strong artistic aspects. Unique mechanics and deep narratives appeal to you.';
    }
  };

  const genreStats = getDynamicGenreStats(steamLib?.games || [], xboxLib?.games || []);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Başlık / User Card */}
      <div className="premium-dashboard-card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '24px 28px',
        marginBottom: 36,
        background: 'linear-gradient(135deg, rgba(201, 133, 10, 0.08), rgba(255, 255, 255, 0.01))',
        border: '1px solid rgba(201, 133, 10, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle ambient light behind avatar */}
        <div style={{
          position: 'absolute',
          top: -20, left: -20,
          width: 120, height: 120,
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
          opacity: 0.5
        }} />

        {steamUser && steamUser.avatar ? (
          <div style={{
            position: 'relative',
            width: 64, height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 16px var(--accent-glow)',
            flexShrink: 0,
            transition: 'transform 0.3s ease'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={steamUser.avatar} 
              alt={user.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-bg), rgba(201, 133, 10, 0.2))',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'var(--accent)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            flexShrink: 0,
            letterSpacing: '0.5px'
          }}>
            {initials}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 2 }}>{user.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
            }} />
            <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 500 }}>
              {lang === 'tr' ? 'Gamerisen Üyesi' : 'Gamerisen Member'}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-two-column">

        {/* Bağlı hesaplar */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {lang === 'tr' ? 'Bağlı Hesaplar' : 'Connected Accounts'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Steam Hesapları */}
            {steamAccounts.length > 0 ? (
              <>
                {steamAccounts.map(account => (
                  <AccountCard
                    key={account.steamId}
                    name={`Steam (${account.name})`}
                    status={lang === 'tr' ? 'Bağlı' : 'Connected'}
                    connected={true}
                    color="#1a9fff"
                    initials="STM"
                    avatar={account.avatar}
                    profileUrl={account.profileUrl || `https://steamcommunity.com/profiles/${account.steamId}`}
                    onToggle={async () => {
                      if (steamLogoutAccount) await steamLogoutAccount(account.steamId);
                    }}
                    lang={lang}
                  />
                ))}
                {steamAccounts.length < 5 && (
                  <button onClick={() => window.location.href = '/api/auth/steam'} style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px dashed #1a9fff', background: 'transparent', color: '#1a9fff',
                    cursor: 'pointer', textAlign: 'center', marginTop: 4, display: 'block', width: '100%'
                  }}>
                    {lang === 'tr' ? '+ Steam Hesabı Ekle' : '+ Add Steam Account'}
                  </button>
                )}
              </>
            ) : (
              <AccountCard
                name="Steam"
                status={lang === 'tr' ? 'Bağlı değil' : 'Not connected'}
                connected={false}
                color="#1a9fff"
                initials="STM"
                profileUrl={null}
                onToggle={() => window.location.href = '/api/auth/steam'}
                lang={lang}
              />
            )}
            {/* Xbox */}
             <AccountCard
              name="Xbox / Game Pass"
              status={
                xboxUser 
                  ? (xboxUser.isMock 
                      ? (lang === 'tr' ? `Simülasyon (Örnek Oyunlar) — ${xboxGamesCount} oyun` : `Simulation (Sample Games) — ${xboxGamesCount} games`) 
                      : (lang === 'tr' ? `Bağlı — ${xboxGamesCount} oyun` : `Connected — ${xboxGamesCount} games`))
                  : (lang === 'tr' ? 'Bağlı değil' : 'Not connected')
              }
              connected={!!xboxUser}
              color="#16a34a"
              initials="XBX"
              avatar={xboxUser?.avatar}
              profileUrl={xboxUser?.gamertag ? `https://live.xbox.com/Profile?Gamertag=${encodeURIComponent(xboxUser.gamertag)}` : null}
              onToggle={() => {
                if (xboxUser) {
                  xboxLogout();
                } else {
                  window.location.href = '/api/auth/xbox';
                }
              }}
              lang={lang}
            />
            {xboxUser?.isMock && (
              <div style={{
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 10,
                padding: '10px 14px', marginTop: 12, fontSize: 12, color: 'var(--accent)',
                display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <div>
                  {lang === 'tr' 
                    ? 'Xbox hesabınız Gamertag simülasyonu ile bağlı olduğundan test amaçlı örnek oyunlar ve istatistikler gösterilmektedir. Gerçek kütüphaneniz için resmi Microsoft bağlantısını kullanın.' 
                    : 'Since your Xbox account is connected via Gamertag simulation, sample games and stats are shown for testing. Use the official Microsoft connection for your real library.'}
                </div>
              </div>
            )}

            {/* Epic Games (Coming Soon) */}
            <div className="premium-dashboard-card" style={{ 
              padding: '12px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: 12, 
              opacity: 0.6, 
              marginTop: 4, 
              minWidth: 0,
              cursor: 'not-allowed'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: `rgba(255,255,255,0.02)`,
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <EpicLogo size={18} color="#666" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Epic Games</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang === 'tr' ? 'Bağlı değil' : 'Not connected'}</p>
                </div>
              </div>
              <button disabled style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-3)',
                cursor: 'not-allowed',
                flexShrink: 0,
              }}>
                {lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
              </button>
            </div>
          </div>
        </div>

        {/* Sağ Sütun */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* AI analiz */}
          <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {lang === 'tr' ? 'AI Oyuncu Analizi' : 'AI Player Analysis'}
          </h2>
          <div className="profile-stats-grid">
            <StatCard 
              number={steamUser ? (steamLib?.games?.length || (ownedGames?.size || 0) || 0).toString() : "0"} 
              label={lang === 'tr' ? 'Steam Oyunu' : 'Steam Games'} 
            />
            <StatCard 
              number={getPlaytimeStat()} 
              label={lang === 'tr' ? 'Ort. Oynama' : 'Avg. Playtime'} 
            />
            <StatCard 
              number={getCompletionStat()}  
              label={lang === 'tr' ? 'Tamamlama' : 'Completion'} 
              isAccent={true}
            />
          </div>

          <div 
            className="premium-dashboard-card" 
            style={{ 
              padding: '20px 24px', 
              marginBottom: 16, 
              border: '1px solid rgba(201, 133, 10, 0.2)', 
              boxShadow: '0 8px 32px var(--accent-glow)',
              position: 'relative'
            }}
          >
            <p style={{ 
              fontSize: 11, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: 'var(--text-3)', 
              fontWeight: 700, 
              marginBottom: 14 
            }}>
              {lang === 'tr' ? 'En Çok Oynanan Türler' : 'Your Top Played Genres'}
            </p>
            <div style={{ marginTop: 24, padding: '0 10px' }}>
              <DonutChart data={genreStats} lang={lang} />
            </div>
          </div>

          <div 
            className="premium-dashboard-card" 
            style={{ 
              padding: '18px 20px',
              borderLeft: '3px solid #8b5cf6', // Soft purple intelligence vibe
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(255, 255, 255, 0.01))'
            }}
          >
            <p style={{ 
              fontSize: 11, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: '#a78bfa', // Purple tint text for AI
              fontWeight: 700, 
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ fontSize: 12 }}>✦</span>
              {lang === 'tr' ? 'AI Oyuncu Yorumu' : 'AI Player Feedback'}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, fontWeight: 500 }}>
              {getDynamicAIComment(genreStats)}
            </p>
          </div>
          
          {/* Ayarlar (Settings) */}
          <div>
            <h2 className="section-title" style={{ fontSize: 16 }}>
              {lang === 'tr' ? 'Ayarlar' : 'Settings'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ChangePasswordCard changePassword={changePassword} lang={lang} />
              <DeleteAccountCard deleteAccount={deleteAccount} lang={lang} />
            </div>
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
          <div className="premium-dashboard-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>
              {lang === 'tr' ? 'Henüz istek listenizde oyun yok.' : 'No games in your wishlist yet.'}
            </p>
            <Link href="/" style={{
              display: 'inline-block', padding: '10px 22px', borderRadius: 10,
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              color: 'var(--accent)', fontSize: 13.5, fontWeight: 700,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
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
        <div className="premium-dashboard-card" style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(201, 133, 10, 0.08), rgba(255, 255, 255, 0.01))',
          border: '1px solid rgba(201, 133, 10, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                ✦ {lang === 'tr' ? 'Bugün İçin Öneri' : 'Recommendation for Today'}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{recommended.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {lang === 'tr' ? recommended.descTr : recommended.descEn}
              </p>
            </div>
            <Link href={`/game/rawg/${recommended.slug}`} style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px var(--accent-glow)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px var(--accent-glow)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow)';
            }}
            >
              {lang === 'tr' ? 'İncele →' : 'View →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ name, status, connected, color, initials, onToggle, lang, profileUrl, avatar }) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, 
        background: connected ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${connected ? `${color}40` : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: connected ? color : 'var(--text-3)', 
        flexShrink: 0,
        boxShadow: connected ? `0 0 10px ${color}15` : 'none',
        transition: 'all 0.25s',
        overflow: 'hidden'
      }}>
        {avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ 
          fontSize: 13.5, 
          fontWeight: 600, 
          color: 'var(--text)', 
          textDecoration: 'none', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          transition: 'color 0.2s'
        }} className="account-card-title">
          {name}
        </p>
        <p style={{ 
          fontSize: 12, 
          color: connected ? 'var(--green)' : 'var(--text-3)', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {connected && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />}
          {status}
        </p>
      </div>
    </div>
  );

  return (
    <div 
      className="premium-dashboard-card" 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        padding: '12px 14px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 12, 
        minWidth: 0,
        borderColor: hovered ? (connected ? color : 'var(--accent)') : 'var(--border)',
        boxShadow: hovered ? `0 8px 24px -6px rgba(0,0,0,0.4), 0 0 0 1px ${connected ? `${color}30` : 'var(--accent-glow)'}` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}
    >
      {profileUrl ? (
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', minWidth: 0, flex: 1, alignItems: 'center' }}>
          {content}
        </a>
      ) : (
        content
      )}
      <button 
        onClick={onToggle} 
        style={{
          padding: '6px 14px', 
          borderRadius: 8, 
          fontSize: 11.5, 
          fontWeight: 700,
          border: connected ? '1px solid var(--border)' : `1px solid ${color}`,
          background: connected ? 'var(--bg-input)' : `linear-gradient(135deg, ${color}15, ${color}05)`,
          color: connected ? 'var(--text-2)' : color,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s',
          boxShadow: !connected && hovered ? `0 0 12px ${color}30` : 'none'
        }}
        onMouseEnter={(e) => {
          if (!connected) {
            e.currentTarget.style.background = color;
            e.currentTarget.style.color = '#fff';
          } else {
            e.currentTarget.style.borderColor = '#ef4444';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!connected) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${color}15, ${color}05)`;
            e.currentTarget.style.color = color;
          } else {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-2)';
            e.currentTarget.style.background = 'var(--bg-input)';
          }
        }}
      >
        {connected 
          ? (lang === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect') 
          : (lang === 'tr' ? 'Bağla' : 'Connect')}
      </button>
    </div>
  );
}

function StatCard({ number, label, isAccent = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="premium-dashboard-card" 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 12px',
        textAlign: 'center',
        flex: 1,
        minWidth: 90,
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 28px -8px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}
    >
      <p className={isAccent ? "glowing-accent-stat-number" : "glowing-stat-number"}>
        {number}
      </p>
      <p style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--text-3)',
        marginTop: 6,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {label}
      </p>
    </div>
  );
}

function WishlistItem({ game, onRemove, lang }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 8, background: 'var(--bg-input)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'var(--text-3)',
        flexShrink: 0, overflow: 'hidden', position: 'relative',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <GameImage game={game} fill sizes="44px" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`}>
          <p 
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: hovered ? 'var(--accent)' : 'var(--text)', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              transition: 'color 0.2s'
            }}
          >
            {game.name}
          </p>
        </Link>
        <p style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--accent)', fontSize: 10 }}>🔔</span>
          {lang === 'tr' ? 'Fiyat Alarmı Aktif' : 'Price Alert Active'}
        </p>
      </div>
      <button 
        onClick={onRemove} 
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-3)', fontSize: 20, cursor: 'pointer',
          flexShrink: 0, padding: '4px 8px',
          transition: 'all 0.2s',
        }} 
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.transform = 'scale(1)'; }}
        title={lang === 'tr' ? 'Kaldır' : 'Remove'}
      >
        ×
      </button>
    </div>
  );
}

function ChangePasswordCard({ changePassword, lang }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError(lang === 'tr' ? 'Yeni şifre en az 6 karakter olmalıdır.' : 'New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await changePassword({ currentPassword, newPassword });
    setLoading(false);

    if (res.ok) {
      setSuccess(
        res.mock
          ? (lang === 'tr' ? 'Şifre başarıyla değiştirildi (Simülasyon Modu).' : 'Password successfully changed (Simulation Mode).')
          : (lang === 'tr' ? 'Şifreniz başarıyla değiştirildi!' : 'Your password has been successfully changed!')
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 40px 10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    background: 'var(--bg-card)',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 6,
    letterSpacing: '0.2px'
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-3)',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  };

  const EyeIcon = ({ show }) => (
    show ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  );

  return (
    <div className="premium-dashboard-card" style={{ marginTop: 24, padding: '24px' }}>
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 16,
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        {lang === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
      </h3>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--accent)',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green-border)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--green)',
          }}>
            {success}
          </div>
        )}

        {/* Mevcut Şifre */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            {lang === 'tr' ? 'Mevcut Şifre' : 'Current Password'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="premium-glass-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={eyeButtonStyle}
              tabIndex="-1"
            >
              <EyeIcon show={showCurrent} />
            </button>
          </div>
        </div>

        {/* Yeni Şifre */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            {lang === 'tr' ? 'Yeni Şifre' : 'New Password'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="premium-glass-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={eyeButtonStyle}
              tabIndex="-1"
            >
              <EyeIcon show={showNew} />
            </button>
          </div>
        </div>

        {/* Yeni Şifre Tekrar */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            {lang === 'tr' ? 'Yeni Şifre Tekrar' : 'Confirm New Password'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="premium-glass-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={eyeButtonStyle}
              tabIndex="-1"
            >
              <EyeIcon show={showConfirm} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-glow)';
          }}
        >
          {loading
            ? (lang === 'tr' ? 'Güncelleniyor...' : 'Updating...')
            : (lang === 'tr' ? 'Şifreyi Güncelle' : 'Update Password')}
        </button>
      </form>
    </div>
  );
}

function DeleteAccountCard({ deleteAccount, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState(1); // 1: Warning, 2: Password prompt
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await deleteAccount(password);
    setLoading(false);

    if (res.ok) {
      try {
        localStorage.removeItem('gamerisen_wishlist');
        localStorage.removeItem('gamepick_wishlist');
        sessionStorage.clear();
      } catch {}
      window.location.href = '/';
    } else {
      setError(res.error || (lang === 'tr' ? 'Hesap silinirken bir hata oluştu.' : 'An error occurred while deleting your account.'));
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStage(1);
    setPassword('');
    setError('');
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 40px 10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    background: 'var(--bg-card)',
    transition: 'border-color 0.15s',
  };

  return (
    <div className="premium-dashboard-card" style={{ marginTop: 20, padding: '24px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.02), rgba(255, 255, 255, 0.01))' }}>
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        marginBottom: 8,
        color: '#ef4444',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
        </svg>
        {lang === 'tr' ? 'Tehlikeli Bölge' : 'Danger Zone'}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.4 }}>
        {lang === 'tr' 
          ? 'Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.' 
          : 'Permanently delete your account and all associated data. This action is irreversible.'}
      </p>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '11px',
          background: 'transparent',
          color: '#ef4444',
          border: '1.5px solid #ef4444',
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.background = '#ef4444'; 
          e.currentTarget.style.color = '#fff'; 
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.3)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.background = 'transparent'; 
          e.currentTarget.style.color = '#ef4444'; 
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {lang === 'tr' ? 'Hesabımı Sil' : 'Delete My Account'}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div className="premium-dashboard-card" style={{
            width: '100%', maxWidth: 400, padding: 32,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'var(--bg-card)',
            animation: 'fadeIn 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
            position: 'relative'
          }}>
            {stage === 1 ? (
              <div>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  color: '#ef4444'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, textAlign: 'center', color: 'var(--text)', marginBottom: 12 }}>
                  {lang === 'tr' ? 'Emin misiniz?' : 'Are you sure?'}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, textAlign: 'center', marginBottom: 24 }}>
                  {lang === 'tr'
                    ? 'Bu işlem hesabınızı, bağlı kütüphanelerinizi ve istek listenizi kalıcı olarak silecektir. Bu işlem kesinlikle geri alınamaz.'
                    : 'This action will permanently delete your account, connected libraries, and wishlist. This action cannot be undone.'}
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleClose}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-input)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  >
                    {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => setStage(2)}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                      background: '#ef4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#dc2626';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                  >
                    {lang === 'tr' ? 'Devam Et' : 'Continue'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDelete}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
                  {lang === 'tr' ? 'Şifrenizi Girin' : 'Enter Password'}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', marginBottom: 20 }}>
                  {lang === 'tr'
                    ? 'Hesap silme işlemini onaylamak için lütfen şifrenizi girin.'
                    : 'Please enter your password to confirm account deletion.'}
                </p>

                {error && (
                  <div style={{
                    background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    fontSize: 13, color: 'var(--accent)',
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: 24, position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="premium-glass-input"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                      display: 'flex', alignItems: 'center', padding: 0
                    }}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--bg-input)', color: 'var(--text-2)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                      opacity: loading ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  >
                    {lang === 'tr' ? 'İptal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                      background: '#ef4444', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                      opacity: loading ? 0.7 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#dc2626';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                  >
                    {loading ? (lang === 'tr' ? 'Siliniyor...' : 'Deleting...') : (lang === 'tr' ? 'Hesabı Sil' : 'Delete')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EpicLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M10.82 17.653c-1.503 0-2.812-1.026-3.08-2.476-.492-2.348 1.488-4.364 3.86-4.116 1.107.13 2.052.793 2.564 1.777l1.96-1.157C15.228 10.02 13.565 9 11.59 9c-3.157 0-5.748 2.454-6.027 5.568-.316 3.518 2.705 6.485 6.273 6.136 2.23-.217 4.15-1.534 5.094-3.522l-1.925-1.092c-.67 1.43-2.186 2.37-3.87 2.37M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12m-6.49-1.956h-2.19v6.52h2.19z"/>
    </svg>
  );
}

function DonutChart({ data, lang }) {
  if (!data || data.length === 0 || data.every(d => d.pct === 0)) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Veri Yok' : 'No Data'}</div>;
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const colors = [
    'var(--accent)',        // Gold
    '#22c55e',              // Green
    '#3b82f6',              // Blue
    '#a855f7',              // Purple
    '#ef4444'               // Red
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div className="donut-chart-container" style={{ flexShrink: 0 }}>
        <svg viewBox="0 0 120 120" className="donut-chart-svg">
          <circle cx="60" cy="60" r={radius} className="donut-chart-circle donut-chart-bg" />
          
          {data.map((item, i) => {
            if (item.pct === 0) return null;
            const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (item.pct / 100) * circumference;

            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                className="donut-chart-circle"
                style={{
                  stroke: colors[i % colors.length],
                  strokeDasharray: strokeDasharray,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            );
          })}
        </svg>
        <div className="donut-chart-center">
          <span className="donut-chart-value">{data[0]?.pct || 0}%</span>
          <span className="donut-chart-label" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data[0]?.label || ''}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 120 }}>
        {data.slice(0, 4).map((item, i) => {
          if (item.pct === 0) return null;
          return (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}80` }} />
                <span style={{ color: 'var(--text-2)' }}>{item.label}</span>
              </div>
              <span style={{ color: 'var(--text)' }}>{item.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

