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
import { StyleSheet } from 'react-native';

import { Icon } from './Icon';
import { PressableScale, Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K, control, layout, typography } from '../theme/tokens';
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

// ── 2.0 GÖRÜNÜMÜ (G-04 greet: tek satır 15/20 text2, başlığın 2 pt altında) ──
// Tasarımda kalın başlık yok, tek cümle var. Faz 1'in bağlam cümlesi
// korunuyor ama AYNI satıra ekleniyor: tasarımın tipografisi ve yüksekliği,
// merdivenin kısayolu. Bağlam varsa satır dokunulabilir ve sonda ok var.
export default function Greeting({ name, saleWish, friends, forYouCount, isCold, onContext }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();

  const selam = t(selamAnahtari(new Date().getHours()));
  // Ad yoksa virgül DÜŞER, nokta kalır.
  const baslik = name ? `${selam}, ${name}.` : `${selam}.`;

  const baglam = baglamSec({ saleWish, friends, forYouCount, isCold });
  const metin = baglam ? doldur(t(baglam.anahtar), baglam.veri) : null;
  const satir = metin ? `${baslik} ${metin}` : baslik;

  return (
    <PressableScale
      onPress={metin ? () => onContext?.(baglam) : undefined}
      disabled={!metin}
      dimDisabled={false}
      accessibilityRole={metin ? 'button' : 'text'}
      accessibilityLabel={satir}
      hitSlop={HIT}
      style={styles.kut}
    >
      <Txt variant="greeting" numberOfLines={2} maxFontSizeMultiplier={1.3} style={[styles.metin, { color: colors.text2 }]}>{satir}</Txt>
      {metin ? <Icon name="chev" size={K.home.greetingChevron} color={colors.text3} strokeWidth={2.4} /> : null}
    </PressableScale>
  );
}

// Satır 20 pt; dokunma alanı 44'e hitSlop ile tamamlanıyor.
const PAY = (layout.minTouch - typography.greeting.lineHeight) / 2;
const HIT = { top: PAY, bottom: PAY };

const styles = StyleSheet.create({
  kut: { flexDirection: 'row', alignItems: 'center', gap: control.buttonGap, paddingHorizontal: layout.gutter, marginTop: K.home.greetingTop },
  metin: { flex: 1 },
});
