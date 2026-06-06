'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('GamePick hata:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: 560, width: '100%',
        background: '#fff', border: '1.5px solid #FECACA',
        borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(220,38,38,0.08)',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          ⚠ Uygulama Hatası
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
          Beklenmeyen bir hata oluştu
        </h2>

        {/* Hata mesajı — tanı için */}
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '12px 14px', marginBottom: 20,
          fontFamily: 'monospace', fontSize: 12, color: '#991B1B',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          <strong>{error?.name}: </strong>{error?.message || 'Bilinmeyen hata'}
          {error?.stack && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: '#DC2626' }}>Stack trace</summary>
              <pre style={{ marginTop: 6, fontSize: 10, overflowX: 'auto' }}>{error.stack}</pre>
            </details>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={reset} style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Tekrar Dene
          </button>
          <button onClick={() => window.location.href = '/'} style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#f5f5f5', color: '#555', border: 'none', cursor: 'pointer',
          }}>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
}
