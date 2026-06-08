'use client';
import Link from 'next/link';
export default function GameDetail() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 18, color: '#999', marginBottom: 16 }}>Bu sayfa artık kullanılmıyor.</p>
      <Link href="/games" style={{ color: '#DC2626', fontWeight: 600 }}>← Oyunlara Dön</Link>
    </div>
  );
}
