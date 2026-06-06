'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

// Demo kütüphane oyunları — gerçek OAuth bağlantısı olunca bu kısım API'den gelecek
const DEMO_STEAM = [
  { id: 292030, name: 'The Witcher 3', platform: 'steam', hours: 148, image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg' },
  { id: 3498,   name: 'Grand Theft Auto V', platform: 'steam', hours: 62, image: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060601f68f6aa07.jpg' },
  { id: 5679,   name: 'The Elder Scrolls V: Skyrim', platform: 'steam', hours: 210, image: 'https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd5.jpg' },
  { id: 13536,  name: 'Portal 2', platform: 'steam', hours: 18, image: 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg' },
  { id: 4200,   name: 'Portal', platform: 'steam', hours: 8, image: 'https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32490e953a4996.jpg' },
];

const DEMO_EPIC = [
  { id: 58175,  name: 'GTA V (Epic)', platform: 'epic', hours: 12, image: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060601f68f6aa07.jpg' },
  { id: 83893,  name: 'Rocket League', platform: 'epic', hours: 34, image: 'https://media.rawg.io/media/games/226/2262de07816b0c4cd30e1b47def4f40b.jpg' },
];

const DEMO_XBOX = [
  { id: 34010,  name: 'Hades', platform: 'xbox', hours: 42, image: 'https://media.rawg.io/media/games/1f4/1f47a270b8f241f1b6ebb9194f30f46a.jpg', isGP: true },
  { id: 3070,   name: 'Forza Horizon 5', platform: 'xbox', hours: 85, image: 'https://media.rawg.io/media/games/b73/b73916ee65fc6b808ccd1a5c4ae9949e.jpg', isGP: true },
  { id: 11859,  name: 'Minecraft', platform: 'xbox', hours: 320, image: 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4a8f4d4.jpg', isGP: true },
];

const PLATFORM_COLORS = {
  steam: '#1a9fff',
  epic:  '#DC2626',
  xbox:  '#16a34a',
};
const PLATFORM_LABELS = {
  steam: 'Steam',
  epic:  'Epic Games',
  xbox:  'Xbox / GP',
};

export default function LibraryPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [steam, setSteam] = useState(false);
  const [epic,  setEpic]  = useState(false);
  const [xbox,  setXbox]  = useState(false);
  const [filter, setFilter] = useState('all');   // all | steam | epic | xbox | gp
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState('hours'); // hours | name | platform

  useEffect(() => {
    setSteam(localStorage.getItem('gp_steam') === '1');
    setEpic (localStorage.getItem('gp_epic')  === '1');
    setXbox (localStorage.getItem('gp_xbox')  !== '0');
  }, []);

  const connect = (platform) => {
    if (platform === 'steam') { setSteam(true); localStorage.setItem('gp_steam', '1'); }
    if (platform === 'epic')  { setEpic(true);  localStorage.setItem('gp_epic',  '1'); }
    if (platform === 'xbox')  { setXbox(true);  localStorage.setItem('gp_xbox',  '1'); }
  };
  const disconnect = (platform) => {
    if (platform === 'steam') { setSteam(false); localStorage.setItem('gp_steam', '0'); }
    if (platform === 'epic')  { setEpic(false);  localStorage.setItem('gp_epic',  '0'); }
    if (platform === 'xbox')  { setXbox(false);  localStorage.setItem('gp_xbox',  '0'); }
  };

  // Kütüphaneyi birleştir
  const allGames = [
    ...(steam ? DEMO_STEAM : []),
    ...(epic  ? DEMO_EPIC  : []),
    ...(xbox  ? DEMO_XBOX  : []),
  ];

  const filtered = allGames
    .filter(g => {
      if (filter === 'gp')     return g.isGP;
      if (filter !== 'all')    return g.platform === filter;
      return true;
    })
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'hours') return (b.hours || 0) - (a.hours || 0);
      if (sort === 'name')  return a.name.localeCompare(b.name);
      return a.platform.localeCompare(b.platform);
    });

  const totalHours = allGames.reduce((s, g) => s + (g.hours || 0), 0);
  const gpCount    = allGames.filter(g => g.isGP).length;
  const connected  = [steam && 'steam', epic && 'epic', xbox && 'xbox'].filter(Boolean);

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🔒</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>Kütüphaneye erişmek için giriş yap</h2>
        <p style={{ color: '#999', marginBottom: 24, fontSize: 14 }}>Steam, Epic ve Xbox hesaplarını bağlamak için üye olman gerekiyor.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/signup" className="btn btn-red">Ücretsiz Kayıt →</Link>
          <Link href="/login"  className="btn btn-ghost">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

      {/* Başlık */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Kütüphanem</h1>
        <p style={{ color: '#999', fontSize: 14 }}>Tüm hesaplarındaki oyunlar tek ekranda</p>
      </div>

      {/* Hesap bağlama kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <PlatformCard
          name="Steam" platform="steam"
          connected={steam} color="#1a9fff" initials="S"
          detail={steam ? `${DEMO_STEAM.length} oyun` : 'Bağlı değil'}
          onConnect={() => connect('steam')} onDisconnect={() => disconnect('steam')}
        />
        <PlatformCard
          name="Epic Games" platform="epic"
          connected={epic} color="#DC2626" initials="E"
          detail={epic ? `${DEMO_EPIC.length} oyun` : 'Bağlı değil'}
          onConnect={() => connect('epic')} onDisconnect={() => disconnect('epic')}
        />
        <PlatformCard
          name="Xbox / Game Pass" platform="xbox"
          connected={xbox} color="#16a34a" initials="X"
          detail={xbox ? `${DEMO_XBOX.length} oyun — GP Ultimate` : 'Bağlı değil'}
          onConnect={() => connect('xbox')} onDisconnect={() => disconnect('xbox')}
        />
      </div>

      {/* Özet istatistikler */}
      {connected.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Toplam Oyun',  value: allGames.length },
            { label: 'Game Pass',    value: gpCount },
            { label: 'Toplam Saat', value: `${totalHours}s` },
            { label: 'Platform',    value: connected.length },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {allGames.length === 0 ? (
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🎮</p>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
            Henüz bağlı hesap yok
          </h3>
          <p style={{ color: '#999', fontSize: 14 }}>
            Yukarıdan Steam, Epic veya Xbox hesabını bağla ve oyunlarını görmeye başla.
          </p>
        </div>
      ) : (
        <>
          {/* Filtreler + Arama */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Platform filtresi */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Tümü',     value: 'all' },
                { label: '🔵 Steam', value: 'steam' },
                { label: '🔴 Epic',  value: 'epic' },
                { label: '🟢 Xbox',  value: 'xbox' },
                { label: '✦ GP',     value: 'gp' },
              ].filter(f => f.value === 'all' || connected.includes(f.value) || f.value === 'gp').map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, border: 'none',
                    background: filter === f.value ? '#DC2626' : '#f5f5f5',
                    color:      filter === f.value ? '#fff'    : '#555',
                    cursor: 'pointer', fontWeight: filter === f.value ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sıralama */}
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 13, color: '#333', background: '#fff', marginLeft: 'auto' }}
            >
              <option value="hours">Oynama saati ↓</option>
              <option value="name">İsim A-Z</option>
              <option value="platform">Platform</option>
            </select>

            {/* Arama */}
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Oyun ara..."
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e5e5e5',
                fontSize: 13, color: '#333', outline: 'none', background: '#fff',
              }}
            />
          </div>

          {/* Sonuç sayısı */}
          <p style={{ fontSize: 13, color: '#999', marginBottom: 14 }}>{filtered.length} oyun</p>

          {/* Oyun listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(game => (
              <LibraryRow key={`${game.id}-${game.platform}`} game={game} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlatformCard({ name, connected, color, initials, detail, onConnect, onDisconnect }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{name}</p>
          <p style={{ fontSize: 12, color: connected ? '#16a34a' : '#bbb' }}>{detail}</p>
        </div>
      </div>
      <button
        onClick={connected ? onDisconnect : onConnect}
        style={{
          width: '100%', padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: connected ? '1px solid #e5e5e5' : '1px solid #FECACA',
          background: connected ? '#f5f5f5' : '#FEF2F2',
          color: connected ? '#999' : '#DC2626',
          cursor: 'pointer',
        }}
      >
        {connected ? 'Bağlantıyı Kes' : 'Bağla →'}
      </button>
    </div>
  );
}

function LibraryRow({ game }) {
  return (
    <Link href={`/game/${game.id}`}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 14px', borderRadius: 10, background: '#fff',
        border: '1px solid #f0f0f0', marginBottom: 4,
        transition: 'border-color 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#FECACA'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}
      >
        {/* Thumbnail */}
        <div style={{
          width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
          background: '#f5f5f5', flexShrink: 0, position: 'relative',
        }}>
          {game.image ? (
            <Image src={game.image} alt={game.name} fill style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 14, fontWeight: 700 }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* İsim + etiketler */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {game.name}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: `${PLATFORM_COLORS[game.platform]}18`,
              color: PLATFORM_COLORS[game.platform],
            }}>
              {PLATFORM_LABELS[game.platform]}
            </span>
            {game.isGP && <span className="badge badge-green" style={{ fontSize: 10 }}>Game Pass</span>}
          </div>
        </div>

        {/* Saat */}
        {game.hours && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{game.hours}s</p>
            <p style={{ fontSize: 11, color: '#bbb' }}>oynandı</p>
          </div>
        )}
      </div>
    </Link>
  );
}
