import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, withSequence,
  interpolate, Extrapolation,
} from 'react-native-reanimated';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { usePop } from '../hooks/usePop';
import { useTabBarCompact, useTabBarHidden } from '../context/TabBarContext';
import { useUnread, refreshUnread } from '../services/unread';
import { type, NUMERIC, spacing, shadows, radius, TAB_BAR, motion } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';

// Sekme olmayan rotalar da burada (games, news, library): harita üst küme
// olarak tutuluyor ki bir rota sekmeye girip çıkınca simgesi kaybolmasın.
const ICONS = {
  index:    'home',
  reviews:  'people',
  games:    'game-controller',
  videos:   'play-circle',
  messages: 'chatbubble-ellipses',
  news:     'newspaper',
  library:  'library',
  profile:  'person',
};

// Rozet taşıyan sekmeler. Şimdilik tek; harita olarak duruyor ki ikinci bir
// sayaç (ör. arkadaşlık istekleri) eklenince koşul dallanmasın.
const BADGED = { messages: true };

const PAD = 6;

// ─────────────────────────────────────────────────────────────────────────────
// ANDROID'İN KENDİ ÇUBUĞU (Faz 2)
//
// Faz 2 Android için AYRI bir çubuk tarif ediyor; ölçüleri: r20 · opak yüzey
// + elevation 18 · 72×48 köşeli vurgu · ikon 22 · basınca şekil morfu.
// Gerekçe platform dili: iOS'ta çubuk bir CAM HAP (tam yuvarlak, arkası
// bulanık, kenarlıkla sınırlanan), Android'de OPAK BİR YÜZEY — Material'da
// yüzeyi içerikten ayıran şey bulanıklık değil YÜKSEKLİK (elevation), ve
// yüzeyler tam hap değil köşeli.
//
// Bu, tasarım paketindeki `src/design/tokens.json → blur.$fallback` notunu
// ("Android'de glassFallback düz dolgu + aynı gölge, geometri asla değişmez")
// BİLEREK eziyor. O not cam YOKKEN düz dolguya düşmeyi anlatıyordu; Faz 2
// Android'i bir yedek olmaktan çıkarıp kendi ölçüsünü veriyor.
//
// UYGULANMAMA GEREKÇESİ DÜŞTÜ. AGENTS.md bunu "doğrulanamaz" diye park
// etmişti (projede `android/` dizini yoktu). Artık var: Android 16
// emülatöründe release APK ile ölçülüyor.
// ─────────────────────────────────────────────────────────────────────────────
const ANDROID = Platform.OS === 'android';

// TEK KAYNAK theme.js. Öncesinde burada ve videos.jsx'te ayrı ayrı 58 yazıyordu.
// YÜKSEKLİK İKİ PLATFORMDA DA 58: Faz 2 Android için ayrı bir yükseklik
// vermiyor ve 58, `TAB_SPACE`/`useTabBosluk` aritmetiğinin girdisi — burada
// oynatmak 8 ekranın liste dolgusunu sessizce kaydırırdı.
const BAR_H = TAB_BAR.height;   // Faz 2: 58
// iOS tam hap (r29), Android köşeli yüzey (r20 = radius.xl).
const RADIUS = ANDROID ? radius.xl : BAR_H / 2;
// FAZ 2: 22 → 25. Etiket kalkınca ikon tek taşıyıcı; 58pt çubukta 25pt ikon
// dikeyde 16.5pt nefes bırakıyor. Android'de 22: vurgu 42 değil 48 yüksekliğinde
// ve 72 genişliğinde — daha büyük bir kabın içinde 25pt ikon kabı dolduruyordu.
const ICON = ANDROID ? 22 : 25;

