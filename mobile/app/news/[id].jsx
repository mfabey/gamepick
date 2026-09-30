// ─────────────────────────────────────────────────────────────────────────────
// Haber detayı — G-17 (kit s3.py news_detail()).
//
// ── BU EKRAN BİR ÖZET, MAKALE DEĞİL ──
// Sunucu haberin tam metnini SAKLAMIYOR; `app/lib/news-list.js` bunu açıkça
// yazıyor: "Retain summaries for old links; this does not copy full publisher
// articles." Elimizde RSS'in 200 karakterlik özeti var ve okumanın devamı
// kaynağın kendi sayfasında.
//
// Kitin gövdesi (çok paragraf + ara başlık + figür + imza + okuma süresi) bu
// yüzden çizilmiyor: yazacak metin yok, olsa da bizim olmazdı. Kapak, başlık
// ve özet kitin ölçüsünde; altında kaynağa giden düğme.
//
// AYRICA ÇİZİLMEYENLER:
//   · KAYDET düğmesi — kaydedilen haber diye bir özellik yok.
//   · OKUMA SÜRESİ ("4 dk okuma") — gövde olmadan hesaplanamaz.
//   · İLGİLİ OYUN kartı — haber ile oyun arasında bir bağ tutulmuyor.
//   · TOPLULUK TEPKİLERİ — haberin beğenisi/yorumu yok.
//
// İLGİLİ HABERLER ÇİZİLİYOR ve YENİ İSTEK AÇMIYOR: liste ekranıyla aynı
// `useQuery` anahtarı kullanılıyor, yani veri önbellekten geliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { Share, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

import { useQuery } from '../../src/hooks/useQuery';
import { fetchNews, fetchNewsArticle } from '../../src/api/news';
import { useLanguage } from '../../src/context/LanguageContext';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { QueryState } from '../../src/components/ui/ScreenParts';
import { Button, IconButton, SectionHeader, Txt } from '../../src/components/ui/Primitives';
import { NewsRow } from '../../src/components/ui/Media';
import NewsImage from '../../src/components/NewsImage';
import { bagilZaman } from '../../src/utils/relativeTime';
import { component as K, layout, space } from '../../src/theme/tokens';

const D = K.newsDetail;
/** Liste ekranıyla aynı tazelik eşiği. */
const TAZE = 60 * 60 * 1000;

