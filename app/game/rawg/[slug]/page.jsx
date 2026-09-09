'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RawgGameRedirect({ params }) {
  const router = useRouter();

  useEffect(() => {
    if (params?.slug) {
      router.replace(`/game/${encodeURIComponent(params.slug)}`);
    }
  }, [params, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
