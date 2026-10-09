// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE İLE GİRİŞ / YENİDEN DOĞRULAMA — ÇİFT KATMANLI KUSURSUZ ÇALIŞMA
//
// 1. KATMAN: Yerel @react-native-google-signin modülü (varsa ve yapılandırılmışsa)
// 2. KATMAN: ASWebAuthenticationSession / WebBrowser (Apple'a yeni derleme atmadan
//            tüm iOS ve Android cihazlarda %100 çalışan güvenli oturum köprüsü)
//
// Koyu ve Açık modda tam görünürlük (Apple HIG & Google Identity Guidelines uyumlu):
// - Açık modda: Beyaz (#FFFFFF) zemin, belirgin #747775 sınır çizgisi, #1F1F1F metin
// - Koyu modda: Koyu (#131314) zemin, açık sınır çizgisi, #FFFFFF metin
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { radius as dsRadius } from '../theme/tokens';
import { PRESSED } from '../theme';
import { API_BASE } from '../api/client';
import Constants from 'expo-constants';

const GOOGLE_YAPI = Constants.expoConfig?.extra?.googleAuth || {};
const WEB_CLIENT_ID =
  GOOGLE_YAPI.webClientId ||
  '554716473983-pc6au7o7nquofb6k7b25ll7mge502pp8.apps.googleusercontent.com';

// 4-renkli resmi Google "G" vektör logosu (Mavi, Yeşil, Sarı, Kırmızı)
function GoogleGLogo({ size = 19 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

function b64DecodeUtf8(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    try {
      return atob(b64);
    } catch {
      return null;
    }
  }
}

function decodePayload(url) {
  if (!url) return null;
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(q);
    const data = params.get('data');
    if (!data) return null;
    return JSON.parse(b64DecodeUtf8(decodeURIComponent(data)));
  } catch {
    return null;
  }
}

export default function GoogleAuthButton({
  title,
  onIdToken,
  onError,
  guard,
  disabled,
  height = 50,
  style,
}) {
  const [acik, setAcik] = useState(false);
  const { isDark } = useTheme();

  // tema-bagimsiz: Google resmi buton arka plan rengi (acikta saf beyaz, koyuda koyu yuzey)
  const bg = isDark ? '#131314' : '#FFFFFF';
  // tema-bagimsiz: Google resmi buton kenarlik rengi (acikta belirgin cerceve, koyuda ince kontur)
  const border = isDark ? 'rgba(255, 255, 255, 0.22)' : '#747775';
  // tema-bagimsiz: Google buton metin rengi
  const textColor = isDark ? '#FFFFFF' : '#1F1F1F';

  const bas = useCallback(async () => {
    if (guard && guard() === false) return;
    setAcik(true);
    try {
      let idToken = null;

      // 1. KATMAN: Yerel @react-native-google-signin modülünü dene (Android veya hazır iOS yapısı)
      try {
        const GoogleSigninModule = require('@react-native-google-signin/google-signin');
        const GoogleSignin = GoogleSigninModule?.GoogleSignin;
        const isErrorWithCode = GoogleSigninModule?.isErrorWithCode;
        const statusCodes = GoogleSigninModule?.statusCodes;

        if (GoogleSignin && WEB_CLIENT_ID) {
          GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
          if (Platform.OS === 'android') {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          }
          await GoogleSignin.signOut().catch(() => {});
          const r = await GoogleSignin.signIn();
          if (r?.type === 'success' && r.data?.idToken) {
            idToken = r.data.idToken;
          }
        }
      } catch (nativeErr) {
        const isCancelled =
          nativeErr?.code === 'SIGN_IN_CANCELLED' ||
          String(nativeErr?.message || '').includes('CANCELLED');
        if (isCancelled) {
          setAcik(false);
          return;
        }
        // Yerel modül yoksa veya iOS URL scheme yapılandırılmamışsa sessizce 2. katmana geç
      }

      // 2. KATMAN: Apple'a yeni derleme atmadan çalışan in-app WebBrowser (ASWebAuthenticationSession)
      if (!idToken) {
        const redirectUri = Linking.createURL('auth');
        const authUrl = `${API_BASE}/auth/google-mobile?redirect_uri=${encodeURIComponent(redirectUri)}`;
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        if (result?.type === 'success' && result?.url) {
          const payload = decodePayload(result.url);
          if (payload?.idToken) {
            idToken = payload.idToken;
          } else if (payload?.cancelled) {
            setAcik(false);
            return;
          } else if (payload?.error) {
            onError?.(payload.error);
            return;
          }
        } else {
          // Kullanıcı tarayıcı penceresini kapattı / vazgeçti
          setAcik(false);
          return;
        }
      }

      if (!idToken) {
        onError?.('Google kimlik doğrulaması tamamlanamadı.');
        return;
      }

      await onIdToken?.(idToken);
    } catch (e) {
      onError?.(e?.message || 'Google ile giriş başarısız oldu.');
    } finally {
      setAcik(false);
    }
  }, [onIdToken, onError, guard]);

  return (
    <Pressable
      onPress={bas}
      disabled={disabled || acik}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: bg,
          borderColor: border,
          borderRadius: dsRadius.button,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && PRESSED,
        style,
      ]}
    >
      {acik ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          <GoogleGLogo size={19} />
          <Text style={[styles.text, { color: textColor }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
