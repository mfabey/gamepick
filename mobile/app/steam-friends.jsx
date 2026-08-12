// ─────────────────────────────────────────────────────────────────────────────
// Steam arkadaşları — kütüphane kesişimi.
//
// NEDEN VAR: yeni bir sosyal ekranın klasik ölüm sebebi, ilk kullanıcının boş
// bir listeye bakmasıdır. Burada liste ASLA boş açılmıyor, çünkü grafiği
// Steam'den ödünç alıyoruz — arkadaşın Gamerisen'i kurmuş olması gerekmiyor.
//
// ÖLÇÜM (13 arkadaşlı gerçek hesap): 12 arkadaşın kütüphanesi okunabildi,
// arkadaş başına ortalama 13,1 ortak oyun, 8,3'ü birlikte oynanabilir.
//
// Sıralama sunucuda yapılıyor ve co-op önceliklidir: saate göre sıralayınca
// her arkadaşta aynı oyun tepeye çıkıyordu (Counter-Strike 2) — doğru ama
// işe yaramaz bir cevap.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getSteamFriends } from '../src/api/social';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { getAvatarPreset } from '../src/utils/avatar';
import { colors, radius, spacing, type, PRESSED, NUMERIC, TAB_SPACE } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function SteamFriendsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  // Oturum REAKTİF okunmalı: getSession() modül değişkeni ve başlangıçta null,
  // asenkron doluyor. Tek seferlik okuma ekranı kalıcı "giriş yap" durumunda
  // bırakıyor — bu hata topluluk listelerinde bir kez yaşandı.
  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen]       = useState(null);   // açık satırın steamId'si

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await getSteamFriends();
      setData(r);
      setError(null);
    } catch (e) {
      setError(e?.code || 'UNKNOWN');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return;      // henüz yüklenmedi
    if (!session) { setLoading(false); return; }
    load();
  }, [session, load]);

  const toggle = useCallback((sid) => {
    Haptics.selectionAsync().catch(() => {});
    setOpen((cur) => (cur === sid ? null : sid));
  }, []);

  // ── Kapılar ───────────────────────────────────────────────────────────────
  let body = null;

  if (!session) {
    body = (
      <EmptyState
        icon="person-circle-outline"
        title={t('sf.needAccount')}
        text={t('sf.needAccountText')}
        actionLabel={t('sf.goAccount')}
        onAction={() => router.push('/account')}
      />
    );
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>{t('sf.loading')}</Text>
      </View>
    );
  } else if (error === 'STEAM_REQUIRED') {
    body = (
      <EmptyState
        icon="logo-steam"
        title={t('sf.noSteam')}
        text={t('sf.noSteamText')}
        actionLabel={t('sf.goProfile')}
        onAction={() => router.push('/(tabs)/profile')}
      />
    );
  } else if (error === 'SELF_PRIVATE') {
    // Düzeltilebilir bir durum — kullanıcıya TAM olarak hangi ayar olduğunu söyle.
    body = (
      <EmptyState
        icon="lock-closed-outline"
        title={t('sf.selfPrivate')}
        text={t('sf.selfPrivateText')}
      />
    );
  } else if (error) {
    body = (
      <EmptyState
        icon="cloud-offline-outline"
        title={t('sf.error')}
        text={t('sf.errorText')}
        actionLabel={t('sf.retry')}
        onAction={() => load()}
      />
    );
  } else if (!data?.friends?.length) {
    // Arkadaş yok VEYA "arkadaş listesi" gizliliği kapalı — Steam ikisinde de
    // boş dönüyor, ayırt edemiyoruz. Metin her iki ihtimali de anlatıyor.
    body = (
      <EmptyState
        icon="people-outline"
        title={t('sf.empty')}
        text={t('sf.emptyText')}
        actionLabel={t('sf.retry')}
        onAction={() => load()}
      />
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.title}>{t('sf.title')}</Text>
          {!!stats && (
            <Text style={styles.subtitle} numberOfLines={1}>
              <Text style={NUMERIC}>{stats.total}</Text>
              {` ${t('sf.friends')}`}
              {stats.private > 0 ? ` · ${stats.private} ${t('sf.hidden')}` : ''}
            </Text>
          )}
        </View>
      </View>

      {body || (
        <FlashList
          data={data.friends}
          keyExtractor={(f) => f.steamId}
          estimatedItemSize={78}
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          renderItem={({ item }) => (
            <FriendRow item={item} open={open === item.steamId} onToggle={() => toggle(item.steamId)} t={t} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FriendRow({ item, open, onToggle, t }) {
  const preset = getAvatarPreset(item.gamerisen?.avatar);
  const locked = item.private;

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && !locked && PRESSED]}
        onPress={locked ? undefined : onToggle}
        disabled={locked}
      >
        {/* Steam avatarı bir URL; Gamerisen ön ayarı ise ikon. İkisi farklı
            kaynak, o yüzden ayrı çiziliyor. */}
        {item.avatar
          ? <Image source={item.avatar} style={styles.avatar} contentFit="cover" transition={120} />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
            </View>}

        <View style={styles.rowMid}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, locked && styles.dim]} numberOfLines={1}>{item.name}</Text>
            {!!item.gamerisen && (
              <View style={styles.grChip}>
                {preset
                  ? <Ionicons name={preset.icon} size={10} color={preset.iconColor} />
                  : <Ionicons name="checkmark-circle" size={10} color={colors.green} />}
                <Text style={styles.grChipText}>Gamerisen</Text>
              </View>
            )}
          </View>

          {locked ? (
            <Text style={styles.metaDim}>{t('sf.rowPrivate')}</Text>
          ) : (
            <Text style={styles.meta}>
              <Text style={[styles.metaStrong, NUMERIC]}>{item.coop}</Text>
              {` ${t('sf.together')} · `}
              <Text style={NUMERIC}>{item.shared}</Text>
              {` ${t('sf.shared')}`}
            </Text>
          )}
        </View>

        {!locked && (
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.text3}
          />
        )}
      </Pressable>

      {open && !!item.top?.length && (
        <View style={styles.games}>
          {item.top.map((g) => (
            <View key={g.appid} style={styles.game}>
              <Ionicons
                name={g.coop ? 'people' : g.together ? 'flash' : 'person'}
                size={13}
                color={g.coop ? colors.green : g.together ? colors.steam : colors.text3}
              />
              <Text style={styles.gameName} numberOfLines={1}>{g.name}</Text>
              <Text style={[styles.gameHours, NUMERIC]}>{Math.round(g.totalHours)}s</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.text3, fontSize: type.footnote },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  // 44×44 — HIG dokunma hedefi alt sınırı
  iconBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  headerMid: { flex: 1 },
  title:     { color: colors.text, fontSize: type.title3, fontWeight: '800', letterSpacing: -0.4 },
  subtitle:  { color: colors.text3, fontSize: type.caption, marginTop: 1 },


  card: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },

  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgInput },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.text2, fontSize: type.subhead, fontWeight: '800' },

  rowMid:   { flex: 1, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name:     { color: colors.text, fontSize: type.subhead, fontWeight: '700', flexShrink: 1 },
  dim:      { color: colors.text3 },

  grChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill,
    backgroundColor: colors.bgInput,
  },
  grChipText: { color: colors.text2, fontSize: type.caption2, fontWeight: '700' },

  meta:       { color: colors.text3, fontSize: type.caption },
  metaStrong: { color: colors.green, fontWeight: '800' },
  metaDim:    { color: colors.text3, fontSize: type.caption, fontStyle: 'italic' },

  games: {
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2,
  },
  game:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  gameName:  { flex: 1, color: colors.text2, fontSize: type.footnote },
  gameHours: { color: colors.text3, fontSize: type.caption2 },
});
