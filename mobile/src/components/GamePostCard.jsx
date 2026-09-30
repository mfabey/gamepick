// ─────────────────────────────────────────────────────────────────────────────
// Keşif akışı kartı — Instagram gönderisi düzeni.
//
// Oyundan bir EKRAN GÖRÜNTÜSÜ (kapak değil) + oyunun açıklaması. Kapak
// görselleri pazarlama afişi; oyunun gerçekte neye benzediğini göstermiyorlar.
// Akışın işi keşfettirmek olduğu için oyun içi kare daha dürüst bir sinyal.
//
// GÖRSEL SEÇİMİ RASTGELE AMA KARARLI: oyunun kimliğinden türetilen bir
// karma ile seçiliyor. Her render'da yeniden zar atılsaydı, kullanıcı yukarı
// kaydırıp geri döndüğünde görsel değişirdi — FlashList kartları geri
// dönüştürdüğü için bu sık olurdu ve akış huzursuz görünürdü.
//
// VERİ TEMBEL: detay yalnızca kart takılınca çekiliyor. FlashList görünür
// alanın yakınındakileri takar, yani pratikte "görününce yükle" davranışı.
// useQuery aynı slug için istekleri tekilleştiriyor ve önbellekliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { memo, useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { fetchGameDetail } from '../api/games';
import { useQuery } from '../hooks/useQuery';
import { useLanguage } from '../context/LanguageContext';
import { usePrice } from '../hooks/usePrice';
import { useKapakOlcum } from '../hooks/useKapakOlcum';
import { summarize } from '../utils/text';
import { turAdi } from '../services/genreName';
import Monogram from './Monogram';
import { PRESSED, motion } from '../theme';
import { useDesignTheme } from '../theme/useDesignTheme';
import { designPalettes } from '../theme/palettes';
import { layout, radius, space } from '../theme/tokens';
import { Txt } from './ui/Primitives';
import { DiscountTag, Price } from './ui/Commerce';
import { OverlayTag } from './ui/Media';
import { OutlineBadge } from './ui/GameDetailParts';

const DETAIL_TTL = 24 * 60 * 60 * 1000;   // ekran görüntüleri ve metin sık değişmez
const CLAMP_LINES = 3;

