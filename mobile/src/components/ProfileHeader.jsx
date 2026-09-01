import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { radius, spacing, type, avatar as avatarSize, PRESSED, NUMERIC, TOUCH_MIN } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Profil kimlik bloğu — KENDİ PROFİLİM VE BAŞKASININ PROFİLİ AYNI BİLEŞEN.
//
// NEDEN ORTAK. İki ekran da aynı iskeleti çiziyor (avatar · üç sayaç · ad ·
// bio · bağlı çipi · eylem satırı); yalnız EYLEM SATIRI ayrışıyor. İki ayrı
// kopya yazılsaydı, bu depoda daha önce olduğu gibi (Avatar bileşeninin
// gerekçesine bakın: aynı mantık sekiz dosyada kopyalanmıştı) biri değişip
// öteki unutulurdu.
//
// SAYAÇLAR AVATARIN SAĞINDA, altında değil: Instagram düzeni. Ölçüm gerekçesi
// eski profil ekranında yazılıydı — dikey kimlik bloğu ekranın %44'ünü
// yiyordu; yatay düzen aynı bilgiyi ~150pt'ye indiriyor ve kazanılan yer
// içeriğe gidiyor.
//
// SAYAÇTA KOLEKSİYON YOK: o sayı sekme şeridinin hemen altındaki bağlam
// satırında duruyor ("KOLEKSİYON · 214"). Aynı sayı ekranda iki kez durmaz —
// bu dosyanın öncülü olan profile.jsx'in de kuralı buydu.
// ─────────────────────────────────────────────────────────────────────────────

/** Kimlik bloğundaki tek sayaç. Dokunulabilir: üçü de bir hedefe gidiyor. */
function Counter({ n, label, onPress }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.counter, pressed && PRESSED]}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
    >
      <Text style={[styles.counterN, NUMERIC]}>{n}</Text>
      <Text style={styles.counterLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** Durum çipi — bağlı mağaza, ortak arkadaş, gizli profil. Bilgi öğesi. */
function Chip({ icon, dot, text, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const inner = (
    <>
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      {icon ? <Ionicons name={icon} size={12} color={colors.text3} /> : null}
      <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
    </>
  );
  if (!onPress) return <View style={styles.chip}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && PRESSED]}>
      {inner}
    </Pressable>
  );
}

