// ─────────────────────────────────────────────────────────────────────────────
// G-11 · Oyun Topluluğu (27 Eyl) — kaynak/G-11 (kit s3.py game_community()).
//
// Topluluk = o oyunla etiketlenmiş kök gönderiler + üyelik (sunucu
// /api/social/community). Gönderi yazmak Topluluk sekmesindekiyle aynı
// oluşturucudan; oyun önceden seçili geliyor, gönderi genel akışa da düşüyor.
//
// KİT'TEN ÇİZİLMEYENLER (verisi yok): çevrimiçi sayısı, açıklama paragrafı,
// "Moderatörlü / Türkçe / Spoiler" çipleri, Gönderiler/Medya/Rehberler/
// Sorular segmenti (gönderi türü yok), sabitlenen gönderi, topluluk
// bildirim zili. Üye ve gönderi sayısı gerçek.
//
// Okuma hesapsız; katılmak ve yazmak hesap ister (kayda yönlendirir).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Button, CoverImage, IconButton, PressableScale, SectionHeader, Txt } from '../../src/components/ui/Primitives';
import { YenileIsareti, YenileKontrol } from '../../src/components/ui/Yenile';
import { Icon } from '../../src/components/Icon';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';
import ModerasyonKatmani from '../../src/components/ModerasyonKatmani';
import EmptyState from '../../src/components/EmptyState';
import { useModerasyon } from '../../src/hooks/useModerasyon';
import { useQuery } from '../../src/hooks/useQuery';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { useLanguage } from '../../src/context/LanguageContext';
import { getSession } from '../../src/services/session';
import { communityAction, fetchCommunity } from '../../src/api/social';
import { bagilZaman } from '../../src/utils/relativeTime';
import { component as K, layout, shadow, space } from '../../src/theme/tokens';

const C = K.gameCommunity;

