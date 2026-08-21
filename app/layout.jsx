import './globals.css';
import { Bricolage_Grotesque, Schibsted_Grotesk } from 'next/font/google';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import IntroSplash from './components/IntroSplash';
import GamerisenAiWidget from './components/GamerisenAiWidget';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Gamerisen — Doğru Oyun, Doğru Platform, En İyi Fiyat',
  description: 'Yapay zekanın hissiyat bazlı önerdiği oyunları; canlı fiyatlar ve abonelik durumlarıyla tek ekranda görün.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${bricolage.variable} ${schibsted.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('gp_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', saved);
            } catch (e) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
            
            // iOS Safari pinch-to-zoom block
            document.addEventListener('gesturestart', function(e) {
              e.preventDefault();
            });
            document.addEventListener('gesturechange', function(e) {
              e.preventDefault();
            });
            document.addEventListener('gestureend', function(e) {
              e.preventDefault();
            });
            
            // Multi-touch touchstart & touchmove zoom block
            document.addEventListener('touchstart', function(e) {
              if (e.touches.length > 1) {
                e.preventDefault();
              }
            }, { passive: false });
            document.addEventListener('touchmove', function(e) {
              if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) {
                e.preventDefault();
              }
            }, { passive: false });
            
            // Double-tap zoom block backup
            var lastTouchEnd = 0;
            document.addEventListener('touchend', function(e) {
              var now = new Date().getTime();
              if (now - lastTouchEnd <= 300) {
                e.preventDefault();
              }
              lastTouchEnd = now;
            }, false);
          })()
        ` }} />
      </head>
      <body>
        <IntroSplash />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <NavBar />
              <main style={{ minHeight: 'calc(100vh - 64px)' }}>
                {children}
              </main>
              <Footer />
              <GamerisenAiWidget />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
