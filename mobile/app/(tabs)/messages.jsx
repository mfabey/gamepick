// ─────────────────────────────────────────────────────────────────────────────
// Mesajlar — konuşma listesi (G-18, kit s4.py messages()).
//
// ARTIK BİR SEKME, yığın ekranı değil. Haberler'in yerini aldı: alt
// navigasyon uygulamanın kendini nasıl tanıttığı yer, orada bir mesaj
// simgesi olması "burası insanların konuştuğu bir yer" diyor.
//
// Mesajlaşma YALNIZCA arkadaşlar arasında. Bu, yabancıdan gelen spam'i kökten
// kapatan kural; sunucu da aynı kuralı uyguluyor (NOT_FRIENDS). Başlıktaki
// kalem bu yüzden bir "yeni mesaj" kompozitörü değil, ARKADAŞ LİSTESİ açıyor:
// yazılabilecek kişi kümesi zaten orası.
//
// ── TASARIMDA OLUP BURADA ÇİZİLMEYENLER ──
// Hepsinin tek sebebi aynı: sunucu o veriyi vermiyor, uydurmuyoruz.
//   · SAYAÇ ROZETİ (2, 5): `/api/social/chat/list` okunmamışı BOOLEAN
//     veriyor (`meta.lastAt > readAt`), adet değil. Sayaç yerine nokta.
//   · OKUNDU TİKLERİ (✓/✓✓) ve "Sen:" öneki: ikisi de son mesajın kimden
//     geldiğini bilmeyi ister; `lastFrom` yanıtta yok (chat-store'da var,
//     route'ta haritalanmıyor).
//   · YAZIYOR göstergesi: yazma bildirimi konuşma ekranının kanalında,
//     listede yok.
//   · GRUPLAR ve İSTEKLER çipleri: grup sohbeti yok ve arkadaş dışı mesaj
//     zaten sunucuda reddediliyor — istek kutusu diye bir şey yok.
//
// Çevrimiçi şeridi ve arama YENİ AĞ İSTEĞİ AÇMIYOR: ikisi de bu ekranın
// zaten çektiği konuşma listesinden hesaplanıyor (`presence` alanı ve
// istemci içi süzme).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import { getChatList } from '../../src/api/social';
import { useQuery } from '../../src/hooks/useQuery';
import { getSession, subscribeSession } from '../../src/services/session';
import { refreshUnread } from '../../src/services/unread';
import EmptyState from '../../src/components/EmptyState';
import { Rail } from '../../src/components/ui/GameCards';
import { PageHeader } from '../../src/components/ui/Navigation';
import { Chip, IconButton, PressableScale, Txt } from '../../src/components/ui/Primitives';
import { SearchField } from '../../src/components/ui/SearchField';
import { MessageRow, UserAvatar } from '../../src/components/ui/Social';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { component as K, layout } from '../../src/theme/tokens';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

// Modul duzeyinde: satir ici verilseydi her render'da yeni kimlik olurdu.
const anahtar = (r) => r.cid;
const cevrimiciAnahtar = (r) => r.cid;

/** Kısa zaman: bugünse saat, bu haftaysa gün, değilse tarih. */
function shortTime(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US';
  if (sameDay) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000) return d.toLocaleDateString(loc, { weekday: 'short' });
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}

/** Satırın adı — profil yoksa kullanıcı adı, o da yoksa soru işareti. */
const adiOf = (r) => r.other.displayName || r.other.username || '?';

