// ─────────────────────────────────────────────────────────────────────────────
// Ayarlar.
//
// Önceden bunların hepsi Profil sekmesinde, kullanıcının İÇERİĞİYLE (koleksiyon,
// takip listesi, arkadaşlar) aynı listede duruyordu. HIG'in bilgi mimarisi
// ilkesi gereği ayrıldı: kullanıcı koleksiyonunu ararken dil ve bildirim
// ayarlarının arasında gezinmemeli.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type, PRESSED } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useWishlist } from '../src/context/WishlistContext';
import { signOut } from '../src/services/session';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const { account } = useAuth();
  const { items, enabled, enableNotifications, disableNotifications } = useWishlist();

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

  const showLanguagePicker = () => {
    Alert.alert(
      lang === 'tr' ? 'Dil Seçimi' : 'Language Selection',
      lang === 'tr' ? 'Lütfen tercih ettiğiniz dili seçin:' : 'Please select your preferred language:',
      [
        { text: lang === 'tr' ? '✓ Türkçe' : 'Türkçe', onPress: () => { if (lang !== 'tr') setLang('tr'); } },
        { text: lang === 'en' ? '✓ English' : 'English', onPress: () => { if (lang !== 'en') setLang('en'); } },
        { text: lang === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const onSignOut = () => {
    Alert.alert(t('acc.signOut'), account?.email || '', [
      { text: t('common.cancel'), style: 'cancel' },
      // Takip listesi çıkışta sunucuya akıtılıyor: yerel kopya siliniyor ve
      // senkron yalnızca açılışta/oturum değişiminde koştuğu için bu oturumda
      // eklenenler aksi hâlde kaybolurdu.
      { text: t('acc.signOut'), style: 'destructive', onPress: () => signOut(items) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('prof.settingsTitle')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Genel */}
        <Text style={styles.sectionLabel}>{t('prof.general')}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="notifications" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{t('notif.enable')}</Text>
              <Text style={styles.rowDesc} numberOfLines={2}>{t('notif.desc')}</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={onToggleNotif}
              trackColor={{ false: colors.cardBorder, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={showLanguagePicker}>
            <Ionicons name="language" size={20} color={colors.accent} />
            <Text style={styles.rowText}>
              {lang === 'tr' ? 'Dil: Türkçe' : 'Language: English'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={() => router.push('/onboarding')}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={styles.rowText}>{t('onb.retake')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        </View>

        {/* Gizlilik */}
        <Text style={styles.sectionLabel}>{t('prof.privacy')}</Text>
        <View style={styles.card}>
          <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={() => router.push('/social-settings')}>
            <Ionicons name="lock-closed" size={20} color={colors.accent} />
            <Text style={styles.rowText}>{t('soc.privacyTitle')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        </View>

        {/* Hesap — yalnızca oturum açıkken */}
        {account && (
          <>
            <Text style={styles.sectionLabel}>{t('prof.account')}</Text>
            <View style={styles.card}>
              <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={onSignOut}>
                <Ionicons name="log-out-outline" size={20} color={colors.text2} />
                <Text style={styles.rowText}>{t('acc.signOut')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text3} />
              </Pressable>

              <View style={styles.divider} />

              {/* Apple zorunlu: uygulama içinden hesap silme */}
              <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={() => router.push('/delete-account')}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.rowText, { color: colors.danger }]}>{t('acc.deleteTitle')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text3} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '900', color: colors.text },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.lg, paddingBottom: 40 },
  sectionLabel: {
    fontSize: type.caption, fontWeight: '800', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10, marginTop: 22,
  },
  card: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 11 },
  rowText: { flex: 1, fontSize: type.subhead, color: colors.text, fontWeight: '500' },
  rowDesc: { fontSize: type.caption, color: colors.text3, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: colors.cardBorder },
});