// ── KAYAN VURGU (Faz 2) ──
// Maket ölçüsü: iOS 52×42, r 21 · Android 72×48, köşeli. Renk iki platformda
// da aynı: rgba(232,36,43,0.16) (açık temada .22).
// Etiketsiz çubukta seçili sekmeyi anlatan tek şey ikonun rengi kalıyordu ve
// renk TEK kanal — renk körlüğünde ayırt edilemez. Vurgu ikinci kanal:
// konum. Ayrıca "nereye gittim" bilgisini kayarak taşıyor.
const HAP_W = ANDROID ? 72 : 52;
const HAP_H = ANDROID ? 48 : 42;
// "Köşeli" tek başına bir sayı değil; ölçekten seçildi: radius.lg (16). 48'lik
// bir kapta 16, tam yuvarlağın (24) üçte ikisi — köşe okunuyor ama sertlemiyor.
const HAP_R = ANDROID ? radius.lg : HAP_H / 2;
// ŞEKİL MORFUNUN VARIŞ ŞEKLİ: tam yuvarlak (48/2). Basılıyken köşe açılıyor,
// bırakınca köşeli hâline dönüyor — Faz 2'nin "basınca şekil morfu" satırı.
const HAP_R_BASILI = HAP_H / 2;
// Faz 2: elevation 18. `shadows.floating` koyu temada zaten 18 veriyor, AÇIK
// temada 10'a düşüyor — Android çubuğunda yüzeyi ayıran tek kanal gölge
// olduğu için iki temada da 18 sabit.
const ANDROID_ELEVATION = 18;

