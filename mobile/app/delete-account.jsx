import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Keyboard, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getValidToken, signOut } from '../src/services/session';
import { deleteAccount } from '../src/api/account';
import { useAuth } from '../src/context/AuthContext';
import { radius, spacing, PRESSED, type } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';

export default function DeleteAccountScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { account } = useAuth();

  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const isApple = account?.provider === 'apple';

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.back, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('acc.deleteTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.warnBox}>
          <Ionicons name="warning-outline" size={22} color={colors.danger} />
          <Text style={styles.warnText}>{t('acc.deleteWarn')}</Text>
        </View>

        {!!account?.email && <Text style={styles.email}>{account.email}</Text>}

        {isApple && Platform.OS === 'ios' ? (
          <>
            <Text style={styles.label}>{t('acc.appleReauth')}</Text>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={radius.lg}
              style={{ height: 52, marginTop: spacing.md }}
              onPress={confirmApple}
            />
            {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />}
          </>
        ) : (
          <>
            <Text style={styles.label}>{t('acc.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.text3}
            />

            <Pressable
              onPress={confirmPassword}
              disabled={!password || busy}
              style={({ pressed }) => [styles.cta, (!password || busy) && styles.ctaOff, pressed && { opacity: 0.85 }]}
            >
              {busy ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.ctaText}>{t('acc.deleteConfirm')}</Text>}
            </Pressable>
          </>
        )}

        {!!error && <Text style={styles.err}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: type.headline, fontWeight: '800', color: colors.text, textAlign: 'center' },

  body: { padding: spacing.lg },
  warnBox: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    // tema-bagimsiz: tehlike tonu; uyari her iki temada da kirmizi kalmali
    backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1, borderRadius: radius.md, padding: 14, marginBottom: 22,
  },
  warnText: { flex: 1, color: colors.text2, fontSize: type.footnote, lineHeight: 20 },
  email: { color: colors.text, fontSize: type.subhead, fontWeight: '700', marginBottom: 20 },

  label: { fontSize: type.footnote, color: colors.text3, fontWeight: '700', marginBottom: 7 },
  input: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 50,
    color: colors.text, fontSize: type.subhead,
  },
  err: { color: colors.danger, fontSize: type.footnote, lineHeight: 20, marginTop: spacing.lg },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },
});
