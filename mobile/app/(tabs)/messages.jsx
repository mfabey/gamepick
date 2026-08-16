// ─────────────────────────────────────────────────────────────────────────────
// Mesajlar — konuşma listesi.
//
// ARTIK BİR SEKME, yığın ekranı değil. Haberler'in yerini aldı: alt
// navigasyon uygulamanın kendini nasıl tanıttığı yer, orada bir mesaj
// simgesi olması "burası insanların konuştuğu bir yer" diyor.
//
// Mesajlaşma YALNIZCA arkadaşlar arasında. Bu, yabancıdan gelen spam'i kökten
// kapatan kural; sunucu da aynı kuralı uyguluyor (NOT_FRIENDS).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getChatList } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import { refreshUnread } from '../../src/services/unread';
import EmptyState from '../../src/components/EmptyState';
import { getAvatarPreset } from '../../src/utils/avatar';
import { radius, spacing, type, PRESSED, TAB_SPACE } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

/** Kısa zaman: bugünse saat, bu haftaysa gün, değilse tarih. */
function shortTime(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US';
  if (sameDay) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000) return d.toLocaleDateString(loc, { weekday: 'short' });
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}

export default function MessagesScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  // Sekmeye tekrar basınca listeyi başa sar (diğer sekmelerle aynı davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [rows, setRows]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await getChatList();
      setRows(r?.conversations || []);
      setError(null);
    } catch (e) {
      setError(e?.code || 'UNKNOWN');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sohbetten geri dönünce liste TAZELENMELİ: son mesaj ve okundu durumu
  // değişmiş olabilir. useEffect tek başına bunu yakalamıyor.
  //
  // Sekme rozeti de burada tazeleniyor: bir sohbet okunduğunda sekme
  // indeksi değişmiyor, dolayısıyla çubuğun kendi tetikleyicisi çalışmıyor.
  useFocusEffect(useCallback(() => {
    if (session) { load(); refreshUnread(); }
  }, [session, load]));

  let body = null;
  if (!session) {
    body = <EmptyState icon="person-circle-outline" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('sf.error')} text={t('sf.errorText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  } else if (!rows?.length) {
    body = <EmptyState icon="chatbubbles-outline" title={t('msg.empty')} text={t('msg.emptyText')}
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/social')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Geri düğmesi YOK: burası artık bir sekme kökü, geri dönülecek bir
          yer yok. Başlık da sola hizalandı — diğer sekmelerin başlıklarıyla
          aynı hizada dursun. */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('msg.title')}</Text>
      </View>

      {body || (
        <FlashList
          ref={listRef}
          onScroll={onTabScroll}
          scrollEventThrottle={16}
          data={rows}
          keyExtractor={(r) => r.cid}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item} t={t} lang={lang}
              onPress={() => router.push(`/chat/${item.other.uid}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({ item, onPress, t, lang }) {
  const styles = useStyles(makeStyles);
  const preset = getAvatarPreset(item.other.avatar);
  const name = item.other.displayName || item.other.username || '?';

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={onPress}>
      {preset ? (
        <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
          <Ionicons name={preset.icon} size={21} color={preset.iconColor} />
        </View>
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      {/* Cevrimici noktasi avatarin uzerinde. presence null ise (kullanici
          paylasmiyorsa) hicbir sey cizilmiyor. */}
      {item.presence?.online ? <View style={styles.onlineDot} /> : null}

      <View style={styles.rowMid}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {/* Metinsiz medya mesajında sunucu `lastKind` gönderiyor; etiket burada
            çevriliyor çünkü kullanıcının dili sunucuda değil, istemcide belli.
            Metin varsa metin kazanır. */}
        <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>
          {item.lastDeleted
            ? t('msg.wasUndone')
            : item.lastText
            ? item.lastText
            : item.lastKind === 'gif'   ? `🖼️ ${t('msg.gif')}`
            : item.lastKind === 'reel'  ? `🎬 ${t('msg.sharedReel')}`
            : item.lastKind === 'video' ? `🎬 ${t('msg.video')}`
            : item.lastKind === 'photo' ? `📷 ${t('msg.photo')}`
            : ''}
        </Text>
      </View>

      <View style={styles.rowEnd}>
        <Text style={styles.time}>{shortTime(item.lastAt, lang)}</Text>
        {item.unread && <View style={styles.dot} />}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  title:   { flex: 1, color: colors.text, fontSize: type.title3, fontWeight: '800', letterSpacing: -0.4 },


  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.subhead, fontWeight: '800' },

  // Avatarin sag altina oturuyor; koyu cerceve arka planla ayirtiyor.
  onlineDot: {
    position: 'absolute', left: 50, top: 46,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.green, borderWidth: 2.5, borderColor: colors.bg,
  },
  rowMid:  { flex: 1, gap: 2 },
  name:    { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  preview: { color: colors.text3, fontSize: type.footnote },
  previewUnread: { color: colors.text, fontWeight: '600' },

  rowEnd: { alignItems: 'flex-end', gap: 6 },
  time:   { color: colors.text3, fontSize: type.caption2 },
  dot:    { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
});
