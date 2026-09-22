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

import {
  getChat, sendChat, deleteChatMessage, pingPresence, sendTyping,
  likeChatMessage, pinChatMessage,
} from '../../src/api/social';
import { subscribeDM, chatCapabilities } from '../../src/services/realtime';
import { setActiveChat, dismissChatNotifications } from '../../src/notifications';
import { getSession, subscribeSession } from '../../src/services/session';
import { engelUygula } from '../../src/services/engel';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import EmptyState from '../../src/components/EmptyState';
import ReportSheet from '../../src/components/ReportSheet';
import PersonMenu from '../../src/components/PersonMenu';
import MessageMenu from '../../src/components/MessageMenu';
import GifPicker from '../../src/components/GifPicker';
import TypingBubble from '../../src/components/TypingBubble';
import { Icon } from '../../src/components/Icon';
import { IconButton, PressableScale, Txt } from '../../src/components/ui/Primitives';
import { UserAvatar } from '../../src/components/ui/Social';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { component as K, typography } from '../../src/theme/tokens';
import Animated, {
  FadeIn, ZoomIn, withSpring, withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';
import {
  ayracGerekli, ayracParcalari, kuyrukVar, ustBosluk,
} from '../../src/utils/messageGroups';
import { saltEmojiMi, EMOJI_BOY } from '../../src/utils/emojiOnly';
import { tmpDegistir, bekleyenEsIndeks } from '../../src/utils/gonderimEsleme';
import { REACTIONS, reactionList } from '../../src/services/reactions';
import { radius, spacing, type, PRESSED, motion, NUMERIC } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';

// expo-video: `allowsFullscreen` kullanimdan kalkti, karsiligi
// `fullscreenOptions.enable`. Modul duzeyinde: JSX icinde nesne yazmak
// her render'da yenisini uretirdi.
const TAM_EKRAN_ACIK = { enable: true };

const MAX_TEXT = 1000;

/** Kit chat() ölçüleri (tokens → component.chat). */
const C = K.chat;
const KC = C.composer;

// Modul duzeyinde: satir ici verilseydi her render'da yeni kimlik olur ve
// FlatList tum hucreleri yeniden anahtarlamak zorunda kalirdi.
//
// ── `yerelId` ÖNCE GELİYOR ──
// İyimser gönderimde satır önce `tmp-…` kimliğiyle giriyor, sunucu yanıtı
// gelince gerçek kimliğe geçiyor. Anahtar `m.id` olsaydı bu geçişte
// DEĞİŞİRDİ; FlatList hücreyi söküp yeniden kurar ve giriş animasyonu
// ikinci kez oynardı (cihazda görüldü: baloncuk iki kez zıplıyor).
//
// `yerelId` istemcide üretiliyor ve mesaj gerçek kimliğine kavuştuktan
// SONRA da üstünde kalıyor — anahtar böylece satırın ömrü boyunca sabit.
const anahtar = (m) => m.yerelId || m.id;

// ─────────────────────────────────────────────────────────────────────────────
// iOS Messages ölçüleri — kaynak: .claude/skills/ios-messages/SKILL.md
//
// Bir kısmı iOS 26.5 Simulator'da piksel ölçümüyle bulundu, bir kısmı
// topluluk tersine mühendisliğinden. Hangisinin hangisi olduğu skill
// dosyasında satır satır işaretli.
// ─────────────────────────────────────────────────────────────────────────────


/** Baloncuk köşesi — kit de 18 diyor (zengin baloncuklar sıradaki işte). */
const BALONCUK_YARICAP = C.bubble.radius;

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

// ── ESKİ iOS ÖLÇÜLERİ KALKTI ──
// Kompozitör, başlık ve baloncuk dolgusu iOS 26.5 Simulator ölçümlerinden
// geliyordu; G-19 hepsini kitin sayılarıyla değiştirdi (tokens → chat).

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
// ── GİRİŞ YAYI ARTIK `settle`, `pop` DEĞİL ──
// `pop` (ζ ≈ 0,43) tek seferlik vurgu için ayarlı ve burada her mesajda
// tekrar ediyordu. Ölçüldü: baloncuk 216 ms'de hedefi %21,9 aşıp
// kompozitörün 5pt altına iniyor, 432 ms'de %4,8 geri tepiyor, ancak 517 ms'de
// oturuyordu — mesaj başına gözle görülen İKİ sekme. Sohbet hızlandıkça bu
// "oynak" hissine dönüşüyordu.
//
// `settle` (ζ ≈ 0,81): %1,3 aşma (0,3pt), 236 ms'de oturma. Karşılaştırma
// tablosu theme.js'te. Aynı sabit saat sütununun dönüşünde de kullanılıyor.
const GONDERIM_YAY = motion.settle;

// ─────────────────────────────────────────────────────────────────────────────
// SAAT — BALONCUĞUN İÇİNDE (G-19, kit chat() recv/sent).
//
// Eskiden saatler gizliydi ve sola sürükleyince 56 pt'lik bir sütun
// kenardan giriyordu. Gerekçe iOS'tu: kalıcı saat sohbeti kalabalıklaştırır
// ve baloncuğun genişliğini daraltırdı. Kit bunun yerine saati baloncuğun
// SON SATIRI olarak yazıyor (11/14, sağa yaslı) ve genişliği buna göre
// veriyor (270). Gizli bir jestin keşfedilmesini beklemek yerine bilgi
// duruyor; jest, paylaşılan değer ve satır başına animasyon kalktı.
// ─────────────────────────────────────────────────────────────────────────────

// ── Medya ölçüleri ──
const MEDYA_EN = 220;
// 4:3 — telefon fotoğraflarının çoğunda üstten/alttan kırpma az oluyor.
const MEDYA_BOY = 165;
// GIF oranları çok değişken; kare kap + contain, kırpma olmuyor.
const GIF_OLCU = 200;



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
  // 2.0 paleti: eski `colors` adlandırmasında vurgu kırmızı, kitin
  // gönderilen baloncuğu ise BİRİNCİL yüzey (acS/onAc). İki palet yan
  // yana duruyor çünkü ekranın henüz taşınmamış bölümleri eski adları
  // kullanıyor (zengin baloncuklar — sıradaki iş).
  const { colors: dc } = useDesignTheme();
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
  const [sending, setSending] = useState(false);
  // Raporlama hedefi METİN olarak tutuluyor, boolean değil: başlıktaki düğme
  // KONUŞMAYI, mesaj menüsü ise TEK MESAJI raporluyor. İki ayrı state yerine
  // tek hedef, iki çağıran.
  const [reportTarget, setReportTarget] = useState(null);
  // Başlıktaki "⋯" ARTIK DOĞRUDAN ŞİKAYET AÇMIYOR.
  //
  // App Store 1.2 engellemenin de bulunabilir olmasını istiyor ve sohbet
  // tacizin ASIL kanalı — ama engelleme yalnızca arkadaş listesinde ve profil
  // ekranındaydı. Konuşmanın içindeyken engellemek için kullanıcının çıkıp
  // karşı tarafın profilini bulması gerekiyordu; en çok ihtiyaç duyulan yerde
  // en uzak olan seçenekti.
  //
  // Üç nokta zaten "başka seçenekler" demek; tek bir eyleme kısayol olması
  // hem sözü tutmuyordu hem de ikinci eylemin yerini kapatıyordu.
  const [kisiMenu, setKisiMenu] = useState(false);
  // Geniş ekranda sohbet kolonu ortalanıyor (bkz. theme → ICERIK_MAX):
  // 820 pt'ye yayılan baloncuklar bir konuşma gibi değil, bir tabloya
  // dağılmış cümleler gibi okunuyordu.
  const yan = useYanBosluk();
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
  // Kompozitörün tek eki GIF ve o da sunucudaki yapılandırmaya bağlı:
  // sağlayıcı anahtarı ortam değişkeninde, istemcinin bunu bilmesinin
  // başka yolu yok.
  //
  // FOTOĞRAF GÖNDERİMİ UYGULAMADAN ÇIKARILDI (2.7.0). Sunucunun `photos`
  // bayrağı burada okunmuyor: seçici paketi binary'de yok, izin metni de
  // yok. Gerekçe ve geri açma reçetesi mobile/AGENTS.md'de.
  //
  // BAŞLANGIÇ KAPALI — yanıt gelene kadar düğme göstermek, bir an
  // görünüp kaybolan düğme demek olurdu.
  const [gifAcik, setGifAcik] = useState(false);
  useEffect(() => { chatCapabilities().then((c) => setGifAcik(!!c.gifs)).catch(() => {}); }, []);
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

  // ── SÜRÜKLE-SAAT SÜTUNU KALDIRILDI (G-19) ──
  // Saatler gizliydi ve sola sürükleyince 56 pt'lik bir sütun kenardan
  // giriyordu (iOS Messages davranışı). Kit saati HER BALONCUĞUN İÇİNE
  // koyuyor (11/14, sağa yaslı) — iki ayrı saat sistemi tutmak hem artıklık
  // hem de gizli jestin keşfedilmeme riskiydi. Jest, paylaşılan değer ve
  // satır başına `useAnimatedStyle` ile birlikte gitti.

  // uid `session.user.uid` içinde. `session.uid` yazılırsa daima null olur ve
  // KENDİ mesajların da karşı tarafınmış gibi sola hizalı çizilir.
  const myUid = session?.user?.uid || null;

  useEffect(() => { msgsRef.current = msgs; }, [msgs]);

  /** Kimliğe göre tekilleştirerek ekler; en yeni başta düzeni korunur. */
  const addMessage = useCallback((m) => {
    // ── KARŞI TARAFIN MESAJI "YAZIYOR"U HEMEN BİTİRİR ──
    // Önceden gösterge kendi süresi (4-5 sn) dolana kadar duruyordu. Sonuç:
    // mesaj gelince yeni satır ekleniyor, yazıyor baloncuğu onun ALTINDA
    // kalıyor, saniyeler sonra kaybolunca bütün liste ~40pt BİR DAHA
    // kayıyordu. Mesajı gönderen artık yazmıyor; göstergenin kalması yanlıştı.
    //
    // `setTypingNow(false)` DOĞRUDAN, efekte bırakılmıyor. Göstergeyi asıl
    // kaldıran `typingNow`; `typingUntil`'i sıfırlamak onu yalnızca aşağıdaki
    // efekt üzerinden, BOYAMADAN SONRA düşürürdü — bir kare boyunca yeni mesaj
    // ve yazıyor baloncuğu birlikte çizilip ikinci kayma yine gelirdi. Üç
    // güncelleme aynı olay döngüsünde toplanıyor (React 18 otomatik
    // toplama), yani satırın eklenmesi ve göstergenin kalkması TEK render,
    // TEK kayma. `typingUntil` de sıfırlanıyor ki efekt göstergeyi geri
    // açmasın.
    //
    // YALNIZCA YENİ MESAJDA: yoklama zaten listede olan bir mesajı tekrar
    // getirebiliyor; o durumda karşı taraf yeniden yazıyorsa göstergesi
    // silinmemeli. `msgsRef` bir render geriden geliyor — en kötü hâlde
    // zaten kapalı olan gösterge bir kez daha kapatılır.
    if (m?.from && m.from !== myUid && !msgsRef.current.some((x) => x.id === m.id)) {
      setTypingUntil(0);
      setTypingNow(false);
    }
    setMsgs((cur) => {
      // Kimlikten tekillestirme (Pusher gonderene de dusuruyor).
      if (cur.some((x) => x.id === m.id)) return cur;
      // ── YANKI BEKLEYEN SATIRA YAZILIR ──
      // Kendi gonderdigim mesajin yankisi, sunucunun HTTP yanitindan ONCE
      // gelebiliyor. Ayri bir satir olarak eklenirse ayni mesaj bir sure
      // IKI BALONCUK olarak duruyor (cihazda goruldu). Bekleyen kendi
      // satirimla eslesiyorsa onun uzerine yaziliyor ve `yerelId`
      // korunuyor — anahtar degismedigi icin hucre de sokulmuyor.
      const i = bekleyenEsIndeks(cur, m, myUid);
      if (i >= 0) {
        const kopya = cur.slice();
        kopya[i] = { ...m, yerelId: cur[i].yerelId };
        return kopya;
      }
      return [m, ...cur];
    });
  }, [myUid]);

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

  // Yazarken karsi tarafa haber ver. 3 saniyelik kisitlama KOMPOZITOR'DE:
  // metin state'i artik orada, burada degil. Bu islev kararli kaliyor.
  const bildirYaziyor = useCallback(() => {
    sendTyping(other).catch(() => {});
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
  const send = useCallback(async (govde) => {
    const body = (govde || '').trim();
    if (!body) return;

    // Geçici kimlik: sunucu gerçeğini döndürünce bununla değiştiriliyor.
    const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    // `yerelId` = satırın ÖMÜR BOYU anahtarı (bkz. anahtar()). Sunucu
    // kimliği geldiğinde de üstünde kalıyor, böylece hücre sökülmüyor.
    const optimistic = {
      id: tempId, yerelId: tempId,
      from: myUid, text: body, at: Date.now(), pending: true,
    };
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

    // setText BURADA DEĞİL: kutuyu Kompozitor kendi temizliyor — metin
    // state'i orada. Temizleme yine ANINDA, sunucu beklenmiyor.
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
  }, [other, myUid, addMessage, replyTo, t]);

  /**
   * GIF gönder — İYİMSER, metin gönderimiyle aynı mantık.
   * GIF bizim depomuza inmiyor, o yüzden yükleme adımı yok: sağlayıcının
   * doğrudan mesaja iliştiriliyor.
   */
  const sendGif = useCallback(async (g) => {
    setGifOpen(false);
    const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const optimistic = {
      id: tempId, yerelId: tempId,
      from: myUid, text: '', at: Date.now(), pending: true,
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
   * "+" düğmesi — tek ek türü GIF, seçiciyi doğrudan açıyor.
   *
   * Fotoğraf seçeneği ve onu taşıyan ek menüsü 2.7.0'da kaldırıldı. Tek
   * satırlık bir menü, kullanıcıya seçim sunmadan fazladan bir dokunuş
   * bindirirdi.
   */
  const ekAc = useCallback(() => setGifOpen(true), []);

  /**
   * Başlık menüsü — profil · engelle · şikayet.
   *
   * ENGELLEDİKTEN SONRA EKRANDAN ÇIKIYORUZ. Engellenen biriyle olan konuşma
   * sunucuda zaten kapalı (canTalk); ekranda kalsaydı kullanıcı yazabilir
   * sanıp her denemede hata alırdı.
   */
  const kisiSec = useCallback((anahtar) => {
    if (anahtar === 'profile') {
      if (peer?.username) router.push(`/u/${peer.username}`);
      return;
    }
    if (anahtar === 'report') { setReportTarget(cid || other); return; }
    if (anahtar === 'block') {
      Alert.alert(peer?.displayName || peer?.username || '', t('soc.blockConfirm'), [
        { text: t('soc.cancel'), style: 'cancel' },
        {
          text: t('soc.block'),
          style: 'destructive',
          onPress: async () => {
            try { await engelUygula(other); router.back(); }
            catch { Alert.alert(t('soc.err.generic')); }
          },
        },
      ]);
    }
  }, [peer, cid, other, router, t]);

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

  /**
   * Satır çizimi — KARARLI.
   *
   * Satır içi ok fonksiyonuydu: her render'da yeni kimlik, yani FlatList
   * `renderItem` değişti sanıp bütün hücreleri yeniden çiziyordu. `Bubble`
   * artık memo'lu ama memo, ebeveyn onu YENİDEN ÇAĞIRMADAN önce devreye
   * girmiyor — bu yüzden ikisi birlikte anlamlı.
   *
   * `veri`ye bağlı: komşular (eski/yeni) oradan okunuyor ve yeni mesaj
   * geldiğinde gruplama gerçekten yeniden hesaplanmalı.
   */
  const satirCiz = useCallback(({ item, index }) => (item.typing ? <TypingBubble /> : (
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
  )), [veri, myUid, seenId, lang, openMenu, react, paylasimAc, jumpTo, peer, t]);

  useEffect(() => { veriRef.current = veri; }, [veri]);

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
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/friends')} />;
  } else if (error === 'BLOCKED') {
    body = <EmptyState icon="ban-outline" title={t('msg.blocked')} text={t('msg.blockedText')} />;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('common.error')} text={t('common.errorText')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Başlık — G-19 (kit chat() hdr) ──
          SATIR BAŞLIK: geri · 38 avatar (çevrimiçi noktasıyla) · ad ve durum
          · ⋯. Önceki düzen iOS 26'nın ortalanmış Ø60 avatarı ve cam ad
          hapıydı; 2.0 uygulamanın kendi dili ve diğer ekranların üst
          çubuklarıyla aynı hizada duruyor. Alt hat kitten: sohbet listesi
          kaydıkça başlığın nerede bittiği belli olmalı.

          AD DOKUNULABİLİR: kitte kişinin profiline gidiyor ve artık bizde de
          bir profil ekranı var (`/u/[username]`). Kullanıcı adı yoksa
          (profilini kurmamış kişi) dokunma yok — hiçbir yere gitmeyen bir
          düğme olmaz. */}
      <View style={[styles.header, { marginHorizontal: yan, borderBottomColor: dc.line }]}>
        <IconButton icon="back" label={t('a11y.back')} iconSize={C.backIcon} strokeWidth={C.backStroke}
                    onPress={() => router.back()} />
        <UserAvatar avatar={peer?.avatar} name={name} size={C.headerAvatar} online={!!presence?.online} />

        <PressableScale disabled={!peer?.username} dimDisabled={false}
          accessibilityRole={peer?.username ? 'button' : 'text'}
          onPress={() => peer?.username && router.push(`/u/${peer.username}`)} style={styles.kimlik}>
          <Txt variant="cardTitleLarge" numberOfLines={1}>{name}</Txt>
          {/* Durum satırı yalnızca paylaşan kullanıcılarda çiziliyor.
              "YAZIYOR" ARTIK BURADA DEĞİL: akışın en altında kendi
              baloncuğu var (bkz. TypingBubble) — yazılmakta olan şey bir
              mesaj ve yeri diğer mesajların yanı.

              Kitin "· Counter-Strike 2 oynuyor" eki YOK: durum ucu yalnız
              `online` ve `lastSeen` veriyor, oynanan oyunu bilmiyoruz. */}
          {presence ? (
            <Txt variant="caption" numberOfLines={1}
              style={{ color: presence.online ? dc.green : dc.text2 }}>
              {presence.online ? t('msg.online') : lastSeenLabel(presence.lastSeen, t, lang)}
            </Txt>
          ) : null}
        </PressableScale>

        <IconButton icon="more" label={t('a11y.more')} iconSize={C.headerIcon} onPress={() => setKisiMenu(true)} />
      </View>

      {/* ── Sabit mesaj bandı ──
          KLAVYE ALANININ DIŞINDA, listenin üstünde: bant her zaman görünmeli.
          KeyboardAvoidingView'ın içine koysaydım klavye açılınca listeyle
          birlikte yukarı itilir ve başlığın altında kaybolurdu.

          Dokununca mesaja gidiyor, X sabitlemeyi kaldırıyor. Sabit ortak bir
          işaret olduğu için kaldırma da iki tarafa açık. */}
      {body ? null : pinned ? (
        <Animated.View entering={FadeIn.duration(160)} style={[styles.pinBar, { marginHorizontal: yan }]}>
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

      {/* ANDROID'DE DE 'padding' — `undefined` DEĞİL.
          `undefined` bırakıldığında KeyboardAvoidingView Android'de HİÇBİR
          ŞEY yapmaz; tamamen pencerenin adjustResize ile küçülmesine güvenir.
          Android 15+ edge-to-edge zorlamasıyla pencere artık klavye için
          KÜÇÜLMÜYOR — klavye bir inset olarak geliyor ve uygulamanın onu
          kendisi tüketmesi gerekiyor.

          Ölçüldü (2026-08-31, Android 16 emülatör, release APK): klavye
          açılınca yazma alanı da mesajlar da klavyenin ALTINDA kalıyordu,
          hiç yukarı kaymıyorlardı. Aynı kalıp beş dosyada daha var. */}
      {body || (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
            <FlatList
              ref={listRef}
              data={veri}
              inverted
              keyExtractor={anahtar}
              contentContainerStyle={[styles.listPad, { paddingHorizontal: spacing.s16 + yan }]}
              keyboardDismissMode="interactive"
              // ── RENDER PENCERESİ ──
              // RN varsayılanı 21 (kaynak: VirtualizedListProps.js,
              // `windowSize ?? 21`) — yani görünen alanın 10 ekran üstü ve
              // 10 ekran altı kadar hücre BAĞLI tutuluyor. Baloncuklar hafif
              // değil: görsel, video, alıntı ve tepki satırı taşıyorlar.
              //
              // 11 = her yönde 5 ekran. Takas açık: çok hızlı kaydırmada
              // kısa boş alan görülebilir. Cihazda doğrulanacak tek sayı bu;
              // boşluk görülürse 15'e çekilir.
              //
              // removeClippedSubviews BİLEREK AÇILMADI: baloncuğun DIŞINA
              // taşan tapback rozeti var — Android'de bu prop tam olarak bu
              // durumda içerik kaybettiriyor. (Saat sütununun translateX
              // animasyonu G-19'da kalktı; kalan gerekçe rozet.)
              windowSize={11}
              // scrollToIndex, henüz çizilmemiş bir satır istendiğinde HATA
              // ATIYOR. Alıntıya dokunmak eski bir mesaja gidiyor ve o mesaj
              // çoğu zaman çizilmemiş oluyor — bu işleyici olmadan uygulama
              // çöker.
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                listRef.current?.scrollToOffset({
                  offset: index * (averageItemLength || 64), animated: true,
                });
              }}
              renderItem={satirCiz}
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
          {/* Gönderim kutusu da kolonun içinde: liste ortalanıp kutu tam
              genişlikte kalsaydı ikisi aynı konuşmaya ait görünmezdi. */}
          <View style={{ marginHorizontal: yan }}>
          <Kompozitor
            ekVar={gifAcik}
            ekAc={ekAc}
            sending={sending}
            onSend={send}
            onTyping={bildirYaziyor}
            altDolgu={kbVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm)}
          />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Kişi menüsü — arkadaş listesi ve profil ekranıyla AYNI bileşen.
          `arkadas={false}`: "arkadaşlıktan çıkar" burada yanlış bir söz
          olurdu (sohbet arkadaş olmadan da açılabiliyor) ve "mesaj gönder"
          zaten bulunduğun ekran. Geriye tam olarak gereken üç satır kalıyor:
          profil · engelle · şikayet. */}
      <PersonMenu
        visible={kisiMenu}
        person={peer?.uid ? peer : null}
        arkadas={false}
        onClose={() => setKisiMenu(false)}
        onSec={kisiSec}
      />

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

/**
 * Tarih ayracı — G-19 (kit chat() div): ortada 24 pt hap, 12 pt yazı.
 *
 * YALNIZ GÜN. Öncesinde "Bugün 14:32" yazıyordu; saat artık her baloncuğun
 * içinde duruyor ve ayraçtaki kopyası bilgi eklemiyordu.
 */
function Ayrac({ at, t, lang }) {
  const styles = useStyles(makeStyles);
  const { colors: dc } = useDesignTheme();
  const { gun } = ayracParcalari(at, t, lang);
  return (
    <View style={styles.ayrac}>
      <View style={[styles.ayracHap, { backgroundColor: dc.surface1 }]}>
        <Txt variant="caption" style={{ color: dc.text3 }}>{gun}</Txt>
      </View>
    </View>
  );
}

/** Saat:dakika — baloncuğun saat satırı ve okundu satırı bunu kullanıyor. */
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
// KOMPOZİTÖR — metin state'i BURADA, ekranda değil.
//
// ── NEDEN AYRILDI (ölçüldü) ──
//
// `text` state'i sohbet ekranının gövdesindeydi ve liste de aynı bileşende
// çiziliyor. Yani HER KARAKTERDE ekranın tamamı yeniden render oluyordu:
// görünen 8–15 baloncuk, her biri `eski`/`yeni` komşularından gruplama,
// kuyruk ve tarih ayracını yeniden hesaplayarak. Yazma gecikmesi sohbetin
// uzunluğuna bağlıydı — uzun sohbette tuş vuruşu ile harfin ekrana gelmesi
// arasındaki mesafe açılıyordu.
//
// Metin buraya taşınınca yazmak yalnız BU bileşeni render ediyor. Ekran
// gövdesi ve baloncuklar tuş vuruşundan tamamen habersiz.
//
// Gönderme sözleşmesi: kutu ANINDA temizleniyor, sonra `onSend(govde)`.
// İyimser gönderim mantığı ekranda kaldı (bkz. `send`), çünkü iyimser
// baloncuğu listeye ekleyen ve hata durumunu yöneten taraf orası.
// ─────────────────────────────────────────────────────────────────────────────
const Kompozitor = memo(function Kompozitor({
  ekVar, ekAc, sending, onSend, onTyping, altDolgu,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  // 2.0 paleti: eski `colors` adlandırmasında vurgu kırmızı, kitin
  // gönderilen baloncuğu ise BİRİNCİL yüzey (acS/onAc). İki palet yan
  // yana duruyor çünkü ekranın henüz taşınmamış bölümleri eski adları
  // kullanıyor (zengin baloncuklar — sıradaki iş).
  const { colors: dc } = useDesignTheme();
  const { t } = useLanguage();
  const [text, setText] = useState('');

  // Yazarken karsi tarafa haber ver — EN FAZLA 3 saniyede bir.
  const sonYazmaRef = useRef(0);
  const yaz = useCallback((v) => {
    setText(v);
    const now = Date.now();
    if (v && now - sonYazmaRef.current > 3000) {
      sonYazmaRef.current = now;
      onTyping?.();
    }
  }, [onTyping]);

  const gonder = useCallback(() => {
    const govde = text.trim();
    if (!govde) return;
    setText('');
    onSend?.(govde);
  }, [text, onSend]);

  const doluMu = !!text.trim();

  return (
    <View style={[styles.composer, { backgroundColor: dc.bg2, borderTopColor: dc.line, paddingBottom: altDolgu }]}>
      {/* ── TEK "+" DÜĞMESİ ──
          Öncesinde fotoğraf ve GIF için iki ayrı simge duruyordu.
          iOS'ta tek bir "+" var ve ekleri bir menüde topluyor; sebebi
          de görünür: kompozitörün solu her yeni ek türünde büyümüyor.

          YETENEĞE BAĞLI kalıyor. Yapılandırma eksikken düğme hiç
          çizilmiyor — basınca "şu an kapalı" diyen bir düğme
          uygulamayı yarım gösteriyor (Guideline 2.2). Bugün tek ek
          türü GIF; düğme menü açmadan doğrudan seçiciyi açıyor.

          KİTİN DİĞER İKİ İKONU ÇİZİLMİYOR: "görsel gönder" fotoğraf
          yüklemesi demek ve 2.7.0'da uygulamadan çıkarıldı (AGENTS.md);
          "oyun paylaş" için kompozitörde bir oyun seçici yok — paylaşım
          oyun ekranından başlıyor. */}
      {ekVar ? (
        <IconButton icon="plus" label={t('msg.attach')} variant="filled" iconSize={KC.plusIcon}
                    disabled={sending} onPress={ekAc} />
      ) : null}

      <View style={[styles.girdiKapsul, { backgroundColor: dc.surface2 }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={yaz}
          placeholder={t('msg.placeholder')}
          placeholderTextColor={colors.text3}
          maxLength={MAX_TEXT}
          multiline
        />
      </View>

      {/* Gönder düğmesi ALANIN DIŞINDA ve HER ZAMAN ÇİZİLİ (kit comp).
          Öncesinde kapsülün içindeydi ve yalnız yazınca beliriyordu; kit
          onu ayrı bir daire olarak ve sürekli gösteriyor. Boşken pasif:
          görünen ama çalışmayan bir düğme yalan değil, kapalı bir kapı —
          kaybolup yerleşimi oynatan bir düğmeden daha sakin. */}
      <PressableScale
        style={[styles.sendBtn, { backgroundColor: dc.primary }]}
        onPress={gonder}
        disabled={sending || !doluMu}
        accessibilityRole="button"
        accessibilityLabel={t('msg.send')}
      >
        {sending
          ? <ActivityIndicator size="small" color={dc.onPrimary} />
          : <Icon name="send" size={KC.sendIcon} color={dc.onPrimary} strokeWidth={2} />}
      </PressableScale>
    </View>
  );
});

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
  msg, mine, seen, eski, yeni, taze, lang,
  onLongPress, onOpenShare, onReact, onJumpTo, myUid, peerName, t,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  // 2.0 paleti: eski `colors` adlandırmasında vurgu kırmızı, kitin
  // gönderilen baloncuğu ise BİRİNCİL yüzey (acS/onAc). İki palet yan
  // yana duruyor çünkü ekranın henüz taşınmamış bölümleri eski adları
  // kullanıyor (zengin baloncuklar — sıradaki iş).
  const { colors: dc } = useDesignTheme();
  const azHareket = useReducedMotion();

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
  const acPaylasimi = useCallback(() => onOpenShare?.(msg), [onOpenShare, msg]);
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
        <View style={styles.gifKap}>
          <Image source={msg.gif.url} style={styles.gifBubble} contentFit="contain" transition={motion.image} />
        </View>
      </View>
    );
  } else {
    govde = (
      <View style={[
        styles.bubble,
        { backgroundColor: mine ? dc.primary : dc.surface2 },
        // ── KUYRUK ARTIK BİR KÖŞE ──
        // Çizilen kuyruk (BubbleTail) ve onun salt görselde kullandığı
        // "görselin ikinci kopyası" hilesi kalktı: kit kuyruğu baloncuğun
        // KÖŞE YARIÇAPIYLA anlatıyor (18 18 18 6 / 18 18 6 18). Küçük köşe
        // grubun SON baloncuğunda — kuyruk kuralı neyse o.
        kuyruk && (mine ? styles.kuyrukBenim : styles.kuyrukOnun),
        // Salt görsel mesajda dolgu YOK: görselin baloncuğu tamamen doldurması
        // gerekiyor, aksi hâlde kenarlarda renkli bir çerçeve kalıyor.
        saltGorsel && styles.bubbleMediaOnly,
      ]}>
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
            mine && { color: dc.onPrimary },
            hasMedia && styles.bubbleTextUnderMedia,
          ]}>
            {msg.text}
          </Text>
        )}
        {/* Saat baloncuğun son satırı (kit recv/sent). Salt görselde
            dolgu yok, saat görselin üstüne düşerdi — orada çizilmiyor. */}
        {saltGorsel ? null : (
          <Txt variant="caption2" style={[styles.saat, { color: mine ? dc.onPrimaryMuted : dc.text3 }]}>
            {saatOf(msg.at, lang)}
          </Txt>
        )}
      </View>
    );
  }

  return (
    <View style={{ marginTop: ustPay }}>
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
          style={[styles.sarmal, msg.pending && styles.sarmalBekliyor]}
          onLongPress={msg.deleted ? undefined : handleLongPress}
          delayLongPress={400}
          onPress={msg.share ? acPaylasimi : onTap}
        >
          {govde}
          {/* Tapback baloncuğun DIŞ üst köşesinde — kendi mesajımda solda,
              gelen mesajda sağda. iOS'un yerleşimi bu ve sebebi konum:
              rozet ekranın ortasına doğru bakıyor, kenara değil. */}
          <Reactions chips={chips} mine={mine} onPress={tepki} />
        </Pressable>

        {/* Gönderiliyor / başarısız — iyimser gönderimin görünen tarafı.
            "Okundu" YALNIZCA en yeni okunmuş kendi mesajımda (bkz. seenId).
            SAATİ ARTIK TEKRARLAMIYOR: saat baloncuğun içinde duruyor, alt
            satıra ikinci kez yazmak aynı bilgiyi iki kez söylerdi. */}
        {/* "Gönderiliyor…" ARTIK YAZI DEĞİL, OPAKLIK (bkz. sarmalBekliyor).
            Yazı olarak baloncuğun altına giriyordu; gönderim bitince
            kaybolunca satır kısalıyor ve altındaki her şey kayıyordu —
            cihazda görüldü. iOS'ta da gönderim sırasında ayrı bir yazı
            yok. Opaklık yerleşimi hiç değiştirmiyor.

            "Gönderilmedi" YAZI OLARAK KALIYOR: nadir, kullanıcıdan bir
            karşılık bekleyen bir durum ve yer açmayı hak ediyor. */}
        {msg.failed ? <Text style={[styles.state, styles.stateFail]}>{t('msg.notSent')}</Text> : null}
        {seen && !msg.pending && !msg.failed ? (
          <Text style={styles.seen}>{t('msg.seen')}</Text>
        ) : null}
      </Animated.View>
    </View>
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

  // ── Başlık — G-19 (kit chat() hdr) ──
  // Tek satır: geri · avatar · ad sütunu · ⋯. Alt hat kitten.
  header: {
    height: C.headerHeight, paddingHorizontal: C.headerPaddingH, gap: C.headerGap,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // `minWidth: 0` olmadan uzun ad iki düğmeyi ekranın dışına itiyor.
  kimlik: { flex: 1, minWidth: 0, marginLeft: C.headerNameLeft, alignItems: 'flex-start' },

  // ── Tarih ayracı — kit chat() div ──
  // Ortada 24 pt hap. SAAT ARTIK YOK: her baloncuk kendi saatini taşıyor,
  // ayraçta tekrarı bilgi eklemiyordu.
  ayrac: { alignItems: 'center', marginTop: C.divider.top },
  ayracHap: {
    height: C.divider.height, paddingHorizontal: C.divider.paddingH, borderRadius: radius.pill,
    justifyContent: 'center',
  },

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
  // Gönderim uçuşta: baloncuk soluk. Metin satırı yerine bu kullanılıyor
  // çünkü opaklık YERLEŞİMİ DEĞİŞTİRMİYOR — giren/çıkan bir yazı satırı
  // her gönderimde listeyi kaydırıyordu.
  sarmalBekliyor: { opacity: 0.55 },

  // Goruldu / durum isareti baloncugun ALTINDA ve hizasi satirdan geliyor.
  seen:  { color: colors.text3, fontSize: type.caption2, marginTop: spacing.s4 },
  // Baloncuğun son satırı: sağa yaslı saat (kit recv/sent). NUMERIC şart —
  // orantılı yazıda "1" ile "8" farklı genişlikte ve alt alta duran saatler
  // titriyor.
  saat: { marginTop: C.bubble.timeTop, textAlign: 'right', ...NUMERIC },
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
    marginHorizontal: KC.paddingH, marginBottom: spacing.s8,
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

  // ── Baloncuk — G-19 (kit chat() recv/sent) ──
  // 15/21 metin, 9/14/8 dolgu, köşe 18. Genişlik ARTIK ORANLI DEĞİL: kit
  // 270 pt sabit veriyor ve baloncuk içi saat bu genişliğe göre ölçüldü.
  bubble: {
    maxWidth: C.bubble.maxWidth,
    paddingTop: C.bubble.paddingTop, paddingHorizontal: C.bubble.paddingH, paddingBottom: C.bubble.paddingBottom,
    borderRadius: C.bubble.radius,
  },
  // Kuyruk = küçük köşe. Kendi mesajımda sağ alt, gelende sol alt.
  kuyrukBenim: { borderBottomRightRadius: C.bubble.corner },
  kuyrukOnun:  { borderBottomLeftRadius: C.bubble.corner },
  // `overflow: 'hidden'` YOK: köşe yuvarlaklığı görselin kendisinde
  // (medyaTek), kırpmaya gerek kalmıyor.
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
  // Kit 15/21 (`bodyTight`); gönderi metninden (15/22) bir piksel sıkı.
  bubbleText:     { color: colors.text, fontSize: typography.bodyTight.fontSize, lineHeight: typography.bodyTight.lineHeight },
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

  // ── Kompozitör — G-19 (kit chat() comp) ──
  // Üst hatlı kendi zemini olan bir bant: + 44 · kapsül 44 (köşe 22) ·
  // gönder 44. Kenar 12, aradaki boşluk 8.
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: KC.gap,
    paddingHorizontal: KC.paddingH, paddingTop: KC.paddingTop,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  girdiKapsul: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    minHeight: KC.input, borderRadius: KC.inputRadius,
    paddingLeft: KC.inputLeft, paddingRight: KC.inputRight, paddingVertical: spacing.s4,
  },
  input: {
    flex: 1, maxHeight: 120, color: colors.text, fontSize: typography.input.fontSize,
    paddingTop: GIRDI_DIKEY, paddingBottom: GIRDI_DIKEY,
  },
  sendBtn: {
    width: KC.button, height: KC.button, borderRadius: KC.button / 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
