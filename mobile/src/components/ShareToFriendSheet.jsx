// ─────────────────────────────────────────────────────────────────────────────
// Arkadaşa gönder — 2.0 / G-DS-4 (27 Eyl). Kitteki "Paylaş" alt sayfası:
// başlık satırı (paylaşılan şeyin adı), arkadaş listesi, en altta sistem
// paylaşımı. Ortak AltSayfa; satırlar 2.0 avatar + ad + küçük düğme.
//
// Gönderim davranışı AYNEN: arkadaşa dokun → sohbete kart düşer, satır
// "Gönderildi" olur; hata olursa satır eski hâlinde kalır ve tekrar denenir.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getFriends, sendChat } from '../api/social';
import Avatar from './Avatar';
import { getSession } from '../services/session';
import { AltSayfa } from './ui/AltSayfa';
import { Button, ListGroup, ListRow, PressableScale, Txt } from './ui/Primitives';
import { Icon } from './Icon';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { control as C, layout, space } from '../theme/tokens';

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
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const [friends, setFriends] = useState(null);
  const [sent, setSent] = useState({});       // uid → true
  const [busy, setBusy] = useState(null);     // gönderim sürerken uid

  useEffect(() => {
    if (!visible) return;
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

  const digerSatiri = onSystemShare ? (
    <View style={styles.diger}>
      <ListGroup>
        <ListRow title={t('share.otherApps')} icon="share" onPress={() => { onClose?.(); onSystemShare(); }} />
      </ListGroup>
    </View>
  ) : null;

  return (
    <AltSayfa visible={visible} onClose={onClose} title={t('share.title')} subtitle={gameName || undefined} oran={0.7}>
      {friends === null ? (
        <View style={styles.merkez}><ActivityIndicator color={colors.text2} /></View>
      ) : friends.length === 0 ? (
        <View>
          <Txt variant="footnote" style={[styles.bos, { color: colors.text2 }]}>{t('share.noFriends')}</Txt>
          {digerSatiri}
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.uid}
          style={styles.liste}
          contentContainerStyle={styles.listeIc}
          ListFooterComponent={digerSatiri}
          renderItem={({ item }) => {
            const name = item.displayName || item.username || '?';
            const done = !!sent[item.uid];
            return (
              <PressableScale onPress={() => send(item.uid)} disabled={done || !!busy} dimDisabled={false}
                accessibilityRole="button" accessibilityLabel={`${name}, ${done ? t('share.sent') : t('share.send')}`}
                style={styles.satir}>
                <Avatar avatar={item.avatar} name={name} size={40} />
                <Txt variant="input" numberOfLines={1} style={styles.ad}>{name}</Txt>
                {busy === item.uid
                  ? <ActivityIndicator size="small" color={colors.text3} />
                  : done
                    ? <View style={styles.gonderildi}><Icon name="check" size={16} color={colors.green} strokeWidth={2.4} /><Txt variant="footnoteStrong" style={{ color: colors.green }}>{t('share.sent')}</Txt></View>
                    : <Button title={t('share.send')} variant="tinted" height={32} onPress={() => send(item.uid)} />}
              </PressableScale>
            );
          }}
        />
      )}
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  merkez: { paddingVertical: space[32], alignItems: 'center' },
  bos: { textAlign: 'center', paddingVertical: space[24], paddingHorizontal: layout.gutter },
  liste: { flexGrow: 0 },
  listeIc: { paddingBottom: space[8] },
  satir: { minHeight: C.listHeight + 6, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: layout.gutter },
  ad: { flex: 1 },
  gonderildi: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  diger: { paddingTop: space[12] },
});
