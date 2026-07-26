import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Web sitesindeki dil sistemiyle uyumlu, mobil için sadeleştirilmiş sürüm.
const STRINGS = {
  tr: {
    'nav.home': 'Anasayfa',
    'nav.games': 'Oyunlar',
    'nav.news': 'Haberler',
    'nav.library': 'Kütüphane',
    'nav.profile': 'Profil',
    'news.title': 'Haberler',
    'news.all': 'Tümü',
    'news.empty': 'Haber bulunamadı',
    'news.featured': 'ÖNE ÇIKAN',
    'games.title': 'Oyunlar',
    'games.searchPlaceholder': 'Oyun ara…',
    'games.noResults': 'Sonuç bulunamadı',
    'games.loading': 'Yükleniyor…',
    'card.free': 'Ücretsiz',
    'section.all': 'Tümü',
    'section.popular': 'Popüler',
    'section.new': 'Yeni Çıkan',
    'section.sale': 'İndirimde',
    'section.free': 'Ücretsiz',
    'section.topscore': 'En İyi Puan',
    'mode.all': 'Tüm Modlar',
    'mode.singleplayer': 'Tek Oyunculu',
    'mode.multiplayer': 'Çok Oyunculu',
    'mode.coop': 'Co-op',
    'home.tagline': 'PC oyunlarını keşfet, fiyatları karşılaştır, kütüphaneni bağla.',
    'home.exploreGames': 'Oyunları Keşfet',
    'hero.badge': 'Canlı fiyat karşılaştırma',
    'hero.subtitle': 'Tek aramada 7 mağazada fiyat karşılaştır — Steam, Epic, GOG ve daha fazlası',
    'hero.search': 'Oyun ara…',
    'home.forYou': 'Senin İçin',
    'home.trend': 'Bu Hafta Trend',
    'home.new': 'Yeni Çıkanlar',
    'home.sale': 'İndirimdekiler',
    'home.viewAll': 'Tümü',
    'home.notInterested': 'İlgilenmiyorum',
    'home.dismissPrompt': 'Bu oyun önerilerden kaldırılsın mı?',
    'common.cancel': 'İptal',
    'library.soon': 'Kütüphane yakında mobilde',
    'profile.soon': 'Profil yakında mobilde',
    'auth.accounts': 'Bağlı Hesaplar',
    'auth.connectSteam': 'Steam ile Bağlan',
    'auth.connectXbox': 'Xbox ile Bağlan',
    'auth.addSteam': '+ Steam Hesabı Ekle',
    'auth.connected': 'Bağlı',
    'auth.disconnect': 'Çıkış',
    'auth.loginFailed': 'Giriş başarısız oldu',
    'auth.games': 'oyun',
    'library.connectPrompt': 'Oyunlarını görmek için Steam veya Xbox hesabını bağla.',
    'library.hoursPlayed': 'saat oynandı',
    'library.notPlayed': 'Oynanmadı',
    'lib.overview': 'Genel',
    'lib.accounts': 'hesap',
    'lib.games': 'Oyun',
    'lib.played': 'Oynanan',
    'lib.hours': 'Saat',
    'lib.value': 'Değer',
    'lib.gamerscore': 'Gamerscore',
    'lib.search': 'Kütüphanede ara…',
    'lib.sortHours': 'Saat',
    'lib.sortName': 'İsim',
    'lib.sortValue': 'Değer',
    'lib.empty': 'Bu filtreyle oyun yok',
    'common.loading': 'Yükleniyor…',
    'common.retry': 'Tekrar dene',
    'notif.title': 'İndirim Uyarıları',
    'notif.desc': 'Takip ettiğin oyunlar indirime girince bildirim al.',
    'notif.enable': 'Bildirimleri Aç',
    'notif.enabled': 'Bildirimler açık',
    'notif.permissionError': 'Bildirim izni verilmedi',
    'notif.needDevBuild': 'Push bildirimleri Expo Go\'da çalışmaz; geliştirme veya mağaza sürümü gerekir.',
    'wishlist.title': 'İstek Listesi',
    'wishlist.empty': 'Henüz oyun eklemedin',
    'wishlist.emptyDesc': 'Oyun detayında 🔔 ile takip et; indirime girince haber ver.',
    'wishlist.add': 'İndirim uyarısı ekle',
    'wishlist.added': 'İzleniyor',
    'wishlist.count': 'oyun izleniyor',
    'wishlist.explore': 'Oyun Keşfet',
    'detail.about': 'Hakkında',
    'detail.screenshots': 'Ekran Görüntüleri',
    'detail.genres': 'Türler',
    'detail.stores': 'Mağazalar',
    'detail.developer': 'Geliştirici',
    'detail.released': 'Çıkış',
    'detail.more': 'Devamını oku',
    'detail.less': 'Daha az',
    'detail.official': 'Resmi Site',
    'detail.priceCompare': 'Fiyat Karşılaştırması',
    'detail.cheapest': 'En ucuz',
    'detail.reviews': 'Değerlendirmeler',
    'detail.positive': 'olumlu',
    'detail.reviewsCount': 'inceleme',
    'review.veryPositive': 'Çok Olumlu',
    'review.positive': 'Olumlu',
    'review.mostlyPositive': 'Çoğunlukla Olumlu',
    'review.mixed': 'Karışık',
    'review.negative': 'Olumsuz',
  },
  en: {
    'nav.home': 'Home',
    'nav.games': 'Games',
    'nav.news': 'News',
    'nav.library': 'Library',
    'nav.profile': 'Profile',
    'news.title': 'News',
    'news.all': 'All',
    'news.empty': 'No news found',
    'news.featured': 'FEATURED',
    'games.title': 'Games',
    'games.searchPlaceholder': 'Search games…',
    'games.noResults': 'No results found',
    'games.loading': 'Loading…',
    'card.free': 'Free',
    'section.all': 'All',
    'section.popular': 'Popular',
    'section.new': 'New',
    'section.sale': 'On Sale',
    'section.free': 'Free',
    'section.topscore': 'Top Rated',
    'mode.all': 'All Modes',
    'mode.singleplayer': 'Single-player',
    'mode.multiplayer': 'Multiplayer',
    'mode.coop': 'Co-op',
    'home.tagline': 'Discover PC games, compare prices, connect your library.',
    'home.exploreGames': 'Explore Games',
    'hero.badge': 'Live price comparison',
    'hero.subtitle': 'Compare prices across 7 stores in one search — Steam, Epic, GOG, and more',
    'hero.search': 'Search games…',
    'home.forYou': 'For You',
    'home.trend': 'Trending This Week',
    'home.new': 'New Releases',
    'home.sale': 'On Sale',
    'home.viewAll': 'All',
    'home.notInterested': 'Not interested',
    'home.dismissPrompt': 'Remove this game from recommendations?',
    'common.cancel': 'Cancel',
    'library.soon': 'Library coming soon on mobile',
    'profile.soon': 'Profile coming soon on mobile',
    'auth.accounts': 'Connected Accounts',
    'auth.connectSteam': 'Connect with Steam',
    'auth.connectXbox': 'Connect with Xbox',
    'auth.addSteam': '+ Add Steam Account',
    'auth.connected': 'Connected',
    'auth.disconnect': 'Disconnect',
    'auth.loginFailed': 'Login failed',
    'auth.games': 'games',
    'library.connectPrompt': 'Connect your Steam or Xbox account to see your games.',
    'library.hoursPlayed': 'hours played',
    'library.notPlayed': 'Not played',
    'lib.overview': 'Overview',
    'lib.accounts': 'accounts',
    'lib.games': 'Games',
    'lib.played': 'Played',
    'lib.hours': 'Hours',
    'lib.value': 'Value',
    'lib.gamerscore': 'Gamerscore',
    'lib.search': 'Search library…',
    'lib.sortHours': 'Hours',
    'lib.sortName': 'Name',
    'lib.sortValue': 'Value',
    'lib.empty': 'No games with this filter',
    'common.loading': 'Loading…',
    'common.retry': 'Retry',
    'notif.title': 'Discount Alerts',
    'notif.desc': 'Get notified when games you follow go on sale.',
    'notif.enable': 'Enable Notifications',
    'notif.enabled': 'Notifications on',
    'notif.permissionError': 'Notification permission denied',
    'notif.needDevBuild': 'Push notifications don\'t work in Expo Go; a dev or store build is required.',
    'wishlist.title': 'Wishlist',
    'wishlist.empty': 'No games added yet',
    'wishlist.emptyDesc': 'Follow a game with 🔔 on its detail page to get discount alerts.',
    'wishlist.add': 'Add discount alert',
    'wishlist.added': 'Watching',
    'wishlist.count': 'games watched',
    'wishlist.explore': 'Explore Games',
    'detail.about': 'About',
    'detail.screenshots': 'Screenshots',
    'detail.genres': 'Genres',
    'detail.stores': 'Stores',
    'detail.developer': 'Developer',
    'detail.released': 'Released',
    'detail.more': 'Read more',
    'detail.less': 'Show less',
    'detail.official': 'Official Site',
    'detail.priceCompare': 'Price Comparison',
    'detail.cheapest': 'Cheapest',
    'detail.reviews': 'Reviews',
    'detail.positive': 'positive',
    'detail.reviewsCount': 'reviews',
    'review.veryPositive': 'Very Positive',
    'review.positive': 'Positive',
    'review.mostlyPositive': 'Mostly Positive',
    'review.mixed': 'Mixed',
    'review.negative': 'Negative',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('tr');
  const [rate, setRate] = useState(38); // USD→TRY (web /api/usd-rate ile güncellenebilir)

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key, [lang]);

  // Web ile aynı biçim: TL için ₺ simgesi ve binlik ayraç
  const formatPrice = useCallback((priceTry) => {
    if (priceTry == null) return '';
    if (priceTry === 0) return t('card.free');
    if (lang === 'tr') {
      const val = Number(priceTry);
      const formatted = val % 1 === 0
        ? val.toLocaleString('tr-TR')
        : val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${formatted}₺`;
    }
    return `$${(priceTry / (rate || 1)).toFixed(2)}`;
  }, [lang, rate, t]);

  const toggleLang = useCallback(() => setLang(l => (l === 'tr' ? 'en' : 'tr')), []);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, formatPrice, rate, setRate }),
    [lang, toggleLang, t, formatPrice, rate]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