export default function NewsDetail() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors } = useDesignTheme();
  const { lang, t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // ── HABER ÖNCE LİSTEDEN OKUNUYOR ──
  // AYNI ANAHTAR, yeni istek değil: liste ekranı bu veriyi zaten çekti ve
  // `useQuery` aynı anahtardaki çağrıları tekilleştiriyor. Haberden habere
  // geçerken de tek kaynak bu.
  const { data: liste, loading: listeYukleniyor, error: listeHata, refetch } =
    useQuery(`news:v2:${lang}`, () => fetchNews(lang), { ttl: 10 * 60 * 1000 });
  const listedeki = useMemo(
    () => (liste?.results || []).find((n) => n.id === id) || null,
    [liste, id],
  );

  // TEK HABER UCU YALNIZCA YEDEK: haber akıştan düşmüşse (eski bağlantı)
  // deneniyor. Uç `?id=`yi tanımayan bir sunucuda `null` dönüyor (bkz.
  // api/news.js) — ekran o zaman boş durumu çiziyor, sonsuza dek dönmüyor.
  const yedek = useQuery(
    `news-article:${lang}:${id}`,
    () => fetchNewsArticle(id, lang),
    { ttl: 1800000, enabled: !!liste && !listedeki },
  );
  const item = listedeki || yedek.data || null;
  const yukleniyor = listeYukleniyor || (!!liste && !listedeki && yedek.loading);

  // İlgili: önce aynı kategori, yetmezse akışın başı. Açık olan haber elenir.
  const ilgili = useMemo(() => {
    const hepsi = (liste?.results || []).filter((n) => n.id !== id);
    const ayniKategori = hepsi.filter((n) => n.cat && n.cat === item?.cat);
    return (ayniKategori.length >= D.relatedCount ? ayniKategori : hepsi).slice(0, D.relatedCount);
  }, [liste, id, item?.cat]);

  const zaman = (n) => bagilZaman(n.ts, t) || n.date;
  const canli = (n) => !!n.ts && Date.now() - n.ts < TAZE;
  const paylas = () => Share.share({ message: `${item.title} ${item.url}` }).catch(() => {});

  return (
    <SafeAreaView edges={[]} style={[s.safe, { backgroundColor: colors.bg }]}>
      <QueryState loading={yukleniyor} error={!item && (listeHata || yedek.error)} empty={!yukleniyor && !item} retry={refetch} />

      {item ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[32] }} showsVerticalScrollIndicator={false}>
          {/* ── Kapak (kit hero) ──
              Düğmeler kapağın ÜSTÜNDE cam dairelerde: kit böyle çiziyor ve
              300 pt'lik görselin üstünde ayrı bir çubuk yer israfı olurdu.
              Gradient metnin değil DÜĞMELERİN okunurluğu için: alt kenarda
              görselden sayfa zeminine geçişi de o yumuşatıyor. */}
          <View style={s.hero}>
            <NewsImage item={item} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[seffaf(colors.bg, 0.5), seffaf(colors.bg, 0), seffaf(colors.bg, 0), colors.bg]}
              locations={[0, 0.3, 0.6, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[s.heroBar, { top: insets.top + D.barTop }]}>
              <IconButton icon="back" label={t('a11y.back')} variant="onArt" iconSize={D.backIcon}
                          strokeWidth={D.backStroke} onPress={() => router.back()} />
              <IconButton icon="share" label={t('stats.share')} variant="onArt" iconSize={D.barIcon}
                          onPress={paylas} />
            </View>
          </View>

          {/* Kategori NÖTR HAP, kırmızı metin değil: kategori sabit bir
              etiket, eylem değil — ekran başına üç kırmızı kotası da
              kapaktaki canlı zamanla doluyor. */}
          <View style={[s.pad, s.meta]}>
            <View style={[s.kategori, { backgroundColor: colors.surface2 }]}>
              <Txt variant="footnoteStrong" numberOfLines={1}>{item.cat}</Txt>
            </View>
            <Txt variant="footnote" style={{ color: canli(item) ? colors.red : colors.text3 }}>{zaman(item)}</Txt>
          </View>

          <Txt variant="newsDetailTitle" style={[s.pad, s.baslik]}>{item.title}</Txt>

          {/* Kitin imza satırı yazar + avatar istiyor; haberde yazar alanı
              yok, kaynak var. Avatarsız tek satır. */}
          <Txt variant="footnote" style={[s.pad, s.kaynak, { color: colors.text2 }]}>
            {`${t('v2.newsSummary')} · ${item.source}`}
          </Txt>

          {item.excerpt ? (
            <Txt variant="bodyLarge" selectable style={[s.pad, s.ozet]}>{item.excerpt}</Txt>
          ) : null}

          <View style={[s.pad, s.oku]}>
            <Button title={t('v2.readSource')} icon="ext"
                    onPress={() => /^https?:\/\//i.test(item.url) && WebBrowser.openBrowserAsync(item.url)} />
          </View>

          {ilgili.length ? (
            <View style={s.ilgili}>
              <View style={s.pad}><SectionHeader title={t('news.related')} /></View>
              <View style={s.ilgiliListe}>
                {ilgili.map((n) => (
                  <View key={n.id} style={s.pad}>
                    <NewsRow
                      title={n.title}
                      image={n.image}
                      category={n.cat}
                      time={zaman(n)}
                      live={canli(n)}
                      source={n.source}
                      onPress={() => router.push({ pathname: '/news/[id]', params: { id: n.id } })}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Zemin renginin saydam hâli — gradient için.
 *
 * `colors.bg` iki temada da düz renk (#0A0A0B / #F4F4F4); gradient'in üst ucu
 * o rengin sıfır alfalı hâli olmalı, yoksa açık temada gri bir sis kalıyor
 * (oyun detayı kapağında ölçülen aynı sorun).
 */
function seffaf(hex, alpha) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter },

  hero: { width: '100%', height: D.heroHeight },
  heroBar: {
    position: 'absolute', left: D.barSide, right: D.barSide,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },

  meta: { height: D.metaHeight, marginTop: D.metaTop, flexDirection: 'row', alignItems: 'center', gap: D.metaGap },
  kategori: { height: D.metaHeight, paddingHorizontal: D.categoryPaddingH, borderRadius: D.categoryRadius, justifyContent: 'center' },
  baslik: { marginTop: D.titleTop },
  kaynak: { marginTop: D.sourceTop },
  ozet: { marginTop: D.excerptTop },
  oku: { marginTop: D.buttonTop },
  ilgili: { marginTop: D.relatedTop },
  ilgiliListe: { marginTop: D.relatedListTop, gap: D.relatedGap },
});
