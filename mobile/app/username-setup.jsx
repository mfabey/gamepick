// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı adı kurulumu — sosyal kimliğin ilk adımı.
//
// `/social` EKRANINDAN ÇIKARILDI. Orada üç kapılı bir akışın ikinci kapısıydı
// (oturum → kullanıcı adı → içerik); o ekran emekli olunca kurulumun kendi
// yeri olması gerekti. Zaten mantıklısı da bu: adı olmayan kullanıcı artık
// yalnız arkadaş listesine değil, PROFİLİNE de giremiyor — kurulum tek bir
// yerden çağrılan ortak bir adım.
//
// CANLI UYGUNLUK KONTROLÜ (400ms sönümleme) korundu: adın alınmış olduğunu
// kaydete basınca öğrenmek, yazarken öğrenmekten çok daha pahalı.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { radius, spacing, type, PRESSED, TOUCH_MIN } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { checkUsername, setUsername } from '../src/api/social';

export default function UsernameSetupScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [state, setState] = useState({ status: 'idle' });   // idle | checking | ok | error
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const v = name.trim();
    if (v.length < 3) { setState({ status: 'idle' }); return; }

    setState({ status: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const r = await checkUsername(v);
        setState(r?.available ? { status: 'ok' } : { status: 'error', code: r?.error || 'TAKEN' });
      } catch (e) {
        setState({ status: 'error', code: e?.code || 'generic' });
      }
    }, 400);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [name]);

  const submit = useCallback(async () => {
    if (state.status !== 'ok' || saving) return;
    setSaving(true);
    try {
      await setUsername(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // GERİ DEĞİL DEĞİŞTİR: kurulum bitince bu ekrana geri dönülecek bir
      // durum kalmıyor; yığında bırakmak kullanıcıyı geri tuşuyla yeniden
      // kurulum formuna düşürürdü.
      router.replace('/(tabs)/profile');
    } catch (e) {
      setState({ status: 'error', code: e?.code || 'generic' });
      setSaving(false);
    }
  }, [name, state, saving, router]);

  const errKey = state.status === 'error' ? `soc.err.${state.code}` : null;
  const errText = errKey ? (t(errKey) !== errKey ? t(errKey) : t('soc.err.generic')) : null;
  const hazir = state.status === 'ok' && !saving;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}
                   style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('soc.title')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons name="at-outline" size={48} color={colors.accent} />
          <Text style={styles.setupTitle}>{t('soc.setupTitle')}</Text>
          <Text style={styles.setupText}>{t('soc.setupText')}</Text>

          <Text style={styles.label}>{t('soc.usernameLabel')}</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.at}>@</Text>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder={t('soc.usernamePlaceholder')}
              placeholderTextColor={colors.text3}
              style={styles.input}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            {state.status === 'checking' ? <ActivityIndicator size="small" color={colors.text3} /> : null}
            {state.status === 'ok' ? <Ionicons name="checkmark-circle" size={21} color={colors.green} /> : null}
            {state.status === 'error' ? <Ionicons name="close-circle" size={21} color={colors.danger} /> : null}
          </View>

          <Text style={[styles.hint, errText ? { color: colors.danger } : null]}>
            {errText || (state.status === 'ok' ? t('soc.available') : t('soc.usernameHint'))}
          </Text>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.text2} />
            <Text style={styles.privacyNoteText}>{t('soc.privacyNote')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, !hazir && styles.ctaOff, pressed && PRESSED]}
            onPress={submit}
            disabled={!hazir}
          >
            {saving
              ? <ActivityIndicator color={colors.onAccent} />
              : <Text style={[styles.ctaText, !hazir && styles.ctaTextOff]}>{t('soc.create')}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4 },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '600', color: colors.text },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.s20, alignItems: 'center' },
  setupTitle: {
    fontSize: type.title3, fontWeight: '700', color: colors.text,
    marginTop: spacing.s16, textAlign: 'center',
  },
  setupText: {
    fontSize: type.subhead, color: colors.text2, textAlign: 'center',
    lineHeight: 22, marginTop: spacing.s8, maxWidth: 300,
  },

  label: {
    alignSelf: 'stretch', marginTop: spacing.s32, marginBottom: spacing.s8,
    fontSize: type.footnote, fontWeight: '600', color: colors.text2,
  },
  inputWrap: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    height: TOUCH_MIN, paddingHorizontal: spacing.s12, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  at: { fontSize: type.subhead, color: colors.text3 },
  input: { flex: 1, fontSize: type.subhead, color: colors.text, padding: 0 },
  hint: {
    alignSelf: 'stretch', fontSize: type.footnote, color: colors.text3,
    marginTop: spacing.s8,
  },

  privacyNote: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    marginTop: spacing.s24, padding: spacing.s12, borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  privacyNoteText: { flex: 1, fontSize: type.footnote, color: colors.text2, lineHeight: 18 },

  cta: {
    alignSelf: 'stretch', height: TOUCH_MIN, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.s24,
    backgroundColor: colors.accentFillStrong,
  },
  ctaOff: { backgroundColor: colors.bgInput },
  ctaText: { fontSize: type.subhead, fontWeight: '600', color: colors.onAccent },
  ctaTextOff: { color: colors.text3 },
});
