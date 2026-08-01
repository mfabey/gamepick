import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signIn, signInWithApple } from '../src/services/session';
import { registerAccount, requestPasswordReset } from '../src/api/account';
import { colors, radius, spacing } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function AccountScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState('signin');   // 'signin' | 'signup' | 'forgot'
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');

  const isForgot = mode === 'forgot';
  const isSignup = mode === 'signup';
  const titleText = isForgot
    ? t('acc.forgot')
    : (isSignup ? t('acc.signUp') : t('acc.signIn'));

  const validateEmail = (emailStr) => {
    const trimmed = emailStr.trim();
    if (!trimmed) return t('acc.emailRequired');
    if (!trimmed.includes('@') || trimmed.length < 5) {
      return lang === 'tr' ? 'Lütfen geçerli bir e-posta adresi girin.' : 'Please enter a valid email address.';
    }
    return null;
  };

  const submit = useCallback(async () => {
    if (busy) return;
    Keyboard.dismiss();
    setError(''); setInfo('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (isForgot) {
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setInfo(t('acc.resetSent'));
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(e?.message || 'Hata');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isSignup && !name.trim()) {
      setError(t('acc.nameRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!password) {
      setError(t('acc.passwordRequired'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (password.length < 6) {
      setError(t('acc.passwordTooShort'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        await registerAccount({ name: name.trim(), email: email.trim(), password });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setInfo(t('acc.verifySent'));
        setMode('signin');
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(String(e?.message || '').includes('EMAIL_NOT_VERIFIED')
        ? t('acc.notVerified')
        : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [busy, mode, email, name, password, t, router, lang, isForgot, isSignup]);

  // Sign in with Apple — Apple yalnızca İLK onayda tam adı verir, o yüzden
  // credential.fullName'i hemen backend'e iletiyoruz (sonraki girişlerde gelmez).
  const onApple = useCallback(async (credential) => {
    setBusy(true); setError(''); setInfo('');
    try {
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : '';
      await signInWithApple(credential.identityToken, fullName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Hata');
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{titleText}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            {isForgot
              ? (lang === 'tr' ? 'Şifrenizi sıfırlamak için e-posta adresinizi girin.' : 'Enter your email address to reset your password.')
              : t('acc.why')}
          </Text>

          {!isForgot && Platform.OS === 'ios' && (
            <>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={radius.lg}
                style={{ height: 52, marginBottom: 18 }}
                onPress={async () => {
                  try {
                    const credential = await AppleAuthentication.signInAsync({
                      requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                      ],
                    });
                    await onApple(credential);
                  } catch (e) {
                    if (e?.code !== 'ERR_REQUEST_CANCELED') setError(e?.message || 'Hata');
                  }
                }}
              />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('acc.or')}</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {isSignup && (
            <Field label={t('acc.name')} value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <Field
            label={t('acc.email')} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />
          {!isForgot && (
            <Field
              label={t('acc.password')} value={password} onChangeText={setPassword}
              secureTextEntry autoCapitalize="none"
            />
          )}

          {!!error && <Text style={styles.err}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.cta, busy && styles.ctaOff, pressed && { opacity: 0.85 }]}
          >
            {busy ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.ctaText}>{isForgot ? t('acc.sendResetLink') : (isSignup ? t('acc.signUp') : t('acc.signIn'))}</Text>}
          </Pressable>

          {isForgot ? (
            <Pressable onPress={() => { setMode('signin'); setError(''); setInfo(''); }} hitSlop={8}>
              <Text style={styles.link}>{t('acc.backToSignIn')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setInfo(''); }} hitSlop={8}>
                <Text style={styles.link}>{isSignup ? t('acc.haveAccount') : t('acc.noAccount')}</Text>
              </Pressable>

              {!isSignup && (
                <Pressable onPress={() => { setMode('forgot'); setError(''); setInfo(''); }} hitSlop={8}>
                  <Text style={styles.linkMuted}>{t('acc.forgot')}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.text3}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },

  body: { padding: spacing.lg, paddingTop: 8 },
  lead: { fontSize: 14, color: colors.text2, lineHeight: 21, marginBottom: 22 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  dividerText: { color: colors.text3, fontSize: 12.5, fontWeight: '600' },

  label: { fontSize: 12.5, color: colors.text3, fontWeight: '700', marginBottom: 7 },
  input: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 50,
    color: colors.text, fontSize: 15.5,
  },

  err:  { color: colors.danger, fontSize: 13.5, lineHeight: 20, marginBottom: 10 },
  info: { color: colors.green,  fontSize: 13.5, lineHeight: 20, marginBottom: 10 },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },

  link:      { color: colors.accentText, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  linkMuted: { color: colors.text3,  fontSize: 13.5, textAlign: 'center', marginTop: 14 },
});
