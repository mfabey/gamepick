// ─────────────────────────────────────────────────────────────────────────────
// Haberler.
//
// ARTIK BİR SEKME DEĞİL, yığın ekranı. Alt navigasyondaki yerini Mesajlar
// aldı; buraya anasayfanın sağ üstündeki gazete simgesinden geliniyor.
//
// Sebep: alt navigasyon uygulamanın kendini nasıl tanıttığı yer. Orada
// "Haberler" yazması, uygulamayı bir haber okuyucusu gibi gösteriyordu —
// oysa haberler tamamlayıcı bir bölüm, ana iş değil.
// ─────────────────────────────────────────────────────────────────────────────
import { memo, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ShareToFriendSheet from '../src/components/ShareToFriendSheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { fetchNews } from '../src/api/news';
import { NewsListSkeleton, Reveal } from '../src/components/Skeleton';
import NewsImage from '../src/components/NewsImage';
import EmptyState from '../src/components/EmptyState';
import { radius, spacing, PRESSED, type, CHIP, CHIP_TEXT } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { bagilZaman } from '../src/utils/relativeTime';
import { useQuery } from '../src/hooks/useQuery';

export default function NewsScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Başlık listenin DIŞINDA ve sabit: sönümleme bandı onun altına, listenin
  // gerçek üst kenarına oturmalı. Üstüne binerse başlığı karartır.
  // Yükseklik ölçülüyor, sabit yazılmıyor — yazı tipi boyutu ve dil değiştikçe
  // değişiyor (games.jsx'te aynı gerekçe).
  const [cat, setCat] = useState('all');

  // Cache-first: yeniden açılışta anında; arka planda tazelenir
  const { data, loading, error, refetch } = useQuery(
    `news:${lang}`,
    () => fetchNews(lang),
    { ttl: 10 * 60 * 1000 }
  );
  const items = useMemo(() => data?.results || [], [data]);

  const cats = useMemo(() => {
    const set = [];
    items.forEach(n => { if (n.cat && !set.includes(n.cat)) set.push(n.cat); });
    return ['all', ...set];
  }, [items]);

  const featured = items[0] || null;
  const filtered = useMemo(() => {
    const rest = cat === 'all' ? items.slice(1) : items.filter(n => n.cat === cat);
    return rest;
  }, [items, cat]);

  const open = useCallback((url) => { if (url) WebBrowser.openBrowserAsync(url); }, []);

  // HABER PAYLAŞIMI — uzun basma. Oyun kartındaki menüden farklı olarak
  // burada TEK eylem var (elenecek bir öneri yok), o yüzden menü değil
  // doğrudan gönderme sayfası açılıyor.
  const [paylas, setPaylas] = useState(null);   // { url, title }
  const keyExtractor = useCallback((item) => item.id, []);
  const renderNews = useCallback(
    ({ item }) => <NewsRow item={item} onPress={open} onShare={(n) => setPaylas({ url: n.url, title: n.title })} />,
    [open]
  );

  // Geri düğmesi ÜÇ DALDA DA gerekiyor (yükleniyor / hata / liste). Ayrı bir
  // bileşen olmasının sebebi bu: üç kez elle yazılsaydı biri unutulur ve o
  // durumda ekranda mahsur kalınırdı.
  const head = (onLayout) => (
    <View style={styles.header} onLayout={onLayout}>
      <Pressable style={({ pressed }) => [styles.backBtn, pressed && PRESSED]}
                 onPress={() => router.back()} hitSlop={10}
                 accessibilityRole="button" accessibilityLabel={t('common.back')}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerText}>{t('news.title')}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {head()}
        <NewsListSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {head()}
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.text3} />
          <Pressable style={({ pressed }) => [styles.retryBtn, pressed && PRESSED]} onPress={refetch}><Text style={styles.retryText}>{t('common.retry')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {head()}
      <Reveal style={{ flex: 1 }}>
      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderNews}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Öne çıkan */}
            {cat === 'all' && featured && (
              <Pressable
                style={({ pressed }) => [styles.featured, pressed && PRESSED]}
                onPress={() => open(featured.url)}
              >
                <NewsImage item={featured} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(6,7,9,0.55)', 'rgba(6,7,9,0.97)']} locations={[0.2, 0.6, 1]} style={StyleSheet.absoluteFill} />
                <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>★ {t('news.featured')}</Text></View>

                {/* "ÖNE ÇIKAN" rozeti SOL üstte; gönderme SAĞ üstte —
                    çakışmıyorlar. Kart ailesindeki 26pt sessiz daireyle
                    aynı dil (bkz. GameCard). */}
                <Pressable
                  onPress={() => setPaylas({ url: featured.url, title: featured.title })}
                  hitSlop={9}
                  accessibilityRole="button"
                  accessibilityLabel={t('share.toFriend')}
                  style={({ pressed }) => [styles.featuredGonder, pressed && PRESSED]}
                >
                  <Ionicons name="paper-plane" size={14} color="#fff" />
                </Pressable>
                <View style={styles.featuredInfo}>
                  <View style={styles.catRow}>
                    <View style={styles.catPill}><Text style={styles.catPillText}>{featured.cat}</Text></View>
                    <Text style={styles.metaText}>{featured.source} · {bagilZaman(featured.ts, t) || featured.date}</Text>
                  </View>
                  <Text numberOfLines={3} style={styles.featuredTitle}>{featured.title}</Text>
                </View>
              </Pressable>
            )}

            {/* Kategori çipleri */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {cats.map(c => {
                const active = cat === c;
                const label = c === 'all' ? t('news.all') : c;
                return (
                  <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          // Çıkış: boş kalan şey SEÇİLİ kategori, o yüzden düğme "Tümü"ne
          // döndürüyor. Tümü zaten seçiliyken çıkış yok — gösterilecek haber
          // gerçekten yoktur ve sahte bir düğme koymak yanıltıcı olurdu.
          <EmptyState
            compact
            icon="newspaper-outline"
            title={t('news.empty')}
            text={t('news.emptyDesc')}
            actionLabel={cat !== 'all' ? t('news.showAll') : undefined}
            onAction={cat !== 'all' ? () => setCat('all') : undefined}
          />
        }
      />
      </Reveal>
    
      <ShareToFriendSheet
        visible={!!paylas}
        onClose={() => setPaylas(null)}
        newsUrl={paylas?.url}
        gameName={paylas?.title}
      />
    </SafeAreaView>
  );
}

const NewsRow = memo(function NewsRow({ item, onPress, onShare }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && PRESSED]}
      onPress={() => onPress(item.url)}
    >
      <View style={styles.thumb}>
        <NewsImage item={item} style={StyleSheet.absoluteFill} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.catRow}>
          <View style={styles.catPillSm}><Text style={styles.catPillTextSm}>{item.cat}</Text></View>
        </View>
        <Text numberOfLines={3} style={styles.rowTitle}>{item.title}</Text>
        {/* TAZELİK, okuma süresi değil. Eskiden `item.read` yazıyordu ve
            34 haberin 34'ü "1 dk" diyordu — RSS özeti okuma süresini
            ölçmeye yetmiyor. Bir haftadan eskisinde bağıl ifade bilgi
            taşımadığı için mutlak tarihe dönülüyor. */}
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.source} · {bagilZaman(item.ts, t) || item.date}
        </Text>
      </View>

      {/* GÖRÜNÜR GÖNDERME DÜĞMESİ. Uzun basmaya bağlıydı — keşfedilemiyordu
          ve haberin tek eylemi (aç) ile aynı jeste yükleniyordu.
          hitSlop 10 → 44pt gerçek hedef; çizilen ikon 20pt. */}
      <Pressable
        onPress={() => onShare?.(item)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('share.toFriend')}
        style={({ pressed }) => [styles.gonder, pressed && PRESSED]}
      >
        <Ionicons name="paper-plane-outline" size={19} color={colors.text3} />
      </Pressable>
    </Pressable>
  );
});

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // Başlık artık bir satır: geri düğmesi + metin. Sol dolgu, düğmenin negatif
  // kenar boşluğuyla dengeleniyor ki metin diğer ekranlarla AYNI hizada
  // başlasın — düğme kadar sağa kaymasın.
  header: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  headerText: { fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },

  featured: { marginHorizontal: spacing.lg, height: 210, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card, marginBottom: spacing.xs },
  featuredBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.accentFillStrong, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: spacing.xs },
  featuredBadgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800', letterSpacing: 0.5 },
  featuredInfo: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  featuredTitle: { color: '#fff', fontSize: type.body, fontWeight: '800', lineHeight: 22, marginTop: spacing.sm },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catPill: { backgroundColor: colors.bgInput, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  // Kategori SABİT bir etiket, eylem değil. Kırmızıyken her haber satırında
  // tekrarlıyor ve ekrandaki vurgu sayısını tek başına dörde katlıyordu —
  // üstelik listedeki tüm satırlar aynı kategoriyi taşıdığında hiçbir şey
  // ayırt etmiyor. Rolü zaten büyük harf + harf aralığı + 800 ağırlık
  // anlatıyor; renge ihtiyaç yok.
  catPillText: { color: colors.text2, fontSize: type.caption, fontWeight: '600' },
  metaText: { color: 'rgba(255,255,255,0.7)', fontSize: type.caption, fontWeight: '500' },

  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 14 },
  // Maketten: hap, dolgu 8/12, surface3, KENARLIK YOK, metin 13/400.
  chip: { ...CHIP, backgroundColor: colors.bgInput },
  // games.jsx ile ayni secim dili: dolu notr yuzey, koyu metin, agirlik.
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipTextActive: { color: colors.bg, fontWeight: '700' },
  chipText: { fontSize: type.footnote, color: colors.text2, fontWeight: '500' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  gonder: { width: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  featuredGonder: {
    position: 'absolute', top: 12, right: 12,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    // tema-bagimsiz: haber kapaginin ustunde duruyor, zemin gorsel
    backgroundColor: 'rgba(8,10,14,0.6)',
  },
  thumb: { width: 108, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  catPillSm: { alignSelf: 'flex-start', backgroundColor: colors.bgInput, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  catPillTextSm: { color: colors.text2, fontSize: type.caption2, fontWeight: '600' },
  rowTitle: { color: colors.text, fontSize: type.subhead, fontWeight: '700', lineHeight: 18 },
  rowMeta: { color: colors.text3, fontSize: type.caption, marginTop: 5, fontWeight: '500' },

  retryBtn: { backgroundColor: colors.accentFillStrong, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 11 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: type.subhead },
});
