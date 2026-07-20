import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '65vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 72,
        fontWeight: 800,
        color: 'var(--accent)',
        lineHeight: 1,
        marginBottom: 12,
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 10,
      }}>
        Aradığınız Sayfa Bulunamadı
      </h2>
      <p style={{
        fontSize: 15,
        color: 'var(--text-2)',
        maxWidth: 440,
        marginBottom: 24,
        lineHeight: 1.5,
      }}>
        Ulaştığınız adres değiştirilmiş, silinmiş veya geçici olarak erişilemiyor olabilir.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: 12,
          background: 'var(--accent)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          boxShadow: '0 4px 14px var(--accent-glow)',
        }}
      >
        Ana Sayfaya Dön →
      </Link>
    </div>
  );
}
