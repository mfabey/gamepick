// ─────────────────────────────────────────────────────────────────────────────
// Oyuncu istatistikleri — haftalık rapor, "Spotify Wrapped" hissi.
//
// Tüm sayılar CİHAZDAKİ verilerden hesaplanır; sunucuya hiçbir şey gitmez.
// Tek ağ isteği, takip listesindeki indirimleri almak için yapılan TOPLU
// fiyat çağrısıdır (oyun başına ayrı istek değil).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useWishlist } from '../src/context/WishlistContext';
import { useCollections } from '../src/hooks/useCollections';
import { useLikedList } from '../src/hooks/useLiked';
import { useSeen } from '../src/hooks/useSeen';
import { useDismissed } from '../src/hooks/useDismissed';
import { weeklyReport } from '../src/services/stats';
import { fetchSteamPrices } from '../src/api/library';
import EmptyState from '../src/components/EmptyState';
import { NavBar } from '../src/components/ui/Navigation';
import { IconButton, ListGroup, ListRow, Txt } from '../src/components/ui/Primitives';
import { StatTile } from '../src/components/ui/Commerce';
import { component as K, control as C, layout, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useLanguage } from '../src/context/LanguageContext';
import ProfileGate from '../src/components/ProfileGate';
export default function StatsScreen() {
  const { t } = useLanguage();
  return (
    <ProfileGate title={t('stats.title')}>
      <StatsScreenContent />
    </ProfileGate>
  );
}

