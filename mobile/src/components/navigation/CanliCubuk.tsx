// ─────────────────────────────────────────────────────────────────────────────
// CANLI ÇUBUK — ortak parçalar (26 Eyl tasarımı, Claude Design tuvali)
//
// Normalde beş sekmeli çubuk (TabBar.tsx). Ekranın bir bağlamı olduğunda
// sekmeler tek DAİREYE iner, yanında bir AKSESUAR kapsülü açılır — iOS 26'nın
// "sekme çubuğu + alt aksesuar" kalıbı. Aynı anda tek kapsül; öncelik:
// canlı olay > ekran bağlamı > arama.
//
// iOS: cam (GlassView / BlurView yedeği), kenar parıltısı, gölge.
// Android: AYNI geometri ama düz dolgu + gölge — bulanıklık yok; orta/alt
// segment cihazda kare düşürmüyor. Material göstergesi dairede de var.
//
// Sekme dışı ekranlar (Reels, oyun detayı) sekme çubuğunu göremiyor: yığının
// üstündeler. Onlar `KucukCubuk` çiziyor — aynı daire + kendi aksesuarı.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing, FadeInDown, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Icon, TabIcon, type TabIconName } from '../Icon';
import Avatar from '../Avatar';
import { GLASS_OK } from '../GlassSurface';
import { Button, Txt } from '../ui/Primitives';
import { DiscountTag } from '../ui/Commerce';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { fontFor, priceStyle } from '../../theme/tokens';
import { tabGeometry } from '../../theme/tabGeometry';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePrice } from '../../hooks/usePrice';
import { OLAY_SURE_MS, canliOlayKapat, useAktifSekme, useCanliOlay } from '../../services/canliCubuk';

const IOS = Platform.OS === 'ios';

// Android'de Material vurgulu eğri; iOS'ta yumuşak iniş. Tasarım: 300–400 ms.
export const CUBUK_EGRI = IOS ? Easing.bezier(0.2, 0.8, 0.2, 1) : Easing.bezier(0.2, 0, 0, 1);
export const CUBUK_SURE = IOS ? 340 : 320;

/** Çubuğun platforma ve güvenli alana göre ölçüleri (tek kaynak: tabGeometry). */
export function useCubukGeometri() {
  const insets = useSafeAreaInsets();
  return tabGeometry(Platform.OS, insets.bottom);
}

// Sekme rotası → dairede gösterilecek ikon. Profil avatarla çiziliyor.
const SEKME_IKONU: Record<string, TabIconName | null> = {
  index: 'home', reviews: 'users', videos: 'play', messages: 'msg', profile: null,
};
const SEKME_ETIKETI: Record<string, string> = {
  index: 'tab.home', reviews: 'tab.community', videos: 'tab.videos', messages: 'tab.messages', profile: 'tab.profile',
};

// ── Yüzey ────────────────────────────────────────────────────────────────────
// GÖLGE DIŞ katmanda, cam İÇ katmanda: kapsül köşeyi kırpmak için
// overflow:hidden taşıyor ve iOS bunu clipsToBounds'a çeviriyor; aynı
// katmandaki gölge kırpılırdı (TabBar.tsx'teki ölçülmüş not).
export function CubukYuzey({ radius, style, vurgu = false, metin = false, children }: {
  radius: number; style?: StyleProp<ViewStyle>; vurgu?: boolean;
  /** Yüzey METİN taşıyor (aksesuar): iOS'ta cam yerine okunur yüzey. Android zaten opak. */
  metin?: boolean; children?: React.ReactNode;
}) {
  const { tabBar, isDark } = useDesignTheme();
  if (!IOS) {
    return (
      <Animated.View style={[{ borderRadius: radius, backgroundColor: vurgu ? tabBar.android.alertFill : tabBar.android.fill, boxShadow: tabBar.android.shadow }, style]}>
        {children}
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[{ borderRadius: radius, boxShadow: tabBar.ios.shadow }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {/* Bildirim (vurgu) ve aksesuar (metin) YERLİ CAM DEĞİL: iOS 26 camı
            parlak içeriğin üstünde çok şeffaf kalıyor, kapsülün metni okunmuyordu
            (26 Eyl bildirim; 27 Eyl oyun detayında fiyat aksesuarı açık renkli
            "En ucuz fiyat" düğmesinin üstünden geçerken fiyat kayboldu, SE).
            Bulanıklık + opak dolgu okunaklılığı garanti ediyor. Yalnız ikon
            taşıyan kapsül ve daire camda kalıyor. */}
        {GLASS_OK && !vurgu && !metin
          ? <GlassView glassEffectStyle="regular" tintColor={tabBar.ios.glassTint} style={StyleSheet.absoluteFill} />
          : <>
              <BlurView tint={isDark ? 'dark' : 'light'} intensity={60} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: vurgu || metin ? tabBar.ios.alertFill : tabBar.ios.fallbackFill }]} />
            </>}
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: tabBar.ios.edge }]} />
      </View>
      {children}
    </Animated.View>
  );
}

