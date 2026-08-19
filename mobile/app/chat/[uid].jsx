// ─────────────────────────────────────────────────────────────────────────────
// Sohbet ekranı — birebir mesajlaşma.
//
// LİSTE TERS ÇEVRİLMİŞ (inverted) ve veri EN YENİ BAŞTA geliyor. Sunucu da
// aynı düzende saklıyor (LPUSH), yani hiçbir yerde ters çevirme yapılmıyor.
//
// TEKİLLEŞTİRME ŞART: Pusher, mesajı gönderenin kendi kanalına da düşürüyor.
// Gönderim yanıtındaki mesajı yerel olarak eklediğimiz için aynı mesaj iki kez
// gelir; kimliğe göre elenmezse ekranda çift görünür.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Keyboard, Clipboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  getChat, sendChat, uploadChatMedia, deleteChatMessage, pingPresence, sendTyping,
  likeChatMessage, pinChatMessage,
} from '../../src/api/social';
import { subscribeDM, chatCapabilities } from '../../src/services/realtime';
import { setActiveChat, dismissChatNotifications } from '../../src/notifications';
import { getSession, subscribeSession } from '../../src/services/session';
import EmptyState from '../../src/components/EmptyState';
import ReportSheet from '../../src/components/ReportSheet';
import MessageMenu from '../../src/components/MessageMenu';
import GifPicker from '../../src/components/GifPicker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getAvatarPreset } from '../../src/utils/avatar';
import { REACTIONS, reactionList } from '../../src/services/reactions';
import { radius, spacing, type, PRESSED, motion } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';

// expo-video: `allowsFullscreen` kullanimdan kalkti, karsiligi
// `fullscreenOptions.enable`. Modul duzeyinde: JSX icinde nesne yazmak
// her render'da yenisini uretirdi.
const TAM_EKRAN_ACIK = { enable: true };

const MAX_TEXT = 1000;

/**
 * Metinsiz mesajin etiketi — '📷 Fotoğraf' gibi.
 *
 * Tür SUNUCUDAN geliyor (`kind`), çeviri BURADA: kullanıcının dili
 * sunucuda belli değil. Hem yanıt çubuğu hem baloncuktaki alıntı aynı
 * etiketi kullanıyor.
 */
function kindLabel(x, t) {
  // Paylaşımın türü artık ÜÇ olabilir; `share.kind` sunucudan geliyor.
  // Eskiden `share` taşıyan her mesaj "fragman" sayılıyordu ve oyun ya da
  // haber gönderilince yanlış şey vaat ediyordu.
  const k = x?.kind || (x?.gif ? 'gif' : x?.share ? (x.share.kind || 'reel')
    : x?.media ? (x.media.type?.startsWith('video/') ? 'video' : 'photo') : null);
  return k === 'gif'   ? `🖼️ ${t('msg.gif')}`
    : k === 'reel'     ? `🎬 ${t('msg.sharedReel')}`
    : k === 'game'     ? `🎮 ${t('share.game')}`
    : k === 'news'     ? `📰 ${t('share.news')}`
    : k === 'video'    ? `🎬 ${t('msg.video')}`
    : k === 'photo'    ? `📷 ${t('msg.photo')}`
    : '';
}

/** Bu mesaja BEN hangi tepkiyi verdim? (yoksa null) */
function myReactionOf(msg, myUid) {
  const r = msg?.reactions;
  if (!r || typeof r !== 'object' || !myUid) return null;
  for (const [emoji, list] of Object.entries(r)) {
    if (Array.isArray(list) && list.includes(myUid)) return emoji;
  }
  return null;
}

/**
 * "Son görülme" etiketi.
 *
 * DAKİKA HASSASİYETİ YOK. "3 dakika önce" gibi bir ifade, kişinin ne zaman
 * telefonuna baktığını dakika dakika bildirmek demek — istenen bilgi bu değil,
 * "yakınlarda mıydı" bilgisi. Bugün / dün / tarih yeterli ve daha az açık ediyor.
 */
