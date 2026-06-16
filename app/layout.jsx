import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import NavBar from './components/NavBar';

export const metadata = {
  title: 'GamePick — Doğru Oyun, Doğru Platform, En İyi Fiyat',
  description: 'Yapay zekanın hissiyat bazlı önerdiği oyunları; canlı fiyatlar ve abonelik durumlarıyla tek ekranda görün.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const savedTheme = localStorage.getItem('theme');
              const initialTheme = savedTheme || 'dark';
              document.documentElement.setAttribute('data-theme', initialTheme);
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NavBar />
            <main style={{ minHeight: 'calc(100vh - 64px)' }}>
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
