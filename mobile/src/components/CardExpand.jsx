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
import { Image } from 'expo-image';

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
 *
 * `kaynak.hedefGorsel` — detayın gösterdiği kapak. Verilmezse ham `image`
 * kullanılıyor: detay da veri gelene kadar zaten onu basıyor.
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

  // ── ZEMİN HER İKİ YÖNDE DE AYNI: opaklık = ilerleme ─────────────────────
  // Zeminin işi tek: HEDEF OLMAYAN ekranı gizlemek. İki animasyon da artık
  // ANASAYFADA oynadığı için kural ikisinde de aynı çıkıyor:
  //   · 0 = kartın çerçevesi → anasayfa GÖRÜNMELİ  → saydam
  //   · 1 = detayın kapağı   → anasayfa GİZLENMELİ → opak
  // Büyürken 0→1 (anasayfa kapanır, detay devralır), küçülürken 1→0 (kapak
  // yerine otururken anasayfa açılır).
  //
  // Bir ara sürümde bu formül yöne göre TERSTİ. O sürümde küçülme detay
  // ekranında oynuyordu ve orada doğruydu; animasyon anasayfaya taşınınca
  // ters formül anasayfayı geçişin SONUNDA siyahla kapatıyordu — ölçüldü,
  // karede yalnız kart ve sekme çubuğu görünüyordu.
  const zeminStil = useAnimatedStyle(() => ({
    opacity: interpolate(ilerleme.value, [0, 1], [0, 1]),
  }), []);

  // ── GÖRSEL DE ÇERÇEVEYLE BİRLİKTE DÖNÜŞÜYOR ─────────────────────────────
  // ÖLÇÜLDÜ: utils/images.js → posterImage() Steam kapaklarını yeniden
  // yazıyor — `/apps/<id>/header.jpg` (yatay) → `/library_600x900.jpg`
  // (dikey 3:4). Kart GameCover üzerinden çizdiği için DİKEY afişi, detay
  // ham URL'yi bastığı için YATAY header'ı gösteriyor. Yani aynı oyunun iki
  // yüzeydeki görseli gerçekten farklı.
  //
  // Bindirme tek katmanken çerçeve yumuşak büyüyor ama içindeki resim devir
  // anında TEK KAREDE değişiyordu. İki katman bunu çözüyor:
  //   A (altta) — kartın gösterdiği hâl, opaklığı SABİT 1
  //   B (üstte) — detayın gösterdiği hâl, opaklık = ilerleme
  //
  // A SÖNDÜRÜLMÜYOR, bilerek. İki katmanı zıt yönde söndürmek orta noktada
  // toplam opaklığı düşürür ve geçişin ortasında bir "çukur" görünürdü. Üst
  // katman zaten opaklaşınca alttakini tamamen kapatıyor.
  // Yan faydası: hedef görsel geç gelirse ya da hiç gelmezse alt katman
  // görünür kalıyor — hiçbir karede boş kutu çıkmıyor.
  //
  // İki adres aynıysa (RAWG kaynaklı oyunlar; ölçüldü: Disco Elysium'da
  // birebir aynı URL) sönüm görünmüyor, ek maliyeti de yok.
  const hedefUri = kaynak?.hedefGorsel || kaynak?.image || null;
  const hedefStil = useAnimatedStyle(() => ({ opacity: ilerleme.value }), []);

  if (!kaynak) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.bindirme]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, zeminStil]} />
      <Animated.View style={[styles.kutu, kutuStil]}>
        {/* A — kartın gösterdiği hâl (dikey afiş + karartma) */}
        <GameCover
          uri={kaynak.image}
          name={kaynak.name}
          style={StyleSheet.absoluteFill}
          kapakNotu={false}
        />
        {/* B — detayın gösterdiği hâl (ham/yatay görsel). GameCover DEĞİL:
            o PosterImage üzerinden yine dikey afişe çevirirdi ve iki katman
            aynı resmi gösterirdi. Monogram da yok — yüklenemezse saydam
            kalıp alttaki katmanı göstermeli, harf basmamalı. */}
        {hedefUri ? (
          <Animated.View style={[StyleSheet.absoluteFill, hedefStil]}>
            <Image
              source={hedefUri}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        ) : null}
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
