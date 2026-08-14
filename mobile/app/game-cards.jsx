// ─────────────────────────────────────────────────────────────────────────────
// Oyun kartların — paylaşılabilir oyuncu istatistikleri.
//
// KARTLAR YERELDE ÇİZİLİYOR, paylaşılan PNG sunucuda üretiliyor. Neden ikisi
// birden: PNG 1200×630 yatay bir görsel, telefonda listeye hiç oturmuyor ve
// 20 kart ~1,4 MB indirme demek. Yerel çizim hızlı ve mobil ölçüye uygun;
// sunucu görseli yalnızca paylaşım anında devreye giriyor.
//
// SIRALAMA on üç ayrı özel kütüphaneden hesaplanıyor (sunucu tarafı) — bu
// ekranın Steam'in gösterebileceği hiçbir şeye benzemediği yer orası.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Share, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getGameCards, getCardUrl } from '../src/api/social';
import { resolveCity } from '../src/services/location';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { colors, radius, spacing, type, PRESSED, NUMERIC, TAB_SPACE } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function GameCardsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  // Oturum REAKTİF okunmalı — modül değişkeni başlangıçta null ve asenkron
  // doluyor. Tek seferlik okuma ekranı kalıcı "giriş yap" durumunda bırakır.
  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setData(await getGameCards(lang));
      setError(null);
    } catch (e) {
      setError(e?.code || 'UNKNOWN');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setLoading(false); return; }
    load();
  }, [session, load]);

  // Şehir etiketi — VARSAYILAN KAPALI, kullanıcı açıkça açıyor. Açıldığında
  // hemen çözülüyor ki paylaşmadan ÖNCE ne ekleneceğini görsün.
  const [city, setCity] = useState(null);
  const [cityBusy, setCityBusy] = useState(false);

  const toggleCity = useCallback(async () => {
    if (city) { setCity(null); return; }        // kapatmak izin gerektirmez
    setCityBusy(true);
    const r = await resolveCity();
    setCityBusy(false);
    if (r.ok) setCity(r.city);
    else Alert.alert(r.reason === 'DENIED' ? t('gc.locDenied') : t('gc.locFailed'));
  }, [city, t]);

  const share = useCallback(async (card) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      // Şehir seçiliyse adres YENİDEN imzalanmalı: önceden imzalanmış adres
      // boş şehirle üretildi ve imza tüm alanları kapsıyor.
      let url = card.shareUrl;
      if (city) {
        const r = await getCardUrl(card.appid, city, lang);
        url = r?.url || url;
      }
      if (!url) return;

      // iOS'ta `url` ayrı bir alan: paylaşım sayfası önizlemeyi ondan üretiyor.
      await Share.share({
        url,
        message: `${card.name} — ${Math.round(card.hours)}${t('gc.hoursShort')}`,
      });
    } catch {
      Alert.alert(t('gc.shareFailed'));
    }
  }, [t, city, lang]);

  // ── Kapılar ───────────────────────────────────────────────────────────────
  let body = null;

  if (!session) {
    body = <EmptyState icon="person-circle-outline" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>{t('gc.loading')}</Text>
      </View>
    );
  } else if (error === 'STEAM_REQUIRED') {
    body = <EmptyState icon="logo-steam" title={t('sf.noSteam')} text={t('sf.noSteamText')}
      actionLabel={t('sf.goProfile')} onAction={() => router.push('/(tabs)/profile')} />;
  } else if (error === 'SELF_PRIVATE') {
    body = <EmptyState icon="lock-closed-outline" title={t('sf.selfPrivate')} text={t('sf.selfPrivateText')} />;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('sf.error')} text={t('sf.errorText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  } else if (!data?.cards?.length) {
    body = <EmptyState icon="game-controller-outline" title={t('gc.empty')} text={t('gc.emptyText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('gc.title')}</Text>
      </View>

      {body || (
        <FlashList
          data={data.cards}
          keyExtractor={(c) => String(c.appid)}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          ListHeaderComponent={
            <Summary s={data.summary} t={t} city={city} busy={cityBusy} onToggleCity={toggleCity} />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          renderItem={({ item, index }) => (
            <CardRow card={item} place={index + 1} onShare={() => share(item)} t={t} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Summary({ s, t, city, busy, onToggleCity }) {
  if (!s) return null;
  return (
    <View>
      <View style={styles.hero}>
        <Text style={[styles.heroNum, NUMERIC]}>{s.totalHours.toLocaleString()}</Text>
        <Text style={styles.heroLabel}>{t('gc.totalHours')}</Text>

        <View style={styles.heroRow}>
          <Cell n={s.games} label={t('gc.games')} />
          {/* "Alıp oynamadıkların" — kütüphane sahiplerinin en çok konuştuğu sayı */}
          <Cell n={s.untouched} label={t('gc.untouched')} tint={colors.mid} />
          <Cell n={s.friends} label={t('gc.friends')} tint={colors.steam} />
        </View>
      </View>

      {/* Şehir etiketi. Çözülen şehir BURADA GÖRÜNÜYOR — kullanıcı paylaşmadan
          önce karta tam olarak neyin ekleneceğini görmeli. Koordinat hiçbir
          zaman gönderilmiyor, çözümleme cihazda yapılıyor. */}
      <Pressable
        style={({ pressed }) => [styles.locRow, pressed && PRESSED]}
        onPress={onToggleCity}
        disabled={busy}
      >
        <Ionicons
          name={city ? 'location' : 'location-outline'}
          size={18}
          color={city ? colors.green : colors.text3}
        />
        <View style={styles.locMid}>
          <Text style={styles.locLabel}>{t('gc.addCity')}</Text>
          <Text style={styles.locHint} numberOfLines={1}>
            {busy ? t('gc.locResolving') : (city || t('gc.locOff'))}
          </Text>
        </View>
        <View style={[styles.switch, city && styles.switchOn]}>
          <View style={[styles.knob, city && styles.knobOn]} />
        </View>
      </Pressable>
    </View>
  );
}

function Cell({ n, label, tint }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellNum, NUMERIC, tint && { color: tint }]}>{n}</Text>
      <Text style={styles.cellLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function CardRow({ card, place, onShare, t }) {
  const hasRank = Number.isFinite(card.rank) && card.owners > 1;
  return (
    <View style={styles.row}>
      <Text style={[styles.place, NUMERIC]}>{place}</Text>

      <View style={styles.rowMid}>
        <Text style={styles.name} numberOfLines={1}>{card.name}</Text>
        <View style={styles.metaLine}>
          <Text style={[styles.hours, NUMERIC]}>
            {Math.round(card.hours).toLocaleString()}{t('gc.hoursShort')}
          </Text>
          {hasRank && (
            <View style={styles.rankChip}>
              <Text style={[styles.rankText, NUMERIC]}>{card.rank}/{card.owners}</Text>
              <Text style={styles.rankLabel}>{t('gc.among')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* shareUrl yoksa (sunucuda CARD_SECRET tanımsız) düğme HİÇ görünmüyor —
          bozuk bir bağlantıyla kullanıcıyı 403 sayfasına göndermektense yok. */}
      {!!card.shareUrl && (
        <Pressable style={({ pressed }) => [styles.shareBtn, pressed && PRESSED]}
                   onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11y.share')}>
          <Ionicons name="share-outline" size={19} color={colors.text2} />
        </Pressable>
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
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title:   { flex: 1, color: colors.text, fontSize: type.title3, fontWeight: '800', letterSpacing: -0.4 },


  hero: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  heroNum:   { color: colors.text, fontSize: type.hero, fontWeight: '900', letterSpacing: -1.5 },
  heroLabel: { color: colors.text3, fontSize: type.footnote, marginTop: -2 },
  heroRow:   { flexDirection: 'row', marginTop: spacing.lg },

  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  locMid:   { flex: 1, gap: 1 },
  locLabel: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  locHint:  { color: colors.text3, fontSize: type.caption2 },

  switch: {
    width: 44, height: 26, borderRadius: 13, padding: 3,
    backgroundColor: colors.bgInput, justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.green },
  knob:     { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.text3 },
  // tema-bagimsiz: acik anahtarin zemini colors.green; topuz ona gore beyaz
  knobOn:   { backgroundColor: '#fff', alignSelf: 'flex-end' },

  cell:      { flex: 1 },
  cellNum:   { color: colors.text, fontSize: type.title3, fontWeight: '800' },
  cellLabel: { color: colors.text3, fontSize: type.caption, marginTop: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  place:  { width: 22, color: colors.text3, fontSize: type.footnote, fontWeight: '800' },
  rowMid: { flex: 1, gap: 3 },
  name:   { color: colors.text, fontSize: type.subhead, fontWeight: '700' },

  metaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hours:    { color: colors.text2, fontSize: type.caption, fontWeight: '700' },

  rankChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill,
    backgroundColor: colors.bgInput,
  },
  rankText:  { color: colors.green, fontSize: type.caption2, fontWeight: '800' },
  rankLabel: { color: colors.text3, fontSize: type.caption2 },

  // 44×44 — HIG dokunma hedefi alt sınırı
  shareBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
