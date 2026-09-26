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

// Türkçe bulunma eki, SÖYLENİŞE göre (kit: "Steam'de"). Sıra önemli: daha
// özel kalıp önce ("Xbox Store" → Store'da, "Xbox" → Xbox'ta).
const TR_STORE_SUFFIX = [
  [/store$/i, 'da'], [/steam$/i, 'de'], [/epic( games)?$/i, 'te'], [/gog(\.com)?$/i, 'da'],
  [/humble( bundle)?$/i, 'da'], [/fanatical$/i, 'da'], [/xbox$/i, 'ta'], [/eshop$/i, 'ta'],
  [/gamersgate$/i, 'te'], [/gaming$/i, 'de'], [/battle\.net$/i, 'te'], [/(ea )?app$/i, 'te'],
];

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

  // Gamerisen 2.0 biçimi (kullanıcı kararı, 22 Eylül): ₺ ÖNDE, binlik ayraç
  // nokta — tasarımdaki "₺599", "₺1.199". Önceden web'le aynı "599₺" idi;
  // web bu geçişin kapsamında değil, iki yüzey artık farklı yazıyor.
  //
  // `{ tam: true }` → kuruşsuz, en yakın tama yuvarlanmış ("₺5.350", "$163").
  // Toplamlar için (kütüphane değeri): tahmini bir toplamda kuruş gürültü ve
  // dar istatistik hücresine sığmıyordu ("$162.93", SE 375 pt, 26 Eyl).
  const formatPrice = useCallback((priceTry, { tam = false } = {}) => {
    if (priceTry == null) return '';
    if (priceTry === 0) return t('card.free');
    if (tam) {
      return lang === 'tr'
        ? `₺${Math.round(Number(priceTry)).toLocaleString('tr-TR')}`
        : `$${Math.round(priceTry / (rate || 1))}`;
    }
    if (lang === 'tr') {
      const val = Number(priceTry);
      const formatted = val % 1 === 0
        ? val.toLocaleString('tr-TR')
        : val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `₺${formatted}`;
    }
    return `$${(priceTry / (rate || 1)).toFixed(2)}`;
  }, [lang, rate, t]);

  // İndirim: Türkçe'de yüzde işareti ÖNDE ("-%50", tasarım), diğer dillerde
  // sonda ("-50%"). Eksi işareti tasarımdaki gibi düz tire.
  const formatDiscount = useCallback((percent) => {
    const n = Math.round(Number(percent) || 0);
    if (n <= 0) return '';
    return lang === 'tr' ? `-%${n}` : `-${n}%`;
  }, [lang]);

  // Mağazada: HeroCard fiyat satırı (kit hero() → "Steam'de"). Türkçe ek
  // YAZILIŞA değil SÖYLENİŞE uyuyor ("Steam" = "stim" → 'de', "Xbox" → 'ta');
  // bilinen mağazalar tabloda, bilinmeyenler yazılıştan tahmin ediliyor.
  // Diğer dillerde `v2.atStore` kalıbı ("on {store}").
  const formatStoreAt = useCallback((store) => {
    const name = String(store || '').trim();
    if (!name) return '';
    if (lang !== 'tr') return t('v2.atStore').replace('{store}', name);
    const known = TR_STORE_SUFFIX.find(([re]) => re.test(name));
    if (known) return `${name}'${known[1]}`;
    const letters = name.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü]/g, '');
    const vowel = [...letters].reverse().find((ch) => 'aeıioöuü'.includes(ch)) || 'e';
    const hard = 'çfhkpsştx'.includes(letters.slice(-1));
    return `${name}'${hard ? 't' : 'd'}${'aıou'.includes(vowel) ? 'a' : 'e'}`;
  }, [lang, t]);

  // Kısa sayı (kit "38,2 B oy"): 1.000 ve üstü bin, 1.000.000 ve üstü milyon;
  // bir ondalık. Intl'in `notation: 'compact'` seçeneği Hermes'te her
  // platformda yok, eşikler elle; ondalık ayraç dilin yerel ayarından.
  const formatCompact = useCallback((n) => {
    const v = Number(n) || 0;
    const kisa = (x) => x.toLocaleString(bcp47(lang), { maximumFractionDigits: 1 });
    if (v >= 1e6) return t('v2.millions').replace('{n}', kisa(Math.round(v / 1e5) / 10));
    if (v >= 1e3) return t('v2.thousands').replace('{n}', kisa(Math.round(v / 1e2) / 10));
    return v.toLocaleString(bcp47(lang));
  }, [lang, t]);

  // `toggleLang` KALDIRILDI: iki dil arasında gidip gelen bir anahtardı ve
  // dört dilde anlamı kalmıyor. Hiçbir ekran kullanmıyordu; dil seçimi
  // Ayarlar'daki listeden yapılıyor.

  // Sayi/tarih bicimlemesi icin BCP-47 etiketi. Ekranlar `toLocaleString()`i
  // CIPLAK cagirmamali — o cihazin dilini kullaniyor, bunu degil.
  const locale = bcp47(lang);

  const value = useMemo(
    () => ({ lang, locale, setLang, t, formatPrice, formatDiscount, formatStoreAt, formatCompact, rate, setRate }),
    [lang, locale, setLang, t, formatPrice, formatDiscount, formatStoreAt, formatCompact, rate]
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
