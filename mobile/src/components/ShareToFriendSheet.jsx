import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getFriends, sendChat } from '../api/social';
import { getSession } from '../services/session';
import { getAvatarPreset } from '../utils/avatar';
import { radius, spacing, type, PRESSED } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// "Arkadaşa gönder" sayfası — Reels'ten paylaşım.
//
// ARKADAŞ LİSTESİ AÇILDIĞINDA ÇEKİLİYOR, önceden değil: bu sayfa nadiren
// açılıyor ve video ekranı zaten ağır. Her video için arkadaş listesi tutmak
// hiç kullanılmayacak bir isteği herkese ödetirdi.
//
// GÖNDERİLEN VERİ YALNIZCA appid. Ad ve görseli sunucu çözüyor; istemciden
// gelen metin saklanmıyor (bkz. lib/chat-share.js).
//
// ÇOKLU SEÇİM YOK. Tek dokunuş = tek gönderim; onay yok, geri bildirim var.
// Instagram'da da böyle: paylaşım hafif bir eylem olmalı, formа dönüşmemeli.
// ─────────────────────────────────────────────────────────────────────────────

export default function ShareToFriendSheet({ visible, onClose, appid, gameName }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [friends, setFriends] = useState(null);
  const [sent, setSent] = useState({});       // uid → true
  const [busy, setBusy] = useState(null);     // gönderim sürerken uid

  useEffect(() => {
    if (!visible) return;
    // Her açılışta sıfırla: önceki paylaşımın "gönderildi" işaretleri
    // yeni videoda yanıltıcı olur.
    setSent({});
    setFriends(null);
    if (!getSession()) { setFriends([]); return; }
    let alive = true;
    getFriends()
      .then((r) => { if (alive) setFriends(Array.isArray(r?.friends) ? r.friends : []); })
      .catch(() => { if (alive) setFriends([]); });
    return () => { alive = false; };
  }, [visible]);

  const send = useCallback(async (uid) => {
    if (busy || sent[uid]) return;
    setBusy(uid);
    Haptics.selectionAsync().catch(() => {});
    try {
      await sendChat(uid, '', undefined, { appid });
      setSent((s) => ({ ...s, [uid]: true }));
    } catch { /* satır "gönderildi" olmuyor, kullanıcı tekrar deneyebilir */ }
    finally { setBusy(null); }
  }, [busy, sent, appid]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.title} numberOfLines={1}>
          {gameName ? `${t('share.title')} · ${gameName}` : t('share.title')}
        </Text>

        {friends === null ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : friends.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{t('share.noFriends')}</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.uid}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            renderItem={({ item }) => {
              const preset = getAvatarPreset(item.avatar);
              const name = item.displayName || item.username || '?';
              const done = !!sent[item.uid];
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && !done && PRESSED]}
                  onPress={() => send(item.uid)}
                  disabled={done}
                >
                  {preset ? (
                    <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
                      <Ionicons name={preset.icon} size={19} color={preset.iconColor} />
                    </View>
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>

                  {busy === item.uid
                    ? <ActivityIndicator size="small" color={colors.text3} />
                    : done
                      ? <Text style={styles.done}>{t('share.sent')}</Text>
                      : <Text style={styles.send}>{t('share.send')}</Text>}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '70%', backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl,
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: colors.cardBorder, marginBottom: spacing.md,
  },
  title: {
    color: colors.text, fontSize: type.subhead, fontWeight: '800',
    marginBottom: spacing.md,
  },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty:  { color: colors.text3, fontSize: type.footnote, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.footnote, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: type.subhead, fontWeight: '600' },
  send: { color: colors.accentText, fontSize: type.footnote, fontWeight: '800' },
  done: { color: colors.green, fontSize: type.footnote, fontWeight: '700' },
});
