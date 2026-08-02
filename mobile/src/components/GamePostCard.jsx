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
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { fetchGameDetail } from '../api/games';
import { useQuery } from '../hooks/useQuery';
import { useLanguage } from '../context/LanguageContext';
import { colors, radius, spacing, PRESSED } from '../theme';

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

function GamePostCard({ game, onDismiss }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

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
  const text = detail?.description || '';

  const open = useCallback(() => {
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(game.id), name: game.name, image: game.image || '',
        slug: game.rawgSlug || '', hasSteam: game.hasSteam ? '1' : '',
      },
    });
  }, [router, game]);

  const onTextLayout = useCallback((e) => {
    // "Devamını gör" YALNIZCA metin gerçekten kırpıldıysa çıksın; kısa
    // açıklamalarda hiçbir şey açmayan bir bağlantı göstermek yanıltıcı olur.
    if (!expanded && e.nativeEvent.lines.length > CLAMP_LINES) setTruncated(true);
  }, [expanded]);

  // 4:3'e yakın oran — oyun içi kareler genelde 16:9 ama gönderi düzeninde
  // biraz daha uzun bir alan akışta daha iyi duruyor.
  const mediaH = Math.round((width - spacing.lg * 2) * 0.56);

  return (
    <View style={styles.card}>
      <Pressable onPress={open} onLongPress={() => onDismiss?.(game)} style={({ pressed }) => pressed && PRESSED}>
        <View style={[styles.media, { height: mediaH }]}>
          {source ? (
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover"
              cachePolicy="memory-disk" transition={220} />
          ) : null}
          <LinearGradient colors={['transparent', 'rgba(6,7,9,0.92)']} style={styles.scrim} />

          <View style={styles.overlay}>
            <Text numberOfLines={2} style={styles.name}>{game.name}</Text>
            {game.genres?.length ? (
              <Text numberOfLines={1} style={styles.genres}>
                {game.genres.slice(0, 3).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {text ? (
        <View style={styles.body}>
          <Text
            style={styles.desc}
            numberOfLines={expanded ? undefined : CLAMP_LINES}
            onTextLayout={onTextLayout}
          >
            {text}
          </Text>

          {truncated && !expanded ? (
            <Pressable onPress={() => setExpanded(true)} hitSlop={8}>
              <Text style={styles.more}>{t('post.more')}</Text>
            </Pressable>
          ) : null}

          {expanded ? (
            <Pressable onPress={() => setExpanded(false)} hitSlop={8}>
              <Text style={styles.more}>{t('post.less')}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={open} style={({ pressed }) => [styles.cta, pressed && PRESSED]} hitSlop={6}>
            <Text style={styles.ctaText}>{t('post.detail')}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.accentText} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// game referansı akış yeniden sıralanmadıkça değişmiyor → gereksiz render yok
export default memo(GamePostCard);

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: 26 },

  media: {
    width: '100%', borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.card,
  },
  // Metnin okunabilirliği görselin karanlığına bırakılamaz — parlak bir
  // ekran görüntüsünde beyaz yazı kaybolurdu.
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  overlay: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  name: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  genres: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 3 },

  body: { paddingTop: 10 },
  desc: { color: colors.text2, fontSize: 14, lineHeight: 20 },
  more: { color: colors.accentText, fontSize: 14, fontWeight: '700', marginTop: 6 },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10, minHeight: 32 },
  ctaText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },
});
