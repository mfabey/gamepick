import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { radius, spacing, type } from '../src/theme';

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

function decodePayload(dataStr) {
  if (!dataStr) return null;
  try {
    const jsonStr = b64DecodeUtf8(decodeURIComponent(dataStr));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export default function AuthCallbackScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { handleAuthPayload } = useAuth();

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function process() {
      try {
        WebBrowser.maybeCompleteAuthSession();
      } catch {}

      const dataParam = params.data;
      if (!dataParam) {
        setStatus('error');
        setErrorMsg('Kimlik doğrulama verisi alınamadı.');
        setTimeout(() => {
          if (!cancelled) router.replace('/(tabs)/profile');
        }, 1500);
        return;
      }

      const payload = decodePayload(dataParam);
      if (!payload) {
        setStatus('error');
        setErrorMsg('Geçersiz kimlik doğrulama verisi.');
        setTimeout(() => {
          if (!cancelled) router.replace('/(tabs)/profile');
        }, 1500);
        return;
      }

      if (handleAuthPayload) {
        const res = await handleAuthPayload(payload);
        if (res.ok) {
          if (!cancelled) {
            setStatus('success');
            setTimeout(() => {
              if (!cancelled) router.replace('/(tabs)/profile');
            }, 800);
          }
          return;
        } else {
          if (!cancelled) {
            setStatus('error');
            setErrorMsg(res.error || 'Bağlantı kaydedilemedi.');
            setTimeout(() => {
              if (!cancelled) router.replace('/(tabs)/profile');
            }, 1800);
          }
          return;
        }
      }

      if (!cancelled) {
        setStatus('success');
        setTimeout(() => {
          if (!cancelled) router.replace('/(tabs)/profile');
        }, 1000);
      }
    }

    process();

    return () => {
      cancelled = true;
    };
  }, [params.data, handleAuthPayload, router]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <View style={styles.box}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.title}>{t('auth.connecting') || 'Hesabınız bağlanıyor…'}</Text>
          <Text style={styles.sub}>{t('auth.pleaseWait') || 'Lütfen bekleyin'}</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.box}>
          <Ionicons name="checkmark-circle" size={54} color={colors.green} />
          <Text style={styles.title}>{t('auth.connectedSuccess') || 'Hesap başarıyla bağlandı!'}</Text>
          <Text style={styles.sub}>{t('auth.redirecting') || 'Yönlendiriliyorsunuz…'}</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.box}>
          <Ionicons name="alert-circle" size={54} color={colors.accent} />
          <Text style={styles.title}>{t('auth.connectFailed') || 'Bağlantı kurulamadı'}</Text>
          {errorMsg ? <Text style={styles.sub}>{errorMsg}</Text> : null}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: type.title3,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: type.subhead,
    color: colors.text2,
    textAlign: 'center',
  },
});
