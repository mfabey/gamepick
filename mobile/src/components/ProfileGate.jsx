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
//
// NAVBAR ŞART. İlk sürüm yalnız boş durumu çiziyordu: geri oku da başlık da
// yoktu, çıkış yalnız kenar kaydırmasıydı (26 Eyl, simülatörde görüldü).
// Çağıran ekran kendi başlığını `title` ile veriyor; kapı ile gerçek ekran
// aynı üst çubuğu taşıyor. İkon `userplus`: uygulamada "hesap gerekli" bu,
// `lock` gizli/kilitli içerik için (bkz. game-cards).
// ─────────────────────────────────────────────────────────────────────────────
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import EmptyState from './EmptyState';
import { NavBar } from './ui/Navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStyles } from '../context/ThemeContext';

export default function ProfileGate({ title, children }) {
  const styles = useStyles(makeStyles);
  const { account } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  if (account) return children;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NavBar title={title} />
      <View style={{ flex: 1 }}>
        <EmptyState
          icon="userplus"
          title={t('prof.lockTitle')}
          text={t('prof.lockDesc')}
          actionLabel={t('prof.lockCta')}
          actionIcon="userplus"
          onAction={() => router.push('/account')}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