// ─────────────────────────────────────────────────────────────────────────────
// Liquid Glass kullanılabilirliği — MODÜL DÜZEYİNDE bir kez hesaplanır.
// İki kontrol birden şart: bazı iOS 26 beta sürümlerinde API yok ve yalnızca
// isLiquidGlassAvailable'a güvenilirse uygulama çöküyor.
// ─────────────────────────────────────────────────────────────────────────────
const GLASS_OK = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  // Yatayda çubuk uzun kenarı baştan sona kaplıyordu (width: '100%'): 874pt'lik
  // bir bant, hem görsel olarak ezici hem de video izlerken gereksiz yer
  // kaplıyor. Genişlik sınırlanıyor, `wrap` zaten alignItems:'center' taşıdığı
  // için kendiliğinden ortalanıyor.
  //
  // Yükseklik SABİT bırakıldı: BAR_H modül düzeyinde ve RADIUS ile hap
  // konumunun (top: (BAR_H-42)/2) hesabı ona bağlı. Yüksekliği yöne göre
  // değiştirmek bu üçünü birden oynatmak demekti; sorun genişlikteydi.
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;
  const reducedMotion = useReducedMotion();
  const compact = useTabBarCompact();
  const hidden = useTabBarHidden();

  // ── Kayan vurgunun konumu ──
  // Çubuk genişliği ÖLÇÜLÜYOR, hesaplanmıyor: `wrap` yatayda kenar
  // boşluklarına, yatay yönde de maxWidth 420'ye tabi — genişliği pencereden
  // türetmek iki kuralı da burada ikinci kez yazmak olurdu.
  //
  // Öğeler `flex: 1` olduğu için beşi eşit; hücre genişliği tek bölme.
  const [barW, setBarW] = useState(0);
  const hucre = barW > 0 ? (barW - PAD * 2) / state.routes.length : 0;
  // VURGU HÜCREDEN TAŞAMAZ. Android'in 72pt'lik vurgusu geniş cihazda sığıyor
  // (411dp Pixel 8: hücre 71.9) ama 360dp'lik bir telefonda hücre 61.6'ya
  // iniyor; sabit 72 orada komşu sekmenin altına 5pt giriyor ve o ikon "yarı
  // seçili" görünüyor. Sınır ÖLÇÜLEN genişlikten türetiliyor, pencereden değil.
  const hapW = hucre > 0 ? Math.min(HAP_W, hucre) : HAP_W;
  const pos = useSharedValue(0);
  useEffect(() => {
    if (hucre <= 0) return;
    const hedef = PAD + state.index * hucre + (hucre - hapW) / 2;
    // firm (ζ=1, aşmasız): "nereye gittim" bilgisi aşarsa bozukluk gibi
    // okunuyor — ikonun pop'u aşmalı, vurgunun kayması değil.
    pos.value = reducedMotion ? hedef : withSpring(hedef, motion.firm);
  }, [state.index, hucre, hapW, pos, reducedMotion, state.routes.length]);

  // ── ŞEKİL MORFU — YALNIZ ANDROID (Faz 2) ──
  // Parmak çubuğa değdiği sürece vurgunun köşesi açılıyor (16 → 24, yani tam
  // yuvarlak), bırakınca köşeli hâline dönüyor. iOS'ta yok ve olamaz da:
  // oradaki vurgu zaten tam yuvarlak, morfacak bir köşesi yok.
  //
  // TEK PAYLAŞILAN DEĞER, sekme başına bir tane değil: ekranda tek bir vurgu
  // var. Basılan sekme vurgunun durduğu sekme olmasa bile morf doğru okunuyor
  // — dokunuş vurguyu zaten o hücreye taşıyor, morf o kaymanın başlangıcı.
  const basili = useSharedValue(0);

  const hapStyle = useAnimatedStyle(() => {
    if (!ANDROID) return { transform: [{ translateX: pos.value }] };
    return {
      transform: [{ translateX: pos.value }],
      // borderRadius transform DEĞİL, ama yerleşim de tetiklemiyor: yalnız
      // yeniden boyama. Tek ve küçük bir görünümde bedeli ölçülebilir değil.
      borderRadius: interpolate(
        basili.value, [0, 1], [HAP_R, HAP_R_BASILI], Extrapolation.CLAMP,
      ),
    };
  }, []);

  // ── Çubuk sekmesi ──
  // Sekme degisiminde tum cubuk kisa bir "otur" hareketi yapiyor: once
  // hafifce basiliyor, sonra yayla geri geliyor.
  //
  // BURADA ASMA (overshoot) ISTENIYOR — pill konumunun tam TERSI. Orada
  // ζ=1 secilmisti cunku vurgunun hedefi asip geri gelmesi bozukluk gibi
  // gorunuyordu. Burada asma hareketin KENDISI; ζ<1 olmadan tepki olmez.
  //   ζ = damping / (2·√(stiffness·mass)) = 12 / (2·√220) ≈ 0.40
  const bounce = useSharedValue(0);
  const firstRun = useRef(true);
  useEffect(() => {
    // Ilk cizimde tetiklenmesin: uygulama acilisinda cubugun zipllamasi
    // hareketi anlamsizlastirir.
    if (firstRun.current) { firstRun.current = false; return; }
    if (reducedMotion) return;
    bounce.value = withSequence(
      // 90 idi — maketin alt siniri 100 ("Aralik 100-320 ms").
      // Pop'un donus yarisi; 110 usePop ile ayni adim.
      withTiming(1, { duration: 110 }),
      withSpring(0, { stiffness: 220, damping: 12 }),
    );
  }, [state.index, bounce, reducedMotion]);

  // ── Okunmamış rozeti ──
  // Sekme her değiştiğinde tazeleniyor. Aralıklı yoklamaya göre tercih
  // sebebi: kullanıcı zaten sekme değiştirerek dolaşıyor ve rozet o anda
  // güncelleniyor; boşta duran uygulamada istek gitmiyor.
  const unread = useUnread();
  useEffect(() => { refreshUnread(); }, [state.index]);

  // Aşağı kaydırınca küçül, yukarı kaydırınca büyü.
  //
  // YALNIZCA transform kullanılıyor — iki sebeple:
  //  1. height/width animasyonu her karede yeniden yerleşim tetikler
  //  2. expo-glass-effect dokümanı GlassView'da veya EBEVEYNİNDE opacity<1
  //     kullanılmamasını söylüyor; opacity ile soldursaydık cam bozulurdu
  const barStyle = useAnimatedStyle(() => {
    // Tam gizleme daralmadan BAĞIMSIZ: Reels'te videoya basılı tutulduğunda
    // çubuk ekranın altına kayıp gözden kayboluyor.
    //
    // OPACITY KULLANILMIYOR — yukarıdaki 2. maddenin aynısı: cam katmanının
    // ebeveyninde opacity<1 camı bozuyor. Ekran dışına ötelemek zaten yeterli;
    // BAR_H + 60, en büyük güvenli alan boşluğunu ve gölgeyi de aşıyor.
    const h = hidden ? hidden.value : 0;
    const hideY = interpolate(h, [0, 1], [0, BAR_H + 60], Extrapolation.CLAMP);

    // Sekme tepkisi: 0 -> 1 arasinda hafif bir basilma. Deger kucuk
    // (0.965) cunku bu bir vurgu degil, bir DOKUNMA hissi.
    const b = interpolate(bounce.value, [0, 1], [1, 0.965], Extrapolation.CLAMP);

    if (reducedMotion || !compact) {
      return { transform: [{ translateY: hideY }, { scale: b }] };
    }

    const c = compact.value;
    return {
      transform: [
        { translateY: hideY },
        // Daralma ve sekme olcekleri CARPILIYOR, ust uste yazilmiyor:
        // iki ayri scale girisi birbirini eziyordu.
        { scale: interpolate(c, [0, 1], [1, 0.86], Extrapolation.CLAMP) * b },
        { translateY: interpolate(c, [0, 1], [0, 10], Extrapolation.CLAMP) },
      ],
    };
  }, [reducedMotion, compact, hidden, bounce]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, {
      // Handoff: alt kenardan 24. Güvenli alanı AŞMAMASI için ikisinin
      // büyüğü alınıyor — çentiksiz cihazda 24, ana ekran çubuğu olanda
      // sistemin istediği kadar.
      bottom: Math.max(insets.bottom, TAB_BAR.bottom),
    }]}>
      {/* GÖLGE AYRI KATMANDA. `bar` yuvarlak köşeyi kırpmak için
          overflow:'hidden' taşıyor; iOS bunu clipsToBounds'a çeviriyor ve
          AYNI katmandaki gölgeyi tamamen kırpıyor. Gölge kırpılmayan bir
          sarmalayıcıya alındı — hem düz hem cam yolda görünüyor.
          (Kontrol listesi: "Cam desteklenmeyen ortamda düz dolgu, AYNI
          geometri VE GÖLGE".)

          ANDROID'DE GÖLGEYİ `elevation` ÇİZİYOR ve bu katmanda çalışıyor:
          ölçüldü (Android 16 emülatör, release APK, iki derleme yan yana).
          "Zemini olmayan görünümde elevation gölge çizmez" beklentisi bu
          ağaçta YANLIŞ — `borderRadius` verilen görünüme RN zaten bir arka
          plan çizimi (dolayısıyla outline) takıyor, gölge zeminsiz de
          çiziliyordu. Android'e özgü tek fark yüksekliğin kendisi
          (golgeAndroid). */}
      <Animated.View
        style={[
          styles.golge,
          ANDROID && styles.golgeAndroid,
          isLandscape && styles.barLandscape,
          barStyle,
        ]}
      >
      <View
        style={[styles.bar, GLASS_OK ? styles.barGlass : styles.barSolid]}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      >
        {/* Cam katmanı içeriği SARMALAMAZ, arkasında durur — sekme öğeleri
            basılınca opacity uyguluyor ve bu camı bozardı. */}
        {GLASS_OK && (
          <GlassView
            style={[StyleSheet.absoluteFill, styles.glassLayer]}
            glassEffectStyle="regular"
            pointerEvents="none"
          />
        )}

        {/* Vurgu cam katmanının ÜSTÜNDE, sekme öğelerinin ALTINDA: camın
            altına girerse blur onu yutuyor, öğelerin üstüne çıkarsa ikonu
            örtüyor. */}
        {hucre > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.hap, { width: hapW }, hapStyle]} />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const base = ICONS[route.name] || 'ellipse';

          const onPress = () => {
            // Instagram sekmelerde hafif bir dokunsal tepki veriyor;
            // "premium" hissin buyuk kismi gorsel degil dokunsal.
            if (!focused) Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          // Şekil morfu yalnız Android'de ve hareket kısıtlı değilken.
          // `withTiming(110)`: basma tepkisi bu dosyada zaten 110 (çubuğun
          // "otur" hareketi ve ikonun pop'u) — üçüncü bir süre üretilmiyor.
          const onPressIn  = () => { if (ANDROID && !reducedMotion) basili.value = withTiming(1, { duration: 110 }); };
          const onPressOut = () => { if (ANDROID && !reducedMotion) basili.value = withSpring(0, motion.firm); };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              // Görünür etiket kalktı → VoiceOver'ın okuyacağı tek kaynak bu.
              // Etiketsiz bırakmak sekmeleri ekran okuyucuda anlamsız yapardı.
              accessibilityLabel={label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.55 }]}
              hitSlop={8}
            >
              <TabIcon
                base={base}
                focused={focused}
                // Odaktaki sekmede rozet YOK: kullanıcı zaten oradaysa
                // "bekleyen bir şey var" demenin anlamı kalmıyor.
                badge={BADGED[route.name] && !focused ? unread : 0}
              />
            </Pressable>
          );
        })}
      </View>
      </Animated.View>
    </View>
  );
}

