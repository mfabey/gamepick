'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function GameCard({ game, compact = false }) {
  const [hovered, setHovered] = useState(false);

  const isFree    = game.isFree || game.gamePass;
  const isOnSale  = game.onSale && !isFree;

  // Kart boyutu
  const width  = compact ? 160 : 200;
  const imgH   = compact ? 90  : 110;

  const glowClass = isFree ? 'glow-green' : isOnSale ? 'glow-orange' : '';

  return (
    <Link href={`/game/${game.id}`} style={{ flexShrink: 0, width: compact ? width : undefined }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={glowClass}
        style={{
          background: '#fff',
          border: `1.5px solid ${hovered ? '#FECACA' : '#ebebeb'}`,
          borderRadius: 14,
          overflow: 'hidden',
          transition: 'border-color 0.15s, transform 0.15s',
          transform: hovered ? 'translateY(-2px)' : 'none',
          cursor: 'pointer',
          width: compact ? width : undefined,
        }}
      >
        {/* Kapak resmi */}
        <div style={{ height: imgH, background: '#f0f0f0', position: 'relative', overflow: 'hidden' }}>
          {game.image ? (
            <Image src={game.image} alt={game.name} fill sizes="(max-width: 640px) 50vw, 200px" style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: '#ccc',
            }}>
              {game.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* Badges üstte */}
          <div style={{ position: 'absolute', top: 7, left: 7, display: 'flex', gap: 4 }}>
            {isFree    && <span className="badge badge-green">Ücretsiz</span>}
            {isOnSale  && !isFree && <span className="badge badge-amber">İndirim</span>}
            {game.gamePass && <span className="badge badge-green">GP</span>}
          </div>
          {game.metacritic && (
            <div style={{ position: 'absolute', bottom: 6, right: 7 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px',
                borderRadius: 6, background: 'rgba(0,0,0,0.6)',
                color: game.metacritic >= 80 ? '#4ade80' : game.metacritic >= 60 ? '#fbbf24' : '#f87171',
              }}>
                {game.metacritic}
              </span>
            </div>
          )}
        </div>

        {/* Bilgiler */}
        <div style={{ padding: '9px 11px' }}>
          <p style={{
            fontWeight: 600, fontSize: 12, lineHeight: 1.3, color: '#1a1a1a',
            marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {game.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isFree ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Ücretsiz</span>
            ) : game.price !== null && game.price !== undefined ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: isOnSale ? '#ea580c' : '#1a1a1a' }}>₺{game.price}</span>
            ) : game.noData ? (
              <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>Fiyatı gör →</span>
            ) : (
              <span style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>yükleniyor…</span>
            )}
            {!compact && (game.genres || []).slice(0, 1).map(g => (
              <span key={g} className="badge badge-gray" style={{ fontSize: 10 }}>{g}</span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
