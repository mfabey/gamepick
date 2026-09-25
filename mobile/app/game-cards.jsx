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
import { useState, useEffect, useCallback, memo } from 'react';
import {
  View, StyleSheet, ActivityIndicator, RefreshControl, Share, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { getGameCards, getCardUrl } from '../src/api/social';
import { resolveCity } from '../src/services/location';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { NavBar } from '../src/components/ui/Navigation';
import { IconButton, ListGroup, ListRow, Switch, Txt } from '../src/components/ui/Primitives';
import { spacing } from '../src/theme';
import { component as K, control as C, layout, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useLanguage } from '../src/context/LanguageContext';

// Modul duzeyinde: satir ici verilseydi her render'da yeni kimlik olurdu.
const anahtar = (c) => String(c.appid);

export default function GameCardsScreen() {
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { t, lang, locale } = useLanguage();

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
  // `onShare={() => share(item)}` her render'da her satir icin yeni bir
  // closure uretiyordu. `share` zaten karti arguman aliyor.
  const satirCiz = useCallback(
    ({ item, index }) => <CardRow card={item} place={index + 1} onShare={share} t={t} locale={locale} />,
    [share, t, locale],
  );

  let body = null;

  if (!session) {
    body = <EmptyState icon="userplus" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text2} />
        <Txt variant="footnote" style={{ color: colors.text3 }}>{t('gc.loading')}</Txt>
      </View>
    );
  } else if (error === 'STEAM_REQUIRED') {
    body = <EmptyState icon="link" title={t('sf.noSteam')} text={t('sf.noSteamText')}
      actionLabel={t('sf.goProfile')} onAction={() => router.push('/(tabs)/profile')} />;
  } else if (error === 'SELF_PRIVATE') {
    body = <EmptyState icon="lock" title={t('sf.selfPrivate')} text={t('sf.selfPrivateText')} />;
  } else if (error) {
    body = <EmptyState icon="wifioff" title={t('sf.error')} text={t('sf.errorText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  } else if (!data?.cards?.length) {
    body = <EmptyState icon="pad" title={t('gc.empty')} text={t('gc.emptyText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('gc.title')} />

      {body || (
        <FlashList
          data={data.cards}
          keyExtractor={anahtar}
          // Alt dolgu `TAB_SPACE` DEĞİL: bu ekranda sekme çubuğu yok (plan
          // §4.1'in işaret ettiği dört ekrandan biri). Güvenli alan + 40.
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.s40, paddingHorizontal: yan }}
          ListHeaderComponent={
            <Summary s={data.summary} t={t} locale={locale} city={city} busy={cityBusy} onToggleCity={toggleCity} />
          }
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

function Summary({ s, t, locale, city, busy, onToggleCity }) {
  const { colors } = useDesignTheme();
  if (!s) return null;
  return (
    <View style={styles.summary}>
      {/* Büyük sayı istatistik ekranıyla aynı dil: surface1 kart, 44/48. */}
      <View style={[styles.hero, { backgroundColor: colors.surface1 }]}>
        <Txt variant="scoreLarge" style={styles.num}>{s.totalHours.toLocaleString(locale)}</Txt>
        <Txt variant="footnote" style={{ color: colors.text3 }}>{t('gc.totalHours')}</Txt>

        <View style={styles.heroRow}>
          <Cell n={s.games} label={t('gc.games')} />
          {/* "Alıp oynamadıkların" — kütüphane sahiplerinin en çok konuştuğu sayı */}
          <Cell n={s.untouched} label={t('gc.untouched')} tint={colors.orange} />
          <Cell n={s.friends} label={t('gc.friends')} />
        </View>
      </View>

      {/* Şehir etiketi. Çözülen şehir BURADA GÖRÜNÜYOR — kullanıcı paylaşmadan
          önce karta tam olarak neyin ekleneceğini görmeli. Koordinat hiçbir
          zaman gönderilmiyor, çözümleme cihazda yapılıyor.
          Eskiden elle çizilmiş bir anahtar taklidiydi (erişilebilirlikte
          "düğme" okunuyordu, durum yoktu); artık 2.0 Switch. */}
      <View style={styles.cityGroup}>
        <ListGroup>
          <ListRow
            icon="pin"
            title={t('gc.addCity')}
            description={busy ? t('gc.locResolving') : (city || t('gc.locOff'))}
            trailing={<Switch accessibilityLabel={t('gc.addCity')} value={!!city} onValueChange={onToggleCity} disabled={busy} />}
          />
        </ListGroup>
      </View>
    </View>
  );
}

function Cell({ n, label, tint }) {
  const { colors } = useDesignTheme();
  return (
    <View style={styles.cell}>
      <Txt variant="statValue" style={[styles.num, tint && { color: tint }]}>{n}</Txt>
      <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>{label}</Txt>
    </View>
  );
}

const CardRow = memo(function CardRow({ card, place, onShare, t, locale }) {
  const { colors } = useDesignTheme();
  const hasRank = Number.isFinite(card.rank) && card.owners > 1;
  // Ebeveyn kararli `share`i veriyor, satir kendi kartini ekliyor.
  const paylas = useCallback(() => onShare?.(card), [onShare, card]);
  return (
    <View style={[styles.row, { backgroundColor: colors.surface1 }]}>
      <Txt variant="footnoteStrong" style={[styles.place, styles.num, { color: colors.text3 }]}>{place}</Txt>

      <View style={styles.rowMid}>
        <Txt variant="cardTitle" numberOfLines={1}>{card.name}</Txt>
        <View style={styles.metaLine}>
          <Txt variant="captionStrong" style={[styles.num, { color: colors.text2 }]}>
            {Math.round(card.hours).toLocaleString(locale)}{t('gc.hoursShort')}
          </Txt>
          {hasRank && (
            <View style={[styles.rankChip, { backgroundColor: colors.pillNeutralSoft }]}>
              <Txt variant="badge" style={[styles.num, { color: colors.green }]}>{card.rank}/{card.owners}</Txt>
              <Txt variant="caption2" style={{ color: colors.text3 }}>{t('gc.among')}</Txt>
            </View>
          )}
        </View>
      </View>

      {/* shareUrl yoksa (sunucuda CARD_SECRET tanımsız) düğme HİÇ görünmüyor —
          bozuk bir bağlantıyla kullanıcıyı 403 sayfasına göndermektense yok. */}
      {!!card.shareUrl && (
        <IconButton icon="share" label={t('a11y.share')} onPress={paylas} color={colors.text2} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[12] },
  num:    { fontVariant: ['tabular-nums'] },

  // Kartlar 20'lik sayfa payında (ListGroup'un kendi payıyla aynı hiza).
  summary: { paddingTop: space[8], paddingBottom: space[12] },
  hero: {
    marginHorizontal: layout.gutter, padding: space[16], borderRadius: dsRadius.group,
  },
  heroRow: { flexDirection: 'row', marginTop: space[16] },
  cell: { flex: 1 },
  cityGroup: { marginTop: space[12] },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: space[12],
    marginHorizontal: layout.gutter, marginBottom: space[8],
    minHeight: K.gameCards.row, paddingLeft: C.listPadding, paddingRight: space[4],
    borderRadius: dsRadius.button,
  },
  place:  { width: K.gameCards.place },
  rowMid: { flex: 1, minWidth: 0, gap: space[2] },

  metaLine: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  rankChip: {
    flexDirection: 'row', alignItems: 'center', gap: K.badgeSmall.gap,
    height: K.badgeSmall.height, paddingHorizontal: K.badgeSmall.paddingH, borderRadius: K.badgeSmall.radius,
  },
});
