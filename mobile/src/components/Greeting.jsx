// ─────────────────────────────────────────────────────────────────────────────
// SELAMLAMA BLOĞU — Faz 1'in eklediği tek yeni yapı.
//
// İki bağımsız parça: selamlama SAATTEN, bağlam satırı MERDİVENDEN geliyor.
//
// ── MERDİVENİN ALTI BASAMAĞINDAN DÖRDÜ KURULDU ──
// Faz 1 altı basamak sayıyor. İkisi bu ekranda VERİSİ OLMAYAN şeyler:
//
//   3 · "Silksong bugün çıktı."      → çıkış tarihi gün hassasiyetinde yok;
//                                       `fresh` listesi "yeni çıkanlar" ama
//                                       "bugün" iddiası doğrulanamıyor.
//   4 · "İncelemene 3 yanıt var."    → yanıt sayısı için bir uç nokta yok;
//                                       anasayfa böyle bir çağrı yapmıyor.
//
// İkisi de ATLANDI, uydurulmadı. Tasarımın kendi kapanış cümlesi bunu
// söylüyor: "en pahalı hatalar eksik özellikten değil, OLMAYAN BİR ŞEYİ
// VARMIŞ GİBİ GÖSTERMEKTEN geliyordu."
//
// Kurulan dördü elimizdeki veriden:
//   1 · istek listesindeki oyun indirimde  → `sale` ∩ istek listesi
//   2 · arkadaşlar bu hafta oynadı         → getFriendActivity
//   5 · zevkine göre yeni oyunlar          → forYou (yalnızca !isCold)
//   6 · yedek: bu hafta konuşulanlar       → Topluluk
//
// ── AD YOKSA VİRGÜL DÜŞER ──
// Faz 1: "Virgül düşer, nokta kalır. 'Misafir' gibi uydurma ad yazılmaz."
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing, type, PRESSED, TOUCH_MIN } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/** Saat → selamlama anahtarı. Faz 1'in dört dilimi. */
export function selamAnahtari(saat) {
  if (saat >= 5  && saat <= 10) return 'greet.morning';
  if (saat >= 11 && saat <= 16) return 'greet.day';
  if (saat >= 17 && saat <= 21) return 'greet.evening';
  return 'greet.night';                    // 22:00–04:59
}

/**
 * Bağlam merdiveni — İLK EŞLEŞEN kazanır, sırası Faz 1'den.
 *
 * Saf fonksiyon: sınır durumları test edilebilir olsun diye bileşenden ayrı.
 * `null` dönerse satır ÇİZİLMEZ (blok tek satıra iner) — boş yer tutucu yok.
 */
export function baglamSec({ saleWish, friends, forYouCount, isCold }) {
  if (saleWish) {
    return { anahtar: 'greet.ctxSale', veri: { ad: saleWish.name, n: saleWish.discount }, hedef: 'game', oyun: saleWish };
  }
  if (friends?.kisi > 0) {
    return { anahtar: friends.kisi > 1 ? 'greet.ctxFriends' : 'greet.ctxFriend', veri: { ad: friends.ilk, n: friends.kisi - 1 }, hedef: 'friends' };
  }
  if (!isCold && forYouCount > 0) {
    return { anahtar: 'greet.ctxForYou', veri: { n: forYouCount }, hedef: 'foryou' };
  }
  return { anahtar: 'greet.ctxFallback', veri: {}, hedef: 'community' };
}

function doldur(sablon, veri) {
  return String(sablon).replace(/\{(\w+)\}/g, (_, k) => (veri[k] ?? ''));
}

export default function Greeting({ name, saleWish, friends, forYouCount, isCold, onContext }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const selam = t(selamAnahtari(new Date().getHours()));
  // Ad yoksa virgül DÜŞER, nokta kalır.
  const baslik = name ? `${selam}, ${name}.` : `${selam}.`;

  const baglam = baglamSec({ saleWish, friends, forYouCount, isCold });
  const metin = baglam ? doldur(t(baglam.anahtar), baglam.veri) : null;

  return (
    <View style={styles.kut}>
      <Text style={styles.selam} numberOfLines={2}>{baslik}</Text>
      {metin ? (
        <Pressable
          onPress={() => onContext?.(baglam)}
          accessibilityRole="button"
          accessibilityLabel={metin}
          style={({ pressed }) => [styles.satir, pressed && PRESSED]}
        >
          {/* İki satır sınırı; taşarsa satır kırpılmaz, blok büyür. */}
          <Text style={styles.baglam} numberOfLines={2}>{metin}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Faz 1: marka satırının altında, aramanın üstünde; s8 üst boşluk.
  kut: { paddingHorizontal: spacing.s20, paddingTop: spacing.s8 },
  // Faz 1 ölçüsü: title3 22 · text. Bu ekranda title3'ün TEK kullanımı —
  // bölüm başlıkları üstyazıya (caption 12) indi.
  selam: { fontSize: type.title3, fontWeight: '700', color: colors.text, letterSpacing: -0.22 },
  // Bağlam satırı dokunulabilir; hedef chevron'la işaretli. minHeight 44.
  satir: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    minHeight: TOUCH_MIN, marginTop: spacing.s4,
  },
  baglam: { flex: 1, fontSize: type.subhead, color: colors.text2, lineHeight: 20 },
});
