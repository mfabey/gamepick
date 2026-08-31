import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getFriends, sendChat } from '../api/social';
import Avatar from './Avatar';
import { getSession } from '../services/session';
import { radius, spacing, type, PRESSED } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// "Arkadaşa gönder" sayfası — ÜÇ TÜR: fragman · oyun · haber.
//
// ARKADAŞ LİSTESİ AÇILDIĞINDA ÇEKİLİYOR, önceden değil: bu sayfa nadiren
// açılıyor ve video ekranı zaten ağır. Her video için arkadaş listesi tutmak
// hiç kullanılmayacak bir isteği herkese ödetirdi.
//
// GÖNDERİLEN VERİ YALNIZCA KİMLİK — üç türde de. Ad ve görseli sunucu
// çözüyor; istemciden gelen metin saklanmıyor (bkz. lib/chat-share.js).
//   fragman → { appid }
//   oyun    → { gameId }   (kart listesinde appid YOK, ölçüldü)
//   haber   → { newsUrl }  (sunucu kendi listesinde arıyor)
//
// ÇOKLU SEÇİM YOK. Tek dokunuş = tek gönderim; onay yok, geri bildirim var.
// Instagram'da da böyle: paylaşım hafif bir eylem olmalı, formа dönüşmemeli.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} [appid]    fragman paylaşımı (Reels)
 * @param {string} [gameId]   oyun paylaşımı (`rawg_<id>`)
 * @param {string} [newsUrl]  haber paylaşımı
 * @param {string} [gameName] başlıkta gösterilecek ad (yalnız görsel)
 * @param {func} [onSystemShare] verilirse listenin sonuna "Diğer uygulamalar"
 *                               satırı geliyor ve işletim sisteminin paylaşım
 *                               katmanını açıyor
 */
export default function ShareToFriendSheet({ visible, onClose, appid, gameId, newsUrl, gameName, onSystemShare }) {
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
      // TEK ALAN yollanıyor: sunucu hangisi geldiyse ona göre çözüyor.
      // İkisini birden yollamak sunucuda öncelik sırası gerektirirdi.
      const payload = appid != null ? { appid }
        : gameId != null ? { gameId }
        : newsUrl != null ? { newsUrl }
        : null;
      if (!payload) return;
      await sendChat(uid, '', undefined, payload);
      setSent((s) => ({ ...s, [uid]: true }));
    } catch { /* satır "gönderildi" olmuyor, kullanıcı tekrar deneyebilir */ }
    finally { setBusy(null); }
  }, [busy, sent, appid, gameId, newsUrl]);

  // ── "DİĞER UYGULAMALAR" ──
  // Yalnız çağıran verirse çıkıyor. Oyun detayında paylaşımın TEK kapısı bu
  // sayfa (üst çubukta ayrı bir sistem-paylaşım ikonu yok, orada başlığa yer
  // kalmıyordu) — o yüzden sistem katmanına giden bir çıkış şart. Arkadaşı
  // olmayan kullanıcı da böylece boş bir sayfayla kalmıyor.
  const digerSatiri = onSystemShare ? (
    <Pressable
      onPress={() => { onClose?.(); onSystemShare(); }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, styles.diger, pressed && PRESSED]}
    >
      <View style={styles.digerIkon}>
        <Ionicons name="share-outline" size={19} color={colors.text2} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{t('share.otherApps')}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.text3} />
    </Pressable>
  ) : null;

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
          <View>
            <View style={styles.center}>
              <Text style={styles.empty}>{t('share.noFriends')}</Text>
            </View>
            {digerSatiri}
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.uid}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            // Liste ALTINDA, sabit bir alt bant olarak değil: sabit bant
            // sayfanın 70% tavanıyla çakışıp arkadaş listesini kısaltırdı.
            ListFooterComponent={digerSatiri}
            renderItem={({ item }) => {
              const name = item.displayName || item.username || '?';
              const done = !!sent[item.uid];
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && !done && PRESSED]}
                  onPress={() => send(item.uid)}
                  disabled={done}
                >
                  {/* DÖRDÜNCÜ AVATAR KOPYASI SİLİNDİ. Faz 7 (social.jsx) ve
                      Faz 8 (social-settings.jsx) ile aynı kırılma: satır içi
                      kopya fotoğraf dalını çizmiyor, fotoğrafı olan arkadaş
                      HARF olarak görünüyordu. */}
                  <Avatar avatar={item.avatar} name={name} size={38} />
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
  name: { flex: 1, color: colors.text, fontSize: type.subhead, fontWeight: '600' },
  // Arkadaş satırlarından bir çizgiyle ayrılıyor: aynı listede ama farklı
  // cinsten bir eylem.
  diger: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  // 38 = Avatar boyutu; ikon avatar sütunuyla hizalı kalıyor.
  digerIkon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  send: { color: colors.accentText, fontSize: type.footnote, fontWeight: '800' },
  done: { color: colors.green, fontSize: type.footnote, fontWeight: '700' },
});
