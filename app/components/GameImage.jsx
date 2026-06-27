'use client';

import { useState, useEffect } from 'react';


const GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink to Rose
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan to Blue
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', // Emerald to Teal
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber to Orange
  'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', // Blue to Indigo
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', // Purple to Pink
];

const getGradient = (name) => {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
};

const SLUG_TO_STEAM_ID = {
  'elden-ring': '1245620',
  'grand-theft-auto-v': '271590',
  'cyberpunk-2077': '1091500',
  'lethal-company': '1966720',
  'palworld': '1623730',
  'balatro': '2379780',
  'manor-lords': '1363080',
  'phasmophobia': '739630',
  'baldurs-gate-3': '1086940',
  'counter-strike-2': '730',
  'battlefield-2042': '1517290',
  'battlefield-6': '1517290',
  'rust': '252490',
  'world-of-warships': '552990',
  'chained-together': '2833600',
  'bodycam': '2406770',
  'content-warning': '2881650',
  'buckshot-roulette': '2835570',
  'supermarket-simulator': '2670630',
  'nine-sols': '1809540',
  'helldivers-2': '553850',
  'among-us': '945360',
  'meccha-chameleon': '4704690',
  'forza-horizon-6': '2483190',
  'football-manager-26': '3551390',
  'football-manager-2026': '3551390',
  'tbh-task-bar-hero': '3678970',
  'task-bar-hero': '3678970',
  '007-first-light': '1659040'
};

const ID_TO_STEAM_ID = {
  326243: '1245620',   // Elden Ring
  3498: '271590',      // GTA V
  41494: '1091500',    // Cyberpunk 2077
  968329: '1966720',   // Lethal Company
  718135: '1623730',   // Palworld
  977316: '2379780',   // Balatro
  496652: '1363080',   // Manor Lords
  427930: '739630',    // Phasmophobia
  4970: '1086940',     // Baldur's Gate 3
  965470: '730',       // CS2
  643632: '1517290',   // Battlefield 2042
  10533: '252490',     // Rust
  50005: '552990',     // World of Warships
  617010: '2833600',   // Chained Together
  983289: '2406770',   // Bodycam
  979524: '2881650',   // Content Warning
  974482: '2835570',   // Buckshot Roulette
  977230: '2670630',   // Supermarket Simulator
  906504: '1809540',   // Nine Sols
  976564: '553850',    // Helldivers 2
  356714: '945360',    // Among Us
  4704690: '4704690'   // Meccha Chameleon
};

export default function GameImage({
  game,
  alt = '',
  fill = false,
  width,
  height,
  sizes,
  style = {},
  className = '',
  unoptimized = true,
  priority = false,
  isVertical = false,
}) {
  const [imgStage, setImgStage] = useState(0); // 0: game.image, 1: capsule, 2: logo, 3+: initials placeholder

  useEffect(() => {
    setImgStage(0);
  }, [game?.image, game?.logo]);

  if (!game) return null;

  const getSteamAppId = () => {
    // 1. Keyword check for Battlefield games first to return a working version
    const nameLower = (game.name || '').toLowerCase();
    if (nameLower.includes('battlefield')) {
      if (nameLower.includes('2042') || nameLower.includes('6')) return '1517290';
      if (nameLower.includes('v') || nameLower.includes(' 5')) return '1238810';
      if (nameLower.includes('1')) return '1238840';
      if (nameLower.includes('4')) return '1238860';
      if (nameLower.includes('3')) return '1238820';
      return '1517290'; // default Battlefield 2042 fallback
    }

    // Name-based fallback mapping for unreleased/new games
    if (nameLower.includes('forza horizon 6')) return '2483190';
    if (nameLower.includes('football manager 26') || nameLower.includes('football manager 2026')) return '3551390';
    if (nameLower.includes('task bar hero') || nameLower.startsWith('tbh')) return '3678970';
    if (nameLower.includes('007 first light')) return '1659040';

    if (game.appid) return game.appid;
    if (game.steamAppId) return game.steamAppId;
    if (game.steamAppid) return game.steamAppid;
    if (game.steam_appid) return game.steam_appid;

    if (game.image) {
      const match = game.image.match(/\/apps\/(\d+)\//);
      if (match) return match[1];
    }
    
    if (game.logo) {
      const match = game.logo.match(/\/apps\/(\d+)\//);
      if (match) return match[1];
    }

    if (game.steamUrl) {
      const match = game.steamUrl.match(/\/app\/(\d+)/);
      if (match) return match[1];
    }

    if (game.storeUrl) {
      const match = game.storeUrl.match(/\/app\/(\d+)/);
      if (match) return match[1];
    }

    const slug = game.rawgSlug || game.slug;
    const rawgId = game.rawgId || game.id;
    
    if (slug && SLUG_TO_STEAM_ID[slug]) {
      return SLUG_TO_STEAM_ID[slug];
    }
    
    if (rawgId) {
      const numericId = Number(String(rawgId).replace('rawg_', ''));
      if (ID_TO_STEAM_ID[numericId]) {
        return ID_TO_STEAM_ID[numericId];
      }
    }
    
    return null;
  };

  const getImgSrc = (stage) => {
    if (isVertical) {
      if (stage === 0) {
        const appid = getSteamAppId();
        if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`;
        return getImgSrc(1);
      }
      if (stage === 1) {
        return game.image || getImgSrc(2);
      }
      if (stage === 2) {
        const appid = getSteamAppId();
        if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_231x87.jpg`;
        return getImgSrc(3);
      }
      if (stage === 3) {
        const appid = getSteamAppId();
        if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_sm_120.jpg`;
        return null;
      }
    } else {
      if (stage === 0) {
        return game.image || getImgSrc(1);
      }
      if (stage === 1) {
        if (game.logo) return game.logo.replace('capsule_sm_120.jpg', 'capsule_231x87.jpg');
        const appid = getSteamAppId();
        if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_231x87.jpg`;
        return getImgSrc(2);
      }
      if (stage === 2) {
        if (game.logo) return game.logo;
        const appid = getSteamAppId();
        if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_sm_120.jpg`;
        return null;
      }
    }
    return null;
  };

  const currentImgSrc = getImgSrc(imgStage);

  if (currentImgSrc) {
    return (
      <img
        key={`${game.id || game.name}-${imgStage}`}
        src={currentImgSrc}
        alt={alt || game.name || ''}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          objectFit: 'cover',
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          position: fill ? 'absolute' : undefined,
          inset: fill ? 0 : undefined,
          ...style
        }}
        className={className}
        onError={() => {
          setImgStage(prev => prev + 1);
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > 0 && (img.naturalWidth < 30 || img.naturalHeight < 30)) {
            // Steam placeholder image detected! Increment stage to try fallback or initials
            setImgStage(prev => prev + 1);
          }
        }}
      />
    );
  }

  // Fallback to beautiful gradient with initials
  const initials = game.name
    ? game.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'GP';

  return (
    <div
      style={{
        width: fill ? '100%' : width,
        height: fill ? '100%' : height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: fill ? '22px' : '14px',
        color: '#fff',
        background: getGradient(game.name),
        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        userSelect: 'none',
        borderRadius: 'inherit',
        position: 'absolute',
        inset: 0,
        ...style,
      }}
      className={className}
    >
      {initials}
    </div>
  );
}