// ── Daire içeriği: aktif sekmenin ikonu (ya da profil avatarı) ────────────────
export function SekmeIkonu({ sekme }: { sekme: string }) {
  const { colors, tabBar } = useDesignTheme();
  const { account } = useAuth();
  const ikon = SEKME_IKONU[sekme];
  return (
    <View style={styles.merkez}>
      {!IOS && <View style={[styles.daireGosterge, { backgroundColor: tabBar.android.indicator.fill }]} />}
      {ikon
        ? <TabIcon name={ikon} active color={colors.red} size={IOS ? tabBar.ios.icon : tabBar.android.icon} cutout={IOS ? tabBar.ios.cutout : tabBar.android.cutout} />
        : <Avatar avatar={account?.avatar} name={account?.displayName || account?.username} size={IOS ? 28 : 24}
            style={{ borderWidth: 2, borderColor: colors.red }} />}
    </View>
  );
}

/** Sekme dışı ekranlardaki daire: dokununca sekmelere dönülür. */
export function SekmeDairesi({ onPress, style }: { onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const g = useCubukGeometri();
  const { t } = useLanguage();
  const router = useRouter();
  const sekme = useAktifSekme();
  const etiket = t('bar.openTabs').replace('{tab}', t(SEKME_ETIKETI[sekme] || 'tab.home'));
  const git = onPress || (() => {
    // Yığındaki bütün ekranları kapatıp sekmelere dön; hangi sekmedeysen o
    // sekme açık kalıyor (Tabs durumu korunuyor).
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiket}
      onPress={() => { void Haptics.selectionAsync().catch(() => {}); git(); }}
      android_ripple={IOS ? undefined : { borderless: true, radius: g.mini / 2, color: 'rgba(255,255,255,0.12)' }}
      style={({ pressed }) => [{ position: 'absolute', left: g.side, bottom: g.bottom, width: g.mini, height: g.mini }, IOS && pressed && styles.basili, style]}>
      <CubukYuzey radius={g.mini / 2} style={StyleSheet.absoluteFill} />
      <SekmeIkonu sekme={sekme} />
    </Pressable>
  );
}

/** Kaydırırken sağda beliren arama dairesi. */
export function AramaDairesi({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const g = useCubukGeometri();
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.search')} onPress={onPress}
      android_ripple={IOS ? undefined : { borderless: true, radius: g.mini / 2, color: 'rgba(255,255,255,0.12)' }}
      style={({ pressed }) => [{ width: g.mini, height: g.mini }, IOS && pressed && styles.basili, style]}>
      <CubukYuzey radius={g.mini / 2} style={StyleSheet.absoluteFill} />
      <View style={styles.merkez}><Icon name="search" size={IOS ? 24 : 22} color={colors.text} /></View>
    </Pressable>
  );
}

// ── Aksesuar kapsülü (dairenin sağında, aynı yükseklikte) ─────────────────────
export function AksesuarKapsul({ children, style, sagPay = 8 }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; sagPay?: number;
}) {
  const g = useCubukGeometri();
  return (
    <Animated.View entering={FadeInDown.duration(320)}
      style={[{ position: 'absolute', left: g.side + g.mini + 8, right: g.side, bottom: g.bottom, height: g.mini }, style]}>
      <CubukYuzey radius={g.mini / 2} metin style={StyleSheet.absoluteFill} />
      <View style={[styles.aksesuarSatir, { paddingLeft: 8, paddingRight: sagPay }]}>{children}</View>
    </Animated.View>
  );
}

