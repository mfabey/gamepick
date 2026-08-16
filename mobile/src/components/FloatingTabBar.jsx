import { useEffect, useRef } from 'react';
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
import { colors, type, NUMERIC, spacing, shadows, TAB_BAR } from '../theme';

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
const BAR_H = TAB_BAR.height;   // handoff: 64
const RADIUS = BAR_H / 2;
// Etiketli düzende ikon küçülüyor: ikon + 11pt etiket 64pt'lik çubuğa
// ancak böyle sığıyor (dikey: 22 ikon + 2 boşluk + ~13 etiket satırı).
const ICON = 22;

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

  // KAYAN KIRMIZI HAP KALDIRILDI. Referans HTML'de aktif sekmenin arkasında
  // hiçbir dolgu yok: aktif durum yalnız ikonun marka rengine dönmesiyle ve
  // etiketin tam kontrasta çıkmasıyla anlatılıyor. Handoff'un "ekran başına
  // en çok 3 kırmızı öğe" bütçesi de bunu gerektiriyor.
  //
  // Hapla birlikte onu süren `pos` paylaşılan değeri ve ζ=1 yay kararı da
  // düştü — o karar yalnızca hapın hedefi aşmasını engellemek içindi.

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
      <View style={[styles.bar, GLASS_OK ? styles.barGlass : styles.barSolid]}>
        {/* Cam katmanı içeriği SARMALAMAZ, arkasında durur — sekme öğeleri
            basılınca opacity uyguluyor ve bu camı bozardı. */}
        {GLASS_OK && (
          <GlassView
            style={[StyleSheet.absoluteFill, styles.glassLayer]}
            glassEffectStyle="regular"
            pointerEvents="none"
          />
        )}

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
                label={label}
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
function TabIcon({ base, focused, label, badge = 0 }) {
  // Mantik usePop'a tasindi: ayni hareket begeni ve istek listesinde de
  // gerekiyordu ve kopyalanmasi besinci bir yay ayari uretirdi.
  // `reducedMotion` prop'u kalkti — kanca kendisi bakiyor.
  //
  // ETIKET GERI GELDI (handoff): "Etiketler her zaman gorunur — Turkce'de
  // ikon tek basina belirsizdir." Yalniz aktif sekme tam kontrastta.
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
      {/* allowFontScaling KAPALI: etiket bir cümle değil, sekmenin adı.
          Erişilebilirlik boyutlarında büyüseydi 70pt'lik hücreyi taşırır ve
          beş sekme birbirine girerdi. Okunabilirlik ikonla birlikte
          sağlanıyor; VoiceOver zaten accessibilityLabel'ı okuyor. */}
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={[styles.label, focused && styles.labelOn]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Ölçekten en küçük basamak. İkon 22 + 4 + etiket ~13 = 39pt, 64pt'lik
    // çubuğa rahat sığıyor.
    gap: spacing.s4,
    height: '100%',
  },
  // Handoff tipografisi — Etiket kademesi: 11 / 600 / +%6 / BUYUK HARF.
  // Pasif renk text3, aktif tam kontrast (handoff: "yalniz aktif sekme tam
  // kontrastta").
  label: {
    fontSize: type.caption2,
    fontWeight: '600',
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    color: colors.text3,
  },
  // HTML'den: aktif ETİKET #f4f4f6 (text1), aktif İKON #e8242b (marka).
  // Etiketi de kırmızı yapmak "ekran başına en çok 3 kırmızı öğe" bütçesini
  // gereksiz yere harcıyordu.
  labelOn: { color: colors.text },

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
