// ─────────────────────────────────────────────────────────────────────────────
// Boş durum — sekiz ekranda kopyalanmış olan kalıbın tek hâli.
//
// HIG: boş bir ekran ölü uç olmamalı; ne olduğunu açıklamalı ve mümkünse
// kullanıcıyı bir sonraki adıma yönlendirmeli. Bu yüzden eylem düğmesi
// birinci sınıf bir seçenek.
//
// ── ÖLÇÜLER TAHMİN DEĞİL, PLATFORMDAN ÖLÇÜLDÜ ──
// Handoff 56 / 17-650 / 13-1.5 diyor; bizde 84 / 20-800 / 15 vardı. Hangisi
// doğru diye tartışmak yerine kaynağa bakıldı: iOS'un kendi boş durumu
// (UIContentUnavailableConfiguration — Dosyalar > Son Kullanılanlar)
// simülatörde açılıp PNG piksel düzeyinde ölçüldü. Instagram ve X dâhil
// bütün iOS uygulamalarının izlediği kalıp bu.
//
//   simge            48 pt (çıplak sembol, kap yok)
//   başlık kapak     16.3 pt → ~22 pt bold   (.title2)
//   açıklama kapak   10.7 pt → ~15 pt        (.subheadline)
//   simge → başlık   23.3 pt
//   başlık → açıklama 11.3 pt
//
// SONUÇ: açıklama 13'e İNDİRİLMEDİ. Platformun kendisi 15 kullanıyor ve boş
// ekranda o cümle ekrandaki TEK yönlendirme — küçültülecek en son yer orası.
// Başlık ise 20'den 22'ye ÇIKTI; ölçüm 22'yi gösteriyor ve ölçeğimizde zaten
// title3 olarak duruyordu.
//
// Simge kabı KALDI ama 84'ten handoff'un 56'sına indi. Apple simgeyi çıplak
// koyuyor; bizde kap, "çıplak simge ekranda kaybolmuş gibi duruyordu" diye
// bilerek eklenmişti ve Instagram da kap kullanıyor. 56'lık kap + 28'lik
// sembol, Apple'ın 48'lik çıplak sembolüyle aynı görsel ağırlıkta.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, type, PRESSED } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';

export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  text,
  actionLabel,
  onAction,
  actionIcon,
  compact = false,
  children,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
        <Ionicons name={icon} size={compact ? 24 : 28} color={colors.text3} />
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {text ? <Text style={styles.text}>{text}</Text> : null}

      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && PRESSED]}
          onPress={onAction}
          accessibilityRole="button"
        >
          {actionIcon ? <Ionicons name={actionIcon} size={17} color="#fff" /> : null}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {children}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 40,
  },
  compact: { flex: 0, paddingVertical: 28 },

  // Handoff'un 56'lık yuvası. Kap boş alana odak noktası veriyor; çıplak
  // simge denendiğinde ekranda kaybolmuş gibi duruyordu.
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.s24,      // ölçüm: 23.3 pt
  },
  iconWrapCompact: { width: 48, height: 48, borderRadius: 24, marginBottom: spacing.s16 },

  // Ölçüm: kapak 16.3 pt → 22 pt bold. Ölçekte title3 olarak zaten vardı.
  title: {
    color: colors.text,
    fontSize: type.title3,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  // Ölçüm: kapak 10.7 pt → 15 pt. Handoff 13 diyordu; platform 15 kullanıyor
  // ve bu cümle boş ekrandaki tek yönlendirme.
  text: {
    color: colors.text2,
    fontSize: type.subhead,
    textAlign: 'center',
    marginTop: spacing.s12,          // ölçüm: 11.3 pt
    lineHeight: 21,
    maxWidth: 280,                   // handoff ölçüsü — satır uzunluğu kısalıyor
  },

  // Handoff: yarıçap 12, dolgu 12/16. minHeight 44 EKLENDİ — 15 pt metinle
  // 12'lik dikey dolgu 42 pt ediyor ve Apple'ın 44 pt dokunma hedefi altında
  // kalıyordu.
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.s8,
    minHeight: 44,
    paddingHorizontal: spacing.s16, paddingVertical: spacing.s12,
    borderRadius: radius.md, backgroundColor: colors.accentFillStrong,
    marginTop: spacing.s24,
  },
  // tema-bagimsiz: marka dolgusu ustundeki metin (tokens: onBrand)
  actionText: { color: '#FFFFFF', fontSize: type.subhead, fontWeight: '700' },
});