function StatsScreenContent() {
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { items } = useWishlist();

  // Bu hook'lar depo değişince yeniden render tetikler → rapor tazelenir
  const collections = useCollections();
  const liked = useLikedList();
  const seen = useSeen();
  const dismissed = useDismissed();

  const [prices, setPrices] = useState(null);

  // Takip listesindeki indirimler — TEK toplu istek
  useEffect(() => {
    const appids = items.map((g) => g.appid).filter(Boolean);
    if (appids.length === 0) { setPrices(null); return; }
    let alive = true;
    fetchSteamPrices(appids)
      .then((p) => { if (alive) setPrices(p || null); })
      .catch(() => { if (alive) setPrices(null); });
    return () => { alive = false; };
  }, [items]);

  const report = useMemo(
    () => weeklyReport({ prices, wishlistCount: items.length }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prices, items.length, collections, liked, seen, dismissed]
  );

  const onShare = useCallback(async () => {
    Haptics.selectionAsync();
    const lines = [
      `📊 ${t('stats.title')} — Gamerisen`,
      `🔍 ${report.discovered} ${t('stats.discovered')}`,
      `❤️ ${report.liked} ${t('stats.liked')}`,
    ];
    if (report.topGenre) lines.push(`🎮 ${t('stats.topGenre')}: ${report.topGenre}`);
    if (report.discount?.avgDiscount) lines.push(`🏷️ ${t('stats.avgDiscount')}: %${report.discount.avgDiscount}`);
    try { await Share.share({ message: lines.join('\n') }); } catch { /* iptal */ }
  }, [report, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={t('stats.title')}
        subtitle={t('stats.subtitle')}
        right={report.hasActivity ? <IconButton icon="share" label={t('stats.share')} onPress={onShare} /> : undefined}
      />

      {/* Swipe arşive alındı; boş durum artık oyun listesine yönlendiriyor —
          rapor için gereken sinyal oradan da toplanıyor.
          Yorum ÜÇLÜNÜN ÜSTÜNDE: ne öznitelik listesinin içine ne de üçlünün
          dalına konulabiliyor, ikisi de ifade bağlamı. */}
      {!report.hasActivity ? (
        <EmptyState
          icon="poll"
          title={t('stats.emptyTitle')}
          text={t('stats.emptyText')}
          actionLabel={t('stats.startBrowsing')}
          actionIcon="search"
          onAction={() => router.replace('/games')}
        />
      ) : (
        // G-23 düzeni: 20'lik telefon payı blokların ve ListGroup'un kendisinde,
        // ScrollView yalnız geniş ekran payı (`yan`) — Ayarlar'la aynı.
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan }]} showsVerticalScrollIndicator={false}>
          {/* Kahraman sayı — haftanın ana metriği. Oyun detayındaki inceleme
              özetinin büyük sayısıyla aynı ölçü (44/48). Kırmızı yok: 2.0'da
              marka kırmızısı logo, seçili sekme, kalp gibi yerlere ayrılmış. */}
          <View style={styles.ozet}>
            <View style={[styles.hero, { backgroundColor: colors.surface1 }]}>
              <Txt variant="scoreLarge" style={styles.num}>{report.discovered}</Txt>
              <Txt variant="cardTitle">{t('stats.discovered')}</Txt>
            </View>

            {/* İkili kutular — DS StatTile (84 pt, nötr ikon). */}
            <View style={styles.grid}>
              <StatTile icon="heart" value={String(report.liked)} label={t('stats.liked')} style={styles.tile} />
              <StatTile icon="x" value={String(report.passed)} label={t('stats.passed')} style={styles.tile} />
              <StatTile icon="bell" value={String(report.wishlistCount)} label={t('stats.wishlist')} style={styles.tile} />
              <StatTile icon="layers" value={String(report.collectedGames)} label={t('stats.collected')} style={styles.tile} />
            </View>
          </View>

          {/* En çok incelenen tür */}
          {report.topGenre ? (
            <ListGroup>
              <ListRow icon="star" title={t('stats.topGenre')} value={report.topGenre} />
            </ListGroup>
          ) : null}

          {/* Tür dağılımı — basit yatay çubuklar (svg gerekmiyor). Çubuk dili
              oyun detayındaki puan dağılımının (ReviewSummary): nötr iz, metin
              renginde dolgu, sayı sağda. Tek çocuk: grup ayraç çizmiyor. */}
          {report.genreBreakdown.length > 0 && (
            <ListGroup title={t('stats.genreTitle')}>
              <View style={styles.bars}>
                {report.genreBreakdown.map((g) => {
                  const max = report.genreBreakdown[0].count || 1;
                  return (
                    <View key={g.name} style={styles.barRow}>
                      <Txt variant="footnote" numberOfLines={1} style={[styles.barLabel, { color: colors.text2 }]}>{g.name}</Txt>
                      <View style={[styles.barTrack, { backgroundColor: colors.pillNeutralSoft }]}>
                        <View style={[styles.barFill, { width: `${Math.max(8, (g.count / max) * 100)}%`, backgroundColor: colors.text }]} />
                      </View>
                      <Txt variant="caption" style={[styles.barValue, styles.num, { color: colors.text3 }]}>{g.count}</Txt>
                    </View>
                  );
                })}
              </View>
            </ListGroup>
          )}

          {/* İndirim özeti — yalnızca veri varsa. Üç sayı üç satır: etiketler
              ("Takip listendeki ortalama indirim") StatTile'ın tek satırlık
              etiketine sığmıyor. İndirim yeşili yalnız değerde. */}
          {report.discount?.onSaleCount > 0 && (
            <ListGroup>
              <ListRow icon="tag" title={t('stats.avgDiscount')} trailing={<Txt variant="headline" style={[styles.num, { color: colors.green }]}>%{report.discount.avgDiscount}</Txt>} />
              <ListRow icon="flame" title={t('stats.bestDiscount')} value={`%${report.discount.bestDiscount}`} />
              <ListRow icon="bag" title={`${report.discount.onSaleCount} ${t('stats.onSale')}`} />
            </ListGroup>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Bloklar arası 28 — Ayarlar'la aynı.
  body: { paddingTop: space[8], gap: space[28] },
  num: { fontVariant: ['tabular-nums'] },

  // Kahraman + kutular TEK blok (aralık 8); bloklar arası 28.
  ozet: { marginHorizontal: layout.gutter, gap: space[8] },
  hero: {
    alignItems: 'center', paddingVertical: space[24],
    borderRadius: dsRadius.group, gap: space[4],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  // İki sütun: (genişlik − 8) / 2. flexBasis yüzde + flexGrow eski kartın kuralı.
  tile: { flexGrow: 1, flexBasis: '46%' },

  bars: { padding: C.listPadding, gap: space[8] },
  barRow: { height: K.stats.barRow, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  barLabel: { width: K.stats.barLabel },
  barTrack: { flex: 1, height: K.stats.bar, borderRadius: K.stats.bar / 2, overflow: 'hidden' },
  barFill: { height: K.stats.bar, borderRadius: K.stats.bar / 2 },
  barValue: { width: K.stats.barValue, textAlign: 'right' },
});
