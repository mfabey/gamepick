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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getPrivacy, setPrivacy, getBlocked, unblockUser } from '../src/api/social';
import { colors, radius, spacing, PRESSED, type } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { getAvatarPreset } from '../src/utils/avatar';
import { SettingsGroup, SettingsRow } from '../src/components/SettingsList';

export default function SocialSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [privacy, setPriv] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([getPrivacy(), getBlocked()]);
      setPriv(p?.privacy || { shareActivity: true, discoverable: true });
      setBlocked(b?.blocked || []);
    } catch {
      setPriv({ shareActivity: true, discoverable: true });
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
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <SettingsGroup>
            <SettingsRow
              icon="pulse-outline"
              label={t('soc.shareActivity')}
              right={(
                <Switch
                  value={!!privacy.shareActivity}
                  onValueChange={(v) => toggle('shareActivity', v)}
                  trackColor={{ false: colors.cardBorder, true: colors.accent }}
                  thumbColor="#fff"
                />
              )}
            />
            <SettingsRow
              icon="search-outline"
              label={t('soc.discoverable')}
              right={(
                <Switch
                  value={!!privacy.discoverable}
                  onValueChange={(v) => toggle('discoverable', v)}
                  trackColor={{ false: colors.cardBorder, true: colors.accent }}
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
                  value={!!privacy.showPresence}
                  onValueChange={(v) => toggle('showPresence', v)}
                  trackColor={{ false: colors.cardBorder, true: colors.accent }}
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
                    {(() => {
                      const preset = getAvatarPreset(p.avatar);
                      if (preset) {
                        return (
                          <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
                            <Ionicons name={preset.icon} size={18} color={preset.iconColor} />
                          </View>
                        );
                      }
                      return (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {(p.displayName || p.username || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      );
                    })()}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '900', color: colors.text },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 15,
  },
  // Iceriden: avatar sutununu gectikten sonra basliyor — ayar listesiyle
  // ayni dil (bkz. components/SettingsList.jsx).
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder, marginLeft: 60 },

  sectionLabel: {
    color: colors.text3, fontSize: type.caption, fontWeight: '800',
    letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 26, marginBottom: 9,
  },
  emptyText: { color: colors.text2, fontSize: type.footnote, paddingVertical: 6 },

  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.accentText, fontWeight: '900', fontSize: type.body },
  blockName: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  blockHandle: { color: colors.text3, fontSize: type.caption, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: 13, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  unblockText: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
});
