// ─────────────────────────────────────────────────────────────────────────────
// Ayarlar.
//
// Önceden bunların hepsi Profil sekmesinde, kullanıcının İÇERİĞİYLE (koleksiyon,
// takip listesi, arkadaşlar) aynı listede duruyordu. HIG'in bilgi mimarisi
// ilkesi gereği ayrıldı: kullanıcı koleksiyonunu ararken dil ve bildirim
// ayarlarının arasında gezinmemeli.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
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
import IconButton from '../src/components/IconButton';
import { useConnectedLibrary } from '../src/hooks/useConnectedLibrary';
import ChoiceSheet from '../src/components/ChoiceSheet';
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
  const [dilAcik, setDilAcik] = useState(false);
  // Bağlı hesap yönetimi PROFİLDEN buraya taşındı (Hesap grubu).
  const {
    account, steamAccounts, xbox, busy,
    loginSteam, loginXbox, logoutSteam, logoutXbox,
  } = useAuth();
  const { steamGames, xboxGames, totalGamesCount: gameCount } = useConnectedLibrary();
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
        {/* ── BÖLÜM BAŞLIKLARI GERİ GELDİ ──
            Eski karar "başlık yok, boşluk yeter"di ve 9 satırda doğruydu.
            Profil sekmesi içerik sayfasına dönüşünce oradaki 10 kısayolun
            altısı ile bağlı hesap satırları BURAYA taşındı; liste 19 satıra
            çıktı ve boşlukla gruplama taranamaz hâle geldi. Başlıklar
            taksonomi değil, "ne bulacağın"ın adı. */}

        {/* ── Hesap ──
            Profil düzenleme ve bağlı mağazalar aynı yerde: ikisi de "bu hesap
            kim" sorusunun cevabı. Bağlı hesap satırları PROFİLDEN geldi —
            profilde artık durumu bir çip söylüyor, yönetimi burası yapıyor. */}
        <SettingsGroup title={t('set.grpAccount')}>
          <SettingsRow
            icon="person-circle-outline"
            label={t('prof.editProfile')}
            onPress={() => router.push(account ? '/profile-edit' : '/account')}
          />
          {steamAccounts.map((acc) => (
            <SettingsRow
              key={acc.steamId}
              icon="logo-steam"
              label={acc.name}
              desc={`Steam · ${t('auth.connected')}`}
              right={<IconButton icon="close" size={18} color={colors.text3}
                                 onPress={() => logoutSteam(acc.steamId)} />}
            />
          ))}
          <SettingsRow
            icon="add-circle-outline"
            label={steamAccounts.length > 0 ? t('auth.addSteam') : t('auth.connectSteam')}
            onPress={busy ? undefined : () => doLogin(loginSteam)}
            disabled={busy}
            right={busy ? <ActivityIndicator size="small" color={colors.steam} /> : undefined}
          />
          {xbox ? (
            <SettingsRow
              icon="logo-xbox"
              label={xbox.gamertag}
              desc={`Xbox · ${t('auth.connected')}`}
              right={<IconButton icon="close" size={18} color={colors.text3} onPress={logoutXbox} />}
            />
          ) : (
            <SettingsRow
              icon="logo-xbox"
              label={t('auth.connectXbox')}
              onPress={busy ? undefined : () => doLogin(loginXbox)}
              disabled={busy}
              right={busy ? <ActivityIndicator size="small" color={colors.xbox} /> : undefined}
            />
          )}
        </SettingsGroup>

        {/* ── Oyun verim ──
            Profildeki kısayol ızgarasının GEZİNME yarısı. İçerik yarısı
            (koleksiyon · istek listesi · inceleme · gönderi) profilde sekme
            oldu; kalanlar araç ve burada duruyorlar. */}
        <SettingsGroup title={t('set.grpGameData')}>
          <SettingsRow icon="grid-outline" label={t('prof.gLibrary')}
                       value={gameCount > 0 ? String(gameCount) : undefined}
                       onPress={() => router.push('/library')} />
          <SettingsRow icon="list-outline" label={t('prof.gLists')}
                       onPress={() => router.push('/lists')} />
          <SettingsRow icon="albums-outline" label={t('prof.gCollections')}
                       onPress={() => router.push('/collections')} />
          <SettingsRow icon="card-outline" label={t('prof.gCards')}
                       onPress={() => router.push(account ? '/game-cards' : '/account')} />
          <SettingsRow icon="stats-chart-outline" label={t('prof.gStats')}
                       onPress={() => router.push(account ? '/stats' : '/account')} />
          <SettingsRow icon="sparkles-outline" label={t('prof.gDiscover')}
                       onPress={() => router.push('/discover')} />
          <SettingsRow icon="people-outline" label={t('prof.gSteam')}
                       onPress={() => router.push(account ? '/steam-friends' : '/account')} />
        </SettingsGroup>

        <SettingsGroup title={t('set.grpApp')}>
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

        <SettingsGroup title={t('set.grpPrivacy')}>
          <SettingsRow
            icon="lock-closed-outline"
            label={t('soc.privacyTitle')}
            onPress={() => router.push('/social-settings')}
          />
        </SettingsGroup>

        {/* Destek ve yasal metinler — bkz. dosya başındaki gerekçe.
            BAŞLIKSIZ KALIYOR: dört başlığın (Hesap · Oyun verim · Gizlilik ·
            Uygulama) hiçbirine ait değil ve beşinci bir başlık eklemek,
            listeyi başlıklarla doldurup taranabilirliği geri götürürdü. */}
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

      <ChoiceSheet
        visible={dilAcik}
        title={t('set.language')}
        options={LANGUAGES.map((l) => ({ key: l.code, label: l.name }))}
        selectedKey={lang}
        onSelect={setLang}
        onClose={() => setDilAcik(false)}
      />
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