// FNV-1a — görsel seçimini oyuna sabitlemek için. Kriptografik değil,
// sadece dağılımı düzgün ve ucuz olsun diye.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function GamePostCard({ game, onDismiss, tag, onExpand }) {
  // 2.0 (27 Eyl): OverlayTag, DiscountTag, Price, Metacritic OutlineBadge
  // (oyun detayıyla aynı), 2.0 tipografi. Görsel üstü metin tema bağımsız
  // koyu palet (ART) — zemin görselin kendisi.
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { t, lang, formatPrice } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const slug = game?.rawgSlug || '';
  const { data: detail } = useQuery(
    slug ? `post:${slug}:${lang}` : null,
    () => fetchGameDetail(slug, lang),
    { ttl: DETAIL_TTL, enabled: !!slug }
  );

  const shots = detail?.screenshots || [];
  // Kararlı rastgele seçim — aynı oyun hep aynı kareyi gösterir
  const shot = useMemo(() => {
    if (shots.length === 0) return null;
    return shots[hash(String(game?.id || slug)) % shots.length];
  }, [shots, game?.id, slug]);

  // Ekran görüntüsü gelene kadar kapak dursun → boş gri kutu yok
  const source = shot || game?.image || null;
  // HAM HTML BASILMIYOR. detail.description Steam'den etiketleriyle geliyor;
  // temizlenmeden basıldığında akışta `<p class="bb_paragraph"><strong>&quot;`
  // görünüyordu. summarize() hem temizliyor hem cümle sınırında kısaltıyor.
  const text = useMemo(() => summarize(detail?.description), [detail]);

  // KARAR SİNYALLERİ. Akış kartı, yerini aldığı şerit kartından (GameCard) az
  // bilgi veriyordu: puan yok, fiyat yok, indirim yok. Kullanıcı "bu oyun ne,
  // alayım mı" sorusunu kartta cevaplayamıyordu.
  const price = usePrice(game);
  const isFree = game?.isFree || price?.isFree;
  const onSale = price?.discount > 0 && !isFree;

  const open = useCallback(() => {
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(game.id), name: game.name, image: game.image || '',
        slug: game.rawgSlug || '', hasSteam: game.hasSteam ? '1' : '',
      },
    });
  }, [router, game]);

  // BÜYÜME GEÇİŞİ. Akış kartı da anasayfada duruyor ve aynı jestle aynı yere
  // gidiyor; şerit kartı büyüyerek açılırken bunun sert atlaması, kullanıcının
  // "oyun kartı" saydığı iki şeyin iki farklı davranması demekti.
  // `onExpand` verilmediğinde (akış dışı kullanımlar) eski düz gezinme kalıyor.
  //
  // ÖLÇÜLEN ALAN KAPAK GÖRSELİ, kartın tamamı DEĞİL: bindirme detayın kapak
  // alanına iniyor, kaynak da kapak olmalı — kart gövdesi ölçülseydi geçiş
  // metin bloğunu da içine alır, hedefte kaybederdi.
  const [kapakRef, buyuterekAc] = useKapakOlcum(onExpand, game);

  const onTextLayout = useCallback((e) => {
    // "Devamını gör" YALNIZCA metin gerçekten kırpıldıysa çıksın; kısa
    // açıklamalarda hiçbir şey açmayan bir bağlantı göstermek yanıltıcı olur.
    if (!expanded && e.nativeEvent.lines.length > CLAMP_LINES) setTruncated(true);
  }, [expanded]);

  return (
    <View style={styles.card}>
      <Pressable onPress={onExpand ? buyuterekAc : open} onLongPress={() => onDismiss?.(game)} style={({ pressed }) => pressed && PRESSED}>
        {/* collapsable={false} ŞART: RN Android'de yalnız düzen taşıyan
            View'leri ağaçtan düşürebiliyor ve düşen View `measureInWindow`
            veremiyor — ölçüm null döner, geçiş sessizce kaybolurdu. */}
        <View ref={kapakRef} collapsable={false} style={[styles.media, { backgroundColor: colors.surface2 }]}>
          {source && !imgFailed ? (
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover"
              cachePolicy="memory-disk" transition={motion.image}
              onError={() => setImgFailed(true)} />
          ) : (
            <Monogram name={game?.name} style={StyleSheet.absoluteFill} not={false} />
          )}
          <LinearGradient colors={['transparent', 'rgba(6,7,9,0.92)']} style={styles.scrim} />

          {/* NEDEN BURADA. Trend/yeni/indirim oyunları artık ayrı şeritlerde
              değil, akışın içinde. Etiket olmadan akış "neden bu oyun?"
              sorusunu cevapsız bırakıyor ve rastgele bir yığın gibi okunuyor. */}
          {tag ? <OverlayTag label={t('home.tag.' + tag)} /> : null}

          <View style={styles.overlay}>
            <Txt variant="cardTitleLarge" numberOfLines={2} style={{ color: ART.white }}>{game.name}</Txt>
            {game.genres?.length ? (
              <Txt variant="caption" numberOfLines={1} style={[styles.genres, { color: ART.onArt }]}>
                {game.genres.slice(0, 3).map((g) => turAdi(g, t)).filter(Boolean).join(' · ')}
              </Txt>
            ) : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.meta}>
        {isFree ? (
          <Price value={t('card.free')} size={16} />
        ) : price?.price != null ? (
          <Price value={formatPrice(price.price)} size={16} />
        ) : null}
        {onSale ? <DiscountTag percent={price.discount} size="xs" /> : null}
        {game.metacritic ? <OutlineBadge label={`Metacritic ${game.metacritic}`} /> : null}
      </View>

      {text ? (
        <View style={styles.body}>
          <Txt
            variant="body"
            style={{ color: colors.text2 }}
            numberOfLines={expanded ? undefined : CLAMP_LINES}
            onTextLayout={onTextLayout}
          >
            {text}
          </Txt>

          {truncated && !expanded ? (
            <Pressable onPress={() => setExpanded(true)} hitSlop={8} accessibilityRole="button">
              <Txt variant="subhead" style={[styles.more, { color: colors.red }]}>{t('post.more')}</Txt>
            </Pressable>
          ) : null}

          {expanded ? (
            <Pressable onPress={() => setExpanded(false)} hitSlop={8} accessibilityRole="button">
              <Txt variant="subhead" style={[styles.more, { color: colors.red }]}>{t('post.less')}</Txt>
            </Pressable>
          ) : null}

        </View>
      ) : null}
    </View>
  );
}

// game referansı akış yeniden sıralanmadıkça değişmiyor → gereksiz render yok
export default memo(GamePostCard);

// Görsel üstü katmanlar TEMA BAĞIMSIZ koyu palet: açık temada da zemin görsel.
const ART = designPalettes.dark;

const styles = StyleSheet.create({
  // FAZ 1: ritim 24; kenar payı sayfa payı (20).
  card: { marginHorizontal: layout.gutter, marginBottom: space[24] },
  media: {
    // Ekran değil, tablet kolonu ve kart kenar payı çıktıktan sonraki genişlik.
    aspectRatio: 1 / 0.56,
    width: '100%', borderRadius: radius.card, overflow: 'hidden',
  },
  // Metnin okunabilirliği görselin karanlığına bırakılamaz — parlak bir
  // ekran görüntüsünde beyaz yazı kaybolurdu.
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  overlay: { position: 'absolute', left: space[16], right: space[16], bottom: space[12] },
  genres: { marginTop: space[4] },
  // Sinyal satırı görselin HEMEN altında: kullanıcı kapağa bakarken göz zaten
  // orada, puan ve fiyat aramaya gitmiyor.
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingTop: space[12] },
  body: { paddingTop: space[8] },
  more: { fontWeight: '600', marginTop: space[4] },
});