export default function MessagesScreen() {
  const tabBosluk = useTabBosluk();
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  // Sekmeye tekrar basınca listeyi başa sar (diğer sekmelerle aynı davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  // ── ÖNCE ÖNBELLEK, SONRA AĞ (SWR) ──
  //
  // Öncesi elle state'ti: her odaklanmada `loading` true'ya dönüyordu ve
  // sohbetten geri dönen kullanıcı listeyi görmeden önce bir ağ turu
  // bekliyordu. Ölçülen maliyet FPS değil, ALGILANAN GECİKME — liste zaten
  // bir saniye önce ekrandaydı.
  //
  // `useQuery` önbellekteki veriyi ANINDA veriyor, tazelemeyi arkada
  // yapıyor ve aynı anahtardaki istekleri tekilleştiriyor.
  //
  // ANAHTAR UID İÇERİYOR — bu ŞART, süs değil: queryCache diske yazıyor
  // (AsyncStorage) ve `clearQueryCache` hiçbir yerden çağrılmıyor. Anahtar
  // hesaba kapsanmasaydı çıkış yapıp başka hesapla girenin karşısına ÖNCEKİ
  // hesabın konuşma listesi çıkardı.
  const uid = session?.user?.uid || null;
  const { data, error: qErr, loading, refetch } = useQuery(
    uid ? `chat:list:${uid}` : null,
    getChatList,
    { ttl: 30 * 1000 },
  );
  const rows = data ? (data.conversations || []) : null;
  const error = qErr ? (qErr.code || 'UNKNOWN') : null;

  // Elle çekme yenilemesi. `useQuery`nin `isValidating`i kullanılamaz: o
  // ARKA PLAN tazelemesinde de true, yani her odaklanmada çekme göstergesi
  // yanıp sönerdi. Gösterge yalnız kullanıcı çektiğinde dönmeli.
  const [refreshing, setRefreshing] = useState(false);
  const cek = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  // Sohbetten geri dönünce liste TAZELENMELİ: son mesaj ve okundu durumu
  // değişmiş olabilir. useEffect tek başına bunu yakalamıyor.
  //
  // Artık SPINNER YOK: eldeki liste ekranda kalıyor, tazeleme arkada.
  //
  // Sekme rozeti de burada tazeleniyor: bir sohbet okunduğunda sekme
  // indeksi değişmiyor, dolayısıyla çubuğun kendi tetikleyicisi çalışmıyor.
  useFocusEffect(useCallback(() => {
    if (uid) { refetch(); refreshUnread(); }
  }, [uid, refetch]));

  // ── ARAMA VE SÜZGEÇ — İKİSİ DE İSTEMCİDE ──
  // Sunucuda konuşma araması diye bir uç yok ve liste zaten en fazla 40
  // satır (listConversations limit=40): ağ turu açmak bu boyda saf kayıp.
  const [q, setQ] = useState('');
  const [suzgec, setSuzgec] = useState('all');   // all | unread
  const okunmamisSayi = rows ? rows.filter((r) => r.unread).length : 0;

  // Süzgeç çipi okunmamış kalmayınca kendiliğinden düşüyor: aksi hâlde
  // "Okunmamış (0)" seçiliyken liste boş kalır ve kullanıcı ekranı bozuk
  // sanır.
  useEffect(() => {
    if (suzgec === 'unread' && !okunmamisSayi) setSuzgec('all');
  }, [suzgec, okunmamisSayi]);

  const gorunen = useMemo(() => {
    if (!rows) return null;
    const aranan = q.trim().toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US');
    return rows.filter((r) => {
      if (suzgec === 'unread' && !r.unread) return false;
      if (!aranan) return true;
      const ad = adiOf(r).toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US');
      const son = (r.lastText || '').toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US');
      return ad.includes(aranan) || son.includes(aranan);
    });
  }, [rows, q, suzgec, lang]);

  // Çevrimiçi şeridi ELDEKİ VERİDEN: `presence` konuşma listesiyle birlikte
  // geliyor (route'ta getPresences ile paralel çekiliyor). `presence: null`
  // = kullanıcı durumunu paylaşmıyor, o kişi şeritte hiç görünmüyor.
  //
  // Alt yazı tasarımda oynanan oyun; O VERİ BU UÇTA YOK ve oyun adı uydurmak
  // en kötü yalan olurdu. Tasarımın kendi örneğinde de oyunu bilinmeyen kişi
  // "Çevrimiçi" yazıyor — aynısı yapılıyor.
  const cevrimici = useMemo(
    () => (rows || []).filter((r) => r.presence?.online),
    [rows],
  );

  // Satir icindeki `() => router.push(...)` her render'da her satir icin yeni
  // bir closure uretiyordu; memo'lansa bile tutmazdi.
  const sohbetAc = useCallback((r) => router.push(`/chat/${r.other.uid}`), [router]);

  const satirCiz = useCallback(
    ({ item }) => <ConversationRow item={item} t={t} lang={lang} onPress={sohbetAc} />,
    [t, lang, sohbetAc],
  );
  const karoCiz = useCallback(
    ({ item }) => (
      <PressableScale accessibilityRole="button" accessibilityLabel={adiOf(item)}
        onPress={() => sohbetAc(item)} style={s.tile}>
        <UserAvatar avatar={item.other.avatar} name={adiOf(item)} size={M.tile.avatar} online />
        <Txt variant="captionStrong" numberOfLines={1} style={[s.tileText, s.tileName]}>{adiOf(item)}</Txt>
        <Txt variant="caption2Medium" numberOfLines={1} style={[s.tileText, { color: colors.text3 }]}>
          {t('msg.onlineNow')}
        </Txt>
      </PressableScale>
    ),
    [sohbetAc, t, colors.text3],
  );

  let body = null;
  if (!session) {
    body = <EmptyState icon="userplus" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = <View style={s.center}><ActivityIndicator color={colors.text2} /></View>;
  // HATA EKRANI YALNIZ ELDE VERİ YOKKEN. SWR'de bir ağ hatası, önbellekte
  // duran geçerli listeyi geçersiz kılmıyor: bağlantı gidince kullanıcıyı
  // dolu bir listeden boş bir hata ekranına düşürmek gerileme olurdu.
  } else if (error && !rows) {
    body = <EmptyState icon="wifioff" title={t('common.error')} text={t('common.errorText')}
      actionLabel={t('common.retry')} onAction={refetch} />;
  } else if (!rows?.length) {
    body = <EmptyState icon="msg" title={t('msg.empty')} text={t('msg.emptyText')}
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/friends')} />;
  }

  // Arama ve çevrimiçi şeridi YALNIZ DOLU LİSTEDE: boş bir listede "ara"
  // kutusu aranacak bir şey olduğunu ima eder.
  const ust = rows?.length ? (
    <View style={s.head}>
      <View style={s.search}>
        <SearchField value={q} onChangeText={setQ} placeholder={t('msg.search')}
          onClear={q ? () => setQ('') : undefined} returnKeyType="search" />
      </View>

      {cevrimici.length ? (
        <View style={s.online}>
          <Txt variant="footnoteStrong" style={[s.pad, s.onlineLabel, { color: colors.text2 }]}>
            {t('msg.onlineNow')}
          </Txt>
          <Rail kind="online" data={cevrimici} renderItem={karoCiz} keyExtractor={cevrimiciAnahtar} initialNumToRender={6} />
        </View>
      ) : null}

      {/* Çipler yalnız okunmamış varken: tek başına "Tümü" ölü bir düğme. */}
      {okunmamisSayi ? (
        <View style={[s.pad, s.chips]}>
          <Chip title={t('msg.filterAll')} selected={suzgec === 'all'} onPress={() => setSuzgec('all')} />
          <Chip title={t('msg.filterUnread').replace('{n}', okunmamisSayi)}
            selected={suzgec === 'unread'} onPress={() => setSuzgec('unread')} />
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Geri düğmesi YOK: burası artık bir sekme kökü, geri dönülecek bir
          yer yok. Başlık listenin DIŞINDA: kolona kendi hizalanıyor. */}
      <View style={{ marginHorizontal: yan }}>
        <PageHeader title={t('msg.title')}>
          {/* Kitteki ikon `pen` (yazma kutusu), `edit` değil. */}
          <IconButton icon="pen" label={t('msg.new')} onPress={() => router.push('/friends')} />
        </PageHeader>
      </View>

      {body || (
        <FlashList
          ref={listRef}
          onScroll={onTabScroll}
          scrollEventThrottle={16}
          data={gorunen}
          keyExtractor={anahtar}
          ListHeaderComponent={ust}
          // Arama sonuç vermediğinde liste boş kalıyor; sessiz boşluk
          // "bağlantı gitti" gibi okunur.
          ListEmptyComponent={
            <Txt variant="footnote" style={[s.pad, s.bos, { color: colors.text3 }]}>
              {t('games.noResults')}
            </Txt>
          }
          contentContainerStyle={{ paddingBottom: tabBosluk, paddingHorizontal: yan }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={cek} tintColor={colors.text2} />
          }
          renderItem={satirCiz}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Konuşma satırı — kit msg_row(): 72 pt, 52 avatar, ad 16 (okunmamışta 700),
// saat 12 (okunmamışta kırmızı/600), önizleme 14.
//
// Okunmamış işareti NOKTA: sunucu adet vermiyor (bkz. dosya başı).
// ─────────────────────────────────────────────────────────────────────────────
function ConversationRow({ item, onPress, t, lang }) {
  // Metinsiz medya mesajında sunucu `lastKind` gönderiyor; etiket burada
  // çevriliyor çünkü kullanıcının dili sunucuda değil, istemcide belli.
  // Metin varsa metin kazanır.
  const onizleme = item.lastText
    ? item.lastText
    : item.lastKind === 'gif'   ? `🖼️ ${t('msg.gif')}`
    : item.lastKind === 'reel'  ? `🎬 ${t('msg.sharedReel')}`
    : item.lastKind === 'video' ? `🎬 ${t('msg.video')}`
    : item.lastKind === 'photo' ? `📷 ${t('msg.photo')}`
    : '';

  return (
    <MessageRow
      avatar={item.other.avatar}
      name={adiOf(item)}
      preview={onizleme}
      time={shortTime(item.lastAt, lang)}
      unread={!!item.unread}
      // presence null = kullanıcı durumunu paylaşmıyor → nokta yok.
      online={!!item.presence?.online}
      onPress={() => onPress?.(item)}
    />
  );
}

const M = K.messages;
const s = StyleSheet.create({
  safe: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { paddingBottom: M.listTop },
  search: { marginTop: M.searchTop, height: M.searchHeight, paddingHorizontal: layout.gutter },
  online: { marginTop: M.onlineTop },
  onlineLabel: { height: M.onlineLabel, marginBottom: M.onlineRailTop },
  tile: { width: M.tile.width, alignItems: 'center' },
  tileText: { width: M.tile.width, textAlign: 'center' },
  tileName: { marginTop: M.tile.nameTop },
  chips: { marginTop: M.chipsTop, height: M.chipsHeight, flexDirection: 'row', gap: 8 },
  bos: { paddingVertical: 24, textAlign: 'center' },
});
