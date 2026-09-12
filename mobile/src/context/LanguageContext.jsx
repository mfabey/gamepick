import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { detectLanguage, SUPPORTED, bcp47 } from '../services/locale';

import tr from '../i18n/tr';
import en from '../i18n/en';
import es from '../i18n/es';
import pt from '../i18n/pt';
import de from '../i18n/de';

// Web sitesindeki dil sistemiyle uyumlu, mobil için sadeleştirilmiş sürüm.
// Sözlükler DİL BAŞINA AYRI DOSYADA (src/i18n/). Beş dil burada toplansaydı
// dosya 2500 satırı aşardı ve bir çeviriyi anadili konuşan birine okutmanın
// pratik yolu kalmazdı.
const STRINGS = { tr, en, es, pt, de };

const LanguageContext = createContext(null);

const PREF_KEY = 'lang.pref';

export function LanguageProvider({ children }) {
  // ── İLK DİL ──
  // Eskiden burada sabit `'tr'` vardı: uygulama, cihazı hangi dile ayarlı
  // olursa olsun HERKESE Türkçe açılıyordu. Amerika'dan giren bir kullanıcı
  // (ve App Store incelemecisi) Türkçe bir uygulama görüyordu.
  //
  // Artık cihaz dilinden türetiliyor ve desteklenmeyen her dil İngilizce'ye
  // düşüyor. Bu SENKRON: ilk çizimde doğru dil hazır.
  const [lang, setLangState] = useState(detectLanguage);
  const [rate, setRate] = useState(38); // USD→TRY (web /api/usd-rate ile güncellenebilir)

  // ── KAYITLI TERCİH ──
  // Kullanıcının açık seçimi cihaz dilini EZER ve uygulama kapanınca
  // kaybolmaz (önceden hiçbir yere yazılmıyordu).
  //
  // Okuma asenkron olduğu için teorik olarak bir karelik geçiş var: cihaz
  // dili önce, kayıtlı tercih sonra. Pratikte yalnızca dili elle DEĞİŞTİRMİŞ
  // kullanıcıda görünür — ilk açılışta kayıt yok, sonraki açılışlarda da
  // değiştirmemişse iki değer zaten aynı.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => { if (alive && v && SUPPORTED.includes(v)) setLangState(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /** Dili değiştirir ve tercihi kalıcı yazar. */
  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    AsyncStorage.setItem(PREF_KEY, next).catch(() => {});
  }, []);

  // Sözlükte olmayan anahtar İngilizce'ye, o da yoksa anahtarın kendisine
  // düşüyor — yeni bir dil eksik çeviriyle de çalışabilsin.
  const t = useCallback((key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key, [lang]);

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

  // `toggleLang` KALDIRILDI: iki dil arasında gidip gelen bir anahtardı ve
  // dört dilde anlamı kalmıyor. Hiçbir ekran kullanmıyordu; dil seçimi
  // Ayarlar'daki listeden yapılıyor.

  // Sayi/tarih bicimlemesi icin BCP-47 etiketi. Ekranlar `toLocaleString()`i
  // CIPLAK cagirmamali — o cihazin dilini kullaniyor, bunu degil.
  const locale = bcp47(lang);

  const value = useMemo(
    () => ({ lang, locale, setLang, t, formatPrice, rate, setRate }),
    [lang, locale, setLang, t, formatPrice, rate]
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
