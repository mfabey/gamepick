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
//
// 2.0 (tasarım dışı ekran): NavBar (alt başlıkta sayılar), surface1 kartlar,
// UserAvatar (Steam avatarı bir URL; Avatar onu fotoğraf olarak çiziyor),
// 2.0 ikonlar. Liste alt dolgusu TAB_SPACE değil güvenli alan: bu ekranda
// sekme çubuğu yok (plan §4.1).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, memo } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getSteamFriends } from '../src/api/social';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { Txt } from '../src/components/ui/Primitives';
import { UserAvatar } from '../src/components/ui/Social';
import { getAvatarPreset } from '../src/utils/avatar';
import { spacing } from '../src/theme';
import { component as K, radius as dsRadius } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';

const S = K.steamFriends;

// Modul duzeyinde: satir ici verilseydi her render'da yeni kimlik olurdu.
const anahtar = (f) => f.steamId;

export default function SteamFriendsScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  const insets = useSafeAreaInsets();
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
  // `onToggle={() => toggle(item.steamId)}` her render'da her satir icin yeni
  // bir closure uretiyordu. `toggle` zaten kimligi arguman aliyor; satir onu
  // kendisi ekliyor, sarmalayici gereksizdi.
  const satirCiz = useCallback(
    ({ item }) => <FriendRow item={item} open={open === item.steamId} onToggle={toggle} t={t} />,
    [open, toggle, t],
  );

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
        <ActivityIndicator color={colors.text2} />
        <Txt variant="footnote" style={{ color: colors.text3 }}>{t('sf.loading')}</Txt>
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={t('sf.title')}
        subtitle={stats
          ? `${stats.total} ${t('sf.friends')}${stats.private > 0 ? ` · ${stats.private} ${t('sf.hidden')}` : ''}`
          : undefined}
      />

      {body || (
        <FlashList
          data={data.friends}
          keyExtractor={anahtar}
          contentContainerStyle={{ paddingTop: spacing.s8, paddingBottom: insets.bottom + spacing.s40, paddingHorizontal: yan }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          renderItem={satirCiz}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const FriendRow = memo(function FriendRow({ item, open, onToggle, t }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const preset = getAvatarPreset(item.gamerisen?.avatar);
  const locked = item.private;
  // Ebeveyn kararli `toggle`i veriyor, satir kendi kimligini ekliyor.
  const ac = useCallback(() => onToggle?.(item.steamId), [onToggle, item.steamId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && !locked && styles.pressed]}
        onPress={locked ? undefined : ac}
        disabled={locked}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!open, disabled: !!locked }}
        accessibilityLabel={item.name}
      >
        {/* Steam avatarı bir URL; Avatar onu fotoğraf olarak çiziyor, yoksa
            baş harfe düşüyor (eskiden burada elle yazılmış bir kopyası vardı). */}
        <UserAvatar avatar={item.avatar || null} name={item.name} size={K.userRow.avatar} />

        <View style={styles.rowMid}>
          <View style={styles.nameLine}>
            <Txt variant="cardTitle" numberOfLines={1} style={[styles.shrink, locked && { color: colors.text3 }]}>{item.name}</Txt>
            {!!item.gamerisen && (
              <View style={[styles.grChip, { backgroundColor: colors.surface2 }]}>
                {/* Ön ayar ikonu VERİ (utils/avatar → Ionicons adı): 2.0 ikon
                    setinde karşılığı yok, o yüzden Ionicons burada kalıyor. */}
                {preset
                  ? <Ionicons name={preset.icon} size={S.chipIcon} color={preset.iconColor} />
                  : <Icon name="checkc" size={S.chipIcon} color={colors.green} strokeWidth={2.4} />}
                <Txt variant="caption2Strong" style={{ color: colors.text2 }}>Gamerisen</Txt>
              </View>
            )}
          </View>

          {locked ? (
            <Txt variant="footnote" style={[styles.italic, { color: colors.text3 }]}>{t('sf.rowPrivate')}</Txt>
          ) : (
            <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>
              <Txt variant="footnote" style={[styles.num, styles.strong, { color: colors.green }]}>{item.coop}</Txt>
              {` ${t('sf.together')} · `}
              <Txt variant="footnote" style={[styles.num, { color: colors.text2 }]}>{item.shared}</Txt>
              {` ${t('sf.shared')}`}
            </Txt>
          )}
        </View>

        {!locked && (
          <View style={open ? styles.flip : null}>
            <Icon name="chevd" size={S.chevron} color={colors.text3} strokeWidth={2.4} />
          </View>
        )}
      </Pressable>

      {open && !!item.top?.length && (
        <View style={[styles.games, { borderTopColor: colors.line }]}>
          {item.top.map((g) => (
            <View key={g.appid} style={styles.game}>
              <Icon
                name={g.coop ? 'users' : g.together ? 'zap' : 'pad'}
                size={S.gameIcon}
                color={g.coop ? colors.green : g.together ? colors.text : colors.text3}
                strokeWidth={2.2}
              />
              <Txt variant="footnote" numberOfLines={1} style={[styles.flex, { color: colors.text2 }]}>{g.name}</Txt>
              {/* "46 sa" — kütüphane kutucuğuyla aynı birim (home.hoursShort). */}
              <Txt variant="caption" style={[styles.num, { color: colors.text3 }]}>{`${Math.round(g.totalHours)} ${t('home.hoursShort')}`}</Txt>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const makeStyles = () => StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.s12 },

  card: {
    marginHorizontal: spacing.s20, marginBottom: spacing.s8,
    borderRadius: dsRadius.card, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s12, padding: spacing.s12 },
  pressed: { opacity: 0.85 },

  rowMid:   { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  shrink:   { flexShrink: 1 },
  flex:     { flex: 1, minWidth: 0 },
  italic:   { fontStyle: 'italic' },
  strong:   { fontWeight: '700' },
  num:      { fontVariant: ['tabular-nums'] },
  // Açıkken ok yukarı: aynı ikonun ters çevrilmişi (sette ayrı "yukarı ok" yok).
  flip:     { transform: [{ rotate: '180deg' }] },

  grChip: {
    flexDirection: 'row', alignItems: 'center', gap: S.chipGap,
    height: S.chip, paddingHorizontal: spacing.s8, borderRadius: dsRadius.pill,
  },

  games: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.s8, paddingHorizontal: spacing.s12,
  },
  game: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8, height: S.gameRow },
});
