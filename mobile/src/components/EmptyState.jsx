// ─────────────────────────────────────────────────────────────────────────────
// Boş durum — sekiz ekranda kopyalanmış olan kalıbın tek hâli.
//
// HIG: boş bir ekran ölü uç olmamalı; ne olduğunu açıklamalı ve mümkünse
// kullanıcıyı bir sonraki adıma yönlendirmeli. Bu yüzden eylem düğmesi
// birinci sınıf bir seçenek.
//
// ── ÖLÇÜLER: G-DS-4 "Boş durum" (kit ds.py empty()) ──
//   kutu     84 × 84, köşe 26, zemin surface1; ikon 36 `text2`, çizgi 1.8
//   başlık   20/26 700 (title2), kutudan 20 aşağıda
//   açıklama 15/22 (body) `text2`, başlıktan 8 aşağıda
//   eylem    260 genişlikte 48 pt birincil düğme, açıklamadan 22 aşağıda
//   yanlar   30
//
// Önceki sürüm iOS'un kendi boş durumunu (UIContentUnavailableConfiguration)
// piksel ölçüp 56'lık kutu / 22 pt başlık kullanıyordu. 2.0 tasarım sistemi
// bu bileşeni ayrıca tarif ediyor ve doğruluk sırasında kaynak kazanır. O
// ölçümün asıl vardığı yer — açıklamanın 13'e İNDİRİLMEMESİ, 15 kalması —
// DS 4 ile zaten aynı.
//
// Eylem artık 2.0 `Button` primary (nötr): eskiden kırmızı dolguydu; 2.0'da
// kırmızı CTA kararı yalnız G-03'ün.
//
// `icon` ve `actionIcon` 2.0 ikon adı (Icon.tsx), Ionicons değil.
//
// `compact`: listenin İÇİNDE (ListEmptyComponent) — tam ekran boyu başlığın
// altına sıkışırdı. DS'de ayrı ölçüsü yok; kutu 64 / köşe 20 / ikon 28,
// başlık headline, eylem 44.
// ─────────────────────────────────────────────────────────────────────────────
import { View, StyleSheet } from 'react-native';

import { Icon } from './Icon';
import { Button, Txt } from './ui/Primitives';
import { ICERIK_MAX } from '../theme';
import { component as K, space } from '../theme/tokens';
import { useDesignTheme } from '../theme/useDesignTheme';

const E = K.emptyState;

export default function EmptyState({
  icon = 'spark',
  title,
  text,
  actionLabel,
  onAction,
  actionIcon,
  compact = false,
  children,
}) {
  const { colors } = useDesignTheme();

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: colors.surface1 }]}>
        <Icon name={icon} size={compact ? E.iconCompact : E.icon} color={colors.text2} strokeWidth={E.iconStroke} />
      </View>

      {title ? <Txt variant={compact ? 'headline' : 'title2'} style={styles.title}>{title}</Txt> : null}
      {text ? <Txt variant="body" style={[styles.text, { color: colors.text2 }]}>{text}</Txt> : null}

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          icon={actionIcon}
          height={compact ? 44 : 48}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: E.paddingH,
    paddingVertical: space[32],
    // GENİŞ EKRANDA BOŞ DURUM DA TAVANA TABİ. iPad'de (820 pt) açıklama
    // metni tek satırda ekranın ucundan ucuna uzuyor ve "boş" ekran, dolu
    // bir ekrandan daha geniş bir satır uzunluğuyla okunuyordu.
    width: '100%',
    maxWidth: ICERIK_MAX,
    alignSelf: 'center',
  },
  compact: { flex: 0, paddingVertical: space[28] },

  iconWrap: {
    width: E.box, height: E.box, borderRadius: E.boxRadius,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapCompact: { width: E.boxCompact, height: E.boxCompact, borderRadius: E.boxRadiusCompact },

  title: { textAlign: 'center', marginTop: space[20] },
  text: { textAlign: 'center', marginTop: space[8] },

  action: { width: E.actionWidth, maxWidth: '100%', marginTop: E.actionTop },
});