/** Kalp düğmesi (istek listesi) — aksesuarın sağ ucu. */
function KalpDugmesi({ izleniyor, onPress }: { izleniyor: boolean; onPress: () => void }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const boy = IOS ? 36 : 40;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('v2.addToWishlist')}
      accessibilityState={{ selected: izleniyor }} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.ortala, { width: boy, height: boy, borderRadius: boy / 2, backgroundColor: colors.pillNeutral }, pressed && styles.basili]}>
      <Icon name="heart" size={20} color={izleniyor ? colors.red : colors.text} fill={izleniyor ? colors.red : undefined} />
    </Pressable>
  );
}

type AksesuarOyunu = { id: string; name: string; image?: string | null; slug?: string };

/**
 * Reels: izlenen oyunun kapağı, adı, indirimi, fiyatı ve kalbi.
 * Video değişince içerik yukarı kayıp kaybolur, yenisi alttan gelir
 * (170 / 280 ms) — tasarımdaki "fiyat değişimi" hareketi.
 */
export function OyunAksesuari({ oyun, izleniyor, onKalp, onAc }: {
  oyun: AksesuarOyunu; izleniyor: boolean; onKalp: () => void; onAc: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const azalt = useReducedMotion();
  const [gosterilen, setGosterilen] = useState(oyun);
  const kay = useSharedValue(0);
  const gorun = useSharedValue(1);

  useEffect(() => {
    if (oyun.id === gosterilen.id) { setGosterilen(oyun); return; }
    if (azalt) { setGosterilen(oyun); return; }
    const yeni = oyun;
    gorun.value = withTiming(0, { duration: 150 });
    kay.value = withTiming(-14, { duration: 170, easing: Easing.in(Easing.quad) }, (bitti) => {
      if (!bitti) return;
      runOnJS(setGosterilen)(yeni);
      kay.value = 14;
      kay.value = withTiming(0, { duration: 280, easing: CUBUK_EGRI });
      gorun.value = withTiming(1, { duration: 220 });
    });
    // gosterilen bilerek bağımlılık değil: yalnız GELEN oyun değişimi tetikler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oyun.id, oyun.name, oyun.image, azalt]);

  const icerikStil = useAnimatedStyle(() => ({ opacity: gorun.value, transform: [{ translateY: kay.value }] }));
  const fiyat = usePrice({ name: gosterilen.name, slug: gosterilen.slug || '', hasSteam: true });
  const bedava = !!fiyat?.isFree;
  const indirim = !bedava && fiyat?.discount > 0 ? fiyat.discount : 0;
  const fiyatMetni = bedava ? t('card.free') : fiyat?.price != null ? formatPrice(fiyat.price) : null;
  const kapak = IOS ? 36 : 40;

  return (
    <>
      <Pressable accessibilityRole="button"
        accessibilityLabel={`${gosterilen.name}${fiyatMetni ? `, ${fiyatMetni}` : ''}. ${t('bar.openPrices')}`}
        accessibilityLiveRegion="polite" onPress={onAc} style={styles.dokunmaAlani}>
        <Animated.View style={[styles.oyunSatir, icerikStil]}>
          <Image source={gosterilen.image || undefined} style={{ width: kapak, height: kapak, borderRadius: 9, backgroundColor: colors.surface2 }} contentFit="cover" cachePolicy="memory-disk" />
          <View style={styles.esnek}>
            <Txt variant="subhead" numberOfLines={1} style={{ color: colors.text, ...fontFor('600') }}>{gosterilen.name}</Txt>
            <View style={styles.fiyatSatir}>
              {indirim > 0 ? <DiscountTag percent={indirim} size="xs" /> : null}
              {fiyatMetni
                ? <Text allowFontScaling={false} style={priceStyle(14, colors.text)}>{fiyatMetni}</Text>
                : <View style={[styles.fiyatIskelet, { backgroundColor: colors.pillNeutral }]} />}
              {indirim > 0 && fiyat?.original > fiyat?.price
                ? <Text allowFontScaling={false} style={[styles.eskiFiyat, { color: colors.text3 }]}>{formatPrice(fiyat.original)}</Text>
                : null}
            </View>
          </View>
        </Animated.View>
      </Pressable>
      <KalpDugmesi izleniyor={izleniyor} onPress={onKalp} />
    </>
  );
}

/** Oyun detayı: en ucuz fiyat + "Mağazaya git". Eski sabit fiyat çubuğunun yerini alır. */
export function FiyatAksesuari({ fiyat, indirim, altYazi, eylem, onEylem, disabled }: {
  fiyat: string; indirim?: number; altYazi?: string; eylem: string; onEylem: () => void; disabled?: boolean;
}) {
  const { colors } = useDesignTheme();
  return (
    <>
      <View style={[styles.esnek, { paddingLeft: 10 }]}>
        <View style={styles.fiyatSatir}>
          <Text allowFontScaling={false} numberOfLines={1} style={priceStyle(20, colors.text)}>{fiyat}</Text>
          {indirim && indirim > 0 ? <DiscountTag percent={indirim} size="xs" /> : null}
        </View>
        {altYazi ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{altYazi}</Txt> : null}
      </View>
      <Button title={eylem} height={40} iconRight="ext" onPress={onEylem} disabled={disabled} />
    </>
  );
}

// ── Canlı olay kapsülü ───────────────────────────────────────────────────────
/**
 * Fiyat düşüşü / yeni mesaj. 4 sn görünür (ilerleme çizgisi), × ile ya da
 * "Gör" ile kapanır. `alt`: kapsülün alt kenarı — altındaki çubuğun üstü + 8.
 */
export function BildirimKapsulu({ alt }: { alt: number }) {
  const olay = useCanliOlay();
  if (!olay) return null;
  return <BildirimIcerik key={olay.id} olay={olay} alt={alt} />;
}

function BildirimIcerik({ olay, alt }: { olay: NonNullable<ReturnType<typeof useCanliOlay>>; alt: number }) {
  const g = useCubukGeometri();
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const router = useRouter();
  const fiyatTuru = olay.tur === 'fiyat';
  const veri = olay.veri || {};
  const fiyat = usePrice(fiyatTuru && veri.name ? { name: veri.name, slug: veri.slug || '', hasSteam: true } : null);
  const ilerleme = useSharedValue(1);
  useEffect(() => { ilerleme.value = withTiming(0, { duration: OLAY_SURE_MS, easing: Easing.linear }); }, [ilerleme]);
  const cizgi = useAnimatedStyle(() => ({ width: `${ilerleme.value * 100}%` }));

  const boy = IOS ? 60 : 64;
  const ust = fiyatTuru ? t('bar.priceDropped') : (olay.baslik ? `${t('bar.newMessage')} · ${olay.baslik}` : t('bar.newMessage'));
  const ad = fiyatTuru ? (veri.name || olay.baslik) : olay.metin;
  const fiyatMetni = fiyatTuru && fiyat?.price != null && !fiyat?.isFree ? formatPrice(fiyat.price) : null;
  const eski = fiyatTuru && fiyat?.discount > 0 && fiyat?.original > fiyat?.price ? formatPrice(fiyat.original) : null;
  const vurguRengi = fiyatTuru ? colors.green : colors.red;

  const gor = () => {
    canliOlayKapat();
    if (fiyatTuru && veri.slug) {
      router.push({ pathname: '/game/[id]', params: { id: String(veri.slug), name: veri.name || '', slug: String(veri.slug) } });
    } else if (!fiyatTuru && veri.from) {
      router.push('/chat/' + String(veri.from));
    }
  };

  return (
    <Animated.View accessibilityRole="alert" entering={FadeInDown.duration(360)} exiting={FadeOut.duration(180)}
      style={{ position: 'absolute', left: g.side, right: g.side, bottom: alt, height: boy }}>
      <CubukYuzey vurgu radius={boy / 2} style={[StyleSheet.absoluteFill, { overflow: IOS ? 'visible' : 'hidden' }]} />
      <View style={[styles.aksesuarSatir, { paddingLeft: 12, paddingRight: 10, gap: 10 }]}>
        <View style={[styles.ortala, { width: 36, height: 36, borderRadius: 18, backgroundColor: fiyatTuru ? colors.greenTint : colors.redTint }]}>
          <Icon name={fiyatTuru ? 'tag' : 'msg'} size={20} color={vurguRengi} />
        </View>
        <View style={styles.esnek}>
          <Txt variant="captionStrong" numberOfLines={1} style={{ color: vurguRengi }}>{ust}</Txt>
          <View style={styles.fiyatSatir}>
            <Txt variant="subhead" numberOfLines={1} style={{ color: colors.text, ...fontFor('600'), flexShrink: 1 }}>{ad}</Txt>
            {fiyatMetni ? <Text allowFontScaling={false} style={priceStyle(15, colors.text)}>{fiyatMetni}</Text> : null}
            {eski ? <Text allowFontScaling={false} style={[styles.eskiFiyat, { color: colors.text3 }]}>{eski}</Text> : null}
          </View>
        </View>
        {/* × YOK (tasarım): kapsül 4 sn'de, kaydırınca ya da "Gör" ile kapanıyor.
            Dar ekranda × ile "Ansehen" metne ~117 pt bırakıyordu. */}
        <Button title={t('bar.see')} height={34} onPress={gor} />
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: boy / 2, overflow: 'hidden' }]}>
        <Animated.View style={[styles.ilerleme, { backgroundColor: fiyatTuru ? colors.green : colors.text2 }, cizgi]} />
      </View>
    </Animated.View>
  );
}