/** Eylem satırının tek düğmesi. Yükseklik HER DURUMDA 44 — bkz. dosya sonu. */
function ActionButton({ label, icon, iconColor, tone = 'quiet', onPress, busy, wide = true }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const toneStyle = tone === 'primary' ? styles.btnPrimary
    : tone === 'outline' ? styles.btnOutline
    : tone === 'settled' ? styles.btnSettled
    : styles.btnQuiet;
  const textStyle = tone === 'primary' ? styles.btnTextPrimary
    : tone === 'outline' ? styles.btnTextMuted
    : styles.btnText;

  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      disabled={busy}
      style={({ pressed }) => [styles.btn, toneStyle, wide && styles.btnWide, pressed && PRESSED]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone === 'primary' ? colors.onAccent : colors.text2} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={17}
              color={iconColor || (tone === 'primary' ? colors.onAccent : tone === 'outline' ? colors.text2 : colors.text)}
            />
          ) : null}
          {label ? <Text style={textStyle} numberOfLines={1}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * @param profile     `/api/social/profile` yanıtındaki profile nesnesi
 * @param friendship  'self' | 'none' | 'requested' | 'incoming' | 'friends'
 * @param mutual      ortak arkadaş sayısı (başkasının profilinde)
 * @param week        `{ hasActivity, byDay, topDay, discovered }` — yalnız kendi profilinde
 * @param busy        arkadaşlık isteği uçuşta
 * @param onCounter   ('posts'|'friends'|'games')
 * @param onFriend    ('request'|'cancel'|'accept'|'reject')
 */
export default function ProfileHeader({
  profile, friendship = 'none', mutual = 0, week = null, busy = false,
  onCounter, onEdit, onShare, onMessage, onFriend, onConnect, onWeek,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (!profile) return null;

  const c = profile.counts || {};
  const isSelf = friendship === 'self';
  const name = profile.displayName || profile.username;

  return (
    <View style={styles.wrap}>
      {/* ── Kimlik ── */}
      <View style={styles.idRow}>
        <Avatar avatar={profile.avatar} name={name} size={avatarSize.xl} style={styles.avatarXl} />
        <View style={styles.counters}>
          <Counter n={c.posts || 0}   label={t('prof.statPosts')}   onPress={() => onCounter?.('posts')} />
          <Counter n={c.friends || 0} label={t('prof.statFriends')} onPress={() => onCounter?.('friends')} />
          <Counter n={c.games || 0}   label={t('prof.statGames')}   onPress={() => onCounter?.('games')} />
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>{name}</Text>

      {/* Bio İKİ SATIR: sunucu 150 karakterde kesiyor (MAX_BIO) ve bu sayı
          tam olarak 390pt genişlikte iki satır demek. Üçüncü satıra izin
          vermek kimlik bloğunu içeriğin üstüne taşırdı. */}
      {profile.bio ? (
        <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
      ) : null}

      {/* ── Çipler ── */}
      <View style={styles.chips}>
        {profile.privateProfile && !isSelf ? (
          <Chip icon="lock-closed-outline" text={t('prof.privateChip')} />
        ) : null}
        {profile.connections?.steam ? (
          <Chip dot={colors.green} text={t('prof.steamConnected')} />
        ) : isSelf ? (
          <Chip dot={colors.text3} text={t('auth.connectSteam')} onPress={onConnect} />
        ) : null}
        {profile.connections?.xbox ? (
          <Chip dot={colors.green} text={t('prof.xboxConnected')} />
        ) : null}
        {!isSelf && mutual > 0 ? (
          <Chip text={`${mutual} ${t('prof.mutualFriends')}`} />
        ) : null}
      </View>

      {/* ── Eylem satırı ──
          BİRİNCİL EYLEM KENDİ PROFİLİMDE KIRMIZI DEĞİL: ekran başına üç
          marka-kırmızı öğe kotası var ve kendi profilimde kırmızı, aktif
          sekme çizgisiyle sekme çubuğunun aktif ikonuna ayrıldı. "Profili
          düzenle" zaten aranan bir eylem, bağırması gerekmiyor.

          Başkasının profilinde kırmızı "Arkadaş ekle"nin: orada sayfanın
          VAR OLUŞ SEBEBİ o düğme. */}
      <View style={styles.actions}>
        {isSelf ? (
          <>
            <ActionButton label={t('prof.editProfile')} icon="create-outline" onPress={onEdit} />
            {/* PAYLAŞ DÜĞMESİ, İŞLEYİCİ VERİLİNCE ÇİZİLİYOR — ve artık hedefi
                var: profilin web karşılığı (`/u/<kullanıcı>`) yayında.
                Bir süre çizilmedi çünkü paylaşılacak adres yoktu; yalnız
                `gamerisen://` şeması paylaşılsaydı bağlantıyı alan çoğu kişi
                hiçbir şey görmezdi — oysa paylaşmanın anlamı tam olarak
                uygulaması OLMAYAN birine göstermek. */}
            {onShare ? (
              <ActionButton icon="share-outline" tone="quiet" wide={false} onPress={onShare} />
            ) : null}
          </>
        ) : friendship === 'incoming' ? (
          <>
            <ActionButton label={t('soc.accept')} icon="checkmark-circle" tone="primary"
                          busy={busy} onPress={() => onFriend?.('accept')} />
            <ActionButton label={t('soc.reject')} icon="close"
                          busy={busy} onPress={() => onFriend?.('reject')} />
          </>
        ) : friendship === 'requested' ? (
          <>
            <ActionButton label={t('soc.requested')} icon="time-outline" tone="outline"
                          busy={busy} onPress={() => onFriend?.('cancel')} />
            <ActionButton label={t('soc.messageShort')} icon="mail-outline" onPress={onMessage} />
          </>
        ) : friendship === 'friends' ? (
          <>
            <ActionButton label={t('soc.friends')} icon="checkmark-circle" iconColor={colors.green}
                          tone="settled" busy={busy} onPress={undefined} />
            <ActionButton label={t('soc.messageShort')} icon="mail-outline" onPress={onMessage} />
          </>
        ) : (
          <>
            <ActionButton label={t('soc.addFriend')} icon="person-add-outline" tone="primary"
                          busy={busy} onPress={() => onFriend?.('request')} />
            <ActionButton label={t('soc.messageShort')} icon="mail-outline" onPress={onMessage} />
          </>
        )}
      </View>

      {/* ── Bu hafta ──
          Sayaçlar "kaç" diyor, bu satır "NE YAPTIN" diyor. Yalnız kendi
          profilimde ve yalnız hareket varsa: boş bir özet sayfayı canlı
          değil ÖLÜ gösterir.

          MAKETTEN SAPMA — maket sağda "12sa 40dk" oynama süresi gösteriyor;
          o veri uygulamada YOK (haftalık rapor keşif sayıyor, saat değil).
          Geometri korundu, sayı gerçek olanla değiştirildi: olmayan bir
          basamağı çizmek yerine var olanı göstermek. */}
      {isSelf && week?.hasActivity ? (
        <Pressable onPress={onWeek} style={({ pressed }) => [styles.week, pressed && PRESSED]}>
          <View style={styles.weekChart}>
            {week.byDay.map((n, i) => {
              const enCok = Math.max(...week.byDay, 1);
              // Yükseklikler ORANLI: sakin bir haftada mutlak ölçek grafiği
              // tamamen yassı gösterirdi. Boş gün 4pt TABAN alıyor — sıfır
              // çizilseydi yedi günlük ritim kopardı.
              const y = n > 0 ? Math.max(8, Math.round((n / enCok) * 32)) : 4;
              return (
                <View key={i} style={[styles.weekBar, { height: y }, n > 0 && i === week.topDay && styles.weekBarTop]} />
              );
            })}
          </View>
          <View style={styles.weekText}>
            <Text style={styles.weekValue} numberOfLines={1}>
              <Text style={NUMERIC}>{week.discovered}</Text> {t('prof.weekDiscovered')}
            </Text>
            <Text style={styles.weekHint} numberOfLines={1}>{t('prof.weekOnlyYou')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text3} />
        </Pressable>
      ) : null}
    </View>
  );
}

// REAKTİF STİL: tema değişince yeniden üretiliyor (bkz. ThemeContext).
const makeStyles = (colors) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.s20, paddingTop: spacing.s8 },

  idRow: { flexDirection: 'row', alignItems: 'center' },
  avatarXl: {
    backgroundColor: colors.surfaceTile,
    borderWidth: 1, borderColor: colors.borderHover,
  },
  counters: { flex: 1, flexDirection: 'row', marginLeft: spacing.s20 },
  counter: { flex: 1, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  counterN: { fontSize: type.body, fontWeight: '600', color: colors.text },
  // Maket sayı ile etiket arasına 2pt koyuyor; ölçekte 2 YOK (4·8·12…) ve
  // yeni borç açmamak için en yakın adım kullanıldı. Gözle fark edilmiyor.
  counterLabel: { fontSize: type.footnote, fontWeight: '500', color: colors.text2, marginTop: spacing.s4 },

  name: { fontSize: type.body, fontWeight: '600', color: colors.text, marginTop: spacing.s16 },
  bio: { fontSize: type.subhead, fontWeight: '400', color: colors.text2, lineHeight: 21, marginTop: spacing.s8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s8, marginTop: spacing.s12 },
  chip: {
    height: 28, flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: type.footnote, fontWeight: '500', color: colors.text2 },

  actions: { flexDirection: 'row', gap: spacing.s8, marginTop: spacing.s16 },
  btn: {
    height: TOUCH_MIN, minWidth: TOUCH_MIN, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.s8, paddingHorizontal: spacing.s12,
  },
  btnWide: { flex: 1 },
  // Dolgu `accentFillStrong`: üstünde metin taşıyan tek yer burası ve düz
  // `accent` beyazla 4.45 veriyor (eşik 4.5). Bkz. scripts/check-accent.mjs.
  btnPrimary: { backgroundColor: colors.accentFillStrong },
  btnQuiet: { backgroundColor: colors.bgInput },
  btnOutline: { backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.borderHover },
  btnSettled: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  btnText: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  btnTextPrimary: { fontSize: type.subhead, fontWeight: '600', color: colors.onAccent },
  btnTextMuted: { fontSize: type.subhead, fontWeight: '600', color: colors.text2 },

  week: {
    height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.s16,
    marginTop: spacing.s16, paddingHorizontal: spacing.s16,
    borderRadius: radius.lg, backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s4, height: 32 },
  weekBar: { width: 8, borderRadius: radius.xs, backgroundColor: colors.surfaceTile },
  // accent-serbest: DEĞERE BAĞLI — haftanın en yoğun günü. Metin taşımıyor.
  weekBarTop: { backgroundColor: colors.accent },
  weekText: { flex: 1, minWidth: 0 },
  weekValue: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  weekHint: { fontSize: type.footnote, fontWeight: '500', color: colors.text3, marginTop: spacing.s4 },
});
