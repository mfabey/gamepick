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
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Avatar from '../src/components/Avatar';
import { radius, spacing, type, avatar as avatarSize, PRESSED, NUMERIC, TOUCH_MIN } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { AVATAR_PRESET_IDS, getAvatarPreset } from '../src/utils/avatar';
import {
  getMyProfile, setUsername as apiSetUsername,
  setAvatar as apiSetAvatar, uploadAvatarPhoto,
} from '../src/api/social';

// Sunucudaki MAX_BIO ile AYNI SAYI olmak zorunda (app/lib/social-store.js).
// Ayrışırlarsa kullanıcı ekranda yazabildiği bir metni kaydedemez.
const MAX_BIO = 150;
const MAX_NAME = 40;

export default function ProfileEditScreen() {
  const styles = useStyles(makeStyles);
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
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyProfile()
      .then((r) => {
        if (!alive || !r?.profile) return;
        setProfile(r.profile);
        setDisplayName(r.profile.displayName || '');
        setBio(r.profile.bio || '');
        setAvatarState(r.profile.avatar || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const save = useCallback(async () => {
    if (saving || !profile?.username) return;
    setSaving(true);
    try {
      // Kullanıcı adı DEĞİŞMEDEN gönderiliyor: sunucudaki tek yazar
      // claimUsername ve profil nesnesini o kuruyor (bkz. username/route.js).
      await apiSetUsername(profile.username, displayName.trim(), bio.trim());
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
    } catch {
      setAvatarState(prev);
      Alert.alert(t('soc.err.generic'));
    }
  }, [avatar, t]);

  // ── Avatar: fotoğraf ──
  // ÖNCE KÜÇÜLT, SONRA YÜKLE. Avatar ekranda en fazla 88pt çiziliyor; 4 MB'lık
  // bir fotoğrafı olduğu gibi yüklemek hem kullanıcının verisini hem sunucu
  // kotasını boşa harcar. 256px kenar 3x ekranda bile yeterli, dosya ~30–60 KB.
  const pickPhoto = useCallback(async () => {
    if (uploading) return;
    const ImagePicker = await import('expo-image-picker');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('prof.photoPerm')); return; }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,          // kalite kaybı boyutlandırmadan SONRA veriliyor
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;

    setUploading(true);
    setPickerOpen(false);
    const prev = avatar;
    try {
      const Manipulator = await import('expo-image-manipulator');
      const out = await Manipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { compress: 0.8, format: Manipulator.SaveFormat.JPEG, base64: true }
      );
      const r = await uploadAvatarPhoto(out.uri, 'image/jpeg', out.base64);
      setAvatarState(r?.avatar || prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setAvatarState(prev);
      console.warn('[avatar-photo] upload failed:', e?.code || e?.status || e?.message || e);
      const code = e?.code || '';
      Alert.alert(
        code === 'MEDIA_DISABLED' || code === 'STORAGE_DISABLED' ? t('prof.photoDisabled')
        : code === 'REJECTED' || code.startsWith?.('BLOCKED_') ? t('prof.photoRejected')
        : code === 'TOO_LARGE' ? t('prof.photoTooLarge')
        : code === 'NO_USERNAME' ? t('prof.noUsername')
        : t('soc.err.generic')
      );
    } finally {
      setUploading(false);
    }
  }, [uploading, avatar, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}
                   style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('prof.editProfile')}</Text>
        <Pressable onPress={save} disabled={saving || !profile} hitSlop={10}
                   style={({ pressed }) => [styles.saveBtn, pressed && PRESSED]}>
          {saving
            ? <ActivityIndicator size="small" color={colors.accentText} />
            : <Text style={styles.saveText}>{t('prof.save')}</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40 }]}
                    keyboardShouldPersistTaps="handled">
          {/* Avatar — dokunuş seçiciyi açıyor. Kalem rozeti değişebilirliği
              ima ediyor; jest artık gizli değil, ekranın işi bu. */}
          <Pressable style={styles.avatarWrap} onPress={() => setPickerOpen(true)}>
            <Avatar avatar={avatar} name={displayName || profile?.username} size={avatarSize.xl} style={styles.avatarXl} />
            <View style={styles.avatarBadge}>
              <Ionicons name="pencil" size={12} color={colors.onAccent} />
            </View>
          </Pressable>
          <Text style={styles.handle} numberOfLines={1}>
            {profile?.username ? `@${profile.username}` : ''}
          </Text>

          <Text style={styles.label}>{t('prof.displayName')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={(v) => setDisplayName(v.slice(0, MAX_NAME))}
            placeholder={profile?.username || ''}
            placeholderTextColor={colors.text3}
            maxLength={MAX_NAME}
          />

          <Text style={styles.label}>{t('prof.bio')}</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, MAX_BIO))}
            placeholder={t('prof.bioHint')}
            placeholderTextColor={colors.text3}
            multiline
            maxLength={MAX_BIO}
          />
          {/* Sayaç SAĞDA ve sessiz: sınıra yaklaşmak hata değil, bilgi. */}
          <Text style={[styles.counter, NUMERIC]}>{bio.length}/{MAX_BIO}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <AvatarPicker
        visible={pickerOpen}
        current={avatar}
        onSelect={pickAvatar}
        onClose={() => setPickerOpen(false)}
        onPickPhoto={pickPhoto}
        uploading={uploading}
      />
    </SafeAreaView>
  );
}