/**
 * Sekme dışı ekranların çubuğu: daire (sekmelere dön) + aksesuar + canlı
 * olay kapsülü. `gizle` basılı tutunca (Reels) arayüzle birlikte solar.
 */
export function KucukCubuk({ children, sagPay, stil }: {
  children: React.ReactNode; sagPay?: number; stil?: StyleProp<ViewStyle>;
}) {
  const g = useCubukGeometri();
  return (
    <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, stil]}>
      <BildirimKapsulu alt={g.bottom + g.mini + 8} />
      <SekmeDairesi />
      <AksesuarKapsul sagPay={sagPay}>{children}</AksesuarKapsul>
    </Animated.View>
  );
}

/** Sekme dışı ekranın içerik alt dolgusu: çubuğun kapladığı alan + nefes payı. */
export function useKucukCubukBoslugu(ek = 16) {
  const g = useCubukGeometri();
  return g.bottom + g.mini + ek;
}

const styles = StyleSheet.create({
  // merkez: kabı DOLDURUP ortalar (daire içi). ortala: yalnız ortalar — sabit
  // boyutlu düğmelerde flex:1 satır içinde düğmeyi büyütüyordu (kalp, 26 Eyl).
  merkez: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  ortala: { alignItems: 'center', justifyContent: 'center' },
  basili: { transform: [{ scale: 0.94 }] },
  daireGosterge: { position: 'absolute', width: 40, height: 32, borderRadius: 16 },
  aksesuarSatir: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  esnek: { flex: 1, minWidth: 0 },
  // Kapsülün TAM yüksekliği dokunulabilir: içerik kadar kalınca kenara yakın
  // dokunuşlar boşa düşüyordu (SE'de alt 6 pt).
  dokunmaAlani: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' },
  oyunSatir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  fiyatIskelet: { width: 56, height: 14, borderRadius: 4 },
  eskiFiyat: { fontSize: 12, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  ilerleme: { position: 'absolute', left: 0, bottom: 0, height: 2 },
});
