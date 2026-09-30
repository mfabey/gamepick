// ─────────────────────────────────────────────────────────────────────────────
// G-20 · Bildirimler (27 Eyl) — kaynak/G-20 (kit s4.py notifications()).
//
// Veri sunucudaki bildirim merkezi (/api/social/notifications): arkadaşlık
// isteği ve kabulü, gönderi/inceleme yanıtı, beğeni, fiyat düşüşü ve hedef
// fiyat. Beğeni ve yanıt sunucuda TOPLANIYOR ("Burak ve 12 kişi…").
//
// KİT'TEN ÇİZİLMEYENLER (verisi yok): "Haberler" kategorisi ve haber satırı,
// "takip etmeye başladı" (kullanıcı takibi yok), çıkış takvimi, içerik
// üreticisi videosu, "oynamaya başladı". Kategori çipleri yalnız gerçek
// türler için: Tümü · Fiyatlar · Sosyal.
//
// Satıra dokunmak onu okundu yapar ve ilgili yere götürür; sağ üstteki
// düğme hepsini okundu yapar.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { NavBar } from '../src/components/ui/Navigation';
import { Button, Chip, IconButton, Txt } from '../src/components/ui/Primitives';
import { NotificationAvatars, NotificationLead, NotificationRow } from '../src/components/ui/Social';
import { YenileIsareti, YenileKontrol } from '../src/components/ui/Yenile';
import EmptyState from '../src/components/EmptyState';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useQuery } from '../src/hooks/useQuery';
import { fetchNotifications, markNotificationsRead } from '../src/api/social';
import { bildirimSayisiYaz } from '../src/services/bildirimSayaci';
import { bagilZaman } from '../src/utils/relativeTime';
import { layout, space } from '../src/theme/tokens';

const FIYAT = ['price_drop', 'price_target'];
const SOSYAL = ['friend_request', 'friend_accept', 'post_reply', 'post_like'];

/** '{name} …' kalıbını parçalara ayırıp değişkenleri kalın basar. */
function Kalip({ kalip, degerler, kalin = ['name', 'game', 'price'] }) {
  const { colors } = useDesignTheme();
  const parcalar = kalip.split(/(\{\w+\})/g).filter(Boolean);
  return parcalar.map((p, i) => {
    const m = p.match(/^\{(\w+)\}$/);
    if (!m) return p;
    const v = String(degerler[m[1]] ?? '');
    return kalin.includes(m[1])
      ? <Txt key={i} variant="subhead" style={{ color: colors.text }}>{v}</Txt>
      : v;
  });
}

