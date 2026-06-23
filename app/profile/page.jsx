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
    steamLogout, 
    xboxLogout,
    changePassword
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
    : user.email.slice(0, 2).toUpperCase();

  // Connected accounts game sizes
  const steamGamesCount = steamUser ? (steamLib?.games?.length || ownedGames.size || 0) : 0;
  const xboxGamesCount = xboxUser ? (xboxLib?.games?.length || xboxOwnedGames.size + gamePassGames.size || 0) : 0;

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
            {lang === 'tr' ? 'Gamerisen Üyesi' : 'Gamerisen Member'}
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
            {/* Steam Hesapları */}
            {steamAccounts.length > 0 ? (
              <>
                {steamAccounts.map(account => (
                  <AccountCard
                    key={account.steamId}
                    name={\`Steam (\${account.name})\`}
                    status={lang === 'tr' ? 'Bağlı' : 'Connected'}
                    connected={true}
                    color="#1a9fff"
                    initials="STM"
                    profileUrl={account.profileUrl || \`https://steamcommunity.com/profiles/\${account.steamId}\`}
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
            <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: 0.7, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, background: `#2A2A2A18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <EpicLogo size={18} color="#888" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Epic Games</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{lang === 'tr' ? 'Bağlı değil' : 'Not connected'}</p>
                </div>
              </div>
              <button disabled style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-3)',
                cursor: 'not-allowed',
              }}>
                {lang === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
              </button>
            </div>
          </div>
          <ChangePasswordCard changePassword={changePassword} lang={lang} />
        </div>

        {/* AI analiz */}
        <div>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {lang === 'tr' ? 'AI Oyuncu Analizi' : 'AI Player Analysis'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            <StatCard 
              number={steamUser ? (steamLib?.games?.length || ownedGames.size || 0).toString() : "0"} 
              label={lang === 'tr' ? 'Steam Oyunu' : 'Steam Games'} 
            />
            <StatCard 
              number={getPlaytimeStat()} 
              label={lang === 'tr' ? 'Ort. Oynama' : 'Avg. Playtime'} 
            />
            <StatCard 
              number={getCompletionStat()}  
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
              {getDynamicAIComment(genreStats)}
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
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{recommended.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {lang === 'tr' ? recommended.descTr : recommended.descEn}
              </p>
            </div>
            <Link href={`/game/rawg/${recommended.slug}`} style={{
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

function AccountCard({ name, status, connected, color, initials, onToggle, lang, profileUrl }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: profileUrl ? 'underline' : 'none' }}>{name}</p>
        <p style={{ fontSize: 12, color: connected ? 'var(--green)' : 'var(--text-3)' }}>{status}</p>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {profileUrl ? (
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
          {content}
        </a>
      ) : (
        content
      )}
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
        <Link href={game.rawgSlug ? `/game/rawg/${game.rawgSlug}` : `/game/rawg/${game.id}`}>
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
    <div className="card" style={{ marginTop: 24, padding: '20px' }}>
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
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
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
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
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
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
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
            padding: '11px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s',
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

function EpicLogo({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M10.82 17.653c-1.503 0-2.812-1.026-3.08-2.476-.492-2.348 1.488-4.364 3.86-4.116 1.107.13 2.052.793 2.564 1.777l1.96-1.157C15.228 10.02 13.565 9 11.59 9c-3.157 0-5.748 2.454-6.027 5.568-.316 3.518 2.705 6.485 6.273 6.136 2.23-.217 4.15-1.534 5.094-3.522l-1.925-1.092c-.67 1.43-2.186 2.37-3.87 2.37M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12m-6.49-1.956h-2.19v6.52h2.19z"/>
    </svg>
  );
}
