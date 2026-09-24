import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { signIn, signInWithApple, signInWithGoogle } from '../src/services/session';
import GoogleAuthButton, { GOOGLE_YAPILANDIRILDI } from '../src/components/GoogleAuthButton';
import { anonDataSummary, transferAnonData } from '../src/services/owner';
import { resetSyncThrottle } from '../src/services/sync';
import { registerAccount, requestPasswordReset, checkUsernameAvailable } from '../src/api/account';
import { spacing, PRESSED, type } from '../src/theme';
import { component as K, radius as dsRadius } from '../src/theme/tokens';
import { NavBar } from '../src/components/ui/Navigation';
import { Button, TextField, Txt } from '../src/components/ui/Primitives';
import { Mark } from '../src/components/brand/Logo';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';

// Sunucudaki USERNAME_RE ile birebir aynı (app/lib/content-filter.js).
// Sunucuya ulaşılamadığında biçim hatasını yine de yakalayabilmek için burada
// da duruyor — yetkili doğrulama her zaman sunucuda.
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// G-03 ölçüleri (kit s2.py login()) — bkz. tokens.component.login.
const L = K.login;

// Sözleşmeler UYGULAMA İÇİ tarayıcıda açılıyor, Safari'ye atılmıyor: kayıt
// formunu yarıda bırakıp uygulamadan çıkan bir kullanıcı geri döndüğünde
// yazdıklarını bulamazdı. Ayarlar ekranı da aynı adresleri aynı biçimde
// açıyor (bkz. settings.jsx → openPage).
const SITE = 'https://www.gamerisen.com';
const openLegal = (path) => { WebBrowser.openBrowserAsync(`${SITE}${path}`).catch(() => {}); };

