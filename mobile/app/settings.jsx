// ─────────────────────────────────────────────────────────────────────────────
// Ayarlar.
//
// Önceden bunların hepsi Profil sekmesinde, kullanıcının İÇERİĞİYLE (koleksiyon,
// takip listesi, arkadaşlar) aynı listede duruyordu. HIG'in bilgi mimarisi
// ilkesi gereği ayrıldı: kullanıcı koleksiyonunu ararken dil ve bildirim
// ayarlarının arasında gezinmemeli.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import Constants from 'expo-constants';
import { NavBar } from '../src/components/ui/ScreenParts';
import { Txt, PressableScale, IconButton, ListGroup, ListRow, Switch } from '../src/components/ui/Primitives';
import Avatar from '../src/components/Avatar';
import { Icon } from '../src/components/Icon';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { space, component } from '../src/theme/tokens';
import { useAppPreferences, setAppPreference } from '../src/services/appPreferences';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useWishlist } from '../src/context/WishlistContext';
import { signOut } from '../src/services/session';
import { LANGUAGES } from '../src/services/locale';
import { useConnectedLibrary } from '../src/hooks/useConnectedLibrary';
import ChoiceSheet from '../src/components/ChoiceSheet';
import { pushHataAnahtari } from '../src/notifications';
import { useTheme } from '../src/context/ThemeContext';

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
  const { pref, setPref } = useTheme();
  const { colors } = useDesignTheme();
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const [dilAcik, setDilAcik] = useState(false);
  const preferences = useAppPreferences();
  const [themeOpen, setThemeOpen] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  // Bağlı hesap yönetimi PROFİLDEN buraya taşındı (Hesap grubu).
  const {
    account, steamAccounts, xbox, busy,
    loginSteam, loginXbox, logoutSteam, logoutXbox,
  } = useAuth();
  const { totalGamesCount: gameCount } = useConnectedLibrary();
  const { items, enabled, enableNotifications, disableNotifications } = useWishlist();

  /**
   * Mağaza bağlama — hata kodu bağlamdan geliyor
   * (ACCOUNT_REQUIRED / STEAM_LIMIT / SYNC_FAILED); çevirisi varsa o
   * gösteriliyor, yoksa ham metne düşülüyor.
   */
  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) {
      const k = `auth.err.${r.error}`;
      Alert.alert(t('auth.loginFailed'), t(k) !== k ? t(k) : r.error);
    }
  };

  const toggleNotifications = async (val) => {
    if (val) {
      const r = await enableNotifications();
      if (r.error) {
        if (r.error === 'permission-denied') {
          Alert.alert(
            t('notif.title'),
            t('notif.permissionDeniedDesc'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          const msg = t(pushHataAnahtari(r.error));
          Alert.alert(t('notif.title'), msg);
        }
      }
    } else {
      await disableNotifications();
    }
  };

  const onToggleNotif = async (value) => {
    if (notifBusy) return;
    setNotifBusy(true);
    try { await toggleNotifications(value); }
    catch { Alert.alert(t('notif.title'), t('v2.loadError')); }
    finally { setNotifBusy(false); }
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
   *
   * ALERT DEĞİL ChoiceSheet — çünkü Alert bu listeyi TAŞIYAMIYORDU.
   * Öncesinde `Alert.alert` buton dizisiydi: 5 dil + İptal = 6 buton.
   * Android'in AlertDialog'u üçten fazlasını göstermiyor ve fazlasını
   * SESSİZCE düşürüyor. Ölçüldü (2026-08-31, Android 16, release APK):
   * ekranda yalnız ENGLISH / ESPAÑOL / PORTUGUÊS çıkıyordu — LANGUAGES
   * sırasındaki son iki dil, Deutsch ve TÜRKÇE, hiç görünmüyordu.
   * Uygulamayı Türkçe kullanmak isteyen biri Android'de bunu yapamıyordu.
   */
  const showLanguagePicker = () => setDilAcik(true);

  const onSignOut = () => {
    Alert.alert(t('acc.signOut'), account?.email || '', [
      { text: t('common.cancel'), style: 'cancel' },
      // Takip listesi çıkışta sunucuya akıtılıyor: yerel kopya siliniyor ve
      // senkron yalnızca açılışta/oturum değişiminde koştuğu için bu oturumda
      // eklenenler aksi hâlde kaybolurdu.
      { text: t('acc.signOut'), style: 'destructive', onPress: () => signOut(items) },
    ]);
  };

  const profileName = account?.displayName || account?.name || account?.username || t('prof.editProfile');
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('prof.settingsTitle')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[28], paddingHorizontal: yan }} showsVerticalScrollIndicator={false}>
        <PressableScale accessibilityRole="button" onPress={() => router.push(account ? '/profile-edit' : '/account')}
          style={[styles.profile, { backgroundColor: colors.surface1 }]}>
          <Avatar avatar={account?.avatar} name={profileName} size={component.settings.avatar} />
          <View style={{ flex: 1 }}>
            <Txt variant="headline" numberOfLines={2}>{account ? profileName : t('acc.signIn')}</Txt>
            <Txt variant="footnote" style={{ color: colors.text2 }}>{t('set.accountSummary')}</Txt>
          </View>
          <Icon name="chev" size={16} color={colors.text3} />
        </PressableScale>
        <View style={styles.groups}>
          <ListGroup title={t('notif.title')} note={t('notif.desc')}>
            <ListRow icon="heart" title={t('notif.enable')} trailing={<Switch accessibilityLabel={t('notif.enable')} disabled={notifBusy} value={enabled} onValueChange={onToggleNotif} />} />
          </ListGroup>
          <ListGroup title={t('set.appearance')}>
            <ListRow icon="moon" title={t('set.theme')} value={t('set.theme.' + pref)} onPress={() => setThemeOpen(true)} />
            <ListRow icon="layers" title={t('v2.reduceMotion')} trailing={<Switch accessibilityLabel={t('v2.reduceMotion')} value={preferences.reduceMotion} onValueChange={value => setAppPreference('reduceMotion', value).catch(() => Alert.alert(t('v2.loadError')))} />} />
            <ListRow icon="play" title={t('v2.autoplay')} trailing={<Switch accessibilityLabel={t('v2.autoplay')} value={preferences.autoplay} onValueChange={value => setAppPreference('autoplay', value).catch(() => Alert.alert(t('v2.loadError')))} />} />
            <ListRow icon="globe" title={t('set.language')} value={LANGUAGES.find(l => l.code === lang)?.name || lang} onPress={showLanguagePicker} />
          </ListGroup>
          <ListGroup title={t('set.grpPrivacy')}>
            <ListRow icon="eye" title={t('soc.privacyTitle')} onPress={() => router.push('/social-settings')} />
            <ListRow icon="lock" title={t('soc.blocked')} onPress={() => router.push('/social-settings?odak=engel')} />
          </ListGroup>
          <ListGroup title={t('set.grpAccount')}>
            {steamAccounts.map(acc => <ListRow key={acc.steamId} icon="bag" title={acc.name} description={'Steam · ' + t('auth.connected')}
              trailing={<IconButton icon="x" label={acc.name + ' · ' + t('auth.disconnect')} onPress={() => logoutSteam(acc.steamId)} />} />)}
            <ListRow icon="plus" title={steamAccounts.length ? t('auth.addSteam') : t('auth.connectSteam')} onPress={() => doLogin(loginSteam)} disabled={busy}
              trailing={busy ? <ActivityIndicator color={colors.text2} /> : undefined} />
            {xbox ? <ListRow icon="pad" title={xbox.gamertag} description={'Xbox · ' + t('auth.connected')}
              trailing={<IconButton icon="x" label={'Xbox · ' + t('auth.disconnect')} onPress={logoutXbox} />} />
              : <ListRow icon="pad" title={t('auth.connectXbox')} onPress={() => doLogin(loginXbox)} disabled={busy}
                  trailing={busy ? <ActivityIndicator color={colors.text2} /> : undefined} />}
          </ListGroup>
          <ListGroup title={t('set.grpGameData')}>
            <ListRow icon="grid" title={t('prof.gLibrary')} value={gameCount > 0 ? String(gameCount) : undefined} onPress={() => router.push('/library')} />
            <ListRow icon="book" title={t('prof.gLists')} onPress={() => router.push('/lists')} />
            <ListRow icon="layers" title={t('prof.gCollections')} onPress={() => router.push('/collections')} />
            <ListRow icon="image" title={t('prof.gCards')} onPress={() => router.push(account ? '/game-cards' : '/account')} />
            <ListRow icon="poll" title={t('prof.gStats')} onPress={() => router.push(account ? '/stats' : '/account')} />
            <ListRow icon="spark" title={t('prof.gDiscover')} onPress={() => router.push('/discover')} />
            <ListRow icon="users" title={t('prof.gSteam')} onPress={() => router.push(account ? '/steam-friends' : '/account')} />
          </ListGroup>
          <ListGroup title={t('set.support')}>
            <ListRow icon="mail" title={t('set.support')} description={SUPPORT_EMAIL} onPress={() => openPage('/support')} />
            <ListRow icon="shield" title={t('set.privacyPolicy')} onPress={() => openPage('/privacy')} />
            <ListRow icon="book" title={t('set.terms')} onPress={() => openPage('/terms')} />
          </ListGroup>
          {account && <>
            <PressableScale accessibilityRole="button" onPress={onSignOut} style={[styles.signOut, { backgroundColor: colors.surface1 }]}>
              <Icon name="logout" size={18} color={colors.red} />
              <Txt variant="button" style={{ color: colors.red }}>{t('acc.signOut')}</Txt>
            </PressableScale>
            <ListGroup><ListRow icon="alert" title={t('acc.deleteTitle')} destructive onPress={() => router.push('/delete-account')} /></ListGroup>
          </>}
        </View>
        <Txt variant="caption" style={[styles.version, { color: colors.text3 }]}>Gamerisen {Constants.expoConfig?.version || ''}</Txt>
      </ScrollView>
      <ChoiceSheet visible={themeOpen} title={t('set.theme')} options={['system', 'dark', 'light'].map(key => ({ key, label: t('set.theme.' + key) }))}
        selectedKey={pref} onSelect={setPref} onClose={() => setThemeOpen(false)} />
      <ChoiceSheet visible={dilAcik} title={t('set.language')} options={LANGUAGES.map(l => ({ key: l.code, label: l.name }))}
        selectedKey={lang} onSelect={setLang} onClose={() => setDilAcik(false)} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  profile: { marginHorizontal: 20, marginTop: 16, minHeight: component.settings.profileHeight, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: component.settings.profileGap },
  groups: { marginTop: space[28], gap: space[28] },
  signOut: { marginHorizontal: 20, minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  version: { textAlign: 'center', marginTop: 16 },
});
