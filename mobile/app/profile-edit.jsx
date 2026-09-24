// ─────────────────────────────────────────────────────────────────────────────
// Profili düzenle.
//
// NEDEN AYRI EKRAN. Yeni profil başlığındaki birincil eylem "Profili düzenle".
// Öncesinde düzenlenebilen tek şey avatardı ve o da profilin ortasındaki bir
// avatara dokunarak açılıyordu — GİZLİ bir jest. Düğmenin sözünü tutması için
// düzenlenebilir alanların hepsinin tek yerde olması gerekiyordu:
// avatar · görünen ad · biyografi.
//
// BİYOGRAFİ BURADA DOĞUYOR: sunucu tarafı alanı taşıyor (MAX_BIO = 150) ama
// yazacak bir yüzey yoktu; alanı ekleyip formu eklememek, kimsenin
// dolduramayacağı bir veri alanı bırakmak olurdu.
//
// KULLANICI ADI BURADA DEĞİŞTİRİLMİYOR: ad değişimi dizin yazımı ve kimlik
// taklidi riski taşıyor, sunucuda saatte 5 ile sınırlı ve kendi kurulum
// akışı var (soc kullanıcı adı kapısı). Bu ekran görünen kimliği düzenliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal,
  Alert, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Avatar from '../src/components/Avatar';
import { radius, spacing, type, SHEET_LAYOUT } from '../src/theme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { AVATAR_PRESET_IDS, getAvatarPreset } from '../src/utils/avatar';
import {
  getMyProfile, setUsername as apiSetUsername,
  setAvatar as apiSetAvatar,
} from '../src/api/social';
import { updateSessionUser } from '../src/services/session';
import { Button, TextField, Txt } from '../src/components/ui/Primitives';
import { NavBar, QueryState } from '../src/components/ui/ScreenParts';

// Sunucudaki MAX_BIO ile AYNI SAYI olmak zorunda (app/lib/social-store.js).
// Ayrışırlarsa kullanıcı ekranda yazabildiği bir metni kaydedemez.
const MAX_BIO = 150;
const MAX_NAME = 40;

export default function ProfileEditScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatarState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    getMyProfile().then((r) => {
      if (!alive) return;
      if (!r?.profile?.username) throw new Error('PROFILE_UNAVAILABLE');
      setProfile(r.profile);
      setDisplayName(r.profile.displayName || '');
      setBio(r.profile.bio || '');
      setAvatarState(r.profile.avatar || null);
    }).catch(() => { if (alive) setLoadError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadAttempt]);

  const save = useCallback(async () => {
    if (saving || !profile?.username) return;
    setSaving(true);
    try {
      // Kullanıcı adı DEĞİŞMEDEN gönderiliyor: sunucudaki tek yazar
      // claimUsername ve profil nesnesini o kuruyor (bkz. username/route.js).
      const trimmedName = displayName.trim();
      const trimmedBio = bio.trim();
      await apiSetUsername(profile.username, trimmedName, trimmedBio);
      await updateSessionUser({
        name: trimmedName || profile.username,
        displayName: trimmedName,
        bio: trimmedBio,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      // Süzgeç reddi ile ağ hatası AYRI: ilki kullanıcının düzeltebileceği
      // bir şey, ikincisi değil.
      const code = e?.code || '';
      Alert.alert(
        code === 'TEXT_INAPPROPRIATE' ? t('prof.bioRejected')
        : code === 'TEXT_TOO_LONG' ? t('prof.bioTooLong')
        : t('soc.err.generic')
      );
    } finally {
      setSaving(false);
    }
  }, [saving, profile, displayName, bio, router, t]);

  // ── Avatar: ön ayar ──
  // İyimser güncelleme; sunucu reddederse eski değere dönülüyor.
  const pickAvatar = useCallback(async (presetId) => {
    Haptics.selectionAsync().catch(() => {});
    const prev = avatar;
    setAvatarState(presetId);
    setPickerOpen(false);
    try {
      await apiSetAvatar(presetId);
      await updateSessionUser({ avatar: presetId });
    } catch {
      setAvatarState(prev);
      Alert.alert(t('soc.err.generic'));
    }
  }, [avatar, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ marginHorizontal: yan }}>
        <NavBar title={t('prof.editProfile')} border
          left={<Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }}
            onPress={() => router.back()} style={styles.cancel}>
            <Txt variant="input" style={{ color: colors.text2 }}>{t('common.cancel')}</Txt>
          </Pressable>}
          right={<Button title={t('prof.save')} height={34} onPress={save}
            loading={saving} disabled={loading || loadError || !profile?.username} />} />
      </View>
      <QueryState loading={loading} error={loadError}
        retry={loadError ? () => setLoadAttempt(n => n + 1) : undefined} />

      {/* ANDROID'DE DE 'padding' — `undefined` DEĞİL. `undefined` iken
          KeyboardAvoidingView Android'de HİÇBİR ŞEY yapmıyor: RN 0.81
          kaynağında switch(behavior) default dalı düz bir <View> döndürüyor.
          Edge-to-edge zorlamasıyla pencere de klavye için küçülmediğinden
          alan hiç yukarı kaymıyordu (bkz. chat/[uid].jsx aynı not).
          `check:edge` bu kuralı denetliyor ve birleştirme sırasında bir kez
          düşürüldüğü için yakaladı. */}
      {!loading && !loadError && <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40, paddingHorizontal: yan + spacing.s20 }]}
                    keyboardShouldPersistTaps="handled">
          {/* Avatar — dokunuş seçiciyi açıyor. Kalem rozeti değişebilirliği
              ima ediyor; jest artık gizli değil, ekranın işi bu. */}
          <Pressable style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel={t('prof.chooseAvatar')} onPress={() => setPickerOpen(true)}>
            <Avatar avatar={avatar} name={displayName || profile?.username} size={88} style={styles.avatarXl} />
            <View style={styles.avatarBadge}>
              <Ionicons name="pencil" size={16} color={colors.bg} />
            </View>
          </Pressable>
          <Text style={styles.handle} numberOfLines={1}>
            {profile?.username ? `@${profile.username}` : ''}
          </Text>

          <View style={styles.fields}>
            <TextField label={t('prof.displayName')} value={displayName}
              onChangeText={setDisplayName} placeholder={profile?.username || ''}
              maxLength={MAX_NAME} editable={!saving} />
            <TextField label={t('soc.usernameLabel')} icon="hash"
              value={profile?.username || ''} editable={false} />
            <TextField label={t('prof.bio')} value={bio} onChangeText={setBio}
              placeholder={t('prof.bioHint')} multiline counter
              maxLength={MAX_BIO} editable={!saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>}

      <AvatarPicker
        visible={pickerOpen}
        current={avatar}
        onSelect={pickAvatar}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Avatar seçici ──────────────────────────────────────────────────────────
