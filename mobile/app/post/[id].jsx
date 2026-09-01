import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  spacing, type, radius, PRESSED, TOUCH_MIN, SECTION_TITLE,
  avatar as avatarSize,
} from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { fetchPost } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';
import ReviewRoot from '../../src/components/ReviewRoot';
import Avatar from '../../src/components/Avatar';

// ─────────────────────────────────────────────────────────────────────────────
// Konuşma görünümü — bir gönderi ve yanıtları.
//
// YANITLAR ESKİDEN YENİYE. Akış en yeniyi öne alıyor ama konuşma öyle
// okunmuyor: bir tartışmayı sondan başa okumak anlamsız.
//
// DÜZ TARTIŞMA. Yanıta yanıt yok; sunucu bir yanıta gelen yanıtı kök gönderiye
// bağlıyor. İç içe thread küçük toplulukta boş görünür ve okuması zordur.
// ─────────────────────────────────────────────────────────────────────────────

// Modul duzeyinde, cunku ikisi de her render'da yeniden uretiliyordu ve
// PostCard ZATEN memo'lu (bkz. components/PostCard.jsx sonu) — taze kimlikli
// prop'lar o memo'yu her seferinde bosa cikariyordu.
const anahtar = (item) => item.id;
// Bu ekranda karta basmak HICBIR SEY yapmamali: zaten o gonderidesin.
// PostCard `onOpen` verilmediginde /post/<id>'ye gidiyor, yani prop'u
// kaldirmak kartlari kendilerine yonlendirirdi.
const ACMA_YOK = () => {};

