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
//
// 2.0 (tasarım dışı ekran, plan: "NavBar + UserRow listesi"): NavBar,
// UserRow, SectionHeader, 2.0 Button. Arkadaşlık eylemi FollowButton'a
// bağlanmıyor (plan).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import EmptyState from '../src/components/EmptyState';
import { NavBar } from '../src/components/ui/Navigation';
import { Button, SectionHeader } from '../src/components/ui/Primitives';
import { UserRow } from '../src/components/ui/Social';
import { spacing } from '../src/theme';
import { component as K } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { getFriends, friendAction } from '../src/api/social';

export default function FriendRequestsScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('soc.tabRequests')} />

      {data === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.text2} /></View>
      ) : bos ? (
        <EmptyState icon="mail-outline" title={t('soc.noRequests')} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40, paddingHorizontal: yan + spacing.s20 }]}
          showsVerticalScrollIndicator={false}
        >
          {data.incoming.length > 0 ? (
            <>
              <View style={styles.sectionTop}>
                <SectionHeader title={`${t('soc.incoming')} · ${data.incoming.length}`} />
              </View>
              {data.incoming.map((p, i) => (
                <View key={p.uid} style={[styles.card, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                  <UserRow
                    avatar={p.avatar}
                    name={p.displayName || p.username}
                    handle={`@${p.username}`}
                    onPress={() => router.push(`/u/${p.username}`)}
                  />
                  {/* İki düğme EŞİT GENİŞLİKTE ve 44 yüksekliğinde: kabul
                      birincil ama reddetmek de meşru bir seçim, küçültülmüyor.
                      "Yoksay" kopyası bilinçli — "reddet" kişiyi yargılıyormuş
                      ve karşı tarafa bildirim gidiyormuş gibi okunuyor. */}
                  <View style={styles.btnRow}>
                    <Button title={t('soc.accept')} height={K.friends.requestButton} loading={islemde === p.uid}
                      disabled={islemde === p.uid} onPress={() => act(p.uid, 'accept')} style={styles.flex} />
                    <Button title={t('soc.ignore')} variant="secondary" height={K.friends.requestButton}
                      disabled={islemde === p.uid} onPress={() => act(p.uid, 'reject')} style={styles.flex} />
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {data.outgoing.length > 0 ? (
            <>
              <View style={styles.sectionTop}>
                <SectionHeader title={`${t('soc.outgoing')} · ${data.outgoing.length}`} />
              </View>
              {data.outgoing.map((p) => (
                <UserRow
                  key={p.uid}
                  avatar={p.avatar}
                  name={p.displayName || p.username}
                  handle={`@${p.username}`}
                  onPress={() => router.push(`/u/${p.username}`)}
                  right={
                    <Button title={t('soc.cancel')} variant="secondary" height={K.friends.action}
                      onPress={() => act(p.uid, 'cancel')} style={styles.action} />
                  }
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.s20 },
  sectionTop: { marginTop: spacing.s20, marginBottom: spacing.s4 },
  card: { paddingBottom: spacing.s16 },
  btnRow: { flexDirection: 'row', gap: spacing.s8, marginTop: spacing.s4 },
  flex: { flex: 1 },
  action: { paddingHorizontal: spacing.s12 },
});