// ─── Avatar seçici ──────────────────────────────────────────────────────────
// RN Modal kullanılıyor — native kütüphane EKLENMEZ, OTA güvenli.
// Profil sekmesinden BURAYA TAŞINDI: düzenleme tek ekranda toplandı.
function AvatarPicker({ visible, current, onSelect, onClose, onPickPhoto, uploading }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>{t('prof.chooseAvatar')}</Text>

          {/* MEVCUT AVATAR GÖRÜNÜR: seçiciyi açan kullanıcı NEYİ değiştirdiğini
              görmeliydi; ekranda yalnız seçenekler vardı, başlangıç yoktu. */}
          <View style={styles.pickerCurrent}>
            <Avatar avatar={current} name={t('nav.profile')} size={56} />
            <Text style={styles.pickerCurrentLabel}>{t('prof.currentAvatar')}</Text>
          </View>

          {/* FOTOĞRAF EN ÜSTTE. Ön ayarlar bir yedek; kişinin kendi fotoğrafı
              "bu hesap benim" hissini veren asıl şey. */}
          <Pressable
            onPress={onPickPhoto}
            disabled={uploading}
            style={({ pressed }) => [styles.pickerPhoto, pressed && PRESSED, uploading && { opacity: 0.6 }]}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="image-outline" size={19} color="#fff" />}
            <Text style={styles.pickerPhotoText}>
              {uploading ? t('prof.photoUploading') : t('prof.photoPick')}
            </Text>
          </Pressable>

          <Text style={styles.pickerNote}>{t('prof.photoNote')}</Text>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.s12, paddingBottom: spacing.s8,
  },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '600', color: colors.text },
  saveBtn: { minWidth: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing.s8 },
  saveText: { fontSize: type.subhead, fontWeight: '600', color: colors.accentText },

  body: { padding: spacing.s20 },

  avatarWrap: { alignSelf: 'center' },
  avatarXl: { backgroundColor: colors.surfaceTile, borderWidth: 1, borderColor: colors.borderHover },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentFillStrong,
    borderWidth: 2, borderColor: colors.bg,
  },
  handle: {
    textAlign: 'center', marginTop: spacing.s8,
    fontSize: type.footnote, fontWeight: '500', color: colors.text3,
  },

  label: {
    marginTop: spacing.s24, marginBottom: spacing.s8,
    fontSize: type.footnote, fontWeight: '600', color: colors.text2,
  },
  input: {
    minHeight: TOUCH_MIN, borderRadius: radius.md,
    paddingHorizontal: spacing.s12, paddingVertical: spacing.s12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
    fontSize: type.subhead, color: colors.text,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  counter: {
    alignSelf: 'flex-end', marginTop: spacing.s8,
    fontSize: type.caption, fontWeight: '500', color: colors.text3,
  },

  pickerOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: spacing.s20, paddingBottom: spacing.s40, paddingTop: spacing.s12,
    borderWidth: 1, borderColor: colors.cardBorder, borderBottomWidth: 0,
  },
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

  pickerPhoto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s8,
    marginTop: spacing.s16, height: TOUCH_MIN,
    backgroundColor: colors.accentFillStrong, borderRadius: radius.md,
  },
  // tema-bagimsiz: dolu marka dugmesinin uzerinde
  pickerPhotoText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },
  pickerNote: {
    color: colors.text3, fontSize: type.caption, textAlign: 'center',
    marginTop: spacing.s8, marginBottom: spacing.s16,
  },

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
