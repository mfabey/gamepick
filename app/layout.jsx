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
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const savedTheme = localStorage.getItem('theme');
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
              document.documentElement.setAttribute('data-theme', initialTheme);
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NavBar />
            <main style={{ minHeight: 'calc(100vh - 60px)' }}>
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
