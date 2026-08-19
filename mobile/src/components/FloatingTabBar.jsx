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
import { type, NUMERIC, spacing, shadows, TAB_BAR, motion } from '../theme';
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
// TEK KAYNAK theme.js. Öncesinde burada ve videos.jsx'te ayrı ayrı 58 yazıyordu.
const BAR_H = TAB_BAR.height;   // Faz 2: 58
const RADIUS = BAR_H / 2;       // tam hap — maket: r 29
// FAZ 2: 22 → 25. Etiket kalkınca ikon tek taşıyıcı; 58pt çubukta 25pt ikon
// dikeyde 16.5pt nefes bırakıyor.
const ICON = 25;

// ── KAYAN VURGU (Faz 2) ──
// Maket ölçüsü: 52×42, r 21, rgba(232,36,43,0.16).
// Etiketsiz çubukta seçili sekmeyi anlatan tek şey ikonun rengi kalıyordu ve
// renk TEK kanal — renk körlüğünde ayırt edilemez. Vurgu ikinci kanal:
// konum. Ayrıca "nereye gittim" bilgisini kayarak taşıyor.
const HAP_W = 52;
const HAP_H = 42;

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
  const pos = useSharedValue(0);
  useEffect(() => {
    if (hucre <= 0) return;
    const hedef = PAD + state.index * hucre + (hucre - HAP_W) / 2;
    // firm (ζ=1, aşmasız): "nereye gittim" bilgisi aşarsa bozukluk gibi
    // okunuyor — ikonun pop'u aşmalı, vurgunun kayması değil.
    pos.value = reducedMotion ? hedef : withSpring(hedef, motion.firm);
  }, [state.index, hucre, pos, reducedMotion, state.routes.length]);

  const hapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value }] }), []);

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
          geometri VE GÖLGE".) */}
      <Animated.View
        style={[styles.golge, isLandscape && styles.barLandscape, barStyle]}
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
          <Animated.View pointerEvents="none" style={[styles.hap, hapStyle]} />
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
  // iOS 26 öncesi ve Android: eski görünüm
  barSolid: {
    backgroundColor: colors.barSolid,
    borderWidth: 1,
    // tokens.json → glassBorder (.10). Kart kenarlığından (.07) ayrı, çünkü
    // çubuk içeriğin ÜSTÜNDE yüzüyor; borderStrong (.12) ise fazla sertti.
    borderColor: colors.glassBorder,
  },
  glassLayer: { borderRadius: RADIUS },
  // Maket: 52×42, r 21, accent %16 tint.
  hap: {
    position: 'absolute',
    left: 0,
    top: (BAR_H - HAP_H) / 2,
    width: HAP_W,
    height: HAP_H,
    borderRadius: HAP_H / 2,
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
