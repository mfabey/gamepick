import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../src/context/AuthContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { component as K, space } from '../src/theme/tokens';
import { Icon } from '../src/components/Icon';
import { Txt } from '../src/components/ui/Primitives';

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
  const { colors } = useDesignTheme();
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

  // Dönüş ekranı: gezinme çubuğu YOK — kullanıcının burada yapacağı bir şey
  // yok, 0,8–1,8 sn içinde profile yönlendiriliyor.
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {status === 'processing' && (
        <View style={styles.box}>
          <ActivityIndicator size="large" color={colors.text2} />
          <Txt variant="title2" style={styles.title}>{t('auth.connecting')}</Txt>
          <Txt variant="body" style={[styles.sub, { color: colors.text2 }]}>{t('auth.pleaseWait')}</Txt>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.box}>
          <Icon name="checkc" size={K.authCallback.icon} color={colors.green} />
          <Txt variant="title2" style={styles.title}>{t('auth.connectedSuccess')}</Txt>
          <Txt variant="body" style={[styles.sub, { color: colors.text2 }]}>{t('auth.redirecting')}</Txt>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.box}>
          <Icon name="alert" size={K.authCallback.icon} color={colors.red} />
          <Txt variant="title2" style={styles.title}>{t('auth.connectFailed')}</Txt>
          {errorMsg ? <Txt variant="body" style={[styles.sub, { color: colors.text2 }]}>{errorMsg}</Txt> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[32] },
  box: { alignItems: 'center', justifyContent: 'center', gap: space[12] },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center' },
});
