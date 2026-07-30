import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { signIn } from '../src/services/session';
import { registerAccount, requestPasswordReset } from '../src/api/account';
import { colors, radius, spacing } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [mode, setMode] = useState('signin');   // 'signin' | 'signup'
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');

  const isSignup = mode === 'signup';
  const canSubmit = email.trim() && password.length >= 6 && (!isSignup || name.trim());

  const submit = useCallback(async () => {
    if (!canSubmit || busy) return;
    Keyboard.dismiss();
    setBusy(true); setError(''); setInfo('');
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
      // Backend doğrulanmamış e-postayı özel kodla bildiriyor
      setError(String(e?.message || '').includes('EMAIL_NOT_VERIFIED')
        ? t('acc.notVerified')
        : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [canSubmit, busy, isSignup, name, email, password, t, router]);

  const onForgot = useCallback(async () => {
    if (!email.trim()) { setError(t('acc.email')); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      await requestPasswordReset(email.trim());
      setInfo(t('acc.resetSent'));
    } catch (e) {
      setError(e?.message || 'Hata');
    } finally {
      setBusy(false);
    }
  }, [email, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{isSignup ? t('acc.signUp') : t('acc.signIn')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>{t('acc.why')}</Text>

          {isSignup && (
            <Field label={t('acc.name')} value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <Field
            label={t('acc.email')} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />
          <Field
            label={t('acc.password')} value={password} onChangeText={setPassword}
            secureTextEntry autoCapitalize="none"
          />

          {!!error && <Text style={styles.err}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          <Pressable
            onPress={submit}
            disabled={!canSubmit || busy}
            style={({ pressed }) => [styles.cta, (!canSubmit || busy) && styles.ctaOff, pressed && { opacity: 0.85 }]}
          >
            {busy ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.ctaText}>{isSignup ? t('acc.signUp') : t('acc.signIn')}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setInfo(''); }} hitSlop={8}>
            <Text style={styles.link}>{isSignup ? t('acc.haveAccount') : t('acc.noAccount')}</Text>
          </Pressable>

          {!isSignup && (
            <Pressable onPress={onForgot} hitSlop={8}>
              <Text style={styles.linkMuted}>{t('acc.forgot')}</Text>
            </Pressable>
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

  link:      { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  linkMuted: { color: colors.text3,  fontSize: 13.5, textAlign: 'center', marginTop: 14 },
});
