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
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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
import BubbleTail from '../../src/components/BubbleTail';
import TypingBubble from '../../src/components/TypingBubble';
import GlassSurface from '../../src/components/GlassSurface';
import Animated, {
  FadeIn, ZoomIn, withSpring, withTiming, useSharedValue, useAnimatedStyle,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';
import { getAvatarPreset } from '../../src/utils/avatar';
import {
  ayracGerekli, ayracParcalari, kuyrukVar, ustBosluk,
} from '../../src/utils/messageGroups';
import { saltEmojiMi, EMOJI_BOY } from '../../src/utils/emojiOnly';
import { REACTIONS, reactionList } from '../../src/services/reactions';
import { radius, spacing, type, PRESSED, motion, TOUCH_MIN, NUMERIC } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';

// expo-video: `allowsFullscreen` kullanimdan kalkti, karsiligi
// `fullscreenOptions.enable`. Modul duzeyinde: JSX icinde nesne yazmak
// her render'da yenisini uretirdi.
const TAM_EKRAN_ACIK = { enable: true };

const MAX_TEXT = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// iOS Messages ölçüleri — kaynak: .claude/skills/ios-messages/SKILL.md
//
// Bir kısmı iOS 26.5 Simulator'da piksel ölçümüyle bulundu, bir kısmı
// topluluk tersine mühendisliğinden. Hangisinin hangisi olduğu skill
// dosyasında satır satır işaretli.
// ─────────────────────────────────────────────────────────────────────────────

/** Baloncuğun en fazla genişliği. Bizde %78'di; iOS %75. */
const BALONCUK_EN = '75%';

/** Baloncuk köşesi. Bizde radius.lg (16) idi; iOS 18. */
const BALONCUK_YARICAP = 18;

/**
 * Tapback rozetinin satırın üstünde açtığı yer.
 *
 * Rozet baloncuğun DIŞ üst köşesine biniyor (position: absolute). Bu pay
 * olmadan üstteki mesajın üstüne çıkıyor — grup içi boşluk 2pt ve rozet
 * 26pt yüksek.
 */
const TAPBACK_PAYI = 20;

/**
 * "Yazıyor" için sahte satır.
 *
 * DONDURULMUŞ ve modül düzeyinde: her render'da yeni nesne üretmek listeyi
 * gereksiz yere yeniden çizdiriyor. Ters çevrilmiş listede EN BAŞA giriyor,
 * yani ekranda en alta.
 */
const YAZIYOR_SATIRI = Object.freeze({ id: '__yaziyor__', typing: true });

// ── Kompozitör ölçüleri [ÖLÇÜLDÜ] ──
// iPhone 17 Pro (402pt): "+" Ø40, soldan 28 · alan 294×40, tam yuvarlak ·
// sağdan 28 · aradaki boşluk 12.
const EK_BTN = 40;
const KAPSUL_YARICAP = 20;
/** Kompozitörün yan kenar boşluğu. Ölçek dışı (28) — bu yüzden adlandırıldı. */
const KOMPOZITOR_KENAR = 28;
/** Gönder oku: alanın içinde, sağ uçta. */
const GONDER_BTN = 32;

// ── Başlık ölçüleri [ÖLÇÜLDÜ] ──
/** Ortalanmış avatar. */
const BASLIK_AVATAR = 60;
/** Ad hapının yüksekliği (ölçüm 32.3). */
const AD_HAPI_H = 32;
/** Hap avatarın alt kenarına bu kadar biniyor. */
const HAP_BINME = 5;

// ── Baloncuk dolgusu ──
// iOS: yatay 14, dikey 9. Bizde 13×9 idi.
const BALONCUK_YAN = 14;
const BALONCUK_DIKEY = 9;

// ── Tapback rozeti ──
// 26pt daire, baloncuğun üst kenarından 14 yukarı ve yan kenardan 6 dışarı.
const TAPBACK_H = 26;
const TAPBACK_BINME = 14;
const TAPBACK_YAN = 6;

// ── Ölçek dışı kalan eski dolgular ──
// Bunlar bu ekranda zaten vardı ve değiştirilmedi; ham sayı olarak
// bırakmak yerine adlandırıldı, böylece ne oldukları okunuyor.
const ALINTI_DOLGU = 7;
const ALINTI_ALT = 6;
const PIN_DOLGU = 7;
const REPLY_DOLGU = 9;
/** Girdi dolgusu: 4 (kapsül) + 5 + 22 (satır) + 5 + 4 = 40pt kapsül. */
const GIRDI_DIKEY = 5;

// ─────────────────────────────────────────────────────────────────────────────
// GÖNDERİM ANİMASYONU — baloncuk kompozitörden yukarı çıkıyor.
//
// ── HAZIR `FadeInDown` KULLANILMIYOR ──
// Liste ters çevrilmiş ve kodda bunun izi duruyordu: "yönlü animasyonlar
// çevrilmiş eksende ters görünüyor". Reanimated'in hazır yönlü animasyonları
// başlangıç ötelemesini kendileri hesaplıyor; burada `initialValues` ile
// AÇIKÇA veriliyor, yani hangi yöne gittiği tahmine bırakılmıyor.
//
// ── YALNIZ EKRAN AÇIKKEN GELEN MESAJDA ──
// Ekran ilk açıldığında yirmi baloncuğun birden zıplaması istenmiyor; o an
// hiçbir şey OLMUYOR, sadece geçmiş çiziliyor. Ayrım `mountedAt` ile
// yapılıyor: ondan eski mesajlar sade `FadeIn` ile geliyor.
// ─────────────────────────────────────────────────────────────────────────────

/** Baloncuğun aşağıdan geldiği mesafe. Kompozitör o tarafta. */
const GIRIS_MESAFE = 24;
/** ζ = 14 / (2·√260) ≈ 0,43 — aşma İSTENEN yer: "bir şey oldu" hissi. */
const GONDERIM_YAY = motion.pop;

// ─────────────────────────────────────────────────────────────────────────────
// SAAT SÜTUNU — sola sürükleyince kenardan giriyor.
//
// Saatler KALICI DEĞİL, çünkü kalıcı olsalardı iki bedeli olurdu: sohbet
// kalabalıklaşır ve baloncuğun %75'lik genişliği sütuna yer açmak için
// daralırdı. iOS bu yüzden gizliyor ve bir hareketle veriyor.
//
// SÜTUN SATIRIN İÇİNDE, ayrı bir katman değil: ayrı bir sütun olsaydı her
// saatin kendi mesajının dikey hizasına oturması ayrıca hesaplanacaktı.
// Satırın içinde `right: -SAAT_SUTUN` ile bekliyor ve satırla birlikte
// aynı `translateX`'i alıyor — hizalama kendiliğinden doğru.
// ─────────────────────────────────────────────────────────────────────────────
const SAAT_SUTUN = 56;

// ── Medya ölçüleri ──
// Kuyruk, görselin İKİNCİ bir kopyasını kendi ölçüsünde çiziyor (bkz.
// BubbleTail) — o yüzden bu sayılar artık stil dosyasında gömülü kalamaz,
// iki yerden okunuyorlar.
const MEDYA_EN = 220;
// 4:3 — telefon fotoğraflarının çoğunda üstten/alttan kırpma az oluyor.
const MEDYA_BOY = 165;
// GIF oranları çok değişken; kare kap + contain, kırpma olmuyor.
const GIF_OLCU = 200;


/**
 * Geçici baloncuğu sunucunun döndürdüğü gerçeğiyle değiştirir.
 *
 * ── ÖNCE VAR MI DİYE BAKIYOR ──
 * Pusher mesajı GÖNDERENE DE düşürüyor (bkz. dosya başlığı). Yanıt
 * gelmeden önce yankı düşmüşse gerçek mesaj listede ZATEN var; düz bir
 * `map` o durumda tmp'yi ikinci bir kopyayla değiştiriyor ve aynı
 * kimlikten iki satır kalıyor.
 *
 * Cihazda görüldü: "Encountered two children with the same key".
 * Hata koddaydı ama ERİŞİLEMİYORDU — Pusher hiç bağlanmadığı için yankı
 * hiç gelmiyordu (bkz. services/realtime.js'teki içe aktarım düzeltmesi).
 * Bağlantı çalışır çalışmaz yarış gerçek oldu.
 */
function tmpDegistir(liste, tempId, gercek) {
  return liste.some((m) => m.id === gercek.id)
    // Yankı bizden önce düşmüş: tmp satırını at, gerçeği yerinde bırak.
    ? liste.filter((m) => m.id !== tempId)
    : liste.map((m) => (m.id === tempId ? gercek : m));
}

function girisYayla() {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: GIRIS_MESAFE }, { scale: 0.92 }],
    },
    animations: {
      // Opaklık YAYLA DEĞİL: yay aşarken opaklık 1'i geçemiyor, o yüzden
      // sönümlü bir zamanlama daha temiz duruyor.
      opacity: withTiming(1, { duration: 120 }),
      transform: [
        { translateY: withSpring(0, GONDERIM_YAY) },
        { scale: withSpring(1, GONDERIM_YAY) },
      ],
    },
  };
}

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
  // "+" ek menüsü. Mesaj menüsüyle AYNI bileşen kullanılıyor: ikisi de
  // bir düğmeye tutturulmuş kısa bir eylem listesi ve ikinci bir menü
  // bileşeni yazmak aynı hizalama hatalarını bir kez daha yapmak olurdu.
  const [ekMenu, setEkMenu] = useState(null);
  const ekBtnRef = useRef(null);
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
  // Kaç ek türü açık? 0 → "+" hiç çizilmiyor, 1 → menü yok doğrudan eylem.
  const ekSayisi = (caps.photos ? 1 : 0) + (caps.gifs ? 1 : 0);
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
  // LİSTEYE VERİLEN dizi — mesajlarla aynı DEĞİL: "yazıyor" satırı varken
  // başa bir sahte satır giriyor ve bütün dizinler bir kayıyor. jumpTo
  // scrollToIndex çağırıyor, yani gerçek listedeki dizini bilmek zorunda.
  const veriRef = useRef([]);
  // Ekranın açıldığı an. Bundan SONRAKİ mesajlar yaylanarak giriyor, öncekiler
  // sade beliriyor — ilk açılışta geçmişin tamamı zıplamasın.
  const acilisRef = useRef(Date.now());

  // ── Saat sütununun kayması ──
  // Paylaşılan değer: her satır kendi `useAnimatedStyle`inde bunu okuyor,
  // yani kaydırma UI iş parçacığında kalıyor ve JS'e hiç uğramıyor.
  const kayma = useSharedValue(0);
  // ── JEST NESNESİ EZBERLENİYOR ──
  // RNGH'nin önerisi: ezberlenmezse her render'da yeni bir Gesture nesnesi
  // üretiliyor ve GestureDetector yerel işleyiciyi söküp yeniden bağlıyor.
  // Bu ekran 4 saniyede bir yokluyor (yedek yoklama), yani render sık.
  //
  // DÜRÜSTLÜK NOTU: bu bir HATA DÜZELTMESİ DEĞİL. Jest `useMemo` olmadan da
  // çalışıyordu — ölçüldü: worklet'e ulaşan translateX tam -56'ya kadar
  // gidiyor. Bir süre "jest çalışmıyor" sanıldı; sebebi üründe değil
  // ÖLÇÜMDEYDİ: sentetik swipe parmağı yol biter bitmez kaldırıyor, yay
  // ~400ms'de geri dönüyor ve ekran görüntüsü hep oturmuş hâli yakalıyordu.
  const saatSurukle = useMemo(() => Gesture.Pan()
    // Yatayda 20pt'den önce etkinleşmiyor, dikeyde 15pt'de VAZGEÇİYOR:
    // ikisi olmadan jest, listenin kendi dikey kaydırmasıyla yarışıyor ve
    // sohbeti kaydırmak imkânsız hâle geliyor.
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      // YALNIZ SOLA. Sağa çekmek saatleri ters yönden getirirdi ve
      // ekranın solunda gösterecek bir şey yok.
      kayma.value = Math.min(0, Math.max(-SAAT_SUTUN, e.translationX));
    })
    .onEnd(() => { kayma.value = withSpring(0, GONDERIM_YAY); }),
  [kayma]);

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

  /**
   * Paylasilan icerigi ac — HEDEF TÜRE GÖRE: fragman ve oyun oyun detayına,
   * haber tarayıcıya. Haber zaten dış bir yazı — uygulama içinde gösterecek
   * bir ekranı yok, o yüzden "↗" davranışı.
   *
   * `renderItem` içinde satır içi ok fonksiyonuydu: her render'da her satır
   * için yeni bir closure, yani `Bubble`in memo'su hiçbir zaman tutmazdı.
   */
  const paylasimAc = useCallback((item) => {
    const sh = item?.share;
    if (!sh) return;
    if (sh.kind === 'news') { if (sh.url) WebBrowser.openBrowserAsync(sh.url); return; }
    // `appid` OLMAYABİLİR: RAWG kataloğundan paylaşılan oyunda Steam
    // karşılığı yok (bkz. lib/chat-share.js — kimlik uzayı çift anlamlı).
    // Detay ekranı `rawg_<id>` ile açılıyor, appid'e ihtiyaç duymuyor.
    const id = sh.gameId || (sh.appid ? `rawg_${sh.appid}` : null);
    if (!id) return;
    router.push({
      pathname: '/game/[id]',
      params: { id, appid: sh.appid || '', name: sh.name, image: sh.image || '' },
    });
  }, [router]);

  const jumpTo = useCallback((id) => {
    const i = veriRef.current.findIndex((m) => m.id === id);
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
      if (r?.message) setMsgs((cur) => tmpDegistir(cur, tempId, r.message));
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
      if (r?.message) setMsgs((cur) => tmpDegistir(cur, tempId, r.message));
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

  /**
   * "+" düğmesi.
   *
   * TEK YETENEK VARSA MENÜ AÇMIYOR. Tek satırlık bir menü, kullanıcıya
   * hiçbir seçim sunmadan fazladan bir dokunuş bindiriyor.
   */
  const ekAc = useCallback(() => {
    if (ekSayisi === 1) {
      if (caps.photos) pickAndSend(); else setGifOpen(true);
      return;
    }
    const node = ekBtnRef.current;
    if (!node?.measureInWindow) { setEkMenu({ x: 0, y: 0, width: 0, height: 0 }); return; }
    node.measureInWindow((x, y, width, height) => setEkMenu({ x, y, width, height }));
  }, [ekSayisi, caps.photos, pickAndSend]);

  const ekActions = useCallback(() => ([
    ...(caps.photos ? [{
      key: 'photo', icon: 'image-outline', label: t('msg.photo'), onPress: pickAndSend,
    }] : []),
    ...(caps.gifs ? [{
      key: 'gif', icon: 'happy-outline', label: t('msg.gif'), onPress: () => setGifOpen(true),
    }] : []),
  ]), [caps.photos, caps.gifs, t, pickAndSend]);

  // Goruldu isareti YALNIZCA EN YENI okunmus kendi mesajimda. Her okunmus
  // mesaja koymak sohbeti isaret cop luguna cevirir; kullanicinin bilmek
  // istedigi tek sey nereye kadar okundugu.
  const seenId = (() => {
    if (!otherReadAt || !myUid) return null;
    // Liste EN YENI BASTA; ilk eslesme en yenisi.
    const m = msgs.find((x) => x.from === myUid && !x.deleted && x.at <= otherReadAt);
    return m ? m.id : null;
  })();

  // Listeye verilen dizi. "Yazıyor" baloncuğu sahte bir satır olarak EN BAŞA
  // giriyor: liste ters çevrilmiş, yani baş = ekranın en altı.
  const veri = useMemo(
    () => (typingNow ? [YAZIYOR_SATIRI, ...msgs] : msgs),
    [typingNow, msgs],
  );
  useEffect(() => { veriRef.current = veri; }, [veri]);

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
      {/* ── Başlık — iOS 26 düzeni ──
          Avatar ORTALANMIŞ ve BÜYÜK (Ø60), adı taşıyan cam hap avatarın alt
          kenarına biniyor. Ölçüler iOS 26.5 Simulator'da piksel ölçümüyle
          alındı (bkz. ios-messages skill'i).

          Geri ve "daha fazla" düğmeleri MUTLAK KONUMLU: akışa girselerdi
          ortadaki sütunu iterlerdi ve ad ekranın ortasında durmazdı — iki
          düğme aynı genişlikte olmadığı için kaydırma da simetrik olmazdı.

          Ad hapında ÇEVRON YOK. iOS'ta var ve kişi kartını açıyor; bizde
          başka bir kullanıcının profil ekranı yok. Hiçbir yere gitmeyen bir
          çevron, olmayan bir ekran vaat ederdi. */}
      <View style={styles.header}>
        <View style={styles.kimlik}>
          {preset ? (
            <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
              <Ionicons name={preset.icon} size={28} color={preset.iconColor} />
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <GlassSurface style={styles.adHapi} radius={radius.lg}>
            <Text style={styles.title} numberOfLines={1}>{name}</Text>
          </GlassSurface>

          {/* Durum satırı yalnızca paylaşan kullanıcılarda çiziliyor.
              "YAZIYOR" ARTIK BURADA DEĞİL: akışın en altında kendi
              baloncuğu var (bkz. TypingBubble) — yazılmakta olan şey bir
              mesaj ve yeri diğer mesajların yanı. */}
          {presence ? (
            <Text style={styles.status} numberOfLines={1}>
              {presence.online ? t('msg.online') : lastSeenLabel(presence.lastSeen, t, lang)}
            </Text>
          ) : null}
        </View>

        <GlassSurface style={[styles.yuvarlakBtn, styles.geriBtn]} radius={TOUCH_MIN / 2}>
          <Pressable style={({ pressed }) => [styles.yuvarlakHit, pressed && PRESSED]}
                     onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </GlassSurface>

        <GlassSurface style={[styles.yuvarlakBtn, styles.dahaBtn]} radius={TOUCH_MIN / 2}>
          <Pressable style={({ pressed }) => [styles.yuvarlakHit, pressed && PRESSED]}
                     onPress={() => setReportTarget(cid || other)} accessibilityRole="button" accessibilityLabel={t('a11y.more')}>
            <Ionicons name="ellipsis-horizontal" size={19} color={colors.text2} />
          </Pressable>
        </GlassSurface>
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
          {/* Sola sürükleyince saat sütunu kenardan giriyor. Sarmalayıcı
              LİSTENİN DIŞINDA: jest listenin tamamını kapsamalı, tek tek
              satırları değil — parmağın nereye denk geldiği önemli değil. */}
          <GestureDetector gesture={saatSurukle}>
            <FlatList
              ref={listRef}
              data={veri}
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
              renderItem={({ item, index }) => (item.typing ? <TypingBubble /> : (
                <Bubble
                  msg={item}
                  mine={item.from === myUid}
                  seen={item.id === seenId}
                  // ESKİ = zamanda önceki = ekranda ÜSTTEKİ (liste ters).
                  // YENİ = zamanda sonraki = ekranda ALTTAKİ.
                  // Gruplama, kuyruk ve tarih ayracı bu ikisinden çıkıyor.
                  eski={veri[index + 1]}
                  yeni={veri[index - 1]}
                  // Ekran açıkken mi geldi? Gönderim animasyonu buna bağlı.
                  taze={(item.at || 0) > acilisRef.current}
                  kayma={kayma}
                  lang={lang}
                  onLongPress={openMenu}
                  // İkisi de KARARLI: baloncuk kendi `msg`ini ekleyip çağırıyor.
                  onReact={react}
                  onOpenShare={paylasimAc}
                  onJumpTo={jumpTo}
                  peerName={peer?.displayName || peer?.username || ''}
                  myUid={myUid}
                  t={t}
                />
              ))}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>{t('msg.startText')}</Text>
                </View>
              }
            />
          </GestureDetector>

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
            {/* ── TEK "+" DÜĞMESİ ──
                Öncesinde fotoğraf ve GIF için iki ayrı simge duruyordu.
                iOS'ta tek bir "+" var ve ekleri bir menüde topluyor; sebebi
                de görünür: kompozitörün solu her yeni ek türünde büyümüyor.

                YETENEĞE BAĞLI kalıyor. Yapılandırma eksikken düğme hiç
                çizilmiyor — basınca "şu an kapalı" diyen bir düğme
                uygulamayı yarım gösteriyor (Guideline 2.2). Tek yetenek
                açıksa menü açmıyor, doğrudan onu çalıştırıyor: tek satırlık
                bir menü, fazladan bir dokunuş demek. */}
            {ekSayisi > 0 ? (
              <GlassSurface style={styles.ekBtn} radius={EK_BTN / 2}>
                <Pressable
                  ref={ekBtnRef}
                  style={({ pressed }) => [styles.ekHit, pressed && PRESSED]}
                  onPress={ekAc}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel={t('msg.attach')}
                >
                  <Ionicons name="add" size={26} color={colors.text} />
                </Pressable>
              </GlassSurface>
            ) : null}

            {/* Gönder düğmesi ALANIN İÇİNDE. Dışarıdaki ayrı daire,
                kompozitörü üç parçalı bir alet çubuğuna çeviriyordu; iOS'ta
                ok metin alanının sağ ucunda ve yalnızca yazacak bir şey
                varken beliriyor. */}
            <GlassSurface style={styles.girdiKapsul} radius={KAPSUL_YARICAP}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={onChangeText}
                placeholder={t('msg.placeholder')}
                placeholderTextColor={colors.text3}
                maxLength={MAX_TEXT}
                multiline
              />
              {text.trim() || sending ? (
                <Pressable
                  style={({ pressed }) => [styles.sendBtn, pressed && PRESSED]}
                  onPress={send}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel={t('msg.send')}
                >
                  {sending
                    ? <ActivityIndicator size="small" color={colors.onAccent} />
                    : <Ionicons name="arrow-up" size={18} color={colors.onAccent} />}
                </Pressable>
              ) : null}
            </GlassSurface>
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

      {/* Ek menüsü — "+" düğmesine tutturulu. `onReact` VERİLMİYOR: tepki
          satırı yalnızca mesaj menüsüne ait. */}
      <MessageMenu
        visible={!!ekMenu}
        onClose={() => setEkMenu(null)}
        anchor={ekMenu}
        mine={false}
        actions={ekMenu ? ekActions() : []}
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

/**
 * Tarih ayracı — iOS'un "Bugün 14:32" satırı.
 *
 * GÜN KALIN, SAAT NORMAL. Tek ağırlıkta yazınca ikisi tek bir dizeye
 * dönüşüyor ve göz hangisinin ne olduğunu ayırmak için duraklıyor.
 */
function Ayrac({ at, t, lang }) {
  const styles = useStyles(makeStyles);
  const { gun, saat } = ayracParcalari(at, t, lang);
  return (
    <View style={styles.ayrac}>
      <Text style={styles.ayracMetin}>
        <Text style={styles.ayracGun}>{gun}</Text>{'  '}{saat}
      </Text>
    </View>
  );
}

/** Saat:dakika — okundu satırı ve ayraç dışında bir yerde kullanılmıyor. */
function saatOf(ts, lang) {
  const loc = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE'
    : lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : 'en-US';
  return new Date(ts || 0).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Baloncuk.
//
// ── GRUPLAMA ──
// Üç şey komşulardan çıkıyor ve üçü de saf fonksiyonlarda (utils/messageGroups):
//   kuyruk  → grubun EN YENİ üyesinde var, diğerlerinde yok
//   ayraç   → üstteki mesajla arada gün ya da 1 saat varsa
//   boşluk  → grup içi 2pt, grup arası 8pt
//
// "eski" ekranda ÜSTTEKİ, "yeni" ekranda ALTTAKİ mesaj. Liste ters çevrilmiş
// olduğu için dizinle karıştırmamak adına adlar zamana göre verildi.
//
// ── KUYRUK KİMDE YOK ──
// GIF, paylaşım kartı ve salt görsel baloncukta kuyruk çizilmiyor: kuyruğun
// dolgusu baloncuğun ZEMİN RENGİNİ taşıyor ve zemini olmayan (ya da zemini
// görselin kendisi olan) bir baloncukta o dolgu görselin köşesini boyardı.
// iOS bunu maskeleyerek çözüyor; maskeleme burada üç ayrı ölçüde görsel
// için ayrı ayrı yazılacak bir iş ve kazancı kuyruğun kendisinden küçük.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// BALONCUK — memo'lu.
//
// Ölçüldü: memo YOKKEN ebeveynin her render'ı görünen baloncukların hepsini
// yeniden çizdiriyordu ve her baloncuk `eski`/`yeni` komşularından gruplama,
// kuyruk ve tarih ayracını sıfırdan hesaplıyor. Kompozitörde yazarken bu
// hesap her karakterde 8–15 kez tekrarlanıyordu.
//
// memo'nun İŞE YARAMASI İÇİN prop'lar kararlı olmak zorundaydı: `onReact` ve
// `onOpenShare` `renderItem` içinde satır içi ok fonksiyonuydu, yani her
// render'da yeni kimlik — memo hiçbir zaman tutmazdı. İkisi de artık
// ebeveynde kararlı, mesajı argüman olarak alan işlevler.
// ─────────────────────────────────────────────────────────────────────────────
const Bubble = memo(function Bubble({
  msg, mine, seen, eski, yeni, taze, kayma, lang,
  onLongPress, onOpenShare, onReact, onJumpTo, myUid, peerName, t,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const azHareket = useReducedMotion();

  // Sola sürükleme. HAREKETİ AZALT BUNU KAPATMIYOR: doğrudan manipülasyon
  // animasyon sayılmıyor (bkz. hooks/useReducedMotion) — kapatılsaydı
  // saatlere ulaşmanın hiçbir yolu kalmazdı.
  const kaydir = useAnimatedStyle(() => ({
    transform: [{ translateX: kayma.value }],
  }));

  // Menu baloncuga TUTTURULUYOR, ekranin altina degil — hangi mesaja ait
  // oldugunu konumu soylemeli. Bunun icin baloncugun pencere koordinati
  // gerekiyor ve o ancak olculerek bulunuyor.
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
  // Mesaji baglayan sarmalayicilar BURADA: ebeveyn kararli bir islev
  // veriyor, baloncuk kendi `msg`ini ekliyor. Kimlik yalnizca msg
  // degisince degisiyor — memo'nun tutmasi bu yuzden mumkun.
  const tepki = useCallback((emoji) => onReact?.(msg, emoji), [onReact, msg]);
  const paylasimAc = useCallback(() => onOpenShare?.(msg), [onOpenShare, msg]);
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) { lastTapRef.current = 0; tepki(REACTIONS[0]); }
    else lastTapRef.current = now;
  }, [tepki]);

  // Sunucu `reactions` gonderiyor; `likes` yalnizca eski istemciler icin
  // tasindigindan burada okunmuyor.
  const chips = reactionList(msg.reactions, myUid);

  const kuyruk = kuyrukVar(msg, yeni);
  const ayrac = ayracGerekli(msg, eski);
  // Tapback baloncuğun DIŞ üst köşesine biniyor; binen rozet için satırın
  // üstünde yer açılmazsa grup içi 2pt boşlukta üstteki mesaja giriyor.
  const ustPay = ustBosluk(msg, eski) + (chips.length ? TAPBACK_PAYI : 0);

  const hasMedia = !!msg.media?.url;
  const hasText = !!msg.text;
  const isVideo = !!msg.media?.type?.startsWith('video/');
  const saltGorsel = hasMedia && !hasText;
  // Baloncuksuz büyük emoji YALNIZ yalın mesajda: alıntı ya da medya
  // varsa mesaj artık bir jest değil, bağlamı olan bir yanıt.
  const saltEmoji = hasText && !hasMedia && !msg.quote && saltEmojiMi(msg.text);

  // ── Gövde ──
  let govde;
  if (msg.deleted) {
    // Geri alınan mesaj listeden ÇIKMIYOR, yerinde bir iz bırakıyor — sıra ve
    // sayfalama bozulmasın, karşı taraf da bir şeyin geri alındığını görsün.
    govde = (
      <View style={[styles.bubble, styles.bubbleGone]}>
        <Text style={styles.goneText}>{t('msg.wasUndone')}</Text>
      </View>
    );
  } else if (msg.share) {
    // Paylaşım: medya değil, bir OYUNA/HABERE referans. Kendi kartı var.
    govde = (
      <View style={styles.shareCard}>
        {/* Kartın ALT bölümü (shareBody) düz renk, yani kuyruk dolgusu
            oraya kusursuz kaynaşıyor — görsel kopyasına gerek yok. */}
        {kuyruk ? (
          <BubbleTail mine={mine} dolgu={colors.bgInput} zemin={colors.bg} />
        ) : null}
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
    );
  } else if (saltEmoji) {
    // Baloncuk YOK: ne zemin, ne dolgu, ne kuyruk. Emoji kendi başına
    // duruyor — iOS'ta da öyle.
    govde = <Text style={styles.emojiTek}>{msg.text.trim()}</Text>;
  } else if (msg.gif?.url) {
    // GIF'in kendi baloncuğu yok: dolgusuz, çerçevesiz. GIF zaten kendi
    // kenarına sahip ve etrafına renkli bir baloncuk koymak kalabalık yapıyor.
    govde = (
      <View>
        {msg.quote ? (
          <View style={styles.gifQuoteWrap}>
            <Quote quote={msg.quote} mine={mine} myUid={myUid} peerName={peerName}
                   onPress={() => onJumpTo?.(msg.quote.id)} t={t} />
          </View>
        ) : null}
        {/* Kuyruk GIF'in kendi kabına tutturuluyor, dıştaki sarmalayıcıya
            değil: alıntı varsa sarmalayıcı ondan da yüksek ve kuyruk
            alıntının hizasına düşerdi. */}
        <View style={styles.gifKap}>
          {kuyruk ? (
            <BubbleTail
              mine={mine}
              gorsel={{ url: msg.gif.url, w: GIF_OLCU, h: GIF_OLCU, fit: 'contain' }}
              zemin={colors.bg}
            />
          ) : null}
          <Image source={msg.gif.url} style={styles.gifBubble} contentFit="contain" transition={motion.image} />
        </View>
      </View>
    );
  } else {
    govde = (
      <View style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        // Salt görsel mesajda dolgu YOK: görselin baloncuğu tamamen doldurması
        // gerekiyor, aksi hâlde kenarlarda renkli bir çerçeve kalıyor.
        saltGorsel && styles.bubbleMediaOnly,
      ]}>
        {/* Kuyruk İLK ÇOCUK: baloncuğun zemininin üstüne, metnin altına
            giriyor. Sonraya konsa metnin son satırını örterdi.

            SALT GÖRSELDE dolgu değil GÖRSELİN KOPYASI kullanılıyor: o
            baloncukta zemin rengi yok, baloncuğu görsel dolduruyor. Kopya
            görselin ARKASINDA kalıyor ve yalnızca yuvarlak köşenin saydam
            bıraktığı yerden görünüyor — köşeyi kuyruğa o bağlıyor.

            VİDEODA KUYRUK YOK: kopyalanacak bir kare elimizde yok (poster
            görseli tutulmuyor). Maskeliyormuş gibi yapmak yerine kuyruksuz
            bırakılıyor. */}
        {kuyruk && !(saltGorsel && isVideo) ? (
          <BubbleTail
            mine={mine}
            gorsel={saltGorsel
              ? { url: msg.media.url, w: MEDYA_EN, h: MEDYA_BOY }
              : undefined}
            dolgu={mine ? colors.accentFillStrong : colors.bgInput}
            zemin={colors.bg}
          />
        ) : null}
        <Quote quote={msg.quote} mine={mine} myUid={myUid} peerName={peerName}
               onPress={() => onJumpTo?.(msg.quote.id)} t={t} />
        {hasMedia && (isVideo
          ? <VideoBubble url={msg.media.url} />
          : (
            <Image
              source={msg.media.url}
              style={[styles.media, saltGorsel && styles.medyaTek]}
              contentFit="cover"
              transition={motion.image}
            />
          )
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
    );
  }

  return (
    <Animated.View style={[{ marginTop: ustPay }, kaydir]}>
      {ayrac ? <Ayrac at={msg.at} t={t} lang={lang} /> : null}

      {/* Ekran açıkken gelen mesaj YAYLANARAK, aşağıdan (kompozitörün
          olduğu taraftan) giriyor. Geçmiş mesajlar ve "hareketi azalt"
          açıkken sade belirme. */}
      <Animated.View
        entering={taze && !azHareket ? girisYayla : FadeIn.duration(motion.fast)}
        style={mine ? styles.hizaBenim : styles.hizaOnun}
      >
        <Pressable
          ref={rowRef}
          style={styles.sarmal}
          onLongPress={msg.deleted ? undefined : handleLongPress}
          delayLongPress={400}
          onPress={msg.share ? paylasimAc : onTap}
        >
          {govde}
          {/* Tapback baloncuğun DIŞ üst köşesinde — kendi mesajımda solda,
              gelen mesajda sağda. iOS'un yerleşimi bu ve sebebi konum:
              rozet ekranın ortasına doğru bakıyor, kenara değil. */}
          <Reactions chips={chips} mine={mine} onPress={tepki} />
        </Pressable>

        {/* Gönderiliyor / başarısız — iyimser gönderimin görünen tarafı.
            "Okundu" YALNIZCA en yeni okunmuş kendi mesajımda (bkz. seenId)
            ve iOS gibi saatiyle birlikte. */}
        {msg.pending ? <Text style={styles.state}>{t('msg.sending')}</Text> : null}
        {msg.failed ? <Text style={[styles.state, styles.stateFail]}>{t('msg.notSent')}</Text> : null}
        {seen && !msg.pending && !msg.failed ? (
          <Text style={styles.seen}>{`${t('msg.seen')} ${saatOf(msg.at, lang)}`}</Text>
        ) : null}

        {/* Saat: satırın SAĞ DIŞINDA bekliyor, sürükleyince içeri giriyor.
            Kapsayıcı tam genişlikte olduğu için baloncuk ne kadar dar
            olursa olsun saatler DÜZ BİR SÜTUN oluşturuyor. */}
        <View style={styles.saatKutu} pointerEvents="none">
          <Text style={styles.saat} numberOfLines={1}>{saatOf(msg.at, lang)}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

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
 * Tepki rozetleri — iOS'un "tapback"i.
 *
 * ── BALONCUĞUN DIŞ ÜST KÖŞESİNDE, MUTLAK KONUMLU ──
 * Bir ara akışa alınmışlardı ve gerekçe doğruydu: rozetler baloncuğun ALT
 * kenarındayken metnin son satırını kapatıyordu. Çözüm rozetleri akışa
 * sokmak değil, iOS'un koyduğu yere koymak — üst köşeye ve baloncuğun
 * DIŞINA. Orada kapatacak metin yok; açılan tek şey satırın üstündeki
 * boşluk ve o da TAPBACK_PAYI ile veriliyor.
 *
 * ROZETE BASMAK O TEPKIYI ACIP KAPATIYOR — menuyu acmadan hizli yol.
 * Sayi YALNIZCA birden fazlaysa yaziliyor: "1" bilgi tasimiyor,
 * rozetin varligi zaten onu soyluyor.
 */
function Reactions({ chips, mine, onPress }) {
  const styles = useStyles(makeStyles);
  const azHareket = useReducedMotion();
  if (!chips.length) return null;
  return (
    <View style={[styles.chips, mine ? styles.chipsMine : styles.chipsTheirs]}>
      {chips.map((c) => (
        // Rozet KÜÇÜKTEN YAYLANARAK geliyor. Dokunsal geri bildirim zaten
        // vardı (bkz. react()) ama görsel karşılığı yoktu; rozet birden var
        // oluyordu ve dokunuşla arasındaki bağ kopuktu.
        //
        // `entering` yalnız BAĞLANIRKEN çalışıyor, yani tepki eklenince —
        // sohbet açılırken duran rozetler animasyonsuz geliyor, doğrusu bu.
        <Animated.View
          key={c.emoji}
          entering={azHareket ? undefined : ZoomIn.springify().damping(14).stiffness(260)}
        >
          <Pressable
            style={({ pressed }) => [styles.chip, c.mine && styles.chipMine, pressed && PRESSED]}
            onPress={() => onPress?.(c.emoji)}
            hitSlop={6}
          >
            <Text style={styles.chipEmoji}>{c.emoji}</Text>
            {c.count > 1 ? <Text style={styles.chipCount}>{c.count}</Text> : null}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Başlık — iOS 26 [ÖLÇÜLDÜ] ──
  // Ortalanmış sütun; düğmeler mutlak konumlu, akışın dışında.
  // ALT KENARLIK YOK: iOS 26'da başlık içerikle aynı zeminde duruyor ve
  // ayrımı çizgi değil, camın kendisi yapıyor.
  header: {
    alignItems: 'center',
    paddingBottom: spacing.s12,
  },
  kimlik: { alignItems: 'center', maxWidth: '70%' },
  avatar: {
    width: BASLIK_AVATAR, height: BASLIK_AVATAR, borderRadius: BASLIK_AVATAR / 2,
    backgroundColor: colors.surfaceTile,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.title3, fontWeight: '800' },
  // Hap avatarın alt kenarına biniyor — ölçüm 5pt.
  adHapi: {
    marginTop: -HAP_BINME,
    height: AD_HAPI_H, justifyContent: 'center',
    paddingHorizontal: spacing.s12,
    maxWidth: '100%',
  },
  title: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  // Durum satiri kucuk ve sessiz: bilgi tasiyor ama ada rakip olmamali.
  status: { color: colors.text3, fontSize: type.caption2, marginTop: spacing.s4 },

  // Geri ve "daha fazla": aynı geometri, farklı kenar.
  yuvarlakBtn: {
    position: 'absolute', top: 0,
    width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: TOUCH_MIN / 2,
  },
  geriBtn: { left: spacing.s16 },
  dahaBtn: { right: spacing.s16 },
  yuvarlakHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Tarih ayracı ──
  // Ortada, sessiz. Gün kalın, saat normal.
  ayrac: { alignItems: 'center', paddingTop: spacing.s24, paddingBottom: spacing.s12 },
  ayracMetin: { color: colors.text3, fontSize: type.caption, lineHeight: 16 },
  ayracGun:   { color: colors.text2, fontWeight: '700' },

  // ── Baloncuk satırı ──
  hizaBenim: { alignItems: 'flex-end' },
  hizaOnun:  { alignItems: 'flex-start' },
  // Kuyruk ve tapback baloncuğun DIŞINA taşıyor; sarmal onların
  // konumlandığı kutu.
  //
  // GENİŞLİK SINIRI BURADA DEĞİL, `bubble`da: paylaşım kartı 240pt sabit
  // genişlikte ve dar bir telefonda %75 onun altına düşüyor — sınır sarmalda
  // olsaydı kart sıkışırdı.
  sarmal: { position: 'relative' },

  // Goruldu / durum isareti baloncugun ALTINDA ve hizasi satirdan geliyor.
  seen:  { color: colors.text3, fontSize: type.caption2, marginTop: spacing.s4 },
  // Sürüklenince görünen saat. `right` NEGATİF: satırın dışında, kenar
  // boşluğunun ötesinde duruyor ve translateX onu içeri getiriyor.
  // NUMERIC şart: orantılı yazıda "1" ile "8" farklı genişlikte ve sütun
  // kaydırırken titriyor.
  //
  // DİKEY ORTALAMA SARMALAYICIYLA: `textAlignVertical` yalnızca Android'de
  // çalışıyor, iOS'ta hiçbir şey yapmıyor. Kapsayıcının yüksekliği
  // baloncuğa göre değiştiği için sabit bir lineHeight da olmuyor.
  saatKutu: {
    position: 'absolute', right: -SAAT_SUTUN, top: 0, bottom: 0,
    width: SAAT_SUTUN, alignItems: 'flex-end', justifyContent: 'center',
  },
  saat: { color: colors.text3, fontSize: type.caption2, ...NUMERIC },
  state: { color: colors.text3, fontSize: type.caption2, marginTop: spacing.s4 },
  stateFail: { color: colors.danger },

  // ── Alıntı (baloncuğun içinde) ──
  // Şeritli sol kenar, sohbet uygulamalarının ortak dili: alıntıyı metinden
  // ayıran şey renk değil o dikey çizgi.
  quote: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.bgHover,
    borderRadius: radius.sm,
    padding: ALINTI_DOLGU, marginBottom: ALINTI_ALT,
  },
  // tema-bagimsiz: kendi baloncugumun zemini colors.accentFillStrong; katman ona gore
  quoteMine:       { backgroundColor: 'rgba(0,0,0,0.18)' },
  // accent-serbest: 3px alinti seridi, uzerinde metin yok
  quoteStripe:     { width: 3, borderRadius: 2, backgroundColor: colors.accent },
  // tema-bagimsiz: kendi baloncugumun zemini colors.accentFillStrong; katman ona gore
  quoteStripeMine: { backgroundColor: 'rgba(255,255,255,0.55)' },
  quoteWho:  { color: colors.text2, fontSize: type.caption2, fontWeight: '800' },
  quoteText: { color: colors.text2, fontSize: type.caption, lineHeight: 16 },
  quoteGone: { fontStyle: 'italic', color: colors.text3 },

  // ── Sabit mesaj bandı (başlığın hemen altında) ──
  pinBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: PIN_DOLGU,
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
    marginHorizontal: KOMPOZITOR_KENAR, marginBottom: spacing.s8,
    paddingVertical: PIN_DOLGU, paddingHorizontal: REPLY_DOLGU,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  // accent-serbest: 3px yanit seridi, uzerinde metin yok
  replyStripe: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accent },
  replyWho:    { color: colors.accentText, fontSize: type.caption2, fontWeight: '800' },
  replyText:   { color: colors.text2, fontSize: type.caption },
  replyClose:  { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  // ── Tapback ──
  // Baloncuğun DIŞ üst köşesi. Kenarlık sayfa zemini renginde: rozet
  // baloncuğa değil, sayfaya oturuyormuş gibi görünsün.
  chips: { position: 'absolute', top: -TAPBACK_BINME, flexDirection: 'row', gap: spacing.s4 },
  chipsMine:   { left: -TAPBACK_YAN },
  chipsTheirs: { right: -TAPBACK_YAN },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s4,
    paddingHorizontal: spacing.s8, height: TAPBACK_H, borderRadius: TAPBACK_H / 2,
    backgroundColor: colors.bgInput,
    borderWidth: 2, borderColor: colors.bg,
  },
  // Kendi tepkim vurgulu: hangi rozetin bana ait olduğunu renk söylüyor.
  chipMine:  { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  chipEmoji: { fontSize: type.caption },
  chipCount: { color: colors.text2, fontSize: type.caption2, fontWeight: '700' },

  // Kuyruk ve tapback baloncuğun dışına taşıyor; kenar boşluğu onları
  // ekranın kenarına yapıştırmayacak kadar geniş olmalı.
  listPad: { paddingHorizontal: spacing.s16, paddingVertical: spacing.s12 },

  emptyWrap: { paddingVertical: spacing.xl, alignItems: 'center', transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.text3, fontSize: type.footnote, textAlign: 'center' },

  // ── Baloncuk ──
  // 17/22 metin (HIG gövdesi), 14×9 dolgu, 18 köşe — iOS ölçüleri.
  bubble: {
    maxWidth: BALONCUK_EN,
    paddingHorizontal: BALONCUK_YAN, paddingVertical: BALONCUK_DIKEY,
    borderRadius: BALONCUK_YARICAP,
  },
  bubbleMine:   { backgroundColor: colors.accentFillStrong },
  // Karşı tarafın baloncuğu surface2 idi ve koyu temada sayfa zemininden
  // (bg) ayrışmıyordu: #15161A ile #0A0B0D arasındaki fark gözle zor
  // seçiliyor. surface3 (#1C1E23) iOS'un zemin–baloncuk farkına yakın.
  bubbleTheirs: { backgroundColor: colors.bgInput },
  // `overflow: 'hidden'` KALDIRILDI: kuyruk baloncugun DISINA tasiyor ve
  // kirpma onu yok ediyordu. Kose yuvarlakligi artik gorselin kendisinde
  // (medyaTek), yani kirpmaya gerek kalmadi.
  bubbleMediaOnly: { padding: 0 },
  // Paylasim karti baloncuk degil kart: icerik bizim degil, bir oyuna isaret.
  shareImgBos: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgInput },
  shareImgHarf: { color: colors.text2, fontSize: type.title3, fontWeight: '800' },
  // ARTIK BIR BALONCUK, kart degil: kuyrugu olan bir seyin kenarligi
  // olamaz — kenarlik kuyrugu takip etmez ve kuyruk 'yapistirilmis'
  // gorunur. Zemin de gelen baloncukla ayni (bgInput), boylece
  // paylasim iOS'un zengin baglanti baloncugu gibi okunuyor.
  // `overflow: 'hidden'` KALKTI (kuyrugu kirpiyordu); ust kose
  // yuvarlakligi gorselin kendisine tasindi.
  shareCard: {
    width: 240, backgroundColor: colors.bgInput,
    borderRadius: BALONCUK_YARICAP,
  },
  shareImg:  {
    width: 240, height: 112, backgroundColor: colors.surfaceTile,
    borderTopLeftRadius: BALONCUK_YARICAP, borderTopRightRadius: BALONCUK_YARICAP,
  },
  shareBody: { padding: spacing.sm, gap: spacing.s4 },
  shareName: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  shareHint: { color: colors.text3, fontSize: type.caption2 },
  // Geri alınan mesaj: dolgusuz, kesikli çerçeve — baloncuk olduğu belli olsun
  // ama içerik taşımadığı da anlaşılsın.
  bubbleGone: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.cardBorder, borderStyle: 'dashed',
  },
  goneText: { color: colors.text3, fontSize: type.footnote, fontStyle: 'italic' },
  // Satır yüksekliği boydan büyük: emojinin altı/üstü kırpılıyordu.
  emojiTek: { fontSize: EMOJI_BOY, lineHeight: EMOJI_BOY + 8 },
  bubbleText:     { color: colors.text, fontSize: type.body, lineHeight: 22 },
  bubbleTextMine: { color: colors.onAccent },
  bubbleTextUnderMedia: { marginTop: spacing.s8 },

  media: { width: MEDYA_EN, height: MEDYA_BOY, borderRadius: radius.md, backgroundColor: colors.bgInput },
  // Salt gorselde baloncuk = gorsel, yani kose baloncuk yaricapinda olmali.
  medyaTek: { borderRadius: BALONCUK_YARICAP },
  // GIF oranlari cok degisken (kare, genis, uzun). Sabit yukseklik yerine
  // en-boy orani birakip contain kullaniyoruz — kirpma olmuyor.
  gifQuoteWrap: { width: 200 },
  gifKap: { position: 'relative' },
  gifBubble: {
    width: GIF_OLCU, height: GIF_OLCU,
    borderRadius: BALONCUK_YARICAP, backgroundColor: colors.bgInput,
  },

  // ── Kompozitör — iOS 26 [ÖLÇÜLDÜ] ──
  // "+" Ø40 soldan 28, alan yüksekliği 40 tam yuvarlak, aradaki boşluk 12.
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s12,
    paddingHorizontal: KOMPOZITOR_KENAR, paddingTop: spacing.s8,
  },
  ekBtn: { width: EK_BTN, height: EK_BTN, borderRadius: EK_BTN / 2 },
  ekHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Kapsül girdiyle gönder okunu birlikte taşıyor; okun yeri alanın İÇİ.
  girdiKapsul: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    minHeight: EK_BTN, borderRadius: KAPSUL_YARICAP,
    paddingLeft: spacing.s16, paddingRight: spacing.s4, paddingVertical: spacing.s4,
  },
  input: {
    flex: 1, maxHeight: 120, color: colors.text, fontSize: type.body,
    paddingTop: GIRDI_DIKEY, paddingBottom: GIRDI_DIKEY,
  },
  sendBtn: {
    width: GONDER_BTN, height: GONDER_BTN, borderRadius: GONDER_BTN / 2,
    backgroundColor: colors.accentFillStrong,
    alignItems: 'center', justifyContent: 'center',
  },
});
