'use client';
import { useRouter } from 'next/navigation';

export default function GameDetail() {
  const router = useRouter();
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 18, color: '#999', marginBottom: 16 }}>Bu sayfa artık kullanılmıyor.</p>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: 16 }}>← Geri Dön</button>
    </div>
  );
}
