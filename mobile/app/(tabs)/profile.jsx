import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections } from '../../src/hooks/useCollections';
import { signOut } from '../../src/services/session';

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox, logoutSteam, logoutXbox, account } = useAuth();

  const onSignOut = () => {
    Alert.alert(t('acc.signOut'), account?.email || '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('acc.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };
  const { items, enabled, enableNotifications, disableNotifications } = useWishlist();
  const collections = useCollections();

  const showLanguagePicker = () => {
    Alert.alert(
      lang === 'tr' ? 'Dil Seçimi' : 'Language Selection',
      lang === 'tr' ? 'Lütfen tercih ettiğiniz dili seçin:' : 'Please select your preferred language:',
      [
        {
          text: lang === 'tr' ? '✓ Türkçe' : 'Türkçe',
          onPress: () => {
            if (lang !== 'tr') setLang('tr');
          },
        },
        {
          text: lang === 'en' ? '✓ English' : 'English',
          onPress: () => {
            if (lang !== 'en') setLang('en');
          },
        },
        {
          text: lang === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

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
        {/* ── Gamerisen hesabı ── */}
        <Text style={styles.sectionLabel}>Gamerisen</Text>
        {account ? (
          <View style={styles.accCard}>
            <View style={styles.accAvatar}>
              <Ionicons name="person" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{account.name}</Text>
              <Text style={styles.accStatus} numberOfLines={1}>{account.email}</Text>
            </View>
            <Pressable onPress={onSignOut} hitSlop={8} style={styles.discBtn}>
              <Ionicons name="log-out-outline" size={18} color={colors.text3} />
            </Pressable>
          </View>
        ) : null}

        {/* Apple zorunlu: uygulama içinden hesap silme (yalnızca oturum açıkken) */}
        {account && (
          <Pressable style={styles.settingRow} onPress={() => router.push('/delete-account')}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.settingText, { color: colors.danger }]}>{t('acc.deleteTitle')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        )}

        {!account && (
          <Pressable style={styles.settingRow} onPress={() => router.push('/account')}>
            <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.settingText}>{t('acc.signIn')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        )}

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

        {/* Arkadaşlar — beta */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/social')}>
          <Ionicons name="people" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('soc.entry')}</Text>
          <View style={styles.betaChip}><Text style={styles.betaChipText}>BETA</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Topluluk listeleri — beta */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/lists')}>
          <Ionicons name="list" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('pl.entry')}</Text>
          <View style={styles.betaChip}><Text style={styles.betaChipText}>BETA</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Haftalık rapor */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/stats')}>
          <Ionicons name="stats-chart" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('stats.entry')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Koleksiyonlar */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/collections')}>
          <Ionicons name="albums" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('col.entry')}</Text>
          {collections.length > 0 && <View style={styles.wishBadge}><Text style={styles.wishBadgeText}>{collections.length}</Text></View>}
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Dil */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{lang === 'tr' ? 'Ayarlar' : 'Settings'}</Text>
        <Pressable style={styles.settingRow} onPress={showLanguagePicker}>
          <Ionicons name="language" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{lang === 'tr' ? 'Dil: Türkçe' : 'Language: English'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Sosyal gizlilik + engellenenler */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/social-settings')}>
          <Ionicons name="lock-closed" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('soc.privacyTitle')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text3} />
        </Pressable>

        {/* Zevk profilini yeniden kur */}
        <Pressable style={styles.settingRow} onPress={() => router.push('/onboarding')}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={styles.settingText}>{t('onb.retake')}</Text>
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
  betaChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder,
    marginRight: 4,
  },
  betaChipText: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});


