import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useState, useCallback } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Alert, Keyboard, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getValidToken, signOut } from '../src/services/session';
import { deleteAccount } from '../src/api/account';
import GoogleAuthButton, { GOOGLE_YAPILANDIRILDI } from '../src/components/GoogleAuthButton';
import { useAuth } from '../src/context/AuthContext';
import { component as K, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { Button, TextField, Txt } from '../src/components/ui/Primitives';

export default function DeleteAccountScreen() {
  const yan = useYanBosluk();
  const { colors, isDark } = useDesignTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { account } = useAuth();

  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const isApple = account?.provider === 'apple';
  // Google hesabının da şifresi yok. Bu dal olmasaydı ekran ona
  // doldurulamayacak bir şifre alanı gösterir, hesap uygulama içinden
  // silinemezdi — App Store 5.1.1(v) tam olarak bunu reddediyor.
  const isGoogle = account?.provider === 'google';

  const runDelete = useCallback(async (reauth) => {
    setBusy(true); setError('');
    try {
      const token = await getValidToken();
      if (!token) throw new Error('Oturum bulunamadı.');
      await deleteAccount(token, reauth);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      router.replace('/(tabs)/profile');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Hesap silinemedi.');
    } finally {
      setBusy(false);
    }
  }, [router]);

  // E-posta/şifre hesapları: şifre tekrar girilir
  const confirmPassword = useCallback(() => {
    if (!password || busy) return;
    Keyboard.dismiss();
    Alert.alert(t('acc.deleteTitle'), t('acc.deleteWarn'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('acc.deleteConfirm'), style: 'destructive', onPress: () => runDelete({ password }) },
    ]);
  }, [password, busy, t, runDelete]);

  // Apple hesapları: şifre yok — taze bir Apple onayı (Face ID/Touch ID) istenir
  const confirmApple = useCallback(() => {
    if (busy) return;
    Alert.alert(t('acc.deleteTitle'), t('acc.deleteWarn'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('acc.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
            });
            await runDelete({ appleIdentityToken: credential.identityToken });
          } catch (e) {
            if (e?.code !== 'ERR_REQUEST_CANCELED') setError(e?.message || 'Hata');
          }
        },
      },
    ]);
  }, [busy, t, runDelete]);

  // Google hesapları: taze bir Google onayı. Apple'dan tek farkı SIRA —
  // düğme doğrudan Google akışını açtığı için uyarı, jeton geldikten sonra
  // ve geri dönülemez işlemin hemen öncesinde gösteriliyor.
  const onGoogleToken = useCallback((googleIdToken) => {
    if (busy) return;
    Alert.alert(t('acc.deleteTitle'), t('acc.deleteWarn'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('acc.deleteConfirm'), style: 'destructive', onPress: () => runDelete({ googleIdToken }) },
    ]);
  }, [busy, t, runDelete]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('acc.deleteTitle')} />

      <View style={[styles.body, { paddingHorizontal: yan + space[20] }]}>
        {/* Uyarı kırmızı tonda KALIYOR: geri alınamaz işlemin tek görsel
            işareti bu kart. 2.0'da kenarlık yok, ton `redTint` (iki temada
            aynı; açık zeminde pembe, koyuda koyu kırmızı). */}
        <View style={[styles.uyari, { backgroundColor: colors.redTint }]}>
          <Icon name="alert" size={K.deleteAccount.warnIcon} color={colors.red} />
          <Txt variant="footnote" style={[styles.uyariMetin, { color: colors.text }]}>{t('acc.deleteWarn')}</Txt>
        </View>

        {!!account?.email && <Txt variant="headline" style={styles.eposta}>{account.email}</Txt>}

        {isApple && Platform.OS === 'ios' ? (
          <>
            <Txt variant="footnoteStrong" style={[styles.etiket, { color: colors.text2 }]}>{t('acc.appleReauth')}</Txt>
            {/* Stil temadan — gerekçe account.jsx'teki ikizinde. Kısaca:
                sabit `WHITE` açık temada görünmez bir düğme üretiyor ve
                Guideline 4'ten ret sebebi. İnceleyici bu ekrana bakmamıştı
                ama hata buradaydı. Ölçü G-03'ün sağlayıcı düğmesi (50 / 12). */}
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={dsRadius.button}
              style={{ height: K.login.provider }}
              onPress={confirmApple}
            />
            {busy && <ActivityIndicator color={colors.text2} style={styles.bekle} />}
          </>
        ) : isGoogle && GOOGLE_YAPILANDIRILDI ? (
          <>
            <Txt variant="footnoteStrong" style={[styles.etiket, { color: colors.text2 }]}>{t('acc.googleReauth')}</Txt>
            <GoogleAuthButton
              title={t('acc.google')}
              onIdToken={onGoogleToken}
              onError={(m) => setError(m)}
              disabled={busy}
              height={K.login.provider}
            />
            {busy && <ActivityIndicator color={colors.text2} style={styles.bekle} />}
          </>
        ) : (
          <>
            <View style={styles.alan}>
              <TextField
                label={t('acc.password')}
                icon="lock"
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={confirmPassword}
              />
            </View>

            {/* 2.0'da dolu kırmızı düğme yok (primary nötr; kırmızı CTA kararı
                yalnız G-03'e ait). `tinted` kırmızı tonlu zemin + kırmızı yazı:
                eylemin yıkıcı olduğunu renk söylüyor, asıl onay Alert'te. */}
            <Button
              title={t('acc.deleteConfirm')}
              variant="tinted"
              height={52}
              onPress={confirmPassword}
              disabled={!password}
              loading={busy}
              style={styles.cta}
            />
          </>
        )}

        {!!error && <Txt variant="footnote" accessibilityLiveRegion="polite" style={[styles.hata, { color: colors.red }]}>{error}</Txt>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingTop: space[16] },

  uyari: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12], padding: space[16], borderRadius: dsRadius.card },
  uyariMetin: { flex: 1 },
  eposta: { marginTop: space[20] },

  // Etiket → düğme arası TextField'ın etiket aralığıyla aynı (6).
  etiket: { marginTop: space[20], marginBottom: space[6] },
  alan: { marginTop: space[20] },
  bekle: { marginTop: space[16] },
  cta: { marginTop: space[24] },
  hata: { marginTop: space[16] },
});
