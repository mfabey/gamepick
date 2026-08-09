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
import { SettingsGroup, SettingsRow } from '../src/components/SettingsList';

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
        {/* BÖLÜM BAŞLIĞI YOK — gruplama boşlukla yapılıyor. Kategori adları
            ("Genel", "Gizlilik", "Hesap") bilgi taşımıyordu; kullanıcı satırı
            zaten okuyor. Ekranı üretilmiş bir taksonomi gibi gösteriyorlardı. */}
        <SettingsGroup>
          <SettingsRow
            icon="notifications-outline"
            label={t('notif.enable')}
            desc={t('notif.desc')}
            right={(
              <Switch
                value={enabled}
                onValueChange={onToggleNotif}
                trackColor={{ false: colors.cardBorder, true: colors.accent }}
                thumbColor="#fff"
              />
            )}
          />
          <SettingsRow
            icon="language-outline"
            label={t('set.language')}
            value={lang === 'tr' ? 'Türkçe' : 'English'}
            onPress={showLanguagePicker}
          />
          <SettingsRow
            icon="sparkles-outline"
            label={t('onb.retake')}
            onPress={() => router.push('/onboarding')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            icon="lock-closed-outline"
            label={t('soc.privacyTitle')}
            onPress={() => router.push('/social-settings')}
          />
        </SettingsGroup>

        {account && (
          <SettingsGroup>
            <SettingsRow icon="log-out-outline" label={t('acc.signOut')} onPress={onSignOut} />
            {/* Apple zorunlu: uygulama içinden hesap silme.
                TEK RENK İSTİSNASI — burada kırmızı gerçek bir uyarı taşıyor. */}
            <SettingsRow
              icon="trash-outline"
              label={t('acc.deleteTitle')}
              danger
              onPress={() => router.push('/delete-account')}
            />
          </SettingsGroup>
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
});