export default function Bildirimler() {
  const { colors } = useDesignTheme();
  const { t, formatPrice, formatDiscount } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account } = useAuth();
  const [kategori, setKategori] = useState('all');
  const [okunan, setOkunan] = useState(() => new Set());
  const [hepsiOkundu, setHepsiOkundu] = useState(0);
  const [yenileniyor, setYenileniyor] = useState(false);

  const anahtar = account ? `notif:list:${account.uid || account.username || 'ben'}` : null;
  const { data, error, loading, refetch } = useQuery(anahtar, fetchNotifications, { ttl: 20 * 1000, enabled: !!account });

  const items = useMemo(() => (data?.items || []).map((it) => ({
    ...it,
    read: it.read || okunan.has(it.id) || (hepsiOkundu && it.ts <= hepsiOkundu),
  })), [data, okunan, hepsiOkundu]);
  const okunmamis = items.filter((it) => !it.read).length;
  useEffect(() => { if (data) bildirimSayisiYaz(okunmamis); }, [data, okunmamis]);

  const say = (turler) => items.filter((it) => !it.read && turler.includes(it.type)).length;
  const suzulmus = items.filter((it) => kategori === 'all' || (kategori === 'price' ? FIYAT : SOSYAL).includes(it.type));

  const bugunBas = new Date(); bugunBas.setHours(0, 0, 0, 0);
  const bolumler = [
    { title: t('notif.today'), data: suzulmus.filter((it) => it.ts >= bugunBas.getTime()) },
    { title: t('notif.earlier'), data: suzulmus.filter((it) => it.ts < bugunBas.getTime()) },
  ].filter((b) => b.data.length);

  const okundu = useCallback((it) => {
    if (it.read) return;
    setOkunan((s) => new Set(s).add(it.id));
    markNotificationsRead([it.id]).catch(() => {});
  }, []);

  const hepsiniOku = useCallback(() => {
    if (!okunmamis) return;
    Haptics.selectionAsync().catch(() => {});
    setHepsiOkundu(Date.now());
    bildirimSayisiYaz(0);
    markNotificationsRead().catch(() => {});
  }, [okunmamis]);

  const git = useCallback((it) => {
    okundu(it);
    const d = it.data || {};
    const g = d.game || {};
    if (FIYAT.includes(it.type)) {
      router.push({ pathname: '/game/[id]/prices', params: {
        id: g.appid ? `rawg_${g.appid}` : (g.slug || g.name || ''), appid: g.appid || '', name: g.name || '',
        image: g.image || '', slug: g.slug || '' } });
    } else if (it.type === 'friend_request') {
      router.push('/friend-requests');
    } else if (it.type === 'friend_accept') {
      const u = it.actors?.[0]?.username;
      router.push(u ? { pathname: '/u/[username]', params: { username: u } } : '/friends');
    } else if (d.postId) {
      router.push({ pathname: '/post/[id]', params: { id: d.postId } });
    }
  }, [okundu, router]);

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    try { await refetch(); } finally { setYenileniyor(false); }
  }, [refetch]);

  const satir = ({ item: it }) => {
    const d = it.data || {};
    const ad = (a) => a?.displayName || a?.username || '—';
    const ilk = it.actors?.[0];
    const zaman = bagilZaman(it.ts, t) || '';
    let lead; let metin; let eylem = null; let kucuk = null;
    if (FIYAT.includes(it.type)) {
      lead = <NotificationLead kind="price" image={d.game?.image || null} />;
      metin = it.type === 'price_target'
        ? <Kalip kalip={t('notif.priceTarget')} degerler={{ game: d.game?.name, price: formatPrice(d.price) }} />
        : <Kalip kalip={t('notif.priceDrop')} degerler={{ game: d.game?.name, price: formatPrice(d.price), discount: formatDiscount(d.discount) }} />;
      eylem = <View style={styles.eylem}><Button title={t('notif.seeStores')} variant="tinted" height={30} onPress={() => git(it)} /></View>;
    } else if (it.type === 'friend_request' || it.type === 'friend_accept') {
      lead = <NotificationLead kind="friend" avatar={ilk?.avatar ?? null} name={ad(ilk)} />;
      metin = <Kalip kalip={t(it.type === 'friend_request' ? 'notif.friendRequest' : 'notif.friendAccept')} degerler={{ name: ad(ilk) }} />;
      if (it.type === 'friend_request') eylem = <View style={styles.eylem}><Button title={t('notif.seeRequests')} variant="secondary" height={30} onPress={() => git(it)} /></View>;
    } else {
      const begeni = it.type === 'post_like';
      const digerleri = Math.max(0, (Number(d.count) || 1) - 1);
      lead = <NotificationAvatars kind={begeni ? 'like' : 'comm'} actors={(it.actors || []).map((a) => ({ avatar: a.avatar, name: ad(a) }))} />;
      const kalip = begeni
        ? (digerleri > 0 ? 'notif.likeMany' : 'notif.like')
        : d.review ? 'notif.replyReview' : (digerleri > 0 ? 'notif.replyMany' : 'notif.reply');
      metin = <Kalip kalip={t(kalip)} degerler={{ name: ad(ilk), n: digerleri, text: d.excerpt || '' }} />;
      kucuk = d.game?.image || null;
    }
    return (
      <NotificationRow lead={lead} text={metin} time={zaman} unread={!it.read} action={eylem} thumb={kucuk} onPress={() => git(it)} />
    );
  };

  const baslik = (
    <>
      <YenileIsareti yenileniyor={yenileniyor} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cipler}>
        <Chip title={t('notif.all')} selected={kategori === 'all'} onPress={() => setKategori('all')} />
        <Chip title={t('notif.prices')} count={say(FIYAT) || undefined} selected={kategori === 'price'} onPress={() => setKategori('price')} />
        <Chip title={t('notif.social')} count={say(SOSYAL) || undefined} selected={kategori === 'social'} onPress={() => setKategori('social')} />
      </ScrollView>
    </>
  );

  let govde;
  if (!account) {
    govde = (
      <View style={styles.orta}>
        <EmptyState icon="bell" title={t('notif.signInTitle')} text={t('notif.signInBody')}
          actionLabel={t('acc.signIn')} onAction={() => router.push('/account?mode=signin')} />
      </View>
    );
  } else if (error && !data) {
    govde = (
      <View style={styles.orta}>
        <EmptyState icon="alert" title={t('notif.error')} actionLabel={t('limited.retry')} onAction={yenile} />
      </View>
    );
  } else {
    govde = (
      <SectionList
        sections={bolumler}
        keyExtractor={(it) => it.id}
        renderItem={satir}
        renderSectionHeader={({ section }) => (
          <Txt variant="footnoteStrong" style={[styles.bolum, { color: colors.text2, backgroundColor: colors.bg }]}>{section.title}</Txt>
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={baslik}
        ListEmptyComponent={loading ? null : (
          <View style={styles.bos}><EmptyState icon="bell" title={t('notif.emptyTitle')} text={t('notif.emptyBody')} compact /></View>
        )}
        refreshControl={<YenileKontrol refreshing={yenileniyor} onRefresh={yenile} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[24] }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.kok, { backgroundColor: colors.bg }]}>
      <NavBar title={t('v2.notifications')} border
        right={account ? <IconButton icon="checkc" label={t('notif.markAll')} onPress={hepsiniOku} disabled={!okunmamis} /> : null} />
      {govde}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  orta: { flex: 1, justifyContent: 'center', paddingHorizontal: layout.gutter },
  bos: { paddingTop: space[40], paddingHorizontal: layout.gutter },
  cipler: { paddingHorizontal: layout.gutter, paddingTop: space[12], gap: space[8] },
  bolum: { paddingHorizontal: layout.gutter, paddingTop: space[20], paddingBottom: space[4] },
  eylem: { flexDirection: 'row', marginTop: space[8] },
});
