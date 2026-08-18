// ─────────────────────────────────────────────────────────────────────────────
// Monogram — kapak gelmediğinde görünen son çare.
//
// NEDEN VAR. Kapak zinciri üç halkalıydı ve sonuncusu boştu:
//   library_600x900  →  orijinal görsel  →  (hiçbir şey)
// PosterImage dikey kapak 404 verince orijinale dönüyor; o da başarısızsa
// expo-image hiçbir şey çizmiyor ve geriye isimsiz gri bir kutu kalıyor.
// Açık temaya geçince bu kutu beyaz boşluğa dönüştü ve daha da görünür oldu.
//
// Ölçüldü: katalog ucunda `image` alanı %0 boş. Yani sorun alanın YOKLUĞU
// değil, ADRESİN ÇALIŞMAMASI — bu yüzden "image varsa göster" kontrolü
// yetmiyor, gerçek bir yük hatası yakalanmalı.
//
// Tasarım handoff'u (12 — Kart ailesi): "Kapak %6 oranında eksik gelir; boş
// kutu yerine monogram (oyun adının iki harfi) gösterilir. Bu monogram
// davranışı ÜRETİMDE DE KALIR."
//
// ZEMİN ADDAN TÜRETİLİYOR, rastgele değil: aynı oyun her yerde aynı rengi
// alsın. Rastgele olsaydı liste kaydırılıp geri dönüldüğünde renk değişirdi
// (FlashList kartları geri dönüştürüyor) ve monogram bir "yükleniyor"
// göstergesi gibi okunurdu.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { radius, spacing, type, TOUCH_MIN } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// FAZ 1 — "Not yalnızca BÜYÜK yüzeyde çıkar, 44pt altı kapaklarda çıkmaz."
// Eşik dokunma hedefiyle aynı sayı (44): bir kapak dokunulabilir bir hedef
// kadar bile değilse, üstünde 11pt bir not okunmuyor — yalnızca kirletiyor.
//
// `not={false}` İKİNCİ BİR KAPI: ölçü yeterli olsa bile, o köşeyi çağıran
// ekranın kendi bindirmesi kaplıyorsa not çizilmiyor. Simülatörde görüldü —
// arkadaş şeridinde 200×104 kapak eşiği geçiyor ama sol alt köşede arkadaş
// avatarı duruyordu ve not onun ARDINDA yarım okunuyordu.
const NOT_ESIGI = TOUCH_MIN;

// FNV-1a — GamePostCard'daki görsel seçiminde kullanılanla aynı gerekçe:
// kriptografik değil, yalnız dağılımı düzgün ve ucuz olsun diye.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Oyun adının ilk iki "anlamlı" harfi.
 *
 * İki KELİMELİ adlarda her kelimenin baş harfi alınıyor (Baldur's Gate → BG),
 * tek kelimelilerde ilk iki harf (Helldivers → HE). Roma rakamı ve sayı ile
 * biten adlarda ("Helldivers 2") sayı atlanıyor: "H2" bir kısaltma gibi
 * okunmuyor.
 */
export function initials(name) {
  const ham = String(name || '').trim();
  if (!ham) return '?';

  // Noktalama TEMİZLENİYOR: "My (♂) Life as a Vampire's Maid" ilk denemede
  // "M(" veriyordu — parantez bir baş harf değil.
  const kelimeler = ham
    .split(/[\s:–—-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((w) => w && !/^[0-9IVX]+$/i.test(w));

  // HEPSİ ELENDİYSE ham ada dön: "II" gibi yalnız rakamdan oluşan bir ad
  // "?" veriyordu, oysa "II" kendisi anlamlı bir monogram.
  if (kelimeler.length === 0) {
    const harfler = ham.replace(/[^\p{L}\p{N}]/gu, '');
    return (harfler.slice(0, 2) || '?').toUpperCase();
  }
  if (kelimeler.length === 1) return kelimeler[0].slice(0, 2).toUpperCase();
  return (kelimeler[0][0] + kelimeler[1][0]).toUpperCase();
}

// Zemin tonları paletten TÜRETİLİYOR, sabit hex listesi değil: açık temada
// koyu bir monogram zemini beyaz sayfada leke gibi durur. İki temada da
// yüzeyden bir tık ayrışan, marka rengine yaklaşmayan nötr tonlar.
//
// MODÜL SABİTİ DEĞİL, artık bileşenin içinde: modül düzeyinde dizi açılıştaki
// paleti donduruyordu ve tema değişince monogram zeminleri eski temada
// kalıyordu — beyaz sayfadaki koyu leke, tam da kaçınmak için yazılan şey.
export default function Monogram({ name, style, size, not: notGoster = true }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const TONLAR = [colors.card, colors.bgInput, colors.bgHover, colors.bgElevated];
  const bas = initials(name);
  const zemin = TONLAR[hash(String(name || '')) % TONLAR.length];

  // BOYUT ÖLÇÜLÜYOR, PROP DEĞİL. Monogram sekiz ayrı yerden çağrılıyor ve
  // hepsi kapak ölçüsünü kendi hesaplıyor (ızgara sütun aritmetiği, şerit
  // sabiti, tam ekran deste). Her çağrıya "büyük müsün" propu eklemek o
  // hesabı ikinci kez, yanlış yapılabilecek bir yerde tekrarlardı.
  const [buyuk, setBuyuk] = useState(false);
  const olc = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setBuyuk(Math.min(width, height) >= NOT_ESIGI);
  }, []);

  return (
    <View style={[styles.wrap, { backgroundColor: zemin }, style]} onLayout={olc}>
      <Text
        style={[styles.text, size ? { fontSize: size } : null]}
        numberOfLines={1}
        // Monogram bir SİMGE, cümle değil: erişilebilirlik boyutlarında
        // büyürse kapak alanını taşırıyordu.
        allowFontScaling={false}
      >
        {bas}
      </Text>

      {/* FAZ 1, Kırılma #2: "Boş kutu bir HATA; yer tutucu hem kimlik verir
          hem DÜRÜST olur." Baş harf tek başına "yükleniyor" gibi okunabilir —
          not, kapağın gelmeyeceğini söylüyor. Maket: sol alt 8, 11pt, %80. */}
      {buyuk && notGoster ? (
        <Text style={styles.not} numberOfLines={1} allowFontScaling={false}>
          {t('cover.none')}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  // Maket: 28pt = title1. Yer tutucunun taşıdığı tek kimlik bu, kapağın
  // yerini dolduracak kadar büyük olmalı.
  text: {
    color: colors.text3,
    fontSize: type.title1,
    fontWeight: '800',
    letterSpacing: 1,
  },
  not: {
    position: 'absolute', bottom: spacing.s8, left: spacing.s8,
    fontSize: type.caption2, color: colors.text3, opacity: 0.8,
  },
});
