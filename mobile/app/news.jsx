// ─────────────────────────────────────────────────────────────────────────────
// Haberler — G-16 (kit s3.py news()).
//
// ARTIK BİR SEKME DEĞİL, yığın ekranı. Alt navigasyondaki yerini Mesajlar
// aldı; buraya anasayfanın sağ üstündeki gazete simgesinden geliniyor.
//
// Sebep: alt navigasyon uygulamanın kendini nasıl tanıttığı yer. Orada
// "Haberler" yazması, uygulamayı bir haber okuyucusu gibi gösteriyordu —
// oysa haberler tamamlayıcı bir bölüm, ana iş değil.
//
// ── ÜÇ KADEME (kit) ──
// En üstteki haber LEAD (350×220 görsel, 22/28 başlık, özet), sonraki ikisi
// iki sütunlu ORTA kart, gerisi 72 pt SATIR. Hiyerarşi tarihten geliyor:
// liste zaten yeniden eskiye sıralı.
//
// ── KİTTE OLUP ÇİZİLMEYENLER ──
//   · "Son dakika" rozeti: RSS'te böyle bir bayrak yok. Tazelik zamandan
//     okunuyor (bir saatten yeni haber kırmızı "canlı" zamanla).
//   · Başlıktaki ARAMA ve KAYDET düğmeleri: haber araması ve kaydedilen
//     haber diye bir şey yok.
//   · "Canlı akış" göstergesi: canlı yayın yok.
//   · Kitin sabit kategorileri (PC · PlayStation · Xbox…): bizim
//     kategorilerimiz akıştan çıkıyor (İndirimler · İncelemeler …) ve
//     gerçek olan bu.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import ShareToFriendSheet from '../src/components/ShareToFriendSheet';
import { fetchNews } from '../src/api/news';
import { NewsListSkeleton, Reveal } from '../src/components/Skeleton';
import EmptyState from '../src/components/EmptyState';
import CevrimdisiBant from '../src/components/CevrimdisiBant';
import { Chip, CoverImage, IconButton, PressableScale, SectionHeader, Txt } from '../src/components/ui/Primitives';
import { NewsFeature, NewsRow } from '../src/components/ui/Media';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { component as K, layout, space } from '../src/theme/tokens';
import { useLanguage } from '../src/context/LanguageContext';
import { bagilZaman } from '../src/utils/relativeTime';
import { useQuery } from '../src/hooks/useQuery';

/** Bir saatten yeni haber "canlı" zamanla yazılıyor (kit fresh()). */
const TAZE = 60 * 60 * 1000;

/** Orta kart: iki sütun, kit news() med. */
const ORTA = K.newsMedium;

/**
 * Gün grubunun etiketi: "Bugün" · "Dün" · tarih.
 *
 * "Bugün/Dün" anahtarları sohbet ekranından paylaşılıyor — ikisi de aynı iki
 * kelimeyi yazıyor ve beş dilde ikinci bir çeviri açmanın anlamı yok.
 */
