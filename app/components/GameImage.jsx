'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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
}) {
  const [imgStage, setImgStage] = useState(0); // 0: game.image, 1: capsule, 2: logo, 3+: initials placeholder

  useEffect(() => {
    setImgStage(0);
  }, [game?.image, game?.logo]);

  if (!game) return null;

  const getImgSrc = (stage) => {
    if (stage === 0) {
      return game.image || getImgSrc(1);
    }
    if (stage === 1) {
      if (game.logo) return game.logo.replace('capsule_sm_120.jpg', 'capsule_231x87.jpg');
      const appid = game.rawgId || (typeof game.id === 'string' && game.id.startsWith('rawg_') ? game.id.split('_')[1] : null);
      if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_231x87.jpg`;
      return getImgSrc(2);
    }
    if (stage === 2) {
      if (game.logo) return game.logo;
      const appid = game.rawgId || (typeof game.id === 'string' && game.id.startsWith('rawg_') ? game.id.split('_')[1] : null);
      if (appid) return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_sm_120.jpg`;
      return null;
    }
    return null;
  };

  const currentImgSrc = getImgSrc(imgStage);

  if (currentImgSrc) {
    return (
      <Image
        src={currentImgSrc}
        alt={alt || game.name || ''}
        fill={fill}
        width={width}
        height={height}
        sizes={sizes}
        style={{ objectFit: 'cover', ...style }}
        className={className}
        unoptimized={unoptimized}
        priority={priority}
        onError={() => {
          setImgStage(prev => prev + 1);
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
