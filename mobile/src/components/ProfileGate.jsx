// ─────────────────────────────────────────────────────────────────────────────
// Profil kilidi — hesap gerektiren ekranların önündeki tek kapı.
//
// NEDEN EKRAN DÜZEYİNDE: kilidi yalnızca profil ekranındaki karolara koymak
// yeterli olmuyor; aynı ekranlara başka yerlerden de gidiliyor (ör. lists.jsx
// boş durumundan /collections'a). Giriş noktalarını tek tek yamamak hem
// kırılgan hem de derin bağlantıları (deep link) kaçırıyor. Kapıyı ekranın
// kendisine koymak her yolu kapatıyor.
//
// Kilitli ekran ÖLÜ UÇ DEĞİL: ne yapılması gerektiğini söyleyip kayıt
// ekranına götürüyor.
// ─────────────────────────────────────────────────────────────────────────────
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import EmptyState from './EmptyState';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {  } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';

export default function ProfileGate({ children }) {
  const styles = useStyles(makeStyles);
  const { account } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  if (account) return children;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ flex: 1 }}>
        <EmptyState
          icon="lock-closed-outline"
          title={t('prof.lockTitle')}
          text={t('prof.lockDesc')}
          actionLabel={t('prof.lockCta')}
          actionIcon="person-add-outline"
          onAction={() => router.push('/account')}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
