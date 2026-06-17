'use client';

// Her sayfa geçişinde otomatik remount olur — bu da içeriğe akıcı bir giriş animasyonu verir.
export default function Template({ children }) {
  return <div className="page-transition">{children}</div>;
}