export default function PostThread() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composing, setComposing] = useState(false);
  // 404 mu (gerçekten yok) yoksa ağ hatası mı (bilmiyoruz) — Faz 5.
  const [yok, setYok] = useState(false);

  // FAZ 5, KIRILMA #3 — HATA "SİLİNMİŞ" DEMİYOR.
  // `catch { setData(null) }` ardından ekran `post.gone` basıyordu: uçak
  // modunda bir bağlantıyı açan kullanıcıya gönderinin SİLİNDİĞİ söylenmiş
  // oluyordu. Bu boşluk değil, YANLIŞ BİLGİ.
  //
  // İki gerçek ayrıldı: 404 gönderi gerçekten yok demek (yapılacak bir şey
  // yok), başka her hata "yükleyemedik" demek (yeniden denenebilir).
  // Sunucu zaten `status` taşıyor (api/social.js), yalnız okunmuyordu.
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetchPost(String(id));
      setData(r);
      setYok(false);
    } catch (e) {
      setData(null);
      setYok(e?.status === 404);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const requireAccount = useCallback(() => {
    if (session) return false;
    router.push('/account');
    return true;
  }, [session, router]);

  const onReply = useCallback(() => {
    if (requireAccount()) return;
    setComposing(true);
  }, [requireAccount]);

  // Satir ici ok fonksiyonuydu: FlashList her render'da `renderItem` degisti
  // sanip butun hucreleri yeniden ciziyordu.
  const satirCiz = useCallback(
    ({ item }) => <PostCard post={item} onRequireAccount={requireAccount} onOpen={ACMA_YOK} />,
    [requireAccount],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && PRESSED]} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('post.threadTitle')}</Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : !data?.post ? (
        <View style={styles.center}>
          <Text style={styles.gone}>{yok ? t('post.gone') : t('post.loadFailed')}</Text>
          {/* 404'te yeniden denemenin anlamı yok; ağ hatasında var. */}
          {!yok ? (
            <>
              <Text style={styles.goneDesc}>{t('post.loadFailedDesc')}</Text>
              <Pressable onPress={() => { setLoading(true); load(); }} hitSlop={8}
                style={({ pressed }) => [styles.goneEylem, pressed && PRESSED]}>
                <Text style={styles.goneEylemText}>{t('common.retry')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : (
        <FlashList
          data={data.replies || []}
          keyExtractor={anahtar}
          renderItem={satirCiz}
          ListHeaderComponent={
            <View>
              {/* KÖK İKİ TÜRDEN BİRİ OLABİLİYOR: sıradan gönderi ya da
                  İNCELEME. Ayrımı sunucu söylüyor (`type: 'review'`) —
                  istemci kök kimliğini ayrıştırmıyor, çünkü kimliğin biçimi
                  (`r:{appid}:{uid}`) sunucunun ayrıntısı ve iki yerde
                  bilinmesi gereksiz bir bağ olurdu.

                  YANIT ÇUBUĞU BURADAN KALKTI: kaydırıp geri gelmek gerekiyordu.
                  Artık ekranın altında sabit duruyor (aşağıya bakın). */}
              {data.post.type === 'review' ? (
                <ReviewRoot
                  review={data.post}
                  onOpenGame={() => router.push({
                    pathname: '/game/[id]',
                    params: {
                      id: `rawg_${data.post.appid}`, appid: data.post.appid,
                      name: data.post.gameName || '', image: data.post.image || '',
                    },
                  })}
                  onAuthor={() => {
                    const u = data.post.author?.username;
                    if (u) router.push(`/u/${u}`);
                  }}
                />
              ) : (
                <PostCard post={data.post} onRequireAccount={requireAccount} onOpen={ACMA_YOK} kok />
              )}

              {/* FAZ 5 — SIRALAMA YAZILIYOR. Akış yeniden eskiye, konuşma
                  tersi. İki farklı sıralama aynı uygulamada varsa hangisinin
                  geçerli olduğu SÖYLENMELİ; yoksa kullanıcı en yeni yanıtı
                  en üstte arar ve bulamaz. */}
              {(data.replies?.length || 0) > 0 ? (
                <Text style={styles.siralama}>
                  {data.replies.length} {t('post.repliesCount')} · {t('post.replyOrder')}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{t('post.noReplies')}</Text>
          }
          // Alt boşluk SEKME ÇUBUĞU İÇİN DEĞİL (bu ekranda çubuk yok), sabit
          // yanıt kutusu için: son yanıt kutunun altında kalmamalı.
          contentContainerStyle={{ paddingBottom: TOUCH_MIN + spacing.s24 + (insets.bottom || spacing.s12) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Sabit yanıt kutusu ──
          ÖNCESİNDE kök gönderinin altındaydı ve uzun bir konuda ekrandan
          çıkıyordu: yanıt yazmak için başa dönmek gerekiyordu. Konuşma
          ekranının tek işi yanıtlamak; o eylem her zaman parmağın altında.

          Kutu KOMPOZİTÖRÜ AÇAN BİR DÜĞME, gerçek bir giriş alanı değil:
          yazma, ek ve gönderme akışı PostComposer'da duruyor ve iki ayrı
          metin girişi tutmak (biri burada, biri sayfada) hangisinin gönderdiği
          belirsiz bir durum üretirdi.

          BULANIKLIK YOK, DÜZ CAM DOLGUSU: blur yalnız sekme çubuğunda
          kullanılıyor; burada Android'de zaten fallback'e düşecekti ve
          geometri aynı kalıyor (jetonun kendi kuralı). */}
      {data?.post ? (
        <View style={[styles.replyDock, { paddingBottom: insets.bottom || spacing.s12 }]}>
          <Avatar avatar={null} name="" size={avatarSize.md} />
          <Pressable
            onPress={onReply}
            style={({ pressed }) => [styles.replyInput, pressed && PRESSED]}
            accessibilityRole="button"
          >
            <Text style={styles.replyText} numberOfLines={1}>
              {data.post.type === 'review' ? t('post.replyToReview') : t('post.replyHint')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <PostComposer
        visible={composing}
        replyTo={String(id)}
        onClose={() => setComposing(false)}
        onPosted={() => load(true)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingBottom: 6,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: type.headline, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  siralama: { ...SECTION_TITLE, color: colors.text3, paddingHorizontal: spacing.s20, marginTop: spacing.s16, marginBottom: spacing.s8 },
  gone: { color: colors.text, fontSize: type.subhead, fontWeight: '700', textAlign: 'center' },
  goneDesc: { color: colors.text2, fontSize: type.footnote, lineHeight: 19, textAlign: 'center', marginTop: spacing.s4, maxWidth: 280 },
  goneEylem: { minHeight: TOUCH_MIN, justifyContent: 'center', marginTop: spacing.s8 },
  goneEylemText: { color: colors.accentText, fontSize: type.subhead, fontWeight: '700' },

  replyDock: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    paddingHorizontal: spacing.s20, paddingTop: spacing.s12,
    backgroundColor: colors.glassFill,
    borderTopWidth: 1, borderTopColor: colors.glassBorder,
  },
  replyInput: {
    flex: 1, height: TOUCH_MIN, justifyContent: 'center',
    paddingHorizontal: spacing.s16, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  replyText: { color: colors.text3, fontSize: type.subhead },

  empty: { color: colors.text3, fontSize: type.footnote, textAlign: 'center', paddingVertical: spacing.s24 },
});