function gunAdi(ts, t) {
  const d = new Date(ts);
  const simdi = new Date();
  if (d.toDateString() === simdi.toDateString()) return t('msg.today');
  const dun = new Date(simdi);
  dun.setDate(simdi.getDate() - 1);
  if (d.toDateString() === dun.toDateString()) return t('msg.yesterdayCap');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export default function NewsScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState('all');

  // Cache-first: yeniden açılışta anında; arka planda tazelenir
  const { data, loading, error, ts, refetch } = useQuery(
    `news:v2:${lang}`,
    () => fetchNews(lang),
    { ttl: 10 * 60 * 1000 }
  );
  const items = useMemo(() => data?.results || [], [data]);

  const cats = useMemo(() => {
    const set = [];
    items.forEach(n => { if (n.cat && !set.includes(n.cat)) set.push(n.cat); });
    return ['all', ...set];
  }, [items]);

  // Üç kademe YALNIZ "Tümü"nde: bir kategori seçiliyken liste zaten kısa ve
  // hiyerarşi kurmak için yeterli haber olmayabilir.
  const hepsi = cat === 'all';
  const secili = useMemo(() => (hepsi ? items : items.filter(n => n.cat === cat)), [items, cat, hepsi]);
  const lead = hepsi ? secili[0] || null : null;
  const orta = hepsi ? secili.slice(1, 3) : [];
  const liste = hepsi ? secili.slice(3) : secili;

  const open = useCallback((item) => router.push({ pathname: '/news/[id]', params: { id: item.id } }), [router]);

  // HABER PAYLAŞIMI — uzun basma. Oyun kartındaki menüden farklı olarak
  // burada TEK eylem var (elenecek bir öneri yok), o yüzden menü değil
  // doğrudan gönderme sayfası açılıyor.
  const [paylas, setPaylas] = useState(null);   // { url, title }
  const gonder = useCallback((n) => setPaylas({ url: n.url, title: n.title }), []);

  const zaman = useCallback((n) => bagilZaman(n.ts, t) || n.date, [t]);
  const canli = useCallback((n) => !!n.ts && Date.now() - n.ts < TAZE, []);

  // ── GÜN GRUPLARI (kit news(): "Bugün" · "Dün") ──
  // Grup başlıkları listeye SAHTE SATIR olarak giriyor; ayrı bir bölüm
  // listesi kurmak sanal listeyi ikiye bölerdi. Etiket `ts`den çıkıyor:
  // uydurma yok, tarihi olmayan haber gruplanmıyor.
  const gruplu = useMemo(() => {
    const out = [];
    let sonGun = null;
    for (const n of liste) {
      const gun = n.ts ? new Date(n.ts).toDateString() : null;
      if (gun && gun !== sonGun) {
        sonGun = gun;
        out.push({ id: `g:${gun}`, __grup: gunAdi(n.ts, t) });
      }
      out.push(n);
    }
    return out;
  }, [liste, t]);

  const keyExtractor = useCallback((item) => item.id, []);
  const itemType = useCallback((item) => (item.__grup ? 'grup' : 'haber'), []);
  const renderNews = useCallback(({ item }) => (item.__grup ? (
    <View style={[styles.pad, styles.grup]}>
      <Txt variant="footnoteStrong" style={{ color: colors.text3 }}>{item.__grup}</Txt>
    </View>
  ) : (
    <View style={styles.rowWrap}>
      <NewsRow
        title={item.title}
        image={item.image}
        category={item.cat}
        time={zaman(item)}
        live={canli(item)}
        source={item.source}
        onPress={() => open(item)}
        onLongPress={() => gonder(item)}
      />
    </View>
  )), [open, gonder, zaman, canli, styles, colors.text3]);

  // Geri düğmesi ÜÇ DALDA DA gerekiyor (yükleniyor / hata / liste). Ayrı bir
  // bileşen olmasının sebebi bu: üç kez elle yazılsaydı biri unutulur ve o
  // durumda ekranda mahsur kalınırdı.
  //
  // Kitin iki katlı başlığı: geri satırı, altında 28/34 sayfa adı.
  const head = (
    <View style={[styles.header, { marginHorizontal: yan }]}>
      <View style={styles.headRow}>
        <IconButton icon="back" label={t('common.back')} iconSize={K.navBar.backIcon}
                    strokeWidth={K.navBar.backStroke} onPress={() => router.back()} />
      </View>
      <Txt variant="largeTitle" accessibilityRole="header" style={styles.headTitle}>{t('news.title')}</Txt>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        {head}
        <NewsListSkeleton />
      </SafeAreaView>
    );
  }

  // HATA EKRANI YALNIZ ELDE HİÇBİR ŞEY YOKKEN. Önceden koşul sadece
  // `error` idi: uçak modunda diskteki haberler hazır dururken bile
  // kullanıcı bulut ikonlu boş ekranı görüyordu. Veri varsa okunur,
  // bayat olduğunu listenin tepesindeki bant söyler.
  if (error && !data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        {head}
        <EmptyState
          icon="wifioff"
          title={t('common.error')}
          text={t('common.errorText')}
          actionLabel={t('common.retry')}
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {head}
      <Reveal style={styles.flex}>
      <FlashList
        data={gruplu}
        keyExtractor={keyExtractor}
        renderItem={renderNews}
        getItemType={itemType}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[32], paddingHorizontal: yan }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Pay bandın KENDİSİNDE: sarmalayıcı bir dolgu View'i
                bant görünmezken de listenin tepesinde şerit bırakırdı. */}
            <CevrimdisiBant
              ts={ts}
              hata={!!error}
              onRetry={refetch}
              style={styles.bant}
            />

            {/* Kategori çipleri — kitte başlığın hemen altında. */}
            <FlashList
              horizontal
              data={cats}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              renderItem={({ item: c }) => (
                <Chip title={c === 'all' ? t('news.all') : c} selected={cat === c} onPress={() => setCat(c)} />
              )}
              ItemSeparatorComponent={CipAra}
            />

            {lead ? (
              <View style={styles.pad}>
                <NewsFeature
                  lead
                  title={lead.title}
                  image={lead.image}
                  category={lead.cat}
                  time={zaman(lead)}
                  live={canli(lead)}
                  source={lead.source}
                  description={lead.excerpt || undefined}
                  onPress={() => open(lead)}
                  onLongPress={() => gonder(lead)}
                />
              </View>
            ) : null}

            {orta.length ? (
              <View style={[styles.pad, styles.grid]}>
                {orta.map((n) => (
                  <OrtaKart key={n.id} item={n} onPress={open} onShare={gonder}
                            time={zaman(n)} live={canli(n)} />
                ))}
              </View>
            ) : null}

            {/* `SectionHeader` kendi yan dolgusunu TAŞIMIYOR (bkz. Primitives
                `sectionWrap`): yan boşluğu çağıran veriyor. */}
            {liste.length ? (
              <View style={[styles.pad, styles.sonGelismeler]}>
                <SectionHeader title={t('news.latest')} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          // Çıkış: boş kalan şey SEÇİLİ kategori, o yüzden düğme "Tümü"ne
          // döndürüyor. Tümü zaten seçiliyken çıkış yok — gösterilecek haber
          // gerçekten yoktur ve sahte bir düğme koymak yanıltıcı olurdu.
          lead ? null : (
            <EmptyState
              compact
              icon="news"
              title={t('news.empty')}
              text={t('news.emptyDesc')}
              actionLabel={cat !== 'all' ? t('news.showAll') : undefined}
              onAction={cat !== 'all' ? () => setCat('all') : undefined}
            />
          )
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

/** Çipler arası boşluk — modül düzeyinde: satır içi verilseydi her render'da yeni kimlik. */
function CipAra() {
  return <View style={{ width: space[8] }} />;
}

/**
 * Orta kart (kit news() med): 169×112 görsel, kategori · zaman, 15/20 başlık.
 *
 * İki sütunlu ızgarada esniyor — kitin 169'u 390 pt kanvasta iki sütun +
 * 12 boşluk demek; dar cihazda sütun kendiliğinden daralıyor.
 */
function OrtaKart({ item, time, live, onPress, onShare }) {
  const styles = useStyles(makeStyles);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={item.title} style={styles.orta}
                    onPress={() => onPress(item)} onLongPress={() => onShare(item)}>
      <CoverImage source={item.image} radius={ORTA.radius} style={styles.ortaGorsel} />
      <View style={styles.ortaMeta}>
        <Txt variant="captionStrong" numberOfLines={1}>{item.cat}</Txt>
        <Txt variant="caption" numberOfLines={1} style={styles.ortaZaman}>{`· ${time}`}</Txt>
      </View>
      <Txt variant="cardTitle" numberOfLines={3} style={styles.ortaBaslik}>{item.title}</Txt>
    </PressableScale>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter },

  // Kit news_head: 44'lük geri satırı, altında 28/34 sayfa adı.
  header: { paddingHorizontal: K.newsHead.paddingH, paddingBottom: K.newsHead.titleTop },
  headRow: { height: K.newsHead.row, flexDirection: 'row', alignItems: 'center', marginLeft: K.newsHead.backEdge },
  headTitle: { marginTop: K.newsHead.titleTop, marginHorizontal: K.newsHead.titleEdge },

  bant: { marginHorizontal: layout.gutter, marginBottom: space[8] },
  chipsRow: { paddingHorizontal: layout.gutter, paddingBottom: K.newsHead.chipsBottom },

  // Gruplar arası kit 24 diyor; her SATIR zaten altında rowGap (16)
  // taşıyor, başlık o yüzden farkı ekliyor — toplam yine 24.
  grup: { paddingTop: ORTA.groupTop - ORTA.rowGap, paddingBottom: ORTA.titleTop },
  grid: { marginTop: ORTA.top, flexDirection: 'row', gap: ORTA.gap },
  orta: { flex: 1, minWidth: 0 },
  ortaGorsel: { width: '100%', height: ORTA.imageHeight },
  ortaMeta: { height: K.newsRow.metaHeight, marginTop: ORTA.metaTop, flexDirection: 'row', alignItems: 'center', gap: K.newsFeature.metaGap },
  ortaZaman: { color: colors.text3, flex: 1, minWidth: 0 },
  ortaBaslik: { marginTop: ORTA.titleTop },

  sonGelismeler: { marginTop: ORTA.sectionTop },
  // Satırlar arası boşluk satırın KENDİSİNDE (kit: gap 16).
  rowWrap: { paddingHorizontal: layout.gutter, paddingBottom: ORTA.rowGap },
});