function saydam(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return 'transparent';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},0)`;
}

export default function OyunToplulugu() {
  const { appid, name: adParam, image: gorselParam } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const { t, tSay } = useLanguage();
  const mod = useModerasyon();

  const { data, error, loading, refetch } = useQuery(`community:${appid}`, () => fetchCommunity(appid), { ttl: 30 * 1000, enabled: !!appid });
  const [ekGonderiler, setEkGonderiler] = useState([]);
  const [sonuna, setSonuna] = useState(false);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [yaziyor, setYaziyor] = useState(false);
  const [katilimYerel, setKatilimYerel] = useState(null);   // iyimser güncelleme
  const [mesgul, setMesgul] = useState(false);

  const topluluk = data?.community || null;
  const ad = topluluk?.name || adParam || '';
  const gorsel = topluluk?.image || gorselParam || null;
  const katildi = katilimYerel ?? !!topluluk?.joined;
  const uyeSayisi = (topluluk?.memberCount || 0) + (katilimYerel == null || !topluluk ? 0 : (katilimYerel === !!topluluk.joined ? 0 : katilimYerel ? 1 : -1));
  const gonderiler = [...(data?.posts || []), ...ekGonderiler];
  const oyun = { appid: String(appid), name: ad, image: gorsel || '' };

  const hesapGerek = useCallback(() => {
    if (getSession()) return false;
    router.push('/account');
    return true;
  }, [router]);

  const katil = useCallback(async () => {
    if (hesapGerek() || mesgul) return;
    const yeni = !katildi;
    Haptics.impactAsync(yeni ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setKatilimYerel(yeni);
    setMesgul(true);
    try {
      await communityAction(yeni ? 'join' : 'leave', oyun);
      await refetch();
      setKatilimYerel(null);
    } catch {
      setKatilimYerel(null);   // sunucu reddettiyse gerçek duruma dön
    } finally {
      setMesgul(false);
    }
  }, [hesapGerek, mesgul, katildi, oyun, refetch]);

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    try { await refetch(); setEkGonderiler([]); setSonuna(false); } finally { setYenileniyor(false); }
  }, [refetch]);

  const dahaFazla = useCallback(async () => {
    if (sonuna || dahaYukleniyor || !data?.posts?.length) return;
    setDahaYukleniyor(true);
    try {
      const r = await fetchCommunity(appid, gonderiler.length);
      const yeni = r?.posts || [];
      if (!yeni.length) setSonuna(true);
      else setEkGonderiler((e) => [...e, ...yeni]);
    } catch { setSonuna(true); } finally { setDahaYukleniyor(false); }
  }, [sonuna, dahaYukleniyor, data, appid, gonderiler.length]);

  const yazmayaBasla = useCallback(() => { if (!hesapGerek()) setYaziyor(true); }, [hesapGerek]);
  const hedef = (p) => ({ targetType: 'post', targetId: String(p.id) });

  const baslik = (
    <View>
      {/* Kapak: tam genişlik 240, üstten ve alttan zemine sönen degrade (kit). */}
      <View style={{ height: C.hero }}>
        <CoverImage source={gorsel ?? undefined} radius={0} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[saydam(colors.bg), colors.bg]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.ustCubuk, { top: insets.top + space[8] }]}>
          <IconButton icon="back" label={t('a11y.back')} variant="onArt" onPress={() => router.back()} />
        </View>
      </View>

      <View style={[styles.kimlik, styles.pad]}>
        <View style={[styles.simge, { boxShadow: shadow.ring(C.iconRing, colors.bg) }]}>
          <CoverImage source={gorsel ?? undefined} radius={C.iconRadius} style={styles.simgeGorsel} />
        </View>
        <Button title={katildi ? t('comm.joined') : t('comm.join')} variant={katildi ? 'secondary' : 'primary'}
          icon={katildi ? 'check' : undefined} height={C.join} loading={mesgul} onPress={katil} style={styles.katil} />
      </View>

      <View style={[styles.pad, styles.bilgi]}>
        <Txt variant="title1" accessibilityRole="header" numberOfLines={2}>{t('comm.title').replace('{name}', ad)}</Txt>
        {topluluk ? (
          <Txt variant="footnote" style={[styles.meta, { color: colors.text2 }]}>
            {`${tSay(uyeSayisi, 'comm.memberOne', 'comm.members')} · ${tSay(topluluk.postCount, 'comm.postOne', 'comm.posts')}`}
          </Txt>
        ) : null}
      </View>

      {data?.popular?.length ? (
        <View style={styles.bolum}>
          <View style={styles.pad}><SectionHeader title={t('comm.popular')} /></View>
          <View style={[styles.grup, { backgroundColor: colors.surface1 }]}>
            {data.popular.map((p, i) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                style={({ pressed }) => [styles.tartisma, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, pressed && { backgroundColor: colors.surface2 }]}>
                <View style={styles.esnek}>
                  <Txt variant="cardTitle" numberOfLines={1}>{p.text}</Txt>
                  <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>
                    {`${tSay(p.replyCount, 'comm.replyOne', 'comm.replies')} · ${bagilZaman(p.at, t) || ''}`}
                  </Txt>
                </View>
                <Icon name="chev" size={16} color={colors.text3} strokeWidth={2.4} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.pad, styles.bolum]}>
        <YenileIsareti yenileniyor={yenileniyor} />
        <SectionHeader title={t('comm.recent')} />
      </View>
    </View>
  );

  const bos = loading ? null : error && !data ? (
    <View style={styles.bos}><EmptyState icon="alert" title={t('comm.error')} actionLabel={t('limited.retry')} onAction={yenile} compact /></View>
  ) : (
    <View style={styles.bos}>
      <EmptyState icon="comment" title={t('comm.emptyTitle')} text={t('comm.emptyBody')} actionLabel={t('comm.write')} onAction={yazmayaBasla} compact />
    </View>
  );

  return (
    <View style={[styles.kok, { backgroundColor: colors.bg }]}>
      <FlatList
        data={gonderiler}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={[styles.pad, styles.gonderi]}>
            <PostCard post={item} onRequireAccount={hesapGerek} onMenu={(k) => mod.acMenu(k, hedef(item))} compact />
          </View>
        )}
        ListHeaderComponent={baslik}
        ListEmptyComponent={bos}
        onEndReached={dahaFazla}
        onEndReachedThreshold={0.6}
        refreshControl={<YenileKontrol refreshing={yenileniyor} onRefresh={yenile} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + C.fab + C.fabInset * 2 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Paylaş düğmesi (kit FAB): sağ altta, marka dolgusu. */}
      <PressableScale accessibilityRole="button" accessibilityLabel={t('comm.write')} onPress={yazmayaBasla}
        style={[styles.fab, { bottom: insets.bottom + C.fabInset, backgroundColor: colors.brand, boxShadow: shadow.toast }]}>
        <Icon name="plus" size={C.fabIcon} color={colors.white} strokeWidth={2.4} />
      </PressableScale>

      <PostComposer visible={yaziyor} onClose={() => setYaziyor(false)} onPosted={yenile} game={oyun} />
      <ModerasyonKatmani mod={mod} />
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter },
  esnek: { flex: 1, minWidth: 0 },
  ustCubuk: { position: 'absolute', left: space[16] },
  kimlik: { height: C.idRow, marginTop: C.overlap, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  simge: { width: C.icon, height: C.icon, borderRadius: C.iconRadius },
  simgeGorsel: { width: C.icon, height: C.icon },
  katil: { paddingHorizontal: C.joinPadH },
  bilgi: { marginTop: C.infoTop },
  meta: { marginTop: C.metaTop },
  bolum: { marginTop: C.sectionTop },
  grup: { marginTop: C.groupTop, marginHorizontal: layout.gutter, paddingVertical: C.groupPadV, borderRadius: C.groupRadius, overflow: 'hidden' },
  tartisma: { minHeight: C.thread, paddingHorizontal: C.threadPadH, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  gonderi: { paddingTop: space[16] },
  bos: { paddingTop: space[24], paddingHorizontal: layout.gutter },
  fab: { position: 'absolute', right: C.fabInset, width: C.fab, height: C.fab, borderRadius: C.fabRadius, alignItems: 'center', justifyContent: 'center' },
});