export default function AccountScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  // `isDark` Apple ile Giriş düğmesinin stilini seçiyor — bkz. aşağıdaki
  // DÜĞME STİLİ TEMADAN GELİYOR notu.
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();

  // ── EKRAN HANGİ MODDA AÇILACAĞINI ÇAĞIRANDAN ÖĞRENİYOR ────────────────────
  //
  // Profil kapısında İKİ düğme var — "Giriş yap" ve "Hesap oluştur" — ve ikisi
  // de `/account`a gidiyordu. Mod burada sabit `signin` olduğu için kaydolmak
  // isteyen kullanıcı giriş formuna düşüyor, sonra sayfanın altındaki bağlantıyı
  // bulup İKİNCİ kez dokunmak zorunda kalıyordu. İki ayrı düğmenin tek bir yere
  // gitmesi, hiyerarşinin verdiği sözü tutmuyordu.
  //
  // PARAMETRE DOĞRULANIYOR, DOĞRUDAN KULLANILMIYOR: bağlantı dışarıdan da
  // gelebilir (derin bağlantı, bildirim) ve `mode=xyz` ekranı tanımsız bir
  // duruma sokardı. Tanınmayan her değer girişe düşüyor.
  //
  // BAŞLANGIÇ DEĞERİ, SENKRONİZASYON DEĞİL: kullanıcı ekrandayken formlar
  // arasında geçiş yapabiliyor (aşağıdaki `setMode`lar) ve parametreye geri
  // bağlanmak o geçişleri geri alırdı.
  const { mode: istenenMod } = useLocalSearchParams();
  const [mode, setMode] = useState(   // 'signin' | 'signup' | 'forgot'
    istenenMod === 'signup' || istenenMod === 'forgot' ? istenenMod : 'signin'
  );
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');

  // ── HATA ARTIK HANGİ ALANA AİT OLDUĞUNU DA TAŞIYOR ────────────────────────
  //
  // Tek bir dize vardı ve mesaj her zaman CTA'nın üstünde, alanlardan uzakta
  // çıkıyordu; kullanıcı hangi kutuyu düzelteceğini cümleden çıkarmak
  // zorundaydı. Kayıt modunda dört alan varken bu tahmin işi.
  //
  // Alanı BİLİNMEYEN hatalar (sunucu yanıtı, Apple akışı, ağ) `null` ile
  // geliyor ve eski yerinde gösteriliyor — uydurma bir alan işaretlemek
  // yanlış kutuyu suçlamak olurdu.
  const [hataAlani, setHataAlani] = useState(null);

  // Doğrulama hatalarının tek girişi: mesaj, alan ve dokunsal geri bildirim
  // birlikte. Üçünü yedi ayrı yerde elle yazmak, birini unutmanın yedi yolu
  // demekti.
  const hata = useCallback((mesaj, alan = null) => {
    setError(mesaj);
    setHataAlani(alan);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);

  const hatayiTemizle = useCallback(() => { setError(''); setHataAlani(null); }, []);

  // Sunucudan/istisnadan gelen hata: alanı YOK. Ayrı bir giriş, çünkü bu
  // yolların kendi dokunsal geri bildirimi zaten var (Error) ve `hata`nın
  // Warning'i üstüne binerdi. Alanı sıfırlamak ŞART: önceki bir doğrulama
  // hatasından kalan alan işareti, mesajı yanlış kutunun altına iliştirirdi.
  const sunucuHatasi = useCallback((mesaj) => { setError(mesaj); setHataAlani(null); }, []);
  // App Store Guideline 1.2 — sözleşme KAYITTAN ÖNCE onaylanıyor.
  //
  // ONAY KUTUSU YALNIZCA KAYITTA. Girişte de sözleşme gösteriliyor ama kutu
  // yok: geri dönen bir kullanıcı sözleşmeyi hesabı açarken zaten kabul etti,
  // her girişte yeniden tıklatmak onay değil sürtünme üretirdi.
  const [accepted, setAccepted] = useState(false);

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
  // Kit girişte "Tekrar hoş geldin" diyor; kayıt ve sıfırlamada başlık işin adı.
  const titleText = isForgot
    ? t('acc.forgot')
    : (isSignup ? t('acc.signUp') : t('acc.welcomeBack'));

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
    hatayiTemizle(); setInfo('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      hata(emailErr, 'email');
      return;
    }

    if (isForgot) {
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setInfo(t('acc.resetSent'));
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        sunucuHatasi(e?.message || 'Hata');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isSignup && !name.trim()) {
      hata(t('acc.nameRequired'), 'name');
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
        hata(t('soc.err.USERNAME_FORMAT'), 'username');
        return;
      }
      if (uname.status === 'taken') {
        hata(unameMsg, 'username');
        return;
      }
    }

    if (!password) {
      hata(t('acc.passwordRequired'), 'password');
      return;
    }

    if (password.length < 6) {
      hata(t('acc.passwordTooShort'), 'password');
      return;
    }

    // Sözleşme onayı EN SONDA denetleniyor: alan hataları önce çıksın, aksi
    // hâlde kutuyu işaretleyen kullanıcı hemen ardından bir alan hatası daha
    // yiyor ve iki adımda öğrenmesi gereken şeyi üç adımda öğreniyor.
    if (isSignup && !accepted) {
      hata(t('acc.legalRequired'), 'legal');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        await registerAccount({ name: name.trim(), username: username.trim(), email: email.trim(), password });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setInfo(t('acc.verifySent'));
        setMode('signin');
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await offerAnonTransfer();
        router.back();
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      sunucuHatasi(String(e?.message || '').includes('EMAIL_NOT_VERIFIED')
        ? t('acc.notVerified')
        : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [busy, mode, email, name, username, uname, unameMsg, password, accepted, t, router, lang, isForgot, isSignup, offerAnonTransfer, hata, hatayiTemizle, sunucuHatasi]);

  // Sign in with Apple — Apple yalnızca İLK onayda tam adı verir, o yüzden
  // credential.fullName'i hemen backend'e iletiyoruz (sonraki girişlerde gelmez).
  const onApple = useCallback(async (credential) => {
    setBusy(true); hatayiTemizle(); setInfo('');
    try {
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : '';
      await signInWithApple(credential.identityToken, fullName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await offerAnonTransfer();
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Sunucudan kod geldiyse göster — "giriş yapılamadı" tek başına ne
      // kullanıcıya ne de bize bir şey anlatıyor.
      sunucuHatasi(e?.code ? `${e.message} (${e.code})` : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [router, offerAnonTransfer, hatayiTemizle, sunucuHatasi]);

  // Google ile giriş — Apple'la aynı kuyruk (oturum kur → anonim veriyi
  // devret → geri dön). Tek farkı ad: Google id_token'ın içinde taşıyor,
  // ayrıca göndermeye gerek yok.
  const onGoogle = useCallback(async (idToken) => {
    setBusy(true); hatayiTemizle(); setInfo('');
    try {
      await signInWithGoogle(idToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await offerAnonTransfer();
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      sunucuHatasi(e?.code ? `${e.message} (${e.code})` : (e?.message || 'Hata'));
    } finally {
      setBusy(false);
    }
  }, [router, offerAnonTransfer, hatayiTemizle, sunucuHatasi]);

  // Mod değişimi tek yerden: segmentin yerini alan alt bağlantı ve "girişe dön".
  const modaGec = (m) => {
    if (m === mode) return;
    Haptics.selectionAsync().catch(() => {});
    setMode(m); hatayiTemizle(); setInfo('');
  };
  const saglayiciVar = !isForgot && (Platform.OS === 'ios' || GOOGLE_YAPILANDIRILDI);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NavBar onBack={() => router.back()} />

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.s20 + yan }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── G-03 BAŞLIĞI (kit s2.py login()) ──────────────────────────────
              İşaret + büyük başlık + tek cümle. Eskiden üst çubukta küçük bir
              başlık ve altında giriş/kayıt SEGMENTİ vardı; ekranın ne olduğunu
              artık bu başlık söylüyor, segmentin işi kalmadı (kullanıcı
              kararı, 25 Eylül: mod geçişi kitteki gibi en altta). */}
          <Mark size={L.mark} />
          <Txt variant="display" accessibilityRole="header" style={styles.baslik}>{titleText}</Txt>
          <Txt variant="body" style={[styles.lead, { color: colors.text2 }]}>
            {isForgot
              ? (lang === 'tr' ? 'Şifrenizi sıfırlamak için e-posta adresinizi girin.' : 'Enter your email address to reset your password.')
              : isSignup ? t('acc.why') : t('acc.signinLead')}
          </Txt>

          {/* SÖZLEŞME HER İKİ GİRİŞ YOLUNUN DA ÜSTÜNDE — KİTTEN BİLEREK SAPMA.
              Kit koşul cümlesini ekranın en altına koyuyor. Apple 1.2 ise
              sözleşmenin "kayıt veya girişten ÖNCE sunulmasını" istiyor;
              altta kalsaydı Apple/Google düğmeleri ondan önce gelirdi ve o
              yolu seçen kullanıcı sözleşmeyi hiç görmezdi. */}
          {!isForgot && (
            <View style={styles.legalWrap}>
              <LegalNotice
                signup={isSignup}
                accepted={accepted}
                onToggle={() => { Haptics.selectionAsync().catch(() => {}); setAccepted((v) => !v); hatayiTemizle(); }}
              />
              {/* Onay kutusu hatası KUTUNUN ALTINDA: işaretlenmesi gereken şey burada. */}
              {hataAlani === 'legal' && !!error && <Text style={styles.err}>{error}</Text>}
            </View>
          )}

          {saglayiciVar && (
            <View style={styles.saglayicilar}>
              {Platform.OS === 'ios' && (
                /* ── DÜĞME STİLİ TEMADAN GELİYOR ──
                   Sabit `WHITE` yazılıydı ve 2.7 (53) bu yüzden Guideline 4'ten
                   REDDEDİLDİ: açık temada kart beyaz, düğme de beyaz olunca
                   ortada ne dolgu ne çerçeve kalıyordu; ekranda yalnızca
                   "Sign in with Apple" yazısı duruyordu ve inceleyici bunu
                   düğme olarak tanımadı. Koyu temada `WHITE` doğru, açık temada
                   `BLACK`. YEREL DÜĞME KALIYOR (kit kendi düğmesini çiziyor):
                   yalnız yükseklik ve köşe kitin 50 / 12'sine çekildi.
                   Tema değişiminde ZORLAMA GEREKMİYOR: yerel görünüm stil
                   değişince düğmeyi yeniden kuruyor (expo-apple-authentication →
                   AppleAuthenticationButton.swift, `needsUpdate` +
                   `OnViewDidUpdateProps`). */
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={dsRadius.button}
                  style={{ height: L.provider }}
                  onPress={async () => {
                    // Apple ile KAYIT da bir kayıt: onay kutusu bu yolu da
                    // bağlıyor, yoksa sözleşme yalnızca e-posta yolunda zorunlu
                    // olurdu ve şart yarısı boş kalırdı.
                    if (isSignup && !accepted) {
                      hata(t('acc.legalRequired'), 'legal');
                      return;
                    }
                    try {
                      const credential = await AppleAuthentication.signInAsync({
                        requestedScopes: [
                          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                          AppleAuthentication.AppleAuthenticationScope.EMAIL,
                        ],
                      });
                      await onApple(credential);
                    } catch (e) {
                      if (e?.code !== 'ERR_REQUEST_CANCELED') sunucuHatasi(e?.message || 'Hata');
                    }
                  }}
                />
              )}

              {/* ── GOOGLE İLE DEVAM ET ───────────────────────────────────────
                  İKİ PLATFORMDA DA: Android'de bugüne kadar hiç sağlayıcı girişi
                  yoktu, tek yol e-posta+şifreydi.
                  YAPILANDIRILMAMIŞSA HİÇ ÇİZİLMİYOR — platform bayrakları
                  app.json → extra.googleAuth içinde ve Android/iOS tarafı
                  Firebase'de henüz kurulmadı (bkz. googleAuthConfig başlığı).
                  Kitteki "Steam hesabınla devam et" YOK: Steam ile hesap açan
                  bir sunucu ucu yok (günlük, G-03 Google yolu). */}
              {GOOGLE_YAPILANDIRILDI && (
                <GoogleAuthButton
                  title={t('acc.google')}
                  onIdToken={onGoogle}
                  onError={sunucuHatasi}
                  disabled={busy}
                  height={L.provider}
                  // Apple yolundaki kuralın aynısı: Google ile KAYIT da bir kayıt,
                  // sözleşme onayı olmadan akış açılmıyor.
                  guard={() => {
                    if (isSignup && !accepted) { hata(t('acc.legalRequired'), 'legal'); return false; }
                    return true;
                  }}
                />
              )}
            </View>
          )}

          {/* Ayraç, ÜSTÜNDE en az bir sağlayıcı düğmesi varsa anlamlı. */}
          {saglayiciVar && (
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('acc.orEmail')}</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* ── ALANLAR: 2.0 TextField, kitteki gibi AYRI ─────────────────────
              Faz'da dört alan tek kartta, saç teli ayraçla duruyordu; kit her
              alanı kendi etiketi ve ikonuyla ayrı çiziyor (kullanıcı kararı,
              25 Eylül). Alanı bilinen hata ilgili kutunun ALTINDA (TextField
              `error`); şifre göster/gizle TextField'ın kendi `secure` düğmesi. */}
          <View style={styles.alanlar}>
            {isSignup && (
              <>
                <TextField
                  label={t('acc.name')} value={name} onChangeText={setName}
                  autoCapitalize="words"
                  textContentType="name" autoComplete="name"
                  error={hataAlani === 'name' ? error : undefined}
                />
                {/* Kullanıcı adı — arkadaş eklemenin ön koşulu.
                    Kayıtta sorulmadığı için kullanıcılar adsız kalıyordu.
                    Uygunluk: kontrol sürerken sağda gösterge; sonuç alanın
                    altında (alınmış → hata, uygun → başarı, diğer → ipucu). */}
                <TextField
                  label={t('soc.usernameLabel')}
                  icon="at"
                  value={username}
                  onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder={t('soc.usernamePlaceholder')}
                  maxLength={20}
                  autoCapitalize="none" autoCorrect={false}
                  textContentType="username" autoComplete="username"
                  trailing={uname.status === 'checking' ? <ActivityIndicator size="small" color={colors.text3} /> : null}
                  error={hataAlani === 'username' ? error : uname.status === 'taken' ? unameMsg : undefined}
                  success={hataAlani !== 'username' && uname.status === 'ok' ? unameMsg : undefined}
                  helper={unameMsg}
                />
              </>
            )}

            <TextField
              label={t('acc.email')} icon="mail" value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              // §8 autofill-support / input-type-keyboard: bunlar yokken iOS
              // ne anahtarlığı önerebiliyor ne de doğru klavyeyi açabiliyordu.
              textContentType="emailAddress" autoComplete="email"
              error={hataAlani === 'email' ? error : undefined}
            />

            {!isForgot && (
              <TextField
                label={t('acc.password')} icon="lock" value={password} onChangeText={setPassword}
                secure autoCapitalize="none" autoCorrect={false}
                // Kayıtta `newPassword`: iOS güçlü parola önerir ve
                // anahtarlığa YENİ kayıt açar. Girişte `password`: mevcut
                // kaydı doldurur. Tek değer kullanmak ikisinden birini bozardı.
                textContentType={isSignup ? 'newPassword' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                error={hataAlani === 'password' ? error : undefined}
              />
            )}
          </View>

          {/* Şifre sıfırlama bir MOD DEĞİL, girişin kaçış yolu: kitteki gibi
              şifre alanının hemen altında, sağa yaslı. */}
          {!isForgot && !isSignup && (
            <Button
              title={t('acc.forgot')} variant="tertiary" height={L.forgot}
              onPress={() => modaGec('forgot')}
              style={styles.unuttum}
            />
          )}

          {/* ALANI BİLİNMEYEN hata burada kalıyor — sunucu yanıtı, ağ hatası,
              Apple akışı. Alanı bilinen hata zaten ilgili kutunun altında
              (§8 error-placement); ikisini birden göstermek aynı cümleyi iki
              yerde tekrarlamak olurdu. */}
          {!!error && !hataAlani && <Text style={styles.err}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          {/* KIRMIZI CTA — kullanıcı kararıyla kalıyor (2.0 `Button` primary
              açık yüzeyli); ölçü kitin 52 / 12'si. */}
          <Pressable
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, busy && styles.ctaOff, pressed && { opacity: 0.85 }]}
          >
            {busy ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.ctaText}>{isForgot ? t('acc.sendResetLink') : (isSignup ? t('acc.signUp') : t('acc.signIn'))}</Text>}
          </Pressable>

          {/* ── ALT BAĞLANTI (kit: "Hesabın yok mu? Kayıt ol") ──────────────
              Boşluk esniyor: kısa formda bağlantı ekranın dibine iniyor, uzun
              formda (kayıt, klavye açık) içeriğin hemen ardından geliyor. */}
          <View style={styles.esnek} />
          {isForgot ? (
            <Pressable onPress={() => modaGec('signin')} accessibilityRole="button" style={styles.altSatir}>
              <Text style={styles.altMetin}><Text style={styles.altVurgu}>{t('acc.backToSignIn')}</Text></Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => modaGec(isSignup ? 'signin' : 'signup')} accessibilityRole="button" style={styles.altSatir}>
              <Text style={styles.altMetin}>
                {isSignup ? t('acc.haveAccount') : t('acc.noAccount')}{' '}
                <Text style={styles.altVurgu}>{isSignup ? t('acc.signIn') : t('acc.signUp')}</Text>
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SÖZLEŞME BİLDİRİMİ — App Store Guideline 1.2
//
// Apple'ın 2.6.1 incelemesinde adını koyduğu eksik buydu: "kayıt veya girişten
// ÖNCE sunulan EULA / kullanım koşulları". Sözleşmeler web'de ve ayarlarda
// zaten vardı — hesap ekranında yoktu, yani şartın istediği ANDA yoktu.
//
// CÜMLE PARÇALARDAN KURULUYOR, tek bir çeviri dizesinden değil: bağlantı
// metinleri (`set.terms`, `set.privacyPolicy`) ayarlar ekranıyla ORTAK ve
// orada değişen bir çeviri burada da değişmeli. Türkçe gibi ekli dillerde
// kesme işareti parçanın kendisine yazılı (`acc.legalMid` → "'nı ve ").
//
// KAYITTA KUTU, GİRİŞTE DÜZ METİN. Kutu bir ONAY; giriş yapan kullanıcı o
// onayı hesabı açarken zaten verdi. Her girişte yeniden tıklatmak, kayıt
// tarafındaki onayın anlamını da zayıflatırdı.
// ─────────────────────────────────────────────────────────────────────────────
function LegalNotice({ signup, accepted, onToggle }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const cumle = (
    <Text style={styles.legalText}>
      {t(signup ? 'acc.legalAgreePre' : 'acc.legalContinuePre')}
      <Text
        style={styles.legalLink}
        onPress={() => openLegal('/terms')}
        accessibilityRole="link"
      >
        {t('set.terms')}
      </Text>
      {t('acc.legalMid')}
      <Text
        style={styles.legalLink}
        onPress={() => openLegal('/privacy')}
        accessibilityRole="link"
      >
        {t('set.privacyPolicy')}
      </Text>
      {t(signup ? 'acc.legalAgreePost' : 'acc.legalContinuePost')}
    </Text>
  );

  if (!signup) return <View style={styles.legalPlain}>{cumle}</View>;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.legalRow, pressed && PRESSED]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      // Kutu 22pt çiziliyor ama satırın tamamı dokunulabilir ve 44pt yüksek:
      // HIG'in alt sınırı görsel boyutta değil DOKUNMA HEDEFİNDE geçerli.
      hitSlop={6}
    >
      <View style={[styles.legalBox, accepted && styles.legalBoxOn]}>
        {accepted ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>{cumle}</View>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // flexGrow: alt bağlantı kısa formda ekranın dibine insin (bkz. `esnek`).
  // Telefon kenar payı 20 (kit); geniş ekranda JSX `yan + 20` ile eziyor
  // (check-layout bu ikisinin tutarlılığını denetliyor).
  body: { flexGrow: 1, paddingHorizontal: spacing.s20, paddingTop: spacing.s8 },
  baslik: { marginTop: L.titleTop },
  lead: { marginTop: L.leadTop },

  // Sözleşme bildirimi — bkz. LegalNotice. Kitte sağlayıcılar başlıktan 26
  // aşağıda; sözleşme onların üstüne girdiği için 26 sözleşmeye, 16 da
  // sözleşme ile ilk düğme arasına veriliyor.
  legalWrap: { marginTop: L.providersTop },
  legalPlain: {},
  legalRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    minHeight: 44,
  },
  legalBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  legalBoxOn: { backgroundColor: colors.accentFillStrong, borderColor: colors.accentFillStrong },
  // 19pt satır yüksekliği: iki satıra taşan cümlede metin bloğu kutuyla aynı
  // optik ağırlıkta kalsın diye.
  legalText: { fontSize: type.footnote, color: colors.text3, lineHeight: 19 },
  legalLink: { color: colors.accentText, fontWeight: '700' },

  saglayicilar: { marginTop: spacing.s16, gap: L.providerGap },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: L.dividerGap,
    height: L.dividerHeight, marginTop: L.dividerTop,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder },
  dividerText: { color: colors.text3, fontSize: type.footnote },

  alanlar: { marginTop: L.fieldsTop, gap: L.fieldGap },
  // Metin düğmesi kendi kenarına yaslanıyor: iç dolgu sağ kenarı içeri
  // itip alanların hizasını bozardı.
  unuttum: { alignSelf: 'flex-end', marginTop: L.forgotTop, paddingHorizontal: 0 },

  err:  { color: colors.danger, fontSize: type.footnote, lineHeight: 20, marginTop: spacing.s8 },
  info: { color: colors.green,  fontSize: type.footnote, lineHeight: 20, marginTop: spacing.s8 },

  cta: {
    height: L.cta, borderRadius: dsRadius.button, backgroundColor: colors.accentFillStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: L.ctaTop,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },

  esnek: { flex: 1, minHeight: spacing.s24 },
  altSatir: { height: L.switchRow, alignItems: 'center', justifyContent: 'center' },
  altMetin: { fontSize: type.subhead, color: colors.text2, textAlign: 'center' },
  altVurgu: { color: colors.text, fontWeight: '600' },
});
