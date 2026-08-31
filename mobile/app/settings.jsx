// ─────────────────────────────────────────────────────────────────────────────
// Ayarlar.
//
// Önceden bunların hepsi Profil sekmesinde, kullanıcının İÇERİĞİYLE (koleksiyon,
// takip listesi, arkadaşlar) aynı listede duruyordu. HIG'in bilgi mimarisi
// ilkesi gereği ayrıldı: kullanıcı koleksiyonunu ararken dil ve bildirim
// ayarlarının arasında gezinmemeli.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { radius, spacing, type, PRESSED } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useWishlist } from '../src/context/WishlistContext';
import { signOut } from '../src/services/session';
import { LANGUAGES } from '../src/services/locale';
import { SettingsGroup, SettingsRow } from '../src/components/SettingsList';
import { pushHataAnahtari } from '../src/notifications';
import { useTheme, useStyles } from '../src/context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// YASAL VE İLETİŞİM
//
// App Store Guideline 1.2, kullanıcı içeriği barındıran uygulamalarda dört
// önlem sayıyor ve dördüncüsü "insanların size kolayca ulaşabilmesi için
// YAYINLANMIŞ İLETİŞİM BİLGİSİ". Sayfalar web'de zaten vardı ama uygulamadan
// erişilemiyordu — yani önlem karşılanmıyordu.
//
// E-POSTA ADRESİ SATIRIN ALTINDA AÇIKÇA YAZIYOR, bir dokunuşun arkasında
// değil. "Yayınlanmış" olmasının anlamı bu: aranan bilgi ekranda görünüyor,
// bulmak için gezinmek gerekmiyor.
//
// Sayfalar uygulama İÇİ tarayıcıda açılıyor (Safari'ye atılmıyor): kullanıcı
// bir sözleşmeyi okuyup ayarlara dönerken uygulamadan çıkmış olmamalı.
// ─────────────────────────────────────────────────────────────────────────────
const SITE = 'https://www.gamerisen.com';
const SUPPORT_EMAIL = 'support@gamerisen.com';

export default function SettingsScreen() {
  const { colors, pref, setPref } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const { account } = useAuth();
  const { items, enabled, enableNotifications, disableNotifications } = useWishlist();

  const onToggleNotif = async (val) => {
    if (val) {
      const r = await enableNotifications();
      if (r.error) {
        const msg = t(pushHataAnahtari(r.error));
        Alert.alert(t('notif.title'), msg);
      }
    } else {
      await disableNotifications();
    }
  };

  /**
   * Yasal sayfayı uygulama içi tarayıcıda açar.
   *
   * Hata SESSİZ: tarayıcı açılamazsa (nadiren, bazı kurumsal profillerde)
   * kullanıcıya gösterilecek bir çözüm yok ve e-posta adresi zaten satırın
   * altında yazılı — ulaşma yolu kapanmıyor.
   */
  const openPage = (path) => {
    WebBrowser.openBrowserAsync(`${SITE}${path}`).catch(() => {});
  };

  /**
   * Dil seçici.
   *
   * Diller KENDİ ADLARIYLA yazılı ("Español", "Português" — "İspanyolca"
   * değil): bir kullanıcı uygulamayı anlamadığı bir dilde açtığında,
   * aradığı satırı ancak kendi dilinin adından bulabilir.
   *
   * Liste `LANGUAGES` üzerinden kuruluyor; yeni dil eklemek tek satır.
   */
  const showLanguagePicker = () => {
    Alert.alert(
      t('set.language'),
      undefined,
      [
        ...LANGUAGES.map((l) => ({
          text: lang === l.code ? `✓ ${l.name}` : l.name,
          onPress: () => { if (lang !== l.code) setLang(l.code); },
        })),
        { text: t('common.cancel'), style: 'cancel' },
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
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('prof.settingsTitle')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
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
          {/* TEMA — handoff'un durum tablosunda "Sistem / koyu / açık" olarak
              tanımlı. Yeniden yükleme YOK: palet artık reaktif, seçim anında
              yansıyor (bkz. ThemeContext başı). */}
          <SettingsRow
            icon="contrast-outline"
            label={t('set.theme')}
            value={t('set.theme.' + pref)}
            onPress={() => {
              const sira = ['system', 'dark', 'light'];
              setPref(sira[(sira.indexOf(pref) + 1) % sira.length]);
            }}
          />
          <SettingsRow
            icon="language-outline"
            label={t('set.language')}
            value={LANGUAGES.find((l) => l.code === lang)?.name || lang}
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

        {/* Destek ve yasal metinler — bkz. dosya başındaki gerekçe. */}
        <SettingsGroup>
          <SettingsRow
            icon="mail-outline"
            label={t('set.support')}
            desc={SUPPORT_EMAIL}
            onPress={() => openPage('/support')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('set.privacyPolicy')}
            onPress={() => openPage('/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('set.terms')}
            onPress={() => openPage('/terms')}
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

// REAKTİF STİL: tema değişince yeniden üretiliyor. Modül düzeyinde tanımlı
// olması şart — bileşen içinde tanımlansaydı her render'da yeni fonksiyon
// olur, useMemo hiç tutmaz ve StyleSheet her çizimde yeniden kurulurdu.
const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '900', color: colors.text },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.lg },
});
