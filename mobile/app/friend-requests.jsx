// ─────────────────────────────────────────────────────────────────────────────
// Gelen ve gönderilen arkadaşlık istekleri.
//
// KENDİ EKRANI OLDU. Öncesinde `/social`'ın üçüncü sekmesiydi; sekme
// çubuğunda durduğu için kullanıcı isteği ancak o ekrana girip üçüncü
// sekmeye dokununca görüyordu. Artık arkadaş listesinin üstündeki bant
// buraya götürüyor ve bandın kendisi sayıyı taşıyor.
//
// GÖNDERİLEN BÖLÜMÜNDE ROZET YOK: bekleyen istek KARŞI TARAFIN eylemi,
// bizde yapılacak bir şey yok. Kırmızı sayaç yalnız eyleme dönüşen bilgi için.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Avatar from '../src/components/Avatar';
import EmptyState from '../src/components/EmptyState';
import { radius, spacing, type, PRESSED, NUMERIC, SECTION_TITLE, TOUCH_MIN, avatar as avatarSize } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { getFriends, friendAction } from '../src/api/social';

export default function FriendRequestsScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState(null);
  const [islemde, setIslemde] = useState(null);   // uid

  const load = useCallback(async () => {
    try { setData(await getFriends()); }
    catch { setData({ friends: [], incoming: [], outgoing: [] }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (uid, action) => {
    if (islemde) return;
    Haptics.selectionAsync().catch(() => {});
    setIslemde(uid);
    try { await friendAction(uid, action); await load(); }
    catch (e) {
      const k = `soc.err.${e?.code}`;
      Alert.alert(t(k) !== k ? t(k) : t('soc.err.generic'));
    }
    finally { setIslemde(null); }
  }, [islemde, load, t]);

  const bos = data && data.incoming.length === 0 && data.outgoing.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}
                   style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{t('soc.tabRequests')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {data === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : bos ? (
        <EmptyState icon="mail-outline" title={t('soc.noRequests')} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40 }]}
          showsVerticalScrollIndicator={false}
        >
          {data.incoming.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>
                {t('soc.incoming')}<Text style={NUMERIC}>{` · ${data.incoming.length}`}</Text>
              </Text>
              {data.incoming.map((p) => (
                <View key={p.uid} style={styles.card}>
                  <Pressable style={styles.person} onPress={() => router.push(`/u/${p.username}`)}>
                    <Avatar avatar={p.avatar} name={p.displayName || p.username} size={avatarSize.list} />
                    <View style={styles.personBody}>
                      <Text numberOfLines={1} style={styles.name}>{p.displayName || p.username}</Text>
                      <Text numberOfLines={1} style={styles.handle}>@{p.username}</Text>
                    </View>
                  </Pressable>
                  {/* İki düğme EŞİT GENİŞLİKTE ve 44 yüksekliğinde: kabul
                      birincil ama reddetmek de meşru bir seçim, küçültülmüyor.
                      "Yoksay" kopyası bilinçli — "reddet" kişiyi yargılıyormuş
                      ve karşı tarafa bildirim gidiyormuş gibi okunuyor. */}
                  <View style={styles.btnRow}>
                    <Pressable onPress={() => act(p.uid, 'accept')} disabled={islemde === p.uid}
                               style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && PRESSED]}>
                      {islemde === p.uid
                        ? <ActivityIndicator size="small" color={colors.onAccent} />
                        : <Text style={styles.btnTextPrimary}>{t('soc.accept')}</Text>}
                    </Pressable>
                    <Pressable onPress={() => act(p.uid, 'reject')} disabled={islemde === p.uid}
                               style={({ pressed }) => [styles.btn, styles.btnQuiet, pressed && PRESSED]}>
                      <Text style={styles.btnText}>{t('soc.ignore')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {data.outgoing.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>
                {t('soc.outgoing')}<Text style={NUMERIC}>{` · ${data.outgoing.length}`}</Text>
              </Text>
              {data.outgoing.map((p) => (
                <Pressable key={p.uid} style={({ pressed }) => [styles.row, pressed && PRESSED]}
                           onPress={() => router.push(`/u/${p.username}`)}>
                  <Avatar avatar={p.avatar} name={p.displayName || p.username} size={avatarSize.list} />
                  <View style={styles.personBody}>
                    <Text numberOfLines={1} style={styles.name}>{p.displayName || p.username}</Text>
                    <Text numberOfLines={1} style={styles.handle}>@{p.username}</Text>
                  </View>
                  <Pressable onPress={() => act(p.uid, 'cancel')} hitSlop={8}
                             style={({ pressed }) => [styles.cancelBtn, pressed && PRESSED]}>
                    <Text style={styles.cancelText}>{t('soc.cancel')}</Text>
                  </Pressable>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.s20 },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4 },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '600', color: colors.text },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { ...SECTION_TITLE, color: colors.text3, marginTop: spacing.s20, marginBottom: spacing.s8 },

  card: {
    paddingVertical: spacing.s16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.s12 },
  personBody: { flex: 1, minWidth: 0 },
  name: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  handle: { fontSize: type.footnote, fontWeight: '500', color: colors.text3, marginTop: spacing.s4 },

  btnRow: { flexDirection: 'row', gap: spacing.s8, marginTop: spacing.s12 },
  btn: {
    flex: 1, height: TOUCH_MIN, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.accentFillStrong },
  btnQuiet: { backgroundColor: colors.bgInput },
  btnText: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  btnTextPrimary: { fontSize: type.subhead, fontWeight: '600', color: colors.onAccent },

  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.s12 },
  cancelBtn: {
    height: 32, paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgInput,
  },
  cancelText: { fontSize: type.footnote, fontWeight: '600', color: colors.text2 },
});