// RN Modal kullanılıyor — native kütüphane EKLENMEZ, OTA güvenli.
// Profil sekmesinden BURAYA TAŞINDI: düzenleme tek ekranda toplandı.
function AvatarPicker({ visible, current, onSelect, onClose }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, spacing.s20) }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView style={styles.pickerScroll} bounces={false}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>{t('prof.chooseAvatar')}</Text>

          {/* MEVCUT AVATAR GÖRÜNÜR: seçiciyi açan kullanıcı NEYİ değiştirdiğini
              görmeliydi; ekranda yalnız seçenekler vardı, başlangıç yoktu. */}
          <View style={styles.pickerCurrent}>
            <Avatar avatar={current} name={t('nav.profile')} size={56} />
            <Text style={styles.pickerCurrentLabel}>{t('prof.currentAvatar')}</Text>
          </View>

          <View style={styles.pickerGrid}>
            {AVATAR_PRESET_IDS.map((id) => {
              const p = getAvatarPreset(id);
              const active = current === id;
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [styles.pickerItem, active && styles.pickerItemActive, pressed && { opacity: 0.7 }]}
                  onPress={() => onSelect(id)}
                >
                  <View style={[styles.pickerCircle, { backgroundColor: p.bg }]}>
                    <Ionicons name={p.icon} size={26} color={p.iconColor} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {current ? (
            <Pressable style={({ pressed }) => [styles.pickerRemove, pressed && { opacity: 0.7 }]}
                       onPress={() => onSelect(null)}>
              <Ionicons name="close-circle-outline" size={18} color={colors.text3} />
              <Text style={styles.pickerRemoveText}>{t('prof.removeAvatar')}</Text>
            </Pressable>
          ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  body: { padding: spacing.s20 },

  cancel: { minHeight: 44, justifyContent: 'center' },
  avatarWrap: { alignSelf: 'flex-start' },
  avatarXl: { backgroundColor: colors.surfaceTile, borderWidth: 1, borderColor: colors.borderHover },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.text,
    borderWidth: 2, borderColor: colors.bg,
  },
  handle: {
    marginTop: spacing.s8,
    fontSize: type.footnote, fontWeight: '500', color: colors.text3,
  },

  fields: { gap: spacing.s16, marginTop: spacing.s20 },

  pickerOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerSheet: {
    ...SHEET_LAYOUT, maxHeight: '90%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: spacing.s20, paddingBottom: spacing.s40, paddingTop: spacing.s12,
    borderWidth: 1, borderColor: colors.cardBorder, borderBottomWidth: 0,
  },
  pickerScroll: { flexGrow: 0 },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.4,
    alignSelf: 'center', marginBottom: spacing.s16,
  },
  pickerTitle: {
    fontSize: type.headline, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: spacing.s20,
  },
  pickerCurrent: { alignItems: 'center', gap: spacing.s8, marginBottom: spacing.s16 },
  pickerCurrentLabel: { color: colors.text3, fontSize: type.caption },

  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.s12 },
  pickerItem: { padding: spacing.s4, borderRadius: 32, borderWidth: 2.5, borderColor: 'transparent' },
  // Seçim kenarlığı NÖTR: kırmızı bu sistemde eylem demek, seçim bir durum.
  pickerItemActive: { borderColor: colors.text },
  pickerCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  pickerRemove: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.s4, marginTop: spacing.s16, paddingVertical: spacing.s12,
  },
  pickerRemoveText: { color: colors.text3, fontSize: type.footnote, fontWeight: '600' },
});