function lastSeenLabel(ts, t, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US';

  if (d.toDateString() === now.toDateString()) {
    return `${t('msg.lastSeen')} ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
  }
  const dun = new Date(now);
  dun.setDate(now.getDate() - 1);
  if (d.toDateString() === dun.toDateString()) return `${t('msg.lastSeen')} ${t('msg.yesterday')}`;

  return `${t('msg.lastSeen')} ${d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`;
}

export default function ChatScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();

  const { uid } = useLocalSearchParams();
  const other = String(uid || '');

  // Bu sohbet açıkken o kişiden gelen bildirim GÖSTERİLMİYOR — mesaj zaten
  // ekranda beliriyor. Temizlik şart: ekran kapandıktan sonra da susturmak
  // gerçek bildirimleri kaybettirirdi.
  //
  // `other` TANIMINDAN SONRA olmak zorunda: önce yukarıdaydı ve `other`'a
  // tanımlanmadan erişiyordu (geçici ölü bölge hatası).
  useEffect(() => {
    setActiveChat(other);
    // Bu kişiden gelen ESKİ bildirimleri merkezden düşür. Mesajı okumak
    // bildirimi kendiliğinden kaldırmıyor; kullanıcı okuduktan sonra da
    // bildirimi görmeye devam ediyordu.
    dismissChatNotifications(other);
    return () => setActiveChat(null);
  }, [other]);

  // Klavye açıkken alt güvenli alan dolgusu KALDIRILMALI: KeyboardAvoidingView
  // zaten klavye yüksekliği kadar itiyor, üstüne ana ekran çizgisi payını da
  // eklersek arada boşluk kalıyor.
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [msgs, setMsgs]     = useState([]);
  const [peer, setPeer]     = useState(null);
  const [cid, setCid]       = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText]     = useState('');
  const [sending, setSending] = useState(false);
  // Raporlama hedefi METİN olarak tutuluyor, boolean değil: başlıktaki düğme
  // KONUŞMAYI, mesaj menüsü ise TEK MESAJI raporluyor. İki ayrı state yerine
  // tek hedef, iki çağıran.
  const [reportTarget, setReportTarget] = useState(null);
  const [gifOpen, setGifOpen] = useState(false);
  // Uzun basılan mesaj: { msg, mine, anchor }. `anchor` baloncuğun pencere
  // koordinatı — menü ona tutturuluyor.
  const [menu, setMenu] = useState(null);
  // Yanıtlanan mesaj: gönderim kutusunun üstünde önizlemesi duruyor.
  // TAM MESAJ tutuluyor, yalnızca kimlik değil — önizlemeyi çizmek için
  // metin ve yazar gerekiyor ve mesaj zaten elimizde.
  const [replyTo, setReplyTo] = useState(null);
  // Sabit mesaj — konuşma başına tek, iki taraf da değiştirebiliyor.
  // Sunucu her geçmiş yanıtında gönderiyor; sayfalamadan bağımsız.
  const [pinned, setPinned] = useState(null);
  // Kompozitör yetenekleri sunucudan geliyor: fotoğraf ve GIF gönderimi
  // ortam değişkenlerine bağlı ve istemcinin bunu bilmesinin başka yolu yok.
  //
  // BAŞLANGIÇ HEPSİ KAPALI — yanıt gelene kadar düğme göstermek, bir an
  // görünüp kaybolan düğme demek olurdu.
  const [caps, setCaps] = useState({ photos: false, videos: false, gifs: false });
  useEffect(() => { chatCapabilities().then(setCaps).catch(() => {}); }, []);
  // Karşı tarafın en son okuma zamanı. Kendi mesajlarımdan `at`'i bundan
  // küçük veya eşit olanlar görülmüş sayılıyor.
  const [otherReadAt, setOtherReadAt] = useState(0);
  const [presence, setPresence] = useState(null);   // null = paylaşmıyor
  // Karsi taraf yaziyor: SURE DAMGASI tutuluyor, boolean degil. Boolean
  // olsaydi "yaziyor" olayindan sonra kapatan bir zamanlayici gerekirdi ve
  // her yeni olay onu sifirlamak zorunda kalirdi.
  const [typingUntil, setTypingUntil] = useState(0);
  const [typingNow, setTypingNow] = useState(false);
  // Pusher bagli mi? Degilse yedek yoklama sikilasiyor.
  const liveRef = useRef(false);
  // Yoklama araligi kapanista yeniden kurulmasin diye mesajlar REF ile
  // okunuyor; bagimliliga koysaydik her mesajda yeni bir aralik acilirdi.
  const msgsRef = useRef([]);
  // Alıntıya dokununca aslına kaydırmak için (bkz. jumpTo).
  const listRef = useRef(null);

  // uid `session.user.uid` içinde. `session.uid` yazılırsa daima null olur ve
  // KENDİ mesajların da karşı tarafınmış gibi sola hizalı çizilir.
  const myUid = session?.user?.uid || null;

  useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  /** Kimliğe göre tekilleştirerek ekler; en yeni başta düzeni korunur. */
  const addMessage = useCallback((m) => {
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [m, ...cur]));
  }, []);

  /**
   * Mesajı geri alınmış olarak işaretler — LİSTEDEN ÇIKARMAZ.
   * Sunucu da aynısını yapıyor: çıkarmak sayfalamayı kaydırır ve arayüzde
   * mesaj atlanmasına yol açar.
   */
  const markDeleted = useCallback((id) => {
    setMsgs((cur) => cur.map((m) => (
      m.id === id ? { id: m.id, from: m.from, at: m.at, deleted: true } : m
    )));
  }, []);

  /**
   * Tepkileri yerel olarak yazar — sunucu yanıtını beklemeden.
   * Dokunuş anlık tepki vermeli; tepki yıkıcı olmayan bir eylem, ters
   * giderse sunucunun döndürdüğü nesne durumu düzeltiyor.
   */
  const setReactionsLocal = useCallback((id, reactions) => {
    setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, reactions } : m)));
  }, []);

  /**
   * Tepki ver / kaldır.
   *
   * KİŞİ BAŞINA TEK TEPKİ — sunucudaki kuralın istemci aynası. Yerel tahmini
   * sunucuyla aynı mantıkla kurmak zorundayız, yoksa iyimser güncelleme bir
   * an farklı bir şey gösterip sunucu yanıtı gelince zıplar.
   */
  const react = useCallback(async (msg, emoji = REACTIONS[0]) => {
    if (!msg?.id || msg.deleted || String(msg.id).startsWith('tmp-')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const cur = msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {};
    const zatenVar = (cur[emoji] || []).includes(myUid);

    // Önce her emojiden çık, sonra (basılan emojide değildiysem) ekle.
    const next = {};
    for (const [e, list] of Object.entries(cur)) {
      const kalan = list.filter((u) => u !== myUid);
      if (kalan.length) next[e] = kalan;
    }
    if (!zatenVar) next[emoji] = [...(next[emoji] || []), myUid];
    setReactionsLocal(msg.id, next);

    try {
      const r = await likeChatMessage(other, msg.id, emoji);
      if (r?.reactions && typeof r.reactions === 'object') setReactionsLocal(msg.id, r.reactions);
    } catch {
      // Sunucu reddetti — yerel değişikliği geri al.
      setReactionsLocal(msg.id, cur);
    }
  }, [myUid, other, setReactionsLocal]);

  const confirmDelete = useCallback((msg) => {
    // Yalnızca KENDİ mesajın; sunucu da ayrıca doğruluyor ama kullanıcıya
    // yapamayacağı bir seçenek göstermenin anlamı yok.
    if (msg.from !== myUid || msg.deleted) return;
    // ONAY KUTUSU KALIYOR, menüye rağmen. Menü bir eylem listesi; silme ise
    // geri alınamayan tek eylem ve onu tek dokunuşa indirmek yanlış olurdu.
    Alert.alert(t('msg.undoTitle'), t('msg.undoText'), [
      { text: t('msg.cancel'), style: 'cancel' },
      {
        text: t('msg.undo'),
        style: 'destructive',
        onPress: async () => {
          // İYİMSER GÜNCELLEME YOK: sunucu reddederse mesaj geri gelmeli ve
          // "silindi sandım ama silinmemiş" durumu mesajlaşmada en kötü hata.
          try {
            await deleteChatMessage(other, msg.id);
            markDeleted(msg.id);
          } catch {
            Alert.alert(t('msg.undoFailed'));
          }
        },
      },
    ]);
  }, [myUid, other, markDeleted, t]);

  /**
   * Baloncuğa uzun basıldı — menüyü aç.
   *
   * ARTIK KARŞI TARAFIN MESAJINDA DA ÇALIŞIYOR. Önceden yalnızca kendi
   * mesajıma basılabiliyordu (tek eylem silmekti); gelen bir mesajı
   * kopyalamanın ya da tek tek raporlamanın yolu yoktu.
   */
  const openMenu = useCallback((msg, mine, anchor) => {
    if (msg.deleted) return;      // geri alınmış mesajda yapılacak bir şey yok
    setMenu({ msg, mine, anchor });
  }, []);

  /**
   * Alıntıya dokununca aslına git.
   *
   * Mesaj YÜKLÜ DEĞİLSE sessizce hiçbir şey yapmıyoruz. Alternatif, o mesaja
   * kadar sayfa sayfa geri yüklemek olurdu — uzun bir bekleme ve belirsiz bir
   * kaydırma; dokunuşun karşılığı olarak ikisi de kötü.
   */
  /**
   * Sabitle / sabitlemeyi kaldır.
   *
   * İYİMSER DEĞİL: sabit iki tarafın da gördüğü ortak bir işaret ve
   * sunucu reddederse 'sabitledim sandım ama sabitlenmemiş' durumu
   * oluşurdu. Sunucunun döndürdüğü değer yazılıyor.
   */
  const togglePin = useCallback(async (msg) => {
    const kaldir = pinned?.id === msg.id;
    try {
      const r = await pinChatMessage(other, kaldir ? '' : msg.id);
      // Uç ham kaydı döndürüyor (id/by/at); banttaki metni çizmek için
      // mesajın kendisinden tamamlıyoruz — ikinci bir istek gerekmesin.
      setPinned(r?.pinned
        ? { ...r.pinned, from: msg.from, text: msg.text || '',
            kind: msg.gif ? 'gif' : msg.share ? 'reel'
              : msg.media ? (msg.media.type?.startsWith('video/') ? 'video' : 'photo') : null }
        : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert(t('msg.pinFailed'));
    }
  }, [other, pinned, t]);

  const jumpTo = useCallback((id) => {
    const i = msgsRef.current.findIndex((m) => m.id === id);
    if (i < 0) return;
    Haptics.selectionAsync().catch(() => {});
    // viewPosition 0.5 = ekranın ortası. Tepeye yaslamak, ters çevrilmiş
    // listede mesajı klavyenin altında bırakabiliyor.
    listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 });
  }, []);

  /**
   * Menü satırları. Mesajın TÜRÜNE göre kuruluyor: yapılamayacak bir eylemi
   * soluk göstermek yerine hiç göstermiyoruz — soluk satır "neden çalışmıyor"
   * sorusunu doğuruyor, olmayan satır soru doğurmuyor.
   *
   * Yanıtla / Sabitle / Çevir buraya eklenecek; menü onları taşıyacak
   * şekilde kuruldu (bkz. MessageMenu — satır sayısı yüksekliği belirliyor).
   */
  const menuActions = useCallback(({ msg, mine }) => {
    const rows = [];
    if (msg.text) {
      rows.push({
        key: 'copy', icon: 'copy-outline', label: t('msg.copy'),
        onPress: () => {
          Clipboard.setString(msg.text);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        },
      });
    }
    // YANITLA en üstte: menünün en sık kullanılan eylemi ve iOS bağlam
    // menülerinde de ilk sırada duruyor.
    rows.unshift({
      key: 'reply', icon: 'arrow-undo-outline', label: t('msg.reply'),
      onPress: () => setReplyTo(msg),
    });
    // SABİTLE her iki tarafın mesajında da var: sabit ortak bir işaret,
    // kimin yazdığıyla ilgisi yok.
    rows.push({
      key: 'pin',
      icon: pinned?.id === msg.id ? 'pin' : 'pin-outline',
      label: pinned?.id === msg.id ? t('msg.unpin') : t('msg.pin'),
      onPress: () => togglePin(msg),
    });
    if (mine) {
      rows.push({
        key: 'delete', icon: 'trash-outline', label: t('msg.undo'),
        destructive: true, onPress: () => confirmDelete(msg),
      });
    } else {
      rows.push({
        key: 'report', icon: 'flag-outline', label: t('msg.reportMessage'),
        destructive: true, onPress: () => setReportTarget(`${cid || other}:${msg.id}`),
      });
    }
    return rows;
  }, [t, confirmDelete, cid, other, pinned, togglePin]);

  useEffect(() => {
    if (!session || !other) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const r = await getChat(other);
        if (!alive) return;
        setMsgs(r?.messages || []);
        setPinned(r?.pinned || null);
        setPeer(r?.other || null);
        setCid(r?.cid || null);
        setOtherReadAt(r?.otherReadAt || 0);
        setPresence(r?.presence ?? null);
        if (r?.otherTyping) setTypingUntil(Date.now() + 5000);
        setError(null);
      } catch (e) {
        if (alive) setError(e?.code || 'UNKNOWN');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [session, other]);

  // Anlık teslim. Abonelik cid ÇÖZÜLDÜKTEN sonra kuruluyor; temizlik şart,
  // aksi hâlde ekran kapandıktan sonra kanal açık kalır.
  useEffect(() => {
    if (!cid) return;
    let off = null;
    let alive = true;
    // Karşı taraf mesajını geri alırsa açık ekran da anında güncellensin.
    subscribeDM(
      cid,
      addMessage,
      (p) => markDeleted(p?.id),
      // KENDİ okuma olayımı ELEMEK ŞART: olay iki tarafa da düşüyor ve
      // filtrelenmezse kendi mesajlarıma "görüldü" koyarım.
      (p) => { if (p?.by && p.by !== myUid) setOtherReadAt((cur) => Math.max(cur, p.at || 0)); },
      // Kendi yazma olayimi ele: kanal iki tarafli.
      (p) => { if (p?.by && p.by !== myUid) setTypingUntil(Date.now() + 4000); },
      // Tepki HER İKİ TARAFTAN da gelebilir; kendi olayımı elemiyorum
      // çünkü sunucunun döndürdüğü nesne zaten doğru olan.
      //
      // `reactions` YOKSA `likes`e düşüyoruz: sunucu güncellenmeden önce
      // dağıtılan bir uygulamada olay yalnızca eski alanı taşıyor olabilir.
      (p) => {
        if (!p?.id) return;
        if (p.reactions && typeof p.reactions === 'object') setReactionsLocal(p.id, p.reactions);
        else if (Array.isArray(p.likes)) setReactionsLocal(p.id, p.likes.length ? { [REACTIONS[0]]: p.likes } : {});
      },
    ).then((r) => {
      liveRef.current = !!r?.live;
      if (alive) off = r?.off; else r?.off?.();
    });
    return () => { alive = false; off?.(); };
  }, [cid, addMessage, markDeleted, myUid, setReactionsLocal]);

  // ── YEDEK YOKLAMA ──
  // Sohbet TEK BIR DIS SERVISE bagimli olmamali. Pusher yapilandirilmamissa
  // (veya baglanti dustuyse) mesajlar yalnizca ekran yeniden acilinca
  // goruluyordu; kullanicinin yasadigi hata tam olarak buydu.
  //
  // Pusher bagliyken de yavas bir tur donuyor: emniyet agi. Kanal sessizce
  // dusebilir ve bunu istemci fark etmez.
  useEffect(() => {
    if (!session || !other || loading) return;
    let alive = true;
    const tick = async () => {
      // En yeni mesajin zamani; sunucudan YALNIZCA farki istiyoruz.
      const newest = msgsRef.current[0]?.at || 0;
      try {
        const r = await getChat(other, undefined, newest || undefined);
        if (!alive) return;
        (r?.messages || []).forEach(addMessage);
        // Sabit her yanıtta geliyor; karşı taraf değiştirdiyse yoklama
        // bunu yakalıyor (anlık bildirim yok, bkz. pin ucu).
        setPinned(r?.pinned || null);
        if (r?.otherReadAt) setOtherReadAt((c) => Math.max(c, r.otherReadAt));
        if (r?.presence !== undefined) setPresence(r.presence);
        // YALNIZCA Pusher YOKKEN: Pusher bagliyken yoklama 20 saniyede bir
        // donuyor ve taze bir "yaziyor" durumunu yanlislikla silebilirdi.
        if (!liveRef.current) {
          setTypingUntil(r?.otherTyping ? Date.now() + 5000 : 0);
        }
      } catch { /* cevrimdisi — sonraki turda duzelir */ }
    };
    const id = setInterval(tick, liveRef.current ? 20000 : 4000);
    return () => { alive = false; clearInterval(id); };
  }, [session, other, loading, addMessage]);

  // ── Çevrimiçi nabzı ──
  // Ekran açıkken 45 saniyede bir. Sunucudaki eşik 90 saniye, yani bir nabız
  // kaçsa bile durum titremiyor. Ekran kapanınca aralık temizleniyor —
  // aksi hâlde uygulama arka plandayken de "çevrimiçi" görünürdük.
  useEffect(() => {
    if (!session || !other) return;
    let alive = true;
    const beat = async () => {
      try {
        const r = await pingPresence(other);
        if (alive && r?.presence !== undefined) setPresence(r.presence);
      } catch { /* çevrimdışı — sonraki nabızda düzelir */ }
    };
    const id = setInterval(beat, 45000);
    return () => { alive = false; clearInterval(id); };
  }, [session, other]);

  // "Yaziyor" 4 saniye sonra kendiliginden sonuyor. Karsi taraf yazmayi
  // birakinca ayrica bir "durdu" olayi gondermeye gerek yok — bir olay
  // daha az, bir yaris kosulu daha az.
  useEffect(() => {
    if (!typingUntil) { setTypingNow(false); return; }
    const kalan = typingUntil - Date.now();
    if (kalan <= 0) { setTypingNow(false); return; }
    setTypingNow(true);
    const id = setTimeout(() => setTypingNow(false), kalan);
    return () => clearTimeout(id);
  }, [typingUntil]);

  // Yazarken karsi tarafa haber ver — EN FAZLA 3 saniyede bir.
  const lastTypingRef = useRef(0);
  const onChangeText = useCallback((v) => {
    setText(v);
    const now = Date.now();
    if (v && now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now;
      sendTyping(other).catch(() => {});
    }
  }, [other]);

  /**
   * İYİMSER GÖNDERİM.
   *
   * Metin ANINDA temizleniyor ve baloncuk hemen listeye giriyor; sunucu
   * yanıtı beklenmiyor. Önce beklenirdi ve yazdığın şey kutuda asılı kalıyordu
   * — mesajlaşmada en çok hissedilen yavaşlık buydu.
   *
   * SİLMEDE İYİMSER DAVRANMIYORUZ ama göndermede davranıyoruz. Fark şu:
   * silme yıkıcı ve geri alınamaz, "sildim sandım" en kötü hata. Gönderim
   * ise başarısız olursa baloncuk EKRANDA KALIYOR ve hata işareti alıyor —
   * kullanıcı ne olduğunu görüyor, hiçbir şey kaybolmuyor.
   */
  const send = useCallback(async () => {
    const body = text.trim();
    if (!body) return;

    // Geçici kimlik: sunucu gerçeğini döndürünce bununla değiştiriliyor.
    const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const optimistic = { id: tempId, from: myUid, text: body, at: Date.now(), pending: true };
    // İYİMSER ALINTI: sunucu `quote`u yanıtla döndürüyor ama baloncuk o ana
    // kadar alıntısız kalırsa mesaj gönderilir gönderilmez bağlamını
    // kaybediyor. Yerel kopya yalnızca çizim için; sunucu yanıtı üzerine yazıyor.
    const yanit = replyTo;
    if (yanit) {
      optimistic.replyTo = yanit.id;
      optimistic.quote = {
        id: yanit.id, from: yanit.from,
        text: yanit.text ? yanit.text.slice(0, 120) : '',
        kind: yanit.gif ? 'gif' : yanit.share ? 'reel'
          : yanit.media ? (yanit.media.type?.startsWith('video/') ? 'video' : 'photo') : null,
      };
    }

    setText('');
    setReplyTo(null);
    addMessage(optimistic);
    Haptics.selectionAsync().catch(() => {});

    try {
      const r = await sendChat(other, body, undefined, undefined, undefined, yanit?.id);
      // Geçici baloncuğu gerçeğiyle değiştir. Kaldırıp yeniden eklemek
      // listede zıplama yaratırdı.
      if (r?.message) {
        setMsgs((cur) => cur.map((m) => (m.id === tempId ? r.message : m)));
      }
    } catch (e) {
      // Baloncuk KALIYOR, hata işaretiyle. Kaldırsaydık kullanıcı yazdığı
      // metni de kaybederdi.
      setMsgs((cur) => cur.map((m) => (
        m.id === tempId ? { ...m, pending: false, failed: true } : m
      )));
      // Sunucu kodlarını kullanıcı diline çeviriyoruz — ham kod göstermek
      // kullanıcıya hiçbir şey anlatmaz.
      const code = e?.code;
      Alert.alert(
        code === 'TEXT_INAPPROPRIATE' ? t('msg.inappropriate')
          : code === 'TEXT_TOO_LONG'  ? t('msg.tooLong')
          : code === 'NOT_FRIENDS'    ? t('msg.notFriends')
          : code === 'BLOCKED'        ? t('msg.blocked')
          : t('msg.sendFailed')
      );
    }
  }, [text, other, myUid, addMessage, replyTo, t]);

  /**
   * GIF gönder — İYİMSER, metin gönderimiyle aynı mantık.
   * GIF bizim depomuza inmiyor, o yüzden yükleme adımı yok: sağlayıcının
   * doğrudan mesaja iliştiriliyor.
   */
  const sendGif = useCallback(async (g) => {
    setGifOpen(false);
    const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const optimistic = {
      id: tempId, from: myUid, text: '', at: Date.now(), pending: true,
      gif: { url: g.url, w: g.w, h: g.h },
    };
    // Yanıt kipindeysek alıntıyı iyimser olarak da taşıyoruz (bkz. send).
    const yanit = replyTo;
    if (yanit) {
      optimistic.replyTo = yanit.id;
      optimistic.quote = {
        id: yanit.id, from: yanit.from,
        text: yanit.text ? yanit.text.slice(0, 120) : '',
        kind: yanit.gif ? 'gif' : yanit.share ? 'reel'
          : yanit.media ? (yanit.media.type?.startsWith('video/') ? 'video' : 'photo') : null,
      };
    }
    setReplyTo(null);
    addMessage(optimistic);
    Haptics.selectionAsync().catch(() => {});

    try {
      const r = await sendChat(other, '', undefined, undefined, { url: g.url, w: g.w, h: g.h }, yanit?.id);
      if (r?.message) setMsgs((cur) => cur.map((m) => (m.id === tempId ? r.message : m)));
    } catch {
      setMsgs((cur) => cur.map((m) => (
        m.id === tempId ? { ...m, pending: false, failed: true } : m
      )));
    }
  }, [other, myUid, addMessage, replyTo]);

  /**
   * Galeriden görsel seç, KÜÇÜLT, yükle, mesaj olarak gönder.
   *
   * Küçültme şart, kozmetik değil: sunucusuz işlevlerde istek gövdesi 4,5 MB
   * ile sınırlı ve modern telefonların ham fotoğrafı bunu rahatça aşıyor.
   * 1600 piksel genişlik + 0,7 kalite tipik olarak 300-600 KB veriyor.
   */
  const pickAndSend = useCallback(async () => {
    if (sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('msg.needPhotoPerm')); return; }

    const picked = await ImagePicker.launchImageLibraryAsync({
      // Video KAPALIYKEN SEÇİCİDE DE YOK. Gösterip sunucuda reddetmek,
      // kullanıcıya sıkıştırmayı bekletip sonra hata vermek demekti —
      // garantili bir başarısızlık yolu.
      mediaTypes: caps.videos ? ['images', 'videos'] : ['images'],
      quality: 1,          // fotoğraf sıkıştırmasını biz yapıyoruz
      allowsMultipleSelection: false,
      // Video 4,5 MB sunucu sınırının ALTINDA kalmak zorunda. 15 saniye + orta
      // kalite tipik olarak 2-4 MB veriyor; sınır aşılırsa sunucu reddediyor ve
      // kullanıcıya daha kısa bir klip seçmesi söyleniyor.
      videoMaxDuration: 15,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    const asset = picked.assets[0];
    const isVideo = asset.type === 'video';

    // Yanıt kipi YÜKLEMEDEN ÖNCE okunuyor: yükleme saniyeler sürüyor ve o
    // sırada kullanıcı çubuğu kapatırsa gönderim yine doğru yanıta bağlanmalı.
    const yanitFoto = replyTo;
    setReplyTo(null);
    setSending(true);
    try {
      let uri = asset.uri;
      let mime = 'image/jpeg';

      if (isVideo) {
        // Video seçicide zaten yeniden kodlandı; burada dokunulmuyor.
        // `mimeType` bazı cihazlarda boş geliyor, uzantıdan tamamlıyoruz.
        mime = asset.mimeType
          || (uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
      } else {
        const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
        const small = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
        uri = small.uri;
      }

      const up = await uploadChatMedia(other, uri, mime);
      const r = await sendChat(other, '', { url: up.url, type: up.contentType },
                               undefined, undefined, yanitFoto?.id);
      if (r?.message) addMessage(r.message);
      Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      const code = e?.code;
      Alert.alert(
        code === 'VIDEO_DISABLED' ? t('msg.videoOff')
          : code === 'MEDIA_DISABLED' || code === 'STORAGE_DISABLED' ? t('msg.mediaOff')
          : code === 'MEDIA_REJECTED'  ? t('msg.mediaRejected')
          // Video sınırı aştığında genel "çok büyük" mesajı yardımcı olmuyor —
          // kullanıcı ne yapacağını bilmeli: daha kısa klip.
          : code === 'FILE_TOO_LARGE'  ? (isVideo ? t('msg.videoTooLong') : t('msg.mediaTooBig'))
          : t('msg.sendFailed')
      );
    } finally {
      setSending(false);
    }
  }, [sending, other, addMessage, replyTo, caps.videos, t]);

  // Goruldu isareti YALNIZCA EN YENI okunmus kendi mesajimda. Her okunmus
  // mesaja koymak sohbeti isaret cop luguna cevirir; kullanicinin bilmek
  // istedigi tek sey nereye kadar okundugu.
  const seenId = (() => {
    if (!otherReadAt || !myUid) return null;
    // Liste EN YENI BASTA; ilk eslesme en yenisi.
    const m = msgs.find((x) => x.from === myUid && !x.deleted && x.at <= otherReadAt);
    return m ? m.id : null;
  })();
  const preset = getAvatarPreset(peer?.avatar);
  const name = peer?.displayName || peer?.username || '…';

  let body = null;
  if (!session) {
    body = <EmptyState icon="person-circle-outline" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  } else if (error === 'NOT_FRIENDS') {
    body = <EmptyState icon="people-outline" title={t('msg.notFriends')} text={t('msg.notFriendsText')}
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/social')} />;
  } else if (error === 'BLOCKED') {
    body = <EmptyState icon="ban-outline" title={t('msg.blocked')} text={t('msg.blockedText')} />;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('sf.error')} text={t('sf.errorText')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {preset ? (
          <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
            <Ionicons name={preset.icon} size={16} color={preset.iconColor} />
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          {/* Durum satırı yalnızca paylaşan kullanıcılarda çiziliyor; kapalıysa
              boş satır bile bırakmıyoruz. */}
          {/* YAZIYOR, DURUMUN YERINE gecer — ikisini alt alta gostermek
              basligi sisiriyor ve "yaziyor" zaten cevrimici demek. */}
          {typingNow ? (
            <Text style={[styles.status, styles.typing]} numberOfLines={1}>{t('msg.typing')}</Text>
          ) : presence ? (
            <Text style={styles.status} numberOfLines={1}>
              {presence.online ? t('msg.online') : lastSeenLabel(presence.lastSeen, t, lang)}
            </Text>
          ) : null}
        </View>

        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   onPress={() => setReportTarget(cid || other)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.more')}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text2} />
        </Pressable>
      </View>

      {/* ── Sabit mesaj bandı ──
          KLAVYE ALANININ DIŞINDA, listenin üstünde: bant her zaman görünmeli.
          KeyboardAvoidingView'ın içine koysaydım klavye açılınca listeyle
          birlikte yukarı itilir ve başlığın altında kaybolurdu.

          Dokununca mesaja gidiyor, X sabitlemeyi kaldırıyor. Sabit ortak bir
          işaret olduğu için kaldırma da iki tarafa açık. */}
      {body ? null : pinned ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.pinBar}>
          <Pressable
            style={({ pressed }) => [styles.pinMain, pressed && PRESSED]}
            onPress={() => jumpTo(pinned.id)}
            accessibilityRole="button"
            accessibilityLabel={t('msg.pinned')}
          >
            <Ionicons name="pin" size={14} color={colors.accentText} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pinLabel}>{t('msg.pinned')}</Text>
              <Text style={styles.pinText} numberOfLines={1}>
                {pinned.text || kindLabel(pinned, t)}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pinClose, pressed && PRESSED]}
            onPress={() => togglePin({ id: pinned.id })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('msg.unpin')}
          >
            <Ionicons name="close" size={16} color={colors.text3} />
          </Pressable>
        </Animated.View>
      ) : null}

      {body || (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            ref={listRef}
            data={msgs}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listPad}
            keyboardDismissMode="interactive"
            // scrollToIndex, henüz çizilmemiş bir satır istendiğinde HATA
            // ATIYOR. Alıntıya dokunmak eski bir mesaja gidiyor ve o mesaj
            // çoğu zaman çizilmemiş oluyor — bu işleyici olmadan uygulama
            // çöker.
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              listRef.current?.scrollToOffset({
                offset: index * (averageItemLength || 64), animated: true,
              });
            }}
            renderItem={({ item }) => (
              <Bubble
                msg={item}
                mine={item.from === myUid}
                seen={item.id === seenId}
                onLongPress={openMenu}
                onReact={(emoji) => react(item, emoji)}
                onJumpTo={jumpTo}
                peerName={peer?.displayName || peer?.username || ''}
                myUid={myUid}
                // HEDEF TÜRE GÖRE: fragman ve oyun oyun detayına, haber
                // tarayıcıya. Haber zaten dış bir yazı — uygulama içinde
                // gösterecek bir ekranı yok, o yüzden "↗" davranışı.
                onOpenShare={() => {
                  const sh = item.share;
                  if (!sh) return;
                  if (sh.kind === 'news') { if (sh.url) WebBrowser.openBrowserAsync(sh.url); return; }
                  // `appid` OLMAYABİLİR: RAWG kataloğundan paylaşılan oyunda
                  // Steam karşılığı yok (bkz. lib/chat-share.js — kimlik
                  // uzayı çift anlamlı). Detay ekranı `rawg_<id>` ile
                  // açılıyor, appid'e ihtiyaç duymuyor.
                  const id = sh.gameId || (sh.appid ? `rawg_${sh.appid}` : null);
                  if (!id) return;
                  router.push({
                    pathname: '/game/[id]',
                    params: { id, appid: sh.appid || '', name: sh.name, image: sh.image || '' },
                  });
                }}
                t={t}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('msg.startText')}</Text>
              </View>
            }
          />

          {/* ── Yanıt önizlemesi ──
              Gönderme kutusunun ÜSTÜNDE, klavyeyle birlikte yükseliyor.
              Neye yanıt verdiğini yazarken görmek zorundasın; menüyü kapattıktan
              sonra tek hatırlatıcı bu.

              Kapatma düğmesi ŞART: yanlış mesaja basıp yanıt kipinde sıkışmak,
              menüyü tekrar açmaktan başka çıkışı olmayan bir tuzak olurdu. */}
          {replyTo ? (
            <Animated.View entering={FadeIn.duration(140)} style={styles.replyBar}>
              <View style={styles.replyStripe} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.replyWho} numberOfLines={1}>
                  {replyTo.from === myUid ? t('msg.replyToSelf') : (peer?.displayName || peer?.username || '')}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {replyTo.text || kindLabel(replyTo, t)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.replyClose, pressed && PRESSED]}
                onPress={() => setReplyTo(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('msg.cancel')}
              >
                <Ionicons name="close" size={17} color={colors.text2} />
              </Pressable>
            </Animated.View>
          ) : null}

          {/* ALT GUVENLI ALAN: SafeAreaView yalnizca ust kenari isliyor
              (edges={['top']}) cunku liste tepeye kadar uzanmali. Alt kenar
              burada elle veriliyor — verilmezse gonderme dugmesi ana ekran
              cizgisinin altinda kaliyordu. */}
          <View style={[
            styles.composer,
            { paddingBottom: kbVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm) },
          ]}>
            {/* DÜĞMELER YETENEĞE BAĞLI. Yapılandırma eksikken çizilmiyorlar:
                basınca "şu an kapalı" diyen bir düğme uygulamayı yarım
                gösteriyor (Guideline 2.2). Ortam değişkeni eklendiği anda
                yeni build olmadan geri geliyorlar. */}
            {caps.photos ? (
              <Pressable
                style={({ pressed }) => [styles.attachBtn, pressed && PRESSED]}
                onPress={pickAndSend}
                disabled={sending}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('msg.photo')}
              >
                <Ionicons name="image-outline" size={22} color={colors.text2} />
              </Pressable>
            ) : null}
            {caps.gifs ? (
              <Pressable
                style={({ pressed }) => [styles.attachBtn, pressed && PRESSED]}
                onPress={() => setGifOpen(true)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('msg.gif')}
              >
                <Ionicons name="happy-outline" size={22} color={colors.text2} />
              </Pressable>
            ) : null}
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={onChangeText}
              placeholder={t('msg.placeholder')}
              placeholderTextColor={colors.text3}
              maxLength={MAX_TEXT}
              multiline
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnOff,
                pressed && PRESSED,
              ]}
              onPress={send}
              disabled={!text.trim() || sending}
              hitSlop={6}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={19} color="#fff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Mesaj raporlama — Apple Guideline 1.2 kullanıcı içeriğinin
          raporlanabilir olmasını istiyor, özel mesajlar dahil. */}
      <MessageMenu
        visible={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor}
        mine={!!menu?.mine}
        actions={menu ? menuActions(menu) : []}
        onReact={(emoji) => react(menu.msg, emoji)}
        myReaction={menu ? myReactionOf(menu.msg, myUid) : null}
      />

      <GifPicker
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={sendGif}
      />

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="message"
        targetId={reportTarget || ''}
      />
    </SafeAreaView>
  );
}

function Bubble({ msg, mine, seen, onLongPress, onOpenShare, onReact, onJumpTo, myUid, peerName, t }) {
  const styles = useStyles(makeStyles);
  // Menu baloncuga TUTTURULUYOR, ekranin altina degil — hangi mesaja ait
  // oldugunu konumu soylemeli. Bunun icin baloncugun pencere koordinati
  // gerekiyor ve o ancak olculerek bulunuyor.
  //
  // Tek ref, dort dalin hepsinde: ayni anda yalnizca biri ciziliyor.
  const rowRef = useRef(null);
  const handleLongPress = useCallback(() => {
    const node = rowRef.current;
    if (!node?.measureInWindow) { onLongPress?.(msg, mine, { x: 0, y: 0, width: 0, height: 0 }); return; }
    node.measureInWindow((x, y, width, height) => {
      onLongPress?.(msg, mine, { x, y, width, height });
    });
  }, [msg, mine, onLongPress]);

  // Çift dokunuş — React Native'de yerleşik değil, elle ölçülüyor. 280 ms:
  // altında yanlışlıkla tetikleniyor, üstünde iki ayrı dokunuş gibi geliyor.
  const lastTapRef = useRef(0);
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) { lastTapRef.current = 0; onReact?.(REACTIONS[0]); }
    else lastTapRef.current = now;
  }, [onReact]);

  // Sunucu `reactions` gonderiyor; `likes` yalnizca eski istemciler icin
  // tasindigindan burada okunmuyor.
  const chips = reactionList(msg.reactions, myUid);

  // Geri alınan mesaj listeden ÇIKMIYOR, yerinde bir iz bırakıyor — sıra ve
  // sayfalama bozulmasın, karşı taraf da bir şeyin geri alındığını görsün.
  if (msg.deleted) {
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, styles.bubbleGone]}>
          <Text style={styles.goneText}>{t('msg.wasUndone')}</Text>
        </View>
      </View>
    );
  }

  // ── Paylasilan Reels ──
  // Kendi baloncugu var: medya degil, bir OYUNA REFERANS. Dokununca oyun
  // sayfasi aciliyor — paylasimin amaci zaten karsi tarafin oyunu gormesi.
  if (msg.share) {
    return (
      <Pressable
        style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
        ref={rowRef}
        onLongPress={handleLongPress}
        delayLongPress={400}
        onPress={onOpenShare}
      >
        <View style={styles.shareCard}>
          {/* Haberde görsel EKSİK OLABİLİR (RSS her zaman vermiyor);
              o hâlde kaynak baş harfi yer tutuyor, kutu boş kalmıyor. */}
          {msg.share.image ? (
            <Image source={msg.share.image} style={styles.shareImg} contentFit="cover" transition={motion.image} />
          ) : (
            <View style={[styles.shareImg, styles.shareImgBos]}>
              <Text style={styles.shareImgHarf}>
                {String(msg.share.source || msg.share.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.shareBody}>
            <Text style={styles.shareName} numberOfLines={2}>{msg.share.name}</Text>
            <Text style={styles.shareHint}>
              {msg.share.kind === 'news' ? (msg.share.source || t('share.news'))
                : msg.share.kind === 'game' ? t('share.game')
                : t('msg.sharedReel')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // ── GIF ──
  // Kendi baloncugu: dolgusuz, cerceve yok. GIF zaten kendi kenarina sahip
  // ve etrafina renkli bir baloncuk koymak gorseli kalabaliklastiriyor.
  if (msg.gif?.url) {
    return (
      <Animated.View entering={FadeIn.duration(160)}>
        <Pressable
          style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
          ref={rowRef}
          onLongPress={handleLongPress}
          delayLongPress={400}
          onPress={onTap}
        >
          {/* GIF'in ustunde alinti: GIF'le yanit vermek de mumkun. */}
          {msg.quote ? (
            <View style={styles.gifQuoteWrap}>
              <Quote quote={msg.quote} mine={mine} myUid={myUid} peerName={peerName}
                     onPress={() => onJumpTo?.(msg.quote.id)} t={t} />
            </View>
          ) : null}
          <Image
            source={msg.gif.url}
            style={styles.gifBubble}
            contentFit="contain"
            transition={motion.image}
          />
          <Reactions chips={chips} mine={mine} onPress={onReact} />
          {msg.pending ? <Text style={styles.state}>{t('msg.sending')}</Text> : null}
          {msg.failed ? <Text style={[styles.state, styles.stateFail]}>{t('msg.notSent')}</Text> : null}
          {seen && !msg.pending && !msg.failed ? <Text style={styles.seen}>{t('msg.seen')}</Text> : null}
        </Pressable>
      </Animated.View>
    );
  }

  const hasMedia = !!msg.media?.url;
  const hasText = !!msg.text;
  const isVideo = !!msg.media?.type?.startsWith('video/');

  return (
    // GİRİŞ ANİMASYONU sade: liste ters çevrilmiş, yönlü animasyonlar
    // (FadeInDown gibi) çevrilmiş eksende ters görünüyor. Yönsüz belirme
    // her iki eksende de doğru duruyor.
    <Animated.View entering={FadeIn.duration(160)}>
    <Pressable
      style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
      ref={rowRef}
      onLongPress={handleLongPress}
      delayLongPress={400}
      onPress={onTap}
    >
      <View style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        // Salt görsel mesajda dolgu YOK: görselin baloncuğu tamamen doldurması
        // gerekiyor, aksi hâlde kenarlarda renkli bir çerçeve kalıyor.
        hasMedia && !hasText && styles.bubbleMediaOnly,
      ]}>
        <Quote quote={msg.quote} mine={mine} myUid={myUid} peerName={peerName}
               onPress={() => onJumpTo?.(msg.quote.id)} t={t} />
        {hasMedia && (isVideo
          ? <VideoBubble url={msg.media.url} />
          : <Image source={msg.media.url} style={styles.media} contentFit="cover" transition={motion.image} />
        )}
        {hasText && (
          <Text style={[
            styles.bubbleText,
            mine && styles.bubbleTextMine,
            hasMedia && styles.bubbleTextUnderMedia,
          ]}>
            {msg.text}
          </Text>
        )}
      </View>
      {/* Goruldu YALNIZCA en yeni okunmus kendi mesajimda (bkz. seenId) —
          her okunmus mesaja koymak sohbeti isaret coplugune cevirir. */}
      {/* Kalp baloncuğun ALT KENARINA oturuyor, içine değil: metnin akışını
          bozmuyor ve medya baloncuğunda da aynı yerde duruyor. */}
      <Reactions chips={chips} mine={mine} onPress={onReact} />

      {/* Gönderiliyor / başarısız — iyimser gönderimin görünen tarafı. */}
      {msg.pending ? <Text style={styles.state}>{t('msg.sending')}</Text> : null}
      {msg.failed ? <Text style={[styles.state, styles.stateFail]}>{t('msg.notSent')}</Text> : null}
      {seen && !msg.pending && !msg.failed ? <Text style={styles.seen}>{t('msg.seen')}</Text> : null}
    </Pressable>
    </Animated.View>
  );
}

/**
 * Sohbet içi video.
 *
 * OTOMATİK OYNATMA YOK ve SES KAPALI BAŞLAMIYOR — kullanıcı dokunup oynatıyor.
 * Sohbet listesi kaydırılırken birden çok videonun kendiliğinden başlaması hem
 * veri hem dikkat israfı; Reels ekranından farklı olarak burada video akışın
 * kendisi değil, mesajın bir parçası.
 */
function VideoBubble({ url }) {
  const styles = useStyles(makeStyles);
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={styles.media}
      nativeControls
      contentFit="cover"
      fullscreenOptions={TAM_EKRAN_ACIK}
    />
  );
}

/**
 * Baloncugun ICINDE, metnin ustunde duran alinti.
 *
 * BALONCUGUN ICINDE, ustunde degil: alinti yanitin bir parcasi, ayri bir
 * mesaj degil. Disarida dursaydi listede iki satir gibi okunurdu.
 *
 * UC DURUM ayri ayri ciziliyor — sunucu hangisi oldugunu soyluyor:
 *   • normal      -> yazar + kisa metin
 *   • geri alinmis-> 'bu mesaj geri alindi'
 *   • bulunamadi  -> 500 mesajlik pencerenin disina dusmus
 *
 * DOKUNULUNCA ASLINA GIDIYOR. Baglami gormek icin elle kaydirmak, uzun
 * sohbetlerde alintiyi islevsiz birakiyor.
 */
function Quote({ quote, mine, myUid, peerName, onPress, t }) {
  const styles = useStyles(makeStyles);
  if (!quote) return null;
  const kim = quote.from === myUid ? t('msg.replyToSelf') : (peerName || '');
  return (
    <Pressable
      style={({ pressed }) => [styles.quote, mine && styles.quoteMine, pressed && PRESSED]}
      onPress={quote.missing ? undefined : onPress}
    >
      <View style={[styles.quoteStripe, mine && styles.quoteStripeMine]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {quote.missing ? null : <Text style={styles.quoteWho} numberOfLines={1}>{kim}</Text>}
        <Text style={[styles.quoteText, (quote.deleted || quote.missing) && styles.quoteGone]} numberOfLines={2}>
          {quote.missing ? t('msg.quoteMissing')
            : quote.deleted ? t('msg.wasUndone')
            : (quote.text || kindLabel(quote, t))}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Baloncugun altina oturan tepki rozetleri.
 *
 * AKISA GIRIYOR, mutlak konumlu DEGIL. Onceki kalp rozeti baloncugun
 * uzerine biniyordu; tek bir kucuk simge icin sorun degildi ama uc dort
 * rozet metnin son satirini kapatir.
 *
 * ROZETE BASMAK O TEPKIYI ACIP KAPATIYOR — menuyu acmadan hizli yol.
 * Sayi YALNIZCA birden fazlaysa yaziliyor: "1" bilgi tasimiyor,
 * rozetin varligi zaten onu soyluyor.
 */
function Reactions({ chips, mine, onPress }) {
  const styles = useStyles(makeStyles);
  if (!chips.length) return null;
  return (
    <View style={[styles.chips, mine ? styles.chipsMine : styles.chipsTheirs]}>
      {chips.map((c) => (
        <Pressable
          key={c.emoji}
          style={({ pressed }) => [styles.chip, c.mine && styles.chipMine, pressed && PRESSED]}
          onPress={() => onPress?.(c.emoji)}
          hitSlop={6}
        >
          <Text style={styles.chipEmoji}>{c.emoji}</Text>
          {c.count > 1 ? <Text style={styles.chipCount}>{c.count}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.footnote, fontWeight: '800' },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  // Durum satiri kucuk ve sessiz: bilgi tasiyor ama ada rakip olmamali.
  status: { color: colors.text3, fontSize: type.caption2, marginTop: 1 },
  typing: { color: colors.green, fontWeight: '700' },
  // Goruldu isareti baloncugun ALTINDA ve saga dayali; icerigin parcasi degil.
  seen: { color: colors.text3, fontSize: type.caption2, marginTop: 3, marginRight: spacing.xs },
  state: { color: colors.text3, fontSize: type.caption2, marginTop: 3, marginRight: spacing.xs },
  stateFail: { color: colors.danger },
  // Baloncuğun alt kenarına binen küçük madalyon.
  // Rozetler AKIŞTA, mutlak konumlu değil (eski tek kalp öyleydi). Üç dört
  // rozet mutlak konumda metnin son satırını kapatıyordu.
  //
  // marginTop NEGATİF: rozet baloncuğun alt kenarına hafifçe biniyor —
  // ayrı bir satır gibi değil, baloncuğa ait bir eklenti gibi okunsun.
  // ── Alıntı (baloncuğun içinde) ──
  // Şeritli sol kenar, sohbet uygulamalarının ortak dili: alıntıyı metinden
  // ayıran şey renk değil o dikey çizgi. Renk tek başına yeterli olmazdı,
  // kendi baloncuğumda zemin zaten renkli.
  quote: {
    flexDirection: 'row', gap: spacing.sm,
    // Karşı tarafın baloncuğu colors.card; beyaz katman açık temada beyaz
    // üstünde beyazdı. bgHover her iki zeminde de ayrışıyor.
    backgroundColor: colors.bgHover,
    borderRadius: radius.sm,
    padding: 7, marginBottom: 6,
  },
  // Kendi baloncuğumun zemini vurgu renginde; aynı beyaz katman orada
  // yeterince ayrışmıyordu.
  // tema-bagimsiz: kendi baloncugumun zemini colors.accent; katman ona gore
  quoteMine:       { backgroundColor: 'rgba(0,0,0,0.18)' },
  // accent-serbest: 3px alinti seridi, uzerinde metin yok
  quoteStripe:     { width: 3, borderRadius: 2, backgroundColor: colors.accent },
  // tema-bagimsiz: kendi baloncugumun zemini colors.accent; katman ona gore
  quoteStripeMine: { backgroundColor: 'rgba(255,255,255,0.55)' },
  quoteWho:  { color: colors.text2, fontSize: type.caption2, fontWeight: '800' },
  quoteText: { color: colors.text2, fontSize: type.caption, lineHeight: 16 },
  quoteGone: { fontStyle: 'italic', color: colors.text3 },

  // ── Sabit mesaj bandı (başlığın hemen altında) ──
  // Alt kenarlık ŞART: bant listeyle aynı zeminde duruyor ve çizgi olmadan
  // ilk mesaj bandın devamı gibi okunuyordu.
  pinBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 7,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  pinMain:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 34 },
  pinLabel: { color: colors.accentText, fontSize: type.caption2, fontWeight: '800' },
  pinText:  { color: colors.text2, fontSize: type.caption },
  pinClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // ── Yanıt önizlemesi (gönderme kutusunun üstünde) ──
  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: 6,
    paddingVertical: 7, paddingHorizontal: 9,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  // accent-serbest: 3px yanit seridi, uzerinde metin yok
  replyStripe: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accent },
  replyWho:    { color: colors.accentText, fontSize: type.caption2, fontWeight: '800' },
  replyText:   { color: colors.text2, fontSize: type.caption },
  replyClose:  { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  chips: { flexDirection: 'row', gap: spacing.xs, marginTop: -6, marginBottom: 2 },
  chipsMine:   { alignSelf: 'flex-end' },
  chipsTheirs: { alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, height: 24, borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  // Kendi tepkim vurgulu: hangi rozetin bana ait olduğunu renk söylüyor.
  chipMine:  { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  chipEmoji: { fontSize: 12 },
  chipCount: { color: colors.text2, fontSize: type.caption2, fontWeight: '700' },

  listPad: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },

  emptyWrap: { paddingVertical: spacing.xl, alignItems: 'center', transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.text3, fontSize: type.footnote, textAlign: 'center' },

  // SÜTUN, satır DEĞİL. Önce `row` idi ve "Görüldü" metni baloncuğun kardeşi
  // olduğu için altında değil YANINDA çiziliyordu (üstelik flex-end yüzünden
  // solunda). Sütunda baloncuk ve etiket alt alta, hizalama alignItems ile.
  bubbleRow:  { flexDirection: 'column', marginBottom: 6, position: 'relative' },
  rowMine:    { alignItems: 'flex-end' },
  rowTheirs:  { alignItems: 'flex-start' },

  bubble: { maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.lg },
  bubbleMine:   { backgroundColor: colors.accentFillStrong, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  bubbleMediaOnly: { padding: 0, overflow: 'hidden' },
  // Paylasim karti baloncuk degil kart: icerik bizim degil, bir oyuna isaret.
  shareImgBos: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgInput },
  shareImgHarf: { color: colors.text2, fontSize: type.title3, fontWeight: '800' },
  shareCard: {
    width: 240, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  shareImg:  { width: 240, height: 112, backgroundColor: colors.bgInput },
  shareBody: { padding: spacing.sm, gap: 2 },
  shareName: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  shareHint: { color: colors.text3, fontSize: type.caption2 },
  // Geri alınan mesaj: dolgusuz, kesikli çerçeve — baloncuk olduğu belli olsun
  // ama içerik taşımadığı da anlaşılsın.
  bubbleGone: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.cardBorder, borderStyle: 'dashed',
  },
  goneText: { color: colors.text3, fontSize: type.footnote, fontStyle: 'italic' },
  bubbleText:     { color: colors.text, fontSize: type.subhead, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextUnderMedia: { marginTop: 7 },

  // 4:3 — telefon fotoğraflarının çoğunda üstten/alttan kırpma az oluyor
  media: { width: 220, height: 165, borderRadius: radius.md, backgroundColor: colors.bgInput },
  // GIF oranlari cok degisken (kare, genis, uzun). Sabit yukseklik yerine
  // en-boy orani birakip contain kullaniyoruz — kirpma olmuyor.
  // GIF'in kendi baloncugu yok; alintiya bir kap gerekiyor ki genislik
  // GIF'e uysun ve metin tasmasin.
  gifQuoteWrap: { width: 200 },
  gifBubble: { width: 200, height: 200, borderRadius: radius.md, backgroundColor: colors.bgInput },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  input: {
    flex: 1, maxHeight: 120, color: colors.text, fontSize: type.subhead,
    backgroundColor: colors.bgInput, borderRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // 40×40 + hitSlop 6 → etkin dokunma alanı 52×52, HIG alt sınırının üstünde
  sendBtn: {
    // accent-serbest: 40pt daire, yalniz simge
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.bgHover },
});
