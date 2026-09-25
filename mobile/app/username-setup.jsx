import { useYanBosluk } from '../src/hooks/useIcerikAlani';
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
  View, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { spacing } from '../src/theme';
import { component as K, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { checkUsername, setUsername } from '../src/api/social';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { Button, TextField, Txt } from '../src/components/ui/Primitives';

export default function UsernameSetupScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('soc.title')} />

      {/* ANDROID'DE DE 'padding' — `undefined` DEĞİL. `undefined` iken
          KeyboardAvoidingView Android'de HİÇBİR ŞEY yapmıyor: RN 0.81
          kaynağında switch(behavior) default dalı düz bir <View> döndürüyor.
          Edge-to-edge zorlamasıyla pencere de klavye için küçülmediğinden
          alan hiç yukarı kaymıyordu (bkz. chat/[uid].jsx aynı not). */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space[24], paddingHorizontal: yan + spacing.s20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Icon name="at" size={K.usernameSetup.icon} color={colors.red} />
          <Txt variant="title2" accessibilityRole="header" style={styles.baslik}>{t('soc.setupTitle')}</Txt>
          <Txt variant="body" style={[styles.lead, { color: colors.text2 }]}>{t('soc.setupText')}</Txt>

          {/* G-03'teki kullanıcı adı alanının aynısı: kontrol sürerken sağda
              gösterge; sonuç alanın altında (alınmış → hata, uygun → başarı,
              diğer → ipucu). Eskiden durum sağda ikonla VE altta metinle iki
              kez söyleniyordu; TextField'ın yardım satırı ikonu zaten taşıyor. */}
          <View style={styles.alan}>
            <TextField
              label={t('soc.usernameLabel')}
              icon="at"
              value={name}
              onChangeText={(v) => setName(v.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder={t('soc.usernamePlaceholder')}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="done"
              onSubmitEditing={submit}
              trailing={state.status === 'checking' ? <ActivityIndicator size="small" color={colors.text3} /> : null}
              error={errText || undefined}
              success={!errText && state.status === 'ok' ? t('soc.available') : undefined}
              helper={t('soc.usernameHint')}
            />
          </View>

          <View style={[styles.not, { backgroundColor: colors.surface1 }]}>
            <Icon name="lock" size={K.usernameSetup.noteIcon} color={colors.text2} />
            <Txt variant="footnote" style={[styles.notMetin, { color: colors.text2 }]}>{t('soc.privacyNote')}</Txt>
          </View>

          {/* Yüklenirken yalnız yay (2.0 Button `loading`): genişlik değişmiyor,
              ikinci basış düğmenin kendisinde engelleniyor. */}
          <Button
            title={t('soc.create')}
            height={52}
            onPress={submit}
            disabled={state.status !== 'ok'}
            loading={saving}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },

  body: { paddingTop: space[16], paddingHorizontal: spacing.s20, alignItems: 'center' },
  baslik: { marginTop: space[16], textAlign: 'center' },
  lead: { marginTop: space[8], textAlign: 'center', maxWidth: K.usernameSetup.leadWidth },

  // Sütun ortalı (ikon ve başlık); alan ve not tam genişlik.
  alan: { alignSelf: 'stretch', marginTop: space[32] },
  not: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space[8],
    marginTop: space[24], padding: space[12], borderRadius: dsRadius.button,
  },
  notMetin: { flex: 1 },
  cta: { alignSelf: 'stretch', marginTop: space[24] },
});
