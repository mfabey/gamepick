'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const TRANSLATIONS = {
  tr: {
    // Nav links
    'nav.home': 'Anasayfa',
    'nav.games': 'Oyunlar',
    'nav.news': 'Haberler',
    'nav.dlc': 'DLC',
    'nav.library': 'Kütüphane',
    'nav.support': 'Destek',
    'nav.logout': 'Çıkış',
    'nav.login': 'Giriş Yap',
    'nav.signup': 'Üye Ol',
    'nav.viewing': 'İnceleniyor',

    // Hero / Search
    'hero.badge': 'Canlı fiyat takibi · 7 mağaza',
    'hero.title': 'Bir sonraki oyununu keşfet',
    'hero.subtitle': '500.000+ oyunu keşfet, Steam · Epic · GOG · Xbox fiyatlarını tek ekranda karşılaştır.',
    'hero.searchPlaceholder': 'Oyun, tür veya stüdyo ara…',
    'hero.search': 'Ara',
    'hero.searching': 'Aranıyor…',
    'hero.allResults': 'için tüm sonuçları gör →',
    'hero.quick.popular': '💥 Popüler',
    'hero.quick.sale': '🏷️ İndirimde',
    'hero.quick.new': '🗓️ Yeni Çıkan',
    'hero.quick.best': '⭐ En İyi',

    // Sections
    'section.trending.title': '🔥 Bu Hafta Trend',
    'section.trending.subtitle': 'Ünlü yayıncıların en çok oynadığı popüler oyunlar',
    'section.trending.badge': 'CANLI',
    'section.new.title': '🗓️ Yeni Çıkanlar',
    'section.new.subtitle': 'Son dönemde yayınlanan oyunlar',
    'section.sale.title': '🏷️ İndirimdekiler',
    'section.sale.subtitle': 'En iyi fiyat fırsatları',
    'section.all': 'Tümünü gör →',
    'section.failed': 'Yüklenemedi.',

    // CTA
    'cta.badge': '✦ Tek Kütüphane',
    'cta.title': 'Oyunlarını tek yerden yönet',
    'cta.desc': 'Steam ve Xbox oyun listenlerini bağla, takip et.',
    'cta.open': 'Kütüphaneyi Aç →',
    'cta.start': 'Hemen Başla →',

    // Card
    'card.free': 'Ücretsiz',
    'card.owned': 'Sahipsin',
    'card.xbox': 'Xbox\'ta',
    'card.gamepass': 'Game Pass',

    // Games Search Page
    'games.title': 'Arama Sonuçları',
    'games.noResults': 'Oyun bulunamadı.',
    'games.loadMore': 'Daha Fazla Yükle',
    'games.loading': 'Yükleniyor...',
    'games.clearFilters': 'Filtreleri Temizle',
    'games.price.all': 'Tüm Fiyatlar',
    'games.price.free': 'Ücretsiz',
    'games.genre.all': 'Tüm Türler',

    // Detail Page
    'detail.notFound': 'Oyun bulunamadı',
    'detail.goBack': 'Geri Dön',
    'detail.metacritic': 'Metacritic Puanı',
    'detail.releaseDate': 'Yayın Tarihi',
    'detail.priceComparison': 'Fiyat Karşılaştırma',
    'detail.cheapest': 'En Ucuz',
    'detail.notForSale': 'Satışta Değil',
    'detail.noPrice': 'Bölgede satılmıyor veya fiyat yok',
    'detail.goToStore': 'Mağazaya Git',
    'detail.news': 'Haberler',
    'detail.dlc': 'DLC ve Ek Paketler',
    'detail.similar': 'Benzer Oyunlar',
    'detail.about': 'Bu oyun hakkında',
    'detail.wishlist.add': 'İstek Listesine Ekle',
    'detail.wishlist.remove': 'İstek Listesinden Çıkar',

    // Library
    'library.title': 'Oyun Kütüphanen',
    'library.subtitle': 'Bağlı hesaplarındaki tüm oyunlar ve istatistiklerin',
    'library.steam': 'Steam Kütüphanen',
    'library.xbox': 'Xbox Kütüphanen',
    'library.value': 'Kütüphane Değeri',
    'library.connect': 'Kütüphaneni Bağla',
    'library.sync': 'Kütüphaneyi Eşitle',
    'library.lastPlayed': 'Son oynama',
    'library.loadingPrices': 'fiyatlar yükleniyor',
    'library.last2weeks': 'Son 2 haftada',
    'library.hours': 'Saat',
    'library.games': 'Oyun',
    'library.connectDesc': 'Steam veya Xbox hesabınla giriş yaparak oyunlarını, istatistiklerini ve kütüphaneni burada görüntüle.',
    'library.xboxError': 'Xbox Bağlantı Hatası',
    'library.steamLogin': 'Steam ile Giriş Yap',
    'library.xboxLogin': 'Xbox ile Giriş Yap',
    'library.req.title': '📋 Gereksinimler',
    'library.req.steam': '• Steam: profil herkese açık olmalı',
    'library.req.xbox': '• Xbox: Microsoft hesabınla veya Gamertag simülasyonuyla giriş yapabilirsin',
    'library.req.gp': '• Gamerisen hiçbir bilgini kaydetmez, yalnızca görüntüler',
    'library.steamActive': 'Steam Aktif: {name}',
    'library.xboxActive': 'Xbox Aktif: {gamertag}',
    'library.connectXbox': 'Xbox Hesabı Bağla',
    'library.connectSteam': 'Steam Hesabı Bağla',
    'library.filter.all': 'Tümü',
    'library.filter.played': '▶ Oynandı',
    'library.filter.unplayed': '○ Oynanmadı',
    'library.filter.gamepass': '🎮 Game Pass',
    'library.filter.owned': '🛒 Sahip Olunan',
    'library.sort.hours': 'Saat ↓',
    'library.sort.name': 'İsim A-Z',
    'library.sort.recent': 'Son Oynanan',
    'library.sort.value': 'Değer ↓',
    'library.sort.score': 'Gamerscore ↓',
    'library.searchPlaceholder': 'Kütüphanede ara…',
    'library.searchXboxPlaceholder': 'Xbox kütüphanesinde ara…',
    'library.showingGames': '{count} oyun gösteriliyor',
    'library.showingGamesLoading': 'fiyatlar yükleniyor…',
    'library.xbox.sessionExpired': 'Oturum Süresi Doldu',
    'library.xbox.loadFailed': 'Kütüphane Yüklenemedi',
    'library.xbox.relogin': 'Tekrar Giriş Yap',
    'library.viewProfile': 'Profili Görüntüle →',
    'library.stats.totalGames': 'Toplam Oyun',
    'library.stats.played': 'Oynanan',
    'library.stats.totalHours': 'Toplam Saat',
    'library.disclaimer': '* Güncel Steam Türkiye fiyatları baz alınmıştır ({count} oyun). Ücretsiz ve bölgede satılmayan oyunlar dahil edilmemiştir.',
    'library.free': '🎁 Ücretsiz',
    'library.noPrice': 'Fiyat yok',
    'library.hoursPlayed': 'oynandı',
    'library.notPlayed': 'Oynanmadı',
    'library.playedRecent': 'Son 2 haftada {hours}s',
    'library.lastPlayedLabel': 'Son: {date}',
    'library.daysAgo': '{days} gün önce',
    'library.weeksAgo': '{weeks} hafta önce',
    'library.monthsAgo': '{months} ay önce',
    'library.yearsAgo': '{years} yıl önce',
    'library.today': 'Bugün',
    'library.yesterday': 'Dün',
    'library.profilePrivate': 'Profil Gizli',
    'library.profilePrivateDesc': 'Steam profilini "Herkese Açık" yapman gerekiyor.',
    'library.steamSettings': 'Steam Gizlilik Ayarları →',
    'library.xbox.member': 'Xbox Live Üyesi',
    'library.xbox.ultimate': 'Game Pass Ultimate',
    'library.xbox.pc': 'PC Game Pass',
    'library.xbox.gp': 'Xbox Game Pass',
    'library.xbox.disclaimer': '* Xbox Live oyun geçmişi gösterilmektedir. Game Pass ile oynanan oyunlar ayrıca işaretlenmiştir.',
    'library.xbox.connectTitle': 'Xbox Hesabını Bağla',
    'library.xbox.connectDesc': 'Hesabını bağlayarak Game Pass durumunu ve oyunlarını gör.',
    'library.xbox.connectOAuth': 'Microsoft Hesabı ile Giriş Yap',
    'library.xbox.connectOAuthDesc': 'Resmi Xbox Live verilerini Microsoft OAuth üzerinden güvenle bağla. (Xbox Developer Sandbox yetkisi gerektirebilir).',
    'library.xbox.connectMock': 'Gamertag ile Hızlı Bağlan (Test)',
    'library.xbox.connectMockDesc': 'Eğer resmi Microsoft OAuth bağlantısı çalışmıyorsa veya anında test etmek isterseniz, Gamertag girerek simülasyonu başlatabilirsiniz.',
    'library.xbox.connectMockLabel': 'Xbox Gamertag',
    'library.xbox.connectMockPlaceholder': 'Gamer Etiketini yaz...',
    'library.xbox.connectMockGP': 'Game Pass Aboneliği',
    'library.xbox.connectMockGPU': 'Xbox Game Pass Ultimate (Aktif)',
    'library.xbox.connectMockGPPC': 'PC Game Pass (Aktif)',
    'library.xbox.connectMockGPNone': 'Abonelik Yok',
    'library.xbox.connectMockSubmit': 'Bağlantıyı Simüle Et',
    'library.xbox.connectMockSubmitting': 'Bağlanıyor...',
    'library.xbox.connectMockFailed': 'Simüle giriş yapılamadı.',
    'footer.poweredBy': 'Steam Destekli',
    'footer.terms': 'Kullanıcı Sözleşmesi',
    'footer.privacy': 'Gizlilik Politikası',
    'footer.disclaimer': 'Valve Corporation, Steam, Xbox veya Microsoft ile hiçbir resmi bağımız yoktur. Tüm ticari markalar kendi sahiplerine aittir.'
  },
  en: {
    // Nav links
    'nav.home': 'Home',
    'nav.games': 'Games',
    'nav.news': 'News',
    'nav.dlc': 'DLC',
    'nav.library': 'Library',
    'nav.support': 'Support',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.viewing': 'Viewing',

    // Hero / Search
    'hero.badge': 'Live price tracking · 7 stores',
    'hero.title': 'Discover your next game',
    'hero.subtitle': 'Discover 500,000+ games, compare Steam, Epic, GOG, and Xbox prices in one place.',
    'hero.searchPlaceholder': 'Search games, genres, or studios...',
    'hero.search': 'Search',
    'hero.searching': 'Searching...',
    'hero.allResults': 'see all results for →',
    'hero.quick.popular': '💥 Popular',
    'hero.quick.sale': '🏷️ On Sale',
    'hero.quick.new': '🗓️ New',
    'hero.quick.best': '⭐ Best',

    // Sections
    'section.trending.title': '🔥 Trending This Week',
    'section.trending.subtitle': 'Popular games played by famous streamers',
    'section.trending.badge': 'LIVE',
    'section.new.title': '🗓️ New Releases',
    'section.new.subtitle': 'Games released recently',
    'section.sale.title': '🏷️ On Sale',
    'section.sale.subtitle': 'Best price deals',
    'section.all': 'See all →',
    'section.failed': 'Failed to load.',

    // CTA
    'cta.badge': '✦ One Library',
    'cta.title': 'Manage your games in one place',
    'cta.desc': 'Connect and track your Steam and Xbox game lists.',
    'cta.open': 'Open Library →',
    'cta.start': 'Get Started →',

    // Card
    'card.free': 'Free',
    'card.owned': 'Owned',
    'card.xbox': 'On Xbox',
    'card.gamepass': 'Game Pass',

    // Games Search Page
    'games.title': 'Search Results',
    'games.noResults': 'No games found.',
    'games.loadMore': 'Load More',
    'games.loading': 'Loading...',
    'games.clearFilters': 'Clear Filters',
    'games.price.all': 'All Prices',
    'games.price.free': 'Free',
    'games.genre.all': 'All Genres',

    // Detail Page
    'detail.notFound': 'Game not found',
    'detail.goBack': 'Go Back',
    'detail.metacritic': 'Metacritic Score',
    'detail.releaseDate': 'Release Date',
    'detail.priceComparison': 'Price Comparison',
    'detail.cheapest': 'Cheapest',
    'detail.notForSale': 'Not for Sale',
    'detail.noPrice': 'Not sold in this region or no price',
    'detail.goToStore': 'Go to Store',
    'detail.news': 'News',
    'detail.dlc': 'DLCs & Add-ons',
    'detail.similar': 'Similar Games',
    'detail.about': 'About this game',
    'detail.wishlist.add': 'Add to Wishlist',
    'detail.wishlist.remove': 'Remove from Wishlist',

    // Library
    'library.title': 'Your Game Library',
    'library.subtitle': 'All your games and stats from connected accounts',
    'library.steam': 'Steam Library',
    'library.xbox': 'Xbox Library',
    'library.value': 'Library Value',
    'library.connect': 'Connect Your Library',
    'library.sync': 'Sync Library',
    'library.lastPlayed': 'Last played',
    'library.loadingPrices': 'loading prices',
    'library.last2weeks': 'In last 2 weeks',
    'library.hours': 'Hours',
    'library.games': 'Games',
    'library.connectDesc': 'Log in with your Steam or Xbox account to view your games, stats, and library here.',
    'library.xboxError': 'Xbox Connection Error',
    'library.steamLogin': 'Log in with Steam',
    'library.xboxLogin': 'Log in with Xbox',
    'library.req.title': '📋 Requirements',
    'library.req.steam': '• Steam: profile must be public',
    'library.req.xbox': '• Xbox: You can sign in with your Microsoft account or Gamertag simulation',
    'library.req.gp': '• Gamerisen does not store any of your info, it only displays it',
    'library.steamActive': 'Steam Active: {name}',
    'library.xboxActive': 'Xbox Active: {gamertag}',
    'library.connectXbox': 'Connect Xbox Account',
    'library.connectSteam': 'Connect Steam Account',
    'library.filter.all': 'All',
    'library.filter.played': '▶ Played',
    'library.filter.unplayed': '○ Unplayed',
    'library.filter.gamepass': '🎮 Game Pass',
    'library.filter.owned': '🛒 Owned',
    'library.sort.hours': 'Hours ↓',
    'library.sort.name': 'Name A-Z',
    'library.sort.recent': 'Last Played',
    'library.sort.value': 'Value ↓',
    'library.sort.score': 'Gamerscore ↓',
    'library.searchPlaceholder': 'Search library...',
    'library.searchXboxPlaceholder': 'Search Xbox library...',
    'library.showingGames': 'Showing {count} games',
    'library.showingGamesLoading': 'loading prices…',
    'library.xbox.sessionExpired': 'Session Expired',
    'library.xbox.loadFailed': 'Failed to Load Library',
    'library.xbox.relogin': 'Login Again',
    'library.viewProfile': 'View Profile →',
    'library.stats.totalGames': 'Total Games',
    'library.stats.played': 'Played',
    'library.stats.totalHours': 'Total Hours',
    'library.disclaimer': '* Based on current Steam Turkey prices ({count} games). Free and regional unavailable games are not included.',
    'library.free': '🎁 Free',
    'library.noPrice': 'No price',
    'library.hoursPlayed': 'played',
    'library.notPlayed': 'Not played',
    'library.playedRecent': 'Last 2 weeks: {hours}h',
    'library.lastPlayedLabel': 'Last: {date}',
    'library.daysAgo': '{days} days ago',
    'library.weeksAgo': '{weeks} weeks ago',
    'library.monthsAgo': '{months} months ago',
    'library.yearsAgo': '{years} years ago',
    'library.today': 'Today',
    'library.yesterday': 'Yesterday',
    'library.profilePrivate': 'Profile Private',
    'library.profilePrivateDesc': 'You need to set your Steam profile to "Public".',
    'library.steamSettings': 'Steam Privacy Settings →',
    'library.xbox.member': 'Xbox Live Member',
    'library.xbox.ultimate': 'Game Pass Ultimate',
    'library.xbox.pc': 'PC Game Pass',
    'library.xbox.gp': 'Xbox Game Pass',
    'library.xbox.disclaimer': '* Xbox Live game history is shown. Games played with Game Pass are marked separately.',
    'library.xbox.connectTitle': 'Connect Xbox Account',
    'library.xbox.connectDesc': 'Connect your account to see your Game Pass status and games.',
    'library.xbox.connectOAuth': 'Sign In with Microsoft Account',
    'library.xbox.connectOAuthDesc': 'Securely connect official Xbox Live data via Microsoft OAuth. (May require Xbox Developer Sandbox permissions).',
    'library.xbox.connectMock': 'Quick Connect with Gamertag (Test)',
    'library.xbox.connectMockDesc': 'If official Microsoft OAuth connection is not working or you want to test instantly, you can start the simulation by entering a Gamertag.',
    'library.xbox.connectMockLabel': 'Xbox Gamertag',
    'library.xbox.connectMockPlaceholder': 'Enter Gamertag...',
    'library.xbox.connectMockGP': 'Game Pass Subscription',
    'library.xbox.connectMockGPU': 'Xbox Game Pass Ultimate (Active)',
    'library.xbox.connectMockGPPC': 'PC Game Pass (Active)',
    'library.xbox.connectMockGPNone': 'No Subscription',
    'library.xbox.connectMockSubmit': 'Simulate Connection',
    'library.xbox.connectMockSubmitting': 'Connecting...',
    'library.xbox.connectMockFailed': 'Failed to simulate login.',
    'footer.poweredBy': 'Powered by Steam',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.disclaimer': 'We are not affiliated with Valve Corporation, Steam, Xbox, or Microsoft in any way. All trademarks belong to their respective owners.'
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('tr');
  const [rate, setRate] = useState(38);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('gp_lang');
      if (savedLang === 'tr' || savedLang === 'en') {
        setLang(savedLang);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetch('/api/usd-rate')
      .then(r => r.json())
      .then(data => {
        if (data.rate > 0) {
          setRate(data.rate);
        }
      })
      .catch(() => {});
  }, []);

  const changeLanguage = (newLang) => {
    if (newLang === 'tr' || newLang === 'en') {
      setLang(newLang);
      try {
        localStorage.setItem('gp_lang', newLang);
      } catch (e) {}
    }
  };

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['tr']?.[key] || key;
  };

  const formatPrice = (priceTry) => {
    if (priceTry == null) return '';
    if (priceTry === 0) return t('card.free');

    if (lang === 'tr') {
      const val = Number(priceTry);
      const formatted = val % 1 === 0
        ? val.toLocaleString('tr-TR')
        : val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${formatted}₺`;
    } else {
      const usdVal = priceTry / rate;
      return `$${usdVal.toFixed(2)}`;
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, formatPrice, rate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
