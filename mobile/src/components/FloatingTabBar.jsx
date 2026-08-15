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
import { colors, type, NUMERIC, spacing, shadows } from '../theme';

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
const PILL_W = 52;
const BAR_H = 58;      // etiketler kalkınca çubuk kısaldı
const RADIUS = BAR_H / 2;

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
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);
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

  // Kayan vurgu konumu.
  //
  // Eskiden { damping: 18, stiffness: 190 } vardı. Sönümleme oranı
  //   ζ = damping / (2·√(stiffness·mass)) = 18 / (2·√190) ≈ 0.65
  // yani 1'in ALTINDA → yay hedefi aşıp geri salınıyordu. Vurgu sekmeye
  // varmadan önce ileri geri oynuyordu.
  //
  // dampingRatio: 1 kritik sönümleme — hedefe en hızlı şekilde, HİÇ aşmadan
  // varır. overshootClamping ayrıca sert bir güvence.
  const pos = useSharedValue(state.index);
  useEffect(() => {
    if (reducedMotion) pos.value = state.index;
    else pos.value = withSpring(state.index, {
      duration: 300,
      dampingRatio: 1,
      overshootClamping: true,
    });
  }, [state.index, pos, reducedMotion]);

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
      withTiming(1, { duration: 90 }),
      withSpring(0, { stiffness: 220, damping: 12 }),
    );
  }, [state.index, bounce, reducedMotion]);

  // ── Okunmamış rozeti ──
  // Sekme her değiştiğinde tazeleniyor. Aralıklı yoklamaya göre tercih
  // sebebi: kullanıcı zaten sekme değiştirerek dolaşıyor ve rozet o anda
  // güncelleniyor; boşta duran uygulamada istek gitmiyor.
  const unread = useUnread();
  useEffect(() => { refreshUnread(); }, [state.index]);

  const N = state.routes.length;
  const cellW = barW > 0 ? (barW - PAD * 2) / N : 0;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + pos.value * cellW + (cellW - PILL_W) / 2 }],
  }), [cellW]);

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
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom || 10 }]}>
      <Animated.View
        style={[styles.bar, isLandscape && styles.barLandscape, GLASS_OK ? styles.barGlass : styles.barSolid, barStyle]}
        onLayout={e => setBarW(e.nativeEvent.layout.width)}
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

        {cellW > 0 && <Animated.View style={[styles.pill, pillStyle]} />}

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
  // Mantik usePop'a tasindi: ayni hareket begeni ve istek listesinde de
  // gerekiyordu ve kopyalanmasi besinci bir yay ayari uretirdi.
  // `reducedMotion` prop'u kalkti — kanca kendisi bakiyor.
  const style = usePop(focused);

  return (
    <Animated.View style={style}>
      <Ionicons
        name={focused ? base : `${base}-outline`}
        size={25}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
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
  // 420: beş sekmenin asgarisi 5×PILL_W + 2×PAD = 272pt, yani rahat sığıyor;
  // 874pt'lik yatay kenarın yarısından azını kaplıyor. barW onLayout ile
  // ölçüldüğü için hap konumu bu genişliğe kendiliğinden uyuyor.
  barLandscape: { maxWidth: 420 },
  // iOS 26+: arka planı cam veriyor, altına düz renk KOYULMAZ
  barGlass: { backgroundColor: 'transparent' },
  // iOS 26 öncesi ve Android: eski görünüm
  barSolid: {
    backgroundColor: colors.barSolid,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    // Gölge artık PALETTEN. Sabit kodluyken açık temada da koyu temanın
    // gölgesini kullanıyordu (0.45 opaklık) ve beyaz zeminde ağır duruyordu.
    // shadows.floating iki tema için ayrı ölçü taşıyor (handoff).
    ...shadows.floating,
  },
  glassLayer: { borderRadius: RADIUS },
  pill: {
    position: 'absolute',
    left: 0,
    top: (BAR_H - 42) / 2,
    width: PILL_W,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentPill,
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
  badge: {
    position: 'absolute', top: -4, right: -9,
    minWidth: 17, height: 17, borderRadius: 9,
    paddingHorizontal: spacing.xs,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2, borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },
});