/**
 * Sekme simgesi — secildiginde kisa bir buyume tepkisi veriyor.
 *
 * HER SIMGENIN KENDI degeri var, ortak bir deger degil: ortak olsaydi tum
 * simgeler ayni anda buyur ve tepki "hangi sekmeye gectim" bilgisini
 * tasimazdi. Tepki, secilen sekmeyi ISARET etmeli.
 *
 * OPACITY YOK — bu bilesen cam katmaninin kardesi ve GlassView'in
 * ebeveyninde opacity<1 cami bozuyor (bkz. dosya basi). Yalnizca transform.
 */
function TabIcon({ base, focused, badge = 0 }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  // Mantik usePop'a tasindi: ayni hareket begeni ve istek listesinde de
  // gerekiyordu ve kopyalanmasi besinci bir yay ayari uretirdi.
  // `reducedMotion` prop'u kalkti — kanca kendisi bakiyor.
  //
  // ETIKETLER MAKETTE VAR ve gerekcesi yazili: "Etiketler kaliyor (Turkce'de
  // ikon tek basina belirsiz), ama sadece aktif olan tam kontrastta."
  // (screens/04-bolum.png — Yuzen sekme cubugu.)
  //
  // Bir ara kaldirilip geri konuldu; karar maketin kendisine dayaniyor.
  const style = usePop(focused, 1.12);   // handoff: 1.0 → 1.12

  return (
    <Animated.View style={[style, styles.item]}>
      <View>
        <Ionicons
          name={focused ? base : `${base}-outline`}
          size={ICON}
          color={focused ? colors.accent : colors.text3}
        />
        {/* Rozet simgenin İÇİNDE, animasyonlu görünümün altında: sekme
            seçilirken birlikte büyüyor. Dışarıda dursaydı simge büyürken
            rozet yerinde kalır, ikisi ayrışmış görünürdü.

            OPACITY YOK — cam katmanının kardeşi (bkz. dosya başı). */}
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, NUMERIC]}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Handoff: yan kenardan 20, alttan 24.
  wrap: {
    position: 'absolute',
    left: TAB_BAR.side,
    right: TAB_BAR.side,
    alignItems: 'center',
  },
  // Gölge katmanı — overflow YOK, yoksa gölge kırpılır.
  golge: {
    width: '100%',
    borderRadius: RADIUS,
    ...shadows.floating,
  },
  // ANDROID: Faz 2'nin elevation 18'i. `shadows.floating` koyu temada zaten 18
  // veriyor, AÇIK temada 10'a düşüyordu — Android'de yüzeyi içerikten ayıran
  // tek kanal gölge olduğu için iki temada da 18.
  //
  // Ölçüldü (aynı ekran, iki release APK): gölge açık temada çubuğun 20px
  // solunda 239 → 242, 34px solunda 254 → 251. Yani kenarda yumuşuyor, dışarı
  // daha uzağa taşıyor: 18'in beklenen davranışı.
  golgeAndroid: {
    elevation: ANDROID_ELEVATION,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: BAR_H,
    paddingHorizontal: PAD,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  // 420: beş sekmenin asgarisi 5×56 + 2×PAD = 292pt, yani rahat sığıyor;
  // 874pt'lik yatay kenarın yarısından azını kaplıyor.
  // ölçüldüğü için hap konumu bu genişliğe kendiliğinden uyuyor.
  barLandscape: { maxWidth: 420 },
  // iOS 26+: arka planı cam veriyor, altına düz renk KOYULMAZ
  // Cam yolda da KENARLIK var — öncesinde yalnız saydam zemin vardı ve
  // çubuğun sınırı belirsizdi. Gölge ortak sarmalayıcıda.
  barGlass: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.glassBorder },
  // iOS 26 öncesi ve Android: düz dolgu. `glassFallback` zaten OPAK bir hex
  // (koyu #16171B, açık #F7F7F9), yani Faz 2'nin Android'den istediği "opak
  // yüzey" ayrı bir renk gerektirmiyor — değişen yalnız geometri ve gölge.
  barSolid: {
    backgroundColor: colors.barSolid,
    borderWidth: 1,
    // tokens.json → glassBorder (.10). Kart kenarlığından (.07) ayrı, çünkü
    // çubuk içeriğin ÜSTÜNDE yüzüyor; borderStrong (.12) ise fazla sertti.
    borderColor: colors.glassBorder,
  },
  glassLayer: { borderRadius: RADIUS },
  // Maket: iOS 52×42 r21 · Android 72×48 köşeli (r16, basılıyken 24).
  // Genişlik JSX'te ölçülen hücreden geliyor; buradaki değer yalnız ilk
  // çizimin (barW=0) yedeği.
  hap: {
    position: 'absolute',
    left: 0,
    top: (BAR_H - HAP_H) / 2,
    width: HAP_W,
    height: HAP_H,
    borderRadius: HAP_R,
    backgroundColor: colors.tabVurgu,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  // Simgenin sağ üst köşesine biniyor. Çerçeve çubuk zemininin rengiyle
  // değil, koyu arka planla çiziliyor: cam açıkken çubuğun rengi arkadaki
  // içeriğe göre değişiyor ve sabit bir eşleşme tutturulamaz — koyu bir
  // halka her iki durumda da rozeti simgeden ayırıyor.
  //
  // KIRMIZI (Faz 2, Faz 1'in düzeltmesi). Faz 1'de nötrleştirilmişti;
  // Faz 2 geri alıyor ve gerekçesi ayrım koyuyor: yasak olan EYLEME
  // DÖNÜŞMEYEN kırmızı rozet. Okunmamış mesaj eyleme dönüşür — açıp
  // okursun ve rozet gider. Ayrıca odaktaki sekmede hiç çıkmıyor.
  badge: {
    position: 'absolute', top: -4, right: -9,
    minWidth: 17, height: 17, borderRadius: 9,
    paddingHorizontal: spacing.xs,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentFillStrong,
    // tema-bagimsiz: cam cubugun uzerinde, zemin arkadaki icerik
    borderWidth: 2, borderColor: 'rgba(6,7,10,0.9)',
  },
  // tema-bagimsiz: dolu kirmizi rozetin uzerinde
  badgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },
});
