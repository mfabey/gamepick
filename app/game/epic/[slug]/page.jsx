'use client';
import { useRouter } from 'next/navigation';

import { useLanguage } from '../../../context/LanguageContext';

export default function EpicGameDetail() {
  const router = useRouter();
  const { lang } = useLanguage();
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontSize: 18, color: '#999', marginBottom: 16 }}>
        {lang === 'tr' ? 'Bu sayfa artık kullanılmıyor.' : 'This page is no longer used.'}
      </p>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 600, fontSize: 16 }}>
        {lang === 'tr' ? '← Geri Dön' : '← Go Back'}
      </button>
    </div>
  );
}
