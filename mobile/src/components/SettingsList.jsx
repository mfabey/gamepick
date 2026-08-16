import { Children, Fragment } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, type, PRESSED } from '../theme';
import { useTheme, useStyles } from '../context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Ayar listesi — gruplanmış satırlar.
//
// NEDEN YAZILDI: ayar ekranları satır işaretlemesini her yerde elle tekrar
// ediyordu ve sonuç dağınıktı — her satırda KIRMIZI bir simge, dolu (outline
// değil) ikonlar, tam genişlik ayırıcılar ve her grubun üstünde bir kategori
// başlığı. Hepsi bir arada, her satır aynı anda dikkat istiyordu.
//
// ÜÇ KURAL:
//
// 1. SİMGELER TEK RENK ve KONTUR. Simge bir yön bulma yardımcısı, süs değil.
//    Her satırı vurgu rengiyle boyamak vurguyu anlamsızlaştırıyor: her şey
//    vurguluysa hiçbir şey vurgulu değildir. Tek istisna yıkıcı eylemler —
//    orada renk gerçek bir uyarı taşıyor.
//
// 2. AYIRICILAR İÇERİDEN başlıyor, simge sütununu geçtikten sonra. Tam
//    genişlik ayırıcı satırları birbirinden koparıyor; içeriden başlayan
//    ayırıcı "bunlar aynı grubun parçası" diyor. iOS'un kendi ayarları da
//    böyle.
//
// 3. BÖLÜM BAŞLIĞI YOK. Gruplama boşlukla yapılıyor. Kategori adları
//    ("Genel", "Gizlilik", "Hesap") bilgi taşımıyor — kullanıcı satırı zaten
//    okuyor — ama ekranı üretilmiş bir taksonomi gibi gösteriyor.
// ─────────────────────────────────────────────────────────────────────────────

// Simge sütunu genişliği. Ayırıcının nereden başlayacağını bu belirliyor;
// ikisi TEK yerden türetilmezse hizalama kayıyor.
const ICON_COL = 30;
const PAD = spacing.lg;

/**
 * Satır grubu. Çocukların arasına ayırıcıları KENDİ koyuyor — çağıranın
 * `<Div />` serpiştirmesi gerekmiyor ve ayırıcı sayısı yanlış olamıyor.
 */
export function SettingsGroup({ children, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * Ayar satırı.
 *
 * @param {string}  icon      Ionicons adı — KONTUR sürüm verilmeli
 * @param {string}  label
 * @param {string}  [value]   sağda gösterilen mevcut değer (dil, sürüm…)
 * @param {string}  [desc]    etiketin altında açıklama
 * @param {boolean} [danger]  yıkıcı eylem — TEK renk istisnası
 * @param {node}    [right]   sağdaki özel içerik (Switch gibi); verilirse
 *                            chevron çizilmiyor
 */
export function SettingsRow({
  icon, label, value, desc, danger, right, onPress, disabled,
}) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const tint = danger ? colors.danger : colors.text;
  const Wrap = onPress ? Pressable : View;

  return (
    <Wrap
      style={onPress ? ({ pressed }) => [styles.row, pressed && PRESSED] : styles.row}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <View style={styles.iconCol}>
        {!!icon && <Ionicons name={icon} size={22} color={tint} />}
      </View>

      <View style={styles.mid}>
        <Text style={[styles.label, danger && { color: colors.danger }]} numberOfLines={1}>
          {label}
        </Text>
        {!!desc && <Text style={styles.desc} numberOfLines={2}>{desc}</Text>}
      </View>

      {!!value && <Text style={styles.value} numberOfLines={1}>{value}</Text>}

      {right ?? (onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.text3} />
      ) : null)}
    </Wrap>
  );
}

// Reaktif stil — tema değişince yeniden üretiliyor (bkz. ThemeContext).
const makeStyles = (colors) => StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    // Gruplar arası boşluk bölüm başlığının yerini tutuyor; dar olursa
    // gruplar tek bir uzun listeye çökerdi.
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: PAD, paddingVertical: 13,
    gap: spacing.md,
    // 44pt HIG dokunma hedefinin üstünde
    minHeight: 54,
  },
  iconCol: { width: ICON_COL, alignItems: 'flex-start' },
  mid:     { flex: 1, minWidth: 0, gap: 2 },
  // 17pt = HIG gövde varsayılanı
  label:   { color: colors.text, fontSize: type.body },
  desc:    { color: colors.text3, fontSize: type.caption },
  value:   { color: colors.text3, fontSize: type.subhead },
  // İçeriden: sol dolgu + simge sütunu + aradaki boşluk kadar
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: PAD + ICON_COL + spacing.md,
  },
});
