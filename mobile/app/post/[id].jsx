import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { fetchPost } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import { useAuth } from '../../src/context/AuthContext';
import PostCard from '../../src/components/PostCard';
import CommentCard from '../../src/components/CommentCard';
import { Icon } from '../../src/components/Icon';
import { Button, IconButton, Txt } from '../../src/components/ui/Primitives';
import { NavBar } from '../../src/components/ui/Navigation';
import { UserAvatar } from '../../src/components/ui/Social';
import { component as K, layout, space } from '../../src/theme/tokens';
import PostComposer from '../../src/components/PostComposer';
import ReviewRoot from '../../src/components/ReviewRoot';
import ModerasyonKatmani from '../../src/components/ModerasyonKatmani';
import { suz } from '../../src/services/engel';
import { useEngelliler } from '../../src/hooks/useEngelliler';
import { useModerasyon } from '../../src/hooks/useModerasyon';

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
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const insets = useSafeAreaInsets();
  const { account } = useAuth();

  // KONUŞMA EKRANINDA HİÇ MODERASYON YOLU YOKTU. Akıştaki bir gönderiye
  // dokunan herkes buraya geliyor ve yanıtları burada okuyor; yanıtlar da
  // kullanıcı içeriği. Guideline 1.2 'her yüzey' diyor, burası atlanmıştı.
  const mod = useModerasyon();
  const engelSurumu = useEngelliler();

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

  // Engellenen kişinin yanıtı konuşmadan ANINDA düşüyor; sunucu bir
  // sonraki çekimde zaten süzüyor (bkz. services/engel.js).
  const yanitlar = useMemo(
    () => suz(data?.replies || [], (x) => x?.author?.uid || x?.uid),
    [data, engelSurumu],
  );

  // Satir ici ok fonksiyonuydu: FlashList her render'da `renderItem` degisti
  // sanip butun hucreleri yeniden ciziyordu.
  const satirCiz = useCallback(
    ({ item }) => (
      // Yorumun kendi yan boşluğu yok (kit: yorum listesi `pad`in içinde,
      // satırlar arası 18). Sarmalayıcı ikisini de veriyor.
      <View style={[s.pad, s.commentRow]}>
        <CommentCard
          reply={item}
          rootAuthorUid={data?.post?.author?.uid || data?.post?.uid}
          onRequireAccount={requireAccount}
          onReply={onReply}
          onMenu={(k) => mod.acMenu(k, { targetType: 'post', targetId: String(item.id) })}
        />
      </View>
    ),
    [requireAccount, onReply, mod, data?.post?.author?.uid, data?.post?.uid],
  );

  const kok = data?.post;
  const kokMenu = useCallback(() => {
    if (!kok) return;
    mod.acMenu(kok.author, kok.type === 'review'
      ? { targetType: 'review', targetId: `${kok.appid}:${kok.uid}` }
      : { targetType: 'post', targetId: String(kok.id) });
  }, [kok, mod]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Başlık listenin DIŞINDA: içerik kolonuyla aynı hizaya getiriliyor —
          başlık tam genişlikte kalsaydı sayfanın adı ile anlattığı şey iki
          ayrı sütunda dururdu. Sağdaki ⋯ kök gönderinin moderasyon kapısı
          (kit nav_bar'ın "Seçenekler" düğmesi). */}
      <View style={{ marginHorizontal: yan }}>
        <NavBar
          title={t('post.threadTitle')}
          onBack={() => router.back()}
          right={kok ? <IconButton icon="more" label={t('a11y.more')} onPress={kokMenu} /> : undefined}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.text2} /></View>
      ) : !kok ? (
        <View style={s.center}>
          <Txt variant="cardTitle" style={s.ortala}>{yok ? t('post.gone') : t('post.loadFailed')}</Txt>
          {/* 404'te yeniden denemenin anlamı yok; ağ hatasında var. */}
          {!yok ? (
            <>
              <Txt variant="footnote" style={[s.ortala, s.goneDesc, { color: colors.text2 }]}>{t('post.loadFailedDesc')}</Txt>
              <Button title={t('common.retry')} variant="tertiary" height={40} onPress={() => { setLoading(true); load(); }} />
            </>
          ) : null}
        </View>
      ) : (
        <FlashList
          data={yanitlar}
          keyExtractor={anahtar}
          renderItem={satirCiz}
          ListHeaderComponent={
            <View>
              {/* KÖK İKİ TÜRDEN BİRİ OLABİLİYOR: sıradan gönderi ya da
                  İNCELEME. Ayrımı sunucu söylüyor (`type: 'review'`) —
                  istemci kök kimliğini ayrıştırmıyor, çünkü kimliğin biçimi
                  (`r:{appid}:{uid}`) sunucunun ayrıntısı ve iki yerde
                  bilinmesi gereksiz bir bağ olurdu. */}
              {kok.type === 'review' ? (
                <ReviewRoot
                  review={kok}
                  onOpenGame={() => router.push({
                    pathname: '/game/[id]',
                    params: {
                      id: `rawg_${kok.appid}`, appid: kok.appid,
                      name: kok.gameName || '', image: kok.image || '',
                    },
                  })}
                  onAuthor={() => {
                    const u = kok.author?.username;
                    if (u) router.push(`/u/${u}`);
                  }}
                  onMenu={(k) => mod.acMenu(k, {
                    targetType: 'review',
                    targetId: `${kok.appid}:${kok.uid}`,
                  })}
                />
              ) : (
                <View style={s.kokTop}>
                  {/* Kök gönderinin ⋯ düğmesi ÜST ÇUBUKTA (kit nav_bar):
                      kartta da olsaydı aynı menü iki ayrı düğmeden açılırdı.
                      Uzun basma kısayolu kartta duruyor. */}
                  <PostCard
                    post={kok}
                    onRequireAccount={requireAccount}
                    onOpen={ACMA_YOK}
                    onLongPressMenu={kokMenu}
                    kok
                  />
                </View>
              )}

              {/* Sayaç satırı (kit post_detail stats): iki hat arasında
                  beğeni ve yanıt. "Paylaşım" sayısı YOK — gönderi paylaşımı
                  ölçülmüyor, uydurulmuyor. */}
              <View style={[s.pad, s.stats, { borderColor: colors.line }]}>
                <Txt variant="footnote" style={{ color: colors.text2 }}>
                  {t('v2.likesCount').replace('{n}', Number(kok.likeCount || 0).toLocaleString(locale))}
                </Txt>
                <Txt variant="footnote" style={{ color: colors.text2 }}>
                  {t('v2.repliesCount').replace('{n}', yanitlar.length.toLocaleString(locale))}
                </Txt>
              </View>

              {/* FAZ 5 — SIRALAMA YAZILIYOR. Akış yeniden eskiye, konuşma
                  tersi. İki farklı sıralama aynı uygulamada varsa hangisinin
                  geçerli olduğu SÖYLENMELİ. Tasarımdaki "En iyi ▾" çipi yok:
                  sunucu tek sıralama veriyor, seçenek sunan çip yanıltır. */}
              {yanitlar.length > 0 ? (
                <View style={[s.pad, s.repliesHead]}>
                  <Txt variant="headline">{t('v2.replies')}</Txt>
                  <Txt variant="footnote" style={{ color: colors.text3 }}>{t('post.replyOrder')}</Txt>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Txt variant="footnote" style={[s.pad, s.empty, { color: colors.text3 }]}>{t('post.noReplies')}</Txt>
          }
          // Alt boşluk SEKME ÇUBUĞU İÇİN DEĞİL (bu ekranda çubuk yok), sabit
          // yanıt kutusu için: son yanıt kutunun altında kalmamalı.
          contentContainerStyle={{ paddingBottom: DOCK + (insets.bottom || space[12]), paddingHorizontal: yan }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Sabit yanıt kutusu (kit post_detail comp) ──
          ÖNCESİNDE kök gönderinin altındaydı ve uzun bir konuda ekrandan
          çıkıyordu: yanıt yazmak için başa dönmek gerekiyordu. Konuşma
          ekranının tek işi yanıtlamak; o eylem her zaman parmağın altında.

          Kutu KOMPOZİTÖRÜ AÇAN BİR DÜĞME, gerçek bir giriş alanı değil:
          yazma, ek ve gönderme akışı PostComposer'da duruyor ve iki ayrı
          metin girişi tutmak hangisinin gönderdiği belirsiz bir durum
          üretirdi. Gönder ikonu da aynı düğmenin parçası. */}
      {kok ? (
        <View style={[s.dock, { backgroundColor: colors.bg2, borderTopColor: colors.line, paddingBottom: insets.bottom || space[12] }]}>
          {/* Kendi baş harfin: kutunun kime ait olduğunu söylüyor. */}
          <UserAvatar avatar={account?.avatar} name={account?.name || account?.displayName || account?.email || ''} size={K.thread.dock.avatar} />
          <Pressable
            onPress={onReply}
            accessibilityRole="button"
            style={({ pressed }) => [s.dockInput, { backgroundColor: colors.surface2 }, pressed && s.pressed]}
          >
            <Txt variant="cardTitle" numberOfLines={1} style={[s.flex, s.dockText, { color: colors.text3 }]}>
              {kok.type === 'review' ? t('post.replyToReview') : t('post.replyHint')}
            </Txt>
            <View style={s.dockSend}>
              <Icon name="send" size={K.thread.dock.sendIcon} color={colors.text3} />
            </View>
          </Pressable>
        </View>
      ) : null}

      <PostComposer
        visible={composing}
        replyTo={String(id)}
        onClose={() => setComposing(false)}
        onPosted={() => load(true)}
      />

      <ModerasyonKatmani mod={mod} />
    </SafeAreaView>
  );
}

const T = K.thread;
// Sabit kutunun yüksekliği: içerik dolgusu + giriş alanı.
const DOCK = T.dock.paddingTop + T.dock.input + space[12];

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  pad: { paddingHorizontal: layout.gutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.gutter, gap: space[8] },
  ortala: { textAlign: 'center' },
  goneDesc: { marginBottom: space[8] },
  kokTop: { marginTop: T.rootTop - K.community.feedGap / 2 },
  stats: { height: T.statsHeight, marginTop: T.statsTop, flexDirection: 'row', alignItems: 'center', gap: T.statsGap,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  repliesHead: { height: T.headerHeight, marginTop: T.headerTop, marginBottom: T.listTop, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentRow: { paddingBottom: T.gap },
  empty: { paddingVertical: space[24], textAlign: 'center' },
  pressed: { opacity: 0.9 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: T.dock.paddingTop, paddingHorizontal: T.dock.paddingH,
    borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: T.dock.gap },
  dockInput: { flex: 1, height: T.dock.input, borderRadius: T.dock.inputRadius, flexDirection: 'row', alignItems: 'center',
    paddingLeft: T.dock.inputLeft, paddingRight: T.dock.inputRight },
  dockText: { fontWeight: '400' },
  dockSend: { width: T.dock.send, height: T.dock.send, alignItems: 'center', justifyContent: 'center' },
});
