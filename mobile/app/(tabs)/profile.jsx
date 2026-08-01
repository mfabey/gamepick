import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections } from '../../src/hooks/useCollections';

export default function ProfileScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox, logoutSteam, logoutXbox, account } = useAuth();

  const { items } = useWishlist();
  const collections = useCollections();

  // Not: oturum kapatma, dil seçimi ve bildirim anahtarı /settings ekranına
  // taşındı — bu ekran artık yalnızca kullanıcının içeriğini gösteriyor.

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) Alert.alert(t('auth.loginFailed'), r.error);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_SPACE + 16 }} showsVerticalScrollIndicator={false}>
        {/* Başlık + ayarlar — ayarlar artık içerikle aynı listede değil */}
        <View style={styles.headRow}>
          <Text style={styles.h1}>{t('nav.profile')}</Text>
          <Pressable style={styles.gearBtn} onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* ── Gamerisen hesabı ── */}
        {account ? (
          <View style={styles.accCard}>
            <View style={styles.accAvatar}>
              <Ionicons name="person" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{account.name}</Text>
              <Text style={styles.accStatus} numberOfLines={1}>{account.email}</Text>
            </View>
          </View>
        ) : (
          <Pressable style={styles.settingRow} onPress={() => router.push('/account')}>
            <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.settingText}>{t('acc.signIn')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        )}

        {/* ── İçeriğim ──
            Liste satırı yerine ızgara: beş giriş art arda satır olarak
            dizildiğinde ayarlardan ayırt edilemiyordu. */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('prof.myContent')}</Text>
        <View style={styles.grid}>
          <ContentTile
            icon="albums" label={t('col.entry')} count={collections.length}
            onPress={() => router.push('/collections')}
          />
          <ContentTile
            icon="bookmark" label={t('wishlist.title')} count={items.length}
            onPress={() => router.push('/wishlist')}
          />
          <ContentTile
            icon="people" label={t('soc.entry')} beta
            onPress={() => router.push('/social')}
          />
          <ContentTile
            icon="list" label={t('pl.entry')} beta
            onPress={() => router.push('/lists')}
          />
          <ContentTile
            icon="stats-chart" label={t('stats.entry')} wide
            onPress={() => router.push('/stats')}
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{t('auth.accounts')}</Text>

        {/* Steam hesapları */}
        {steamAccounts.map(acc => (
          <View key={acc.steamId} style={styles.accountCard}>
            {acc.avatar ? (
              <Image source={acc.avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.steam }]}>
                <Text style={styles.avatarInitial}>{acc.name?.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
              <View style={styles.badgeRow}>
                <SteamMark />
                <Text style={styles.accStatus}>Steam · {t('auth.connected')}</Text>
              </View>
            </View>
            <Pressable onPress={() => logoutSteam(acc.steamId)} hitSlop={8} style={styles.discBtn}>
              <Ionicons name="close" size={18} color={colors.text3} />
            </Pressable>
          </View>
        ))}

        {/* Steam bağla / ekle */}
        <Pressable
          disabled={busy}
          onPress={() => doLogin(loginSteam)}
          style={[styles.connectBtn, { borderColor: colors.steam }]}
        >
          {busy ? <ActivityIndicator color={colors.steam} /> : (
            <>
              <SteamMark size={17} />
              <Text style={[styles.connectText, { color: colors.steam }]}>
                {steamAccounts.length > 0 ? t('auth.addSteam') : t('auth.connectSteam')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Xbox */}
        {xbox ? (
          <View style={[styles.accountCard, { marginTop: 12 }]}>
            {xbox.avatar ? (
              <Image source={xbox.avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: 'rgba(16,124,16,0.3)' }]}>
                <Ionicons name="logo-xbox" size={22} color={colors.xbox} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{xbox.gamertag}</Text>
              <View style={styles.badgeRow}>
                <Ionicons name="logo-xbox" size={13} color={colors.xbox} />
                <Text style={styles.accStatus}>Xbox · {t('auth.connected')}</Text>
              </View>
            </View>
            <Pressable onPress={logoutXbox} hitSlop={8} style={styles.discBtn}>
              <Ionicons name="close" size={18} color={colors.text3} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={busy}
            onPress={() => doLogin(loginXbox)}
            style={[styles.connectBtn, { borderColor: colors.xbox, marginTop: 12 }]}
          >
            {busy ? <ActivityIndicator color={colors.xbox} /> : (
              <>
                <Ionicons name="logo-xbox" size={18} color={colors.xbox} />
                <Text style={[styles.connectText, { color: colors.xbox }]}>{t('auth.connectXbox')}</Text>
              </>
            )}
          </Pressable>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function SteamMark({ size = 14 }) {
  return <Ionicons name="logo-steam" size={size} color={colors.steam} />;
}

// İçerik karosu — sayacı ve BETA rozetini taşır.
function ContentTile({ icon, label, count, beta, wide, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      <View style={styles.tileTop}>
        <View style={styles.tileIcon}>
          <Ionicons name={icon} size={19} color={colors.accent} />
        </View>
        {beta ? <View style={styles.betaChip}><Text style={styles.betaChipText}>BETA</Text></View> : null}
        {count > 0 && !beta ? (
          <View style={styles.wishBadge}><Text style={styles.wishBadgeText}>{count}</Text></View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  h1: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  gearBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1, flexBasis: '46%',
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, padding: 14, minHeight: 92, justifyContent: 'space-between',
  },
  tileWide: { flexBasis: '100%', minHeight: 76 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 12, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 10 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 17 },
  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 13,
  },
  accAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  accName: { fontSize: 15, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  accStatus: { fontSize: 12, color: colors.text3 },
  discBtn: { padding: 4 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 13,
  },
  connectText: { fontSize: 15, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 14,
  },
  settingText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  wishBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  wishBadgeText: { color: colors.accentText, fontSize: 12, fontWeight: '800' },
  betaChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder,
    marginRight: 4,
  },
  betaChipText: { color: colors.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});


