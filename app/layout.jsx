import './globals.css';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';

export const metadata = {
  title: 'GamePick — Doğru Oyun, Doğru Platform, En İyi Fiyat',
  description: 'Yapay zekanın hissiyat bazlı önerdiği oyunları; canlı fiyatlar ve abonelik durumlarıyla tek ekranda görün.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
          <NavBar />
          <main style={{ minHeight: 'calc(100vh - 60px)' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
