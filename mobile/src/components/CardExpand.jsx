// ─────────────────────────────────────────────────────────────────────────────
// KART BÜYÜME GEÇİŞİ — App Store "Bugün" kartlarındaki gibi
//
// NEDEN ELLE YAZILDI. Bu bir PAYLAŞILAN ÖĞE geçişi ama bu yığında hazır bir
// API yok:
//   · Reanimated 4.1.7'de `sharedTransitionTag` YOK (v3'te deneyseldi,
//     v4'te kaldırıldı)
//   · react-native-shared-element benzeri bir paket kurulu değil
//
// Bunun yerine ÖLÇ-VE-BİNDİR yöntemi: kartın ekrandaki çerçevesi ölçülüyor,
// tam ekran bir bindirmede kapağın kopyası o çerçevede çiziliyor ve hedef
// çerçeveye büyütülüyor.
//
// HEDEF ÇERÇEVE SABİT VE BİLİNİYOR: oyun detayının kapağı
// `position:absolute; top:0; left:0; right:0; height:320` (game/[id].jsx →
// coverWrap). Yani iniş noktası tahmin değil, ölçü.
//
// DEVİR ANI. Bindirme, detay ekranı ilk karesini çizene kadar duruyor.
// İkisi AYNI görseli AYNI çerçevede gösterdiği için devir görünmüyor;
// bindirme erken kaldırılsaydı bir kare boyunca boşluk görünürdü.
//
// REDUCE MOTION: animasyon hiç kurulmuyor, çağrı yeri doğrudan gidiyor.
// Hareket bir bilgi taşımıyor — yalnız sürekliliği anlatıyor — o yüzden
// kapalıyken kaybolan bir şey yok.
//
// ── GERİ DÖNÜŞ (`yon="kucul"`) ──
// Detay ekranı `buyume:'1'` ile açıldığında yığın animasyonu `none` yapılıyor
// (çift açılışı önlemek için, bkz. _layout.jsx). Ama bu ayar İKİ YÖNE birden
// uygulanıyor: geri çıkışta da hiçbir animasyon kalmıyordu, detay tek karede
// yok oluyordu. Girişteki düzeltmenin görünmeyen bedeli buydu.
// Çözüm, girişin aynısını ters oynatmak: kapak detayın 320pt alanından
// kartın çerçevesine küçülüyor, sonra pop yapılıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate, Easing, runOnJS,
} from 'react-native-reanimated';

import GameCover from './GameCover';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

// Detay ekranının kapak yüksekliği (game/[id].jsx → COVER_H). İkisi
// ayrışırsa geçiş yanlış yere iner; bu yüzden burada da adlı sabit.
export const HEDEF_KAPAK_Y = 320;

// App Store'un kendi geçişi ~380 ms sürüyor (videodan ölçüldü: kart
// 3.08 sn'de yerinde, 3.46 sn'de oturmuş). Yay değil EĞRİ kullanılıyor:
// bir çerçeve büyürken aşma (overshoot) kartın hedefi geçip geri gelmesi
// demek — App Store'da bu yok, hareket tek yönlü ve kararlı.
const SURE = 380;
const EGRI = Easing.bezier(0.2, 0.9, 0.2, 1);

/**
 * @param {object|null} kaynak  { x, y, width, height, image, name, id }
 * @param {func}        onVar   hedefe varınca (gezinme burada yapılıyor)
 * @param {string}     [yon]    'buyu' (karttan detaya) | 'kucul' (detaydan karta)
 */
// Bindirme KENDİSİ kalkmıyor: anasayfa, odağı kaybettiğinde temizliyor
// (useFocusEffect). Böylece bindirme, detay ekranı devralana kadar
// duruyor — erken kalksaydı bir kare boyunca boşluk görünürdü.
export default function CardExpand({ kaynak, onVar, yon = 'buyu' }) {
  const { colors } = useTheme();
  const ilerleme = useSharedValue(0);
  const { width: EKRAN_G } = Dimensions.get('window');

  // GERİ DÖNÜŞ AYNI YOLUN TERSİ. 0 = kartın çerçevesi, 1 = detayın kapağı;
  // büyüme 0→1, küçülme 1→0. Aradaki interpolasyonlar aynen paylaşılıyor —
  // ikinci bir animasyon yazılsaydı iki yön zamanla birbirinden ayrışırdı.
  const kucul = yon === 'kucul';

  useEffect(() => {
    if (!kaynak) { ilerleme.value = kucul ? 1 : 0; return; }
    ilerleme.value = kucul ? 1 : 0;
    ilerleme.value = withTiming(kucul ? 0 : 1, { duration: SURE, easing: EGRI }, (bitti) => {
      if (bitti) runOnJS(onVar)();
    });
  }, [kaynak, kucul, ilerleme, onVar]);

  const kutuStil = useAnimatedStyle(() => {
    if (!kaynak) return { opacity: 0 };
    const p = ilerleme.value;
    return {
      opacity: 1,
      left:   interpolate(p, [0, 1], [kaynak.x, 0]),
      top:    interpolate(p, [0, 1], [kaynak.y, 0]),
      width:  interpolate(p, [0, 1], [kaynak.width, EKRAN_G]),
      height: interpolate(p, [0, 1], [kaynak.height, HEDEF_KAPAK_Y]),
      // Kart yarıçapından ekran köşesine: App Store'da köşeler geçiş
      // boyunca YUVARLAK kalıyor, sıfıra inmiyor.
      borderRadius: interpolate(p, [0, 1], [radius.md, radius.xl]),
    };
  }, [kaynak, EKRAN_G]);

  // ── ZEMİN YÖNE GÖRE TERS ÇALIŞIYOR ──────────────────────────────────────
  // Büyürken: 0'da saydam (anasayfa görünür), 1'de opak — detayın gelişi
  // zeminin arkasında olup bitiyor.
  //
  // Küçülürken AYNI FORMÜL YANLIŞ OLURDU. İlerleme 1'den başladığı için zemin
  // daha ilk karede tam opak olur, detayın gövdesi tek karede yok olur ve
  // geçiş bir "flaş"la başlardı. Doğrusu tersi: başta saydam (detay hâlâ
  // görünür), kart küçüldükçe zemin kapanıyor; en sonda ekran zaten düz zemin
  // olduğu için pop görünmüyor ve anasayfa aynı zeminle devralıyor.
  const zeminStil = useAnimatedStyle(() => ({
    opacity: kucul
      ? interpolate(ilerleme.value, [0, 1], [1, 0])
      : interpolate(ilerleme.value, [0, 1], [0, 1]),
  }), [kucul]);

  if (!kaynak) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.bindirme]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, zeminStil]} />
      <Animated.View style={[styles.kutu, kutuStil]}>
        <GameCover
          uri={kaynak.image}
          name={kaynak.name}
          style={StyleSheet.absoluteFill}
          kapakNotu={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex ŞART — ölçüldü. Detay ekranının üst bandı (topBarWrap) zIndex:10
  // taşıyor; bindirme ağaçta sondaki kardeş olmasına rağmen onun ALTINDA
  // kalıyordu. Geri çıkış karesinde kapak küçülürken geri/paylaş/koleksiyon
  // düğmeleri tam parlaklıkta havada asılı duruyordu.
  // 100: ekrandaki bilinen en yüksek katmanın (10) belirgin üstünde.
  bindirme: { zIndex: 100, elevation: 100 },
  kutu: { position: 'absolute', overflow: 'hidden' },
});
