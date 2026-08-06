import { useState, useCallback, useEffect, useRef } from 'react';
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
import { anonDataSummary, transferAnonData } from '../src/services/owner';
import { resetSyncThrottle } from '../src/services/sync';
import { registerAccount, requestPasswordReset, checkUsernameAvailable } from '../src/api/account';
import { colors, radius, spacing, PRESSED, type } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

// Sunucudaki USERNAME_RE ile birebir aynı (app/lib/content-filter.js).
// Sunucuya ulaşılamadığında biçim hatasını yine de yakalayabilmek için burada
// da duruyor — yetkili doğrulama her zaman sunucuda.
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function AccountScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState('signin');   // 'signin' | 'signup' | 'forgot'
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');

  // Kullanıcı adı uygunluğu — yazarken canlı kontrol (400ms sönümleme).
  //
  // 'taken' (sunucu KESİN olarak "alınmış" dedi) ile 'unknown' (kontrol
  // edilemedi) ayrı durumlar olmak ZORUNDA. Eskiden ikisi de 'idle'a düşüyordu,
  // gönderme koşulu ise 'ok' şart koşuyordu; sonuçta uca ulaşılamadığı her
  // durumda kayıt sonsuza dek kilitleniyordu. Artık yalnızca 'taken' engelliyor.
  const [uname, setUname] = useState({ status: 'idle' });   // idle|checking|ok|taken|unknown
  const unameTimer = useRef(null);

  useEffect(() => {
    if (unameTimer.current) clearTimeout(unameTimer.current);
    const v = username.trim();
    if (mode !== 'signup' || v.length < 3) { setUname({ status: 'idle' }); return; }

    setUname({ status: 'checking' });
    unameTimer.current = setTimeout(async () => {
      try {
        const r = await checkUsernameAvailable(v);
        setUname(r?.available ? { status: 'ok' } : { status: 'taken', code: r?.error || 'TAKEN' });
      } catch {
        // Kontrol edilemedi (ağ hatası ya da uç henüz yayında değil) → engelleme.
        // Kayıt ucu adı zaten yeniden doğruluyor ve çakışmada 409 dönüyor.
        setUname({ status: 'unknown' });
      }
    }, 400);

    return () => { if (unameTimer.current) clearTimeout(unameTimer.current); };
  }, [username, mode]);

  const unameMsg = uname.status === 'taken'
    ? (t(`soc.err.${uname.code}`) !== `soc.err.${uname.code}` ? t(`soc.err.${uname.code}`) : t('soc.err.generic'))
    : (uname.status === 'ok' ? t('soc.available') : t('soc.usernameHint'));

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

  // ── Misafir verisinin devri ────────────────────────────────────────────────
  // Hesapsız kullanılırken biriken koleksiyon ve takip listesi kullanıcının
  // emeği; kaydolunca yok olmamalı. Ama devir SESSİZ de olmamalı: ortak bir
  // cihazda sessiz devir, başkasının verisini yeni hesaba yazmak demek —
  // düzeltmeye çalıştığımız hatanın ta kendisi. Bu yüzden soruluyor.
  //
  // submit ve onApple'ın bağımlılık dizisinde yer aldığı için ikisinden de
  // ÖNCE tanımlanmak zorunda (const → TDZ, dizi render sırasında okunuyor).
  const offerAnonTransfer = useCallback(async () => {
    const s = await anonDataSummary();
    if (!s.collections && !s.wishlist) return;

    const parts = [];
    if (s.collections) parts.push(t('acc.transferCollections').replace('{n}', s.collections));
    if (s.wishlist) parts.push(t('acc.transferWishlist').replace('{n}', s.wishlist));
    const what = parts.join(lang === 'tr' ? ' ve ' : ' and ');

    await new Promise((resolve) => {
      Alert.alert(
        t('acc.transferTitle'),
        t('acc.transferBody').replace('{n}', what),
        [
          { text: t('acc.transferNo'), style: 'cancel', onPress: () => resolve() },
          {
            text: t('acc.transferYes'),
            onPress: async () => {
              try {
                await transferAnonData();
                resetSyncThrottle();   // devredilen veri hemen sunucuya gitsin
              } catch {}
              resolve();
            },
          },
        ],
        { cancelable: false }
      );
    });
  }, [t, lang]);

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

    // Kullanıcı adı zorunlu: sosyal özelliklerin kimlik temeli.
    // Boş bırakılırsa kullanıcı adsız kalıyor ve arkadaş ekleyemiyor.
    //
    // YALNIZCA kesin bilinen iki durumda engelliyoruz: biçim yanlış, ya da
    // sunucu adın alındığını söyledi. 'checking' ve 'unknown' geçirilir —
    // uygunluk kontrolü bir KOLAYLIK, yetkili doğrulama kayıt ucunda.
    // (Aksi hâlde uca ulaşılamadığında kayıt tamamen kilitleniyor.)
    if (isSignup) {
      const u = username.trim();
      if (!USERNAME_RE.test(u)) {
        setError(t('soc.err.USERNAME_FORMAT'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      if (uname.status === 'taken') {
        setError(unameMsg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
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
        await registerAccount({ name: name.trim(), username: username.trim(), email: email.trim(), password });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setInfo(t('acc.verifySent'));
        setMode('signin');
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await offerAnonTransfer();
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
  }, [busy, mode, email, name, username, uname, unameMsg, password, t, router, lang, isForgot, isSignup, offerAnonTransfer]);

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
      await offerAnonTransfer();
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Sunucudan kod geldiyse göster — "giriş yapılamadı" tek başına ne
      // kullanıcıya ne de bize bir şey anlatıyor.
      setError(e?.code ? `${e.message} (${e.code})` : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [router, offerAnonTransfer]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.back, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
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
            <>
              <Field label={t('acc.name')} value={name} onChangeText={setName} autoCapitalize="words" />

              {/* Kullanıcı adı — arkadaş eklemenin ön koşulu.
                  Kayıtta sorulmadığı için kullanıcılar adsız kalıyordu. */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.label}>{t('soc.usernameLabel')}</Text>
                <View style={styles.unameWrap}>
                  <Text style={styles.at}>@</Text>
                  <TextInput
                    value={username}
                    onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder={t('soc.usernamePlaceholder')}
                    placeholderTextColor={colors.text3}
                    style={styles.unameInput}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {uname.status === 'checking' && <ActivityIndicator size="small" color={colors.text3} />}
                  {uname.status === 'ok' && <Ionicons name="checkmark-circle" size={20} color={colors.green} />}
                  {uname.status === 'taken' && <Ionicons name="close-circle" size={20} color={colors.danger} />}
                </View>
                <Text style={[styles.hint, uname.status === 'taken' && { color: colors.danger }]}>
                  {unameMsg}
                </Text>
              </View>
            </>
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
  title: { flex: 1, fontSize: type.headline, fontWeight: '800', color: colors.text, textAlign: 'center' },

  body: { padding: spacing.lg, paddingTop: 8 },
  lead: { fontSize: type.subhead, color: colors.text2, lineHeight: 21, marginBottom: 22 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  dividerText: { color: colors.text3, fontSize: type.footnote, fontWeight: '600' },

  label: { fontSize: type.footnote, color: colors.text3, fontWeight: '700', marginBottom: 7 },
  unameWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  at: { color: colors.text3, fontSize: type.subhead, fontWeight: '700' },
  unameInput: { flex: 1, color: colors.text, fontSize: type.subhead },
  hint: { fontSize: type.caption, color: colors.text3, marginTop: 6 },
  input: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 50,
    color: colors.text, fontSize: type.subhead,
  },

  err:  { color: colors.danger, fontSize: type.footnote, lineHeight: 20, marginBottom: 10 },
  info: { color: colors.green,  fontSize: type.footnote, lineHeight: 20, marginBottom: 10 },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },

  link:      { color: colors.accentText, fontSize: type.subhead, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  linkMuted: { color: colors.text3,  fontSize: type.footnote, textAlign: 'center', marginTop: 14 },
});
