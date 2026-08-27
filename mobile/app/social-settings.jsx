// ─────────────────────────────────────────────────────────────────────────────
// Sosyal gizlilik + engellenenler.
//
// Guideline 1.2 (engelleme yönetimi) ve 5.1.2 (kullanıcı kendi verisinin
// paylaşımını denetleyebilmeli) burada karşılanıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Switch, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getPrivacy, setPrivacy, getBlocked, unblockUser } from '../src/api/social';
import { radius, spacing, PRESSED, type, SECTION_TITLE, TOUCH_MIN } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import Avatar from '../src/components/Avatar';
import { SettingsGroup, SettingsRow, AYIRICI_SOL } from '../src/components/SettingsList';

export default function SocialSettingsScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  const [privacy, setPriv] = useState(null);
  // Ayarlar OKUNAMADI mı — 'kapalı'dan AYRI durum (Faz 8).
  const [bozuk, setBozuk] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([getPrivacy(), getBlocked()]);
      setPriv(p?.privacy || { shareActivity: false, discoverable: false, showPresence: false });
      setBozuk(false);
      setBlocked(b?.blocked || []);
    } catch {
      // FAZ 8, KIRILMA — GİZLİLİKTE AÇIĞA DEĞİL BİLİNMEZLİĞE DÜŞ.
      // Öncesi: `setPriv({ shareActivity: true, discoverable: true })`.
      // İstek başarısız olduğunda arayüz paylaşımın AÇIK olduğunu
      // söylüyordu. Yanlış tarafa düşmek burada asimetrik: açığı kapalı
      // göstermek endişe yaratır, KAPALIYI AÇIK GÖSTERMEK GERÇEK ZARAR
      // yaratır — kullanıcı kapattığını sanıp açık bırakır.
      //
      // Ayrıca `showPresence` bu yedekte HİÇ YOKTU: üçüncü anahtar tanımsız
      // gelip kapalı çiziliyordu, yani sessizce üçüncü bir yalan.
      //
      // Artık üçü de kapalı ÇİZİLİYOR ama anahtarlar DEVRE DIŞI ve bant
      // "sunucudaki ayarların değişmedi" diyor: gösterilen şey bir durum
      // değil, bir bilinmezlik.
      setPriv({ shareActivity: false, discoverable: false, showPresence: false });
      setBozuk(true);
      setBlocked([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (key, value) => {
    if (saving) return;
    Haptics.selectionAsync();
    // İyimser güncelleme — anahtar anında dönsün
    setPriv((p) => ({ ...p, [key]: value }));
    setSaving(true);
    try {
      const r = await setPrivacy({ [key]: value });
      if (r?.privacy) setPriv(r.privacy);
    } catch {
      // Başarısızsa geri al, kullanıcı yanlış durumu doğru sanmasın
      setPriv((p) => ({ ...p, [key]: !value }));
      Alert.alert(t('soc.err.generic'));
    } finally {
      setSaving(false);
    }
  }, [saving, t]);

  const unblock = useCallback((person) => {
    Alert.alert(person.displayName || person.username || '', t('soc.unblock'), [
      { text: t('soc.cancel'), style: 'cancel' },
      {
        text: t('soc.unblock'),
        onPress: async () => {
          try {
            await unblockUser(person.uid);
            setBlocked((list) => list.filter((x) => x.uid !== person.uid));
          } catch { Alert.alert(t('soc.err.generic')); }
        },
      },
    ]);
  }, [t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('soc.privacyTitle')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {privacy === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Anahtarlar kapalı ama bu bir DURUM değil bir BİLİNMEZLİK —
              bant tam olarak bunu söylüyor. Kırmızı yok. */}
          {bozuk ? (
            <View style={styles.bozukBant}>
              <Text style={styles.bozukBaslik}>{t('soc.privUnknown')}</Text>
              <Text style={styles.bozukMetin}>{t('soc.privUnknownDesc')}</Text>
              <Pressable onPress={load} hitSlop={8} style={({ pressed }) => [styles.bozukEylem, pressed && PRESSED]}>
                <Text style={styles.bozukEylemText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : null}

          <SettingsGroup>
            <SettingsRow
              icon="pulse-outline"
              label={t('soc.shareActivity')}
              desc={t('soc.shareActivityDesc')}
              right={(
                <Switch
                  value={!bozuk && !!privacy.shareActivity}
                  onValueChange={(v) => toggle('shareActivity', v)}
                  disabled={bozuk}
                  trackColor={{ false: colors.cardBorder, true: colors.green }}
                  thumbColor="#fff"
                />
              )}
            />
            <SettingsRow
              icon="search-outline"
              label={t('soc.discoverable')}
              desc={t('soc.discoverableDesc')}
              right={(
                <Switch
                  value={!bozuk && !!privacy.discoverable}
                  onValueChange={(v) => toggle('discoverable', v)}
                  disabled={bozuk}
                  trackColor={{ false: colors.cardBorder, true: colors.green }}
                  thumbColor="#fff"
                />
              )}
            />
            {/* Sunucu tarafi bu ayari zaten okuyordu ama arayuzde anahtari
                yoktu — kullanici cevrimici gorunmeyi kapatamiyordu. */}
            <SettingsRow
              icon="ellipse-outline"
              label={t('soc.showPresence')}
              desc={t('soc.showPresenceDesc')}
              right={(
                <Switch
                  value={!bozuk && !!privacy.showPresence}
                  onValueChange={(v) => toggle('showPresence', v)}
                  disabled={bozuk}
                  trackColor={{ false: colors.cardBorder, true: colors.green }}
                  thumbColor="#fff"
                />
              )}
            />
          </SettingsGroup>
          <Text style={styles.sectionLabel}>{t('soc.blocked')}</Text>
          {blocked === null ? null : blocked.length === 0 ? (
            <Text style={styles.emptyText}>{t('soc.noBlocked')}</Text>
          ) : (
            <View style={styles.card}>
              {blocked.map((p, i) => (
                <View key={p.uid}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.blockRow}>
                    {/* FAZ 8 — ÜÇÜNCÜ AVATAR KOPYASI SİLİNDİ. Burada satır
                        içi bir IIFE vardı: ön ayar veya baş harf, FOTOĞRAF
                        YOK. Faz 7'de social.jsx'te bulduğumun aynısı —
                        fotoğrafı olan kişi harf olarak görünüyordu. */}
                    <Avatar avatar={p.avatar} name={p.displayName || p.username} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.blockName}>
                        {p.displayName || p.username || p.uid}
                      </Text>
                      {p.username ? <Text style={styles.blockHandle}>@{p.username}</Text> : null}
                    </View>
                    <Pressable style={({ pressed }) => [styles.unblockBtn, pressed && PRESSED]} onPress={() => unblock(p)}>
                      <Text style={styles.unblockText}>{t('soc.unblock')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '900', color: colors.text },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 15,
  },
  // Iceriden: avatar sutununu gectikten sonra basliyor — ayar listesiyle
  // ayni dil (bkz. components/SettingsList.jsx).
  // FAZ 8: elle 60 yazılıydı. SettingsList aynı çizgiyi TÜRETİYOR
  // (PAD + ICON_COL + gap = 58) ve neden türettiğini yazıyor; profildeki
  // ölü stil ise 56 diyordu. Tek çizgi için üç sayı — türetmenin gerekçesi
  // kanıtlanmış oluyor. Tek kaynağa bağlandı.
  // Bozuk bant — Faz 4/5'teki ikizleriyle aynı dil. Kırmızı yok.
  bozukBant: {
    marginBottom: spacing.s16, padding: spacing.s16, borderRadius: radius.md,
    backgroundColor: colors.bgInput, gap: spacing.s4,
  },
  bozukBaslik: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  bozukMetin: { color: colors.text2, fontSize: type.footnote, lineHeight: 19 },
  bozukEylem: { minHeight: TOUCH_MIN, justifyContent: 'center', alignSelf: 'flex-start' },
  bozukEylemText: { color: colors.accentText, fontSize: type.subhead, fontWeight: '700' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder, marginLeft: AYIRICI_SOL },

  sectionLabel: {
    ...SECTION_TITLE, color: colors.text2,
    marginTop: spacing.s24, marginBottom: spacing.s8,
  },
  emptyText: { color: colors.text2, fontSize: type.footnote, paddingVertical: 6 },

  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  blockName: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  blockHandle: { color: colors.text3, fontSize: type.caption, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: 13, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  unblockText: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
});
