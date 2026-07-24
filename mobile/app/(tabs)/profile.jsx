import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';

export default function ProfileScreen() {
  const { t, lang, toggleLang } = useLanguage();
  const router = useRouter();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox, logoutSteam, logoutXbox } = useAuth();
  const { items, enabled, enableNotifications, disableNotifications } = useWishlist();

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) Alert.alert(t('auth.loginFailed'), r.error);
  };

  const onToggleNotif = async (val) => {
    if (val) {
      const r = await enableNotifications();
      if (r.error) {
        const msg = r.error === 'permission-denied' ? t('notif.permissionError') : t('notif.needDevBuild');
        Alert.alert(t('notif.title'), msg);
      }
    } else {
      await disableNotifications();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_SPACE + 16 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>{t('nav.profile')}</Text>

        {/* Bağlı hesaplar */}
        <Text style={styles.sectionLabel}>{t('auth.accounts')}</Text>

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

        {/* İndirim uyarıları */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{t('notif.title')}</Text>
        <View style={styles.notifCard}>
          <View style={styles.notifIcon}>
            <Ionicons name="notifications" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.notifTitle}>{t('notif.enable')}</Text>
            <Text style={styles.notifDesc} numberOfLines={2}>{t('notif.desc')}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggleNotif}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
        <Pressable style={[styles.settingRow, { marginTop: 10 }]} onPress={() => router.push('/wishlist')}>
          <Ionicons name="bookmark" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('wishlist.title')}</Text>
          {items.length > 0 && <View style={styles.wishBadge}><Text style={styles.wishBadgeText}>{items.length}</Text></View>}
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Dil */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{lang === 'tr' ? 'Ayarlar' : 'Settings'}</Text>
        <Pressable style={styles.settingRow} onPress={toggleLang}>
          <Ionicons name="language" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{lang === 'tr' ? 'Dil: Türkçe' : 'Language: English'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SteamMark({ size = 14 }) {
  return <Ionicons name="logo-steam" size={size} color={colors.steam} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 12, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 10 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  accName: { fontSize: 15, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  accStatus: { fontSize: 12, color: colors.text3 },
  discBtn: { padding: 4 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 13,
  },
  connectText: { fontSize: 14, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 14,
  },
  settingText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 14,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  notifDesc: { fontSize: 12, color: colors.text3, marginTop: 2, lineHeight: 16 },
  wishBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  wishBadgeText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});


