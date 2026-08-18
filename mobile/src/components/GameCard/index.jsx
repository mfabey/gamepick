// ─────────────────────────────────────────────────────────────────────────────
// TEK KART AİLESİ — `variant` prop'u ile altı görünüm.
//
// Handoff'un CLAUDE.md'si: "Kart ailesi — TEK BİLEŞEN, altı varyant. Altı
// ayrı bileşen yazma." Gerekçesi de yazılı: "Brief'teki üçüncü kırılma
// 'aynı bileşenin farklı ekranlarda farklı görünmesi'ydi. Tek kaynak:
// GameCard + variant prop'u. Yeni ekran yeni kart doğurmaz."
//
// ── YAPI: ÜÇ PARÇA ──
//   kapak    — 3:4 ya da 16:9; kapak gelmezse MONOGRAM (boş kutu yok)
//   ad       — 2 satıra kadar, SABİT YÜKSEKLİKLİ blok (min 44)
//   bağlam   — tek satır: tarih, fiyat, mağaza ya da arkadaş
//
// Varyantlar yalnızca ölçüyü ve bağlam satırını değiştiriyor.
//
// ── AD KAPAĞIN ALTINDA, ÜSTÜNDE DEĞİL ──
// Uygulamadaki kartlar adı kapağın üstüne bindiriyordu. Tasarım altına
// alıyor ve sebebi kuralın kendisinde: "ad alanı 44pt taban, iki satıra
// kadar büyür; erişilebilirlik boyutunda KART UZAR, YAZI KIRPILMAZ."
// Bindirme bunu imkânsız kılıyor — kapağın üstünde büyüyecek yer yok.
// Ölçülmüştü: erişilebilirlik boyutunda şerit adları "Robocr…" diye
// kırpılıyordu.
// ─────────────────────────────────────────────────────────────────────────────
import { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import GameCover from '../GameCover';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePrice } from '../../hooks/usePrice';
import { type, radius, spacing, PRESSED_CARD, metacriticColor } from '../../theme';
import { KART, VARYANT } from './variants';

/**
 * @param {object}  game      { image, name, … }
 * @param {string}  variant   'grid' | 'rail' | 'social'
 * @param {node}    context   tek satır bağlam (fiyat, tarih, arkadaş…)
 * @param {node}    overlay   kapağın ÜSTÜNE binen rozetler (puan, indirim)
 * @param {func}    onPress
 * @param {func}   [onLongPress]
 * @param {func}   [onDismiss] verilirse kapakta 26pt "×" çıkar (yalnız öneri)
 * @param {object} [style]    dış kap (ızgara hücresi genişliği buradan)
 */
function GameCard({ game, variant = 'grid', context, overlay, onPress, onLongPress, onDismiss, style }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, formatPrice } = useLanguage();
  const router = useRouter();
  const v = VARYANT[variant] || VARYANT.grid;

  // ROZET VE FİYAT BİLEŞENİN İÇİNDE. Dışarıda bırakılsaydı her çağrı yeri
  // kendi kopyasını yazardı ve "tek kaynak" ilk yeni ekranda bozulurdu —
  // handoff'un düzeltmek istediği kırılma tam buydu.
  const price = usePrice(game);
  const isFree = game?.isFree || price?.isFree;
  const onSale = price?.discount > 0 && !isFree;

  const git = onPress || (() => router.push({
    pathname: '/game/[id]',
    params: {
      id: String(game.id), name: game.name, image: game.image || '',
      slug: game.rawgSlug || '', hasSteam: game.hasSteam ? '1' : '',
    },
  }));

  const rozetler = overlay !== undefined ? overlay : (
    <>
      {game?.metacritic ? (
        <View style={styles.mcBadge}>
          <Text style={[styles.mcText, { color: metacriticColor(game.metacritic) }]}>{game.metacritic}</Text>
        </View>
      ) : null}
      {isFree ? (
        <View style={[styles.tagBadge, { backgroundColor: colors.green }, onDismiss && styles.tagBadgeKaydir]}>
          <Text style={styles.tagFree}>{t('card.free')}</Text>
        </View>
      ) : onSale ? (
        <View style={[styles.tagBadge, styles.tagSaleBg, onDismiss && styles.tagBadgeKaydir]}>
          <Text style={styles.tagSale}>-%{price.discount}</Text>
        </View>
      ) : null}
    </>
  );

  // ── "×" — ÖZERKLİK (Faz 1) ────────────────────────────────────────────────
  // "Yalnızca 'Senin için' şeridinde, 26pt sessiz daire; uzun basınca
  //  'Neden bunu görüyorum?'. Katalog şeritlerinde (Yeni, İndirim) YOK —
  //  orada eleyecek bir öneri yok, sadece liste var."
  //
  // Bu yüzden bir varyant özelliği değil, ÇAĞRI YERİNİN propu: kartın kendisi
  // önerilip önerilmediğini bilemez, onu diziyi kuran ekran bilir.
  //
  // Eskiden eleme KARTIN TAMAMINA uzun basmaktı: keşfedilemezdi ve yanlışlıkla
  // tetikleniyordu. Artık görünür bir hedefi var; uzun basma da boşa gitmiyor,
  // gerekçeyi açıklıyor.
  const carpi = onDismiss ? (
    <Pressable
      onPress={() => onDismiss(game)}
      onLongPress={() => Alert.alert(t('home.whyThis'), t('home.whyThisBody'))}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={t('home.notInterested')}
      // 26pt daire HIG'in 44'ünün altında; fark hitSlop'la kapanıyor —
      // dokunma hedefi 44, çizilen daire 26.
      hitSlop={9}
      style={({ pressed }) => [styles.carpi, pressed && PRESSED]}
    >
      <Text style={styles.carpiText} allowFontScaling={false}>×</Text>
    </Pressable>
  ) : null;

  // TEK SATIR bağlam (handoff: "tarih, fiyat, mağaza ya da arkadaş").
  // Eskiden tür + fiyat İKİ bilgi aynı satırdaydı; tasarım tek bilgi istiyor.
  const altSatir = context !== undefined ? context
    : isFree ? t('card.free')
    : price?.price != null ? formatPrice(price.price)
    : null;

  const kapakStil = [
    styles.kapak,
    v.kapakYukseklik ? { height: v.kapakYukseklik } : { aspectRatio: v.kapakOran },
  ];

  return (
    <Pressable
      onPress={git}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={game?.name}
      style={({ pressed }) => [
        styles.kart,
        // Yalnizca sosyal varyantta dolu yuzey (maket olcusu).
        v.yuzey && styles.kartYuzey,
        v.genislik ? { width: v.genislik } : null,
        style,
        // motion.json → "Kart/buton basımı": scale 1→0.97. Dokunulan hiçbir
        // öğe sessiz kalmıyor.
        pressed && PRESSED_CARD,
      ]}
    >
      {({ pressed }) => (
        <>
          {/* Aydınlanma KAPAĞA, karta değil: kartın metin bloğunun zemini
              saydam, oraya %6 beyaz koymak sayfanın kendisini lekelerdi. */}
          <GameCover
            uri={game?.image} name={game?.name}
            recyclingKey={String(game?.id ?? game?.appid ?? '')}
            style={kapakStil} lift={pressed}
            // Sosyal kartın sol alt köşesi ARKADAŞ AVATARINA ait
            // (FriendActivity `overlay` ile koyuyor) — "kapak yok" notu
            // oraya yazılsa avatarın ardında yarım kalırdı.
            kapakNotu={variant !== 'social'}
          >
            {rozetler}
            {carpi}
          </GameCover>

          {/* SABİT YÜKSEKLİKLİ metin bloğu — kart uzar, yazı kırpılmaz. */}
          <View style={styles.metin}>
            <Text numberOfLines={2} style={styles.ad}>{game?.name}</Text>
            {altSatir ? (
              typeof altSatir === 'string'
                ? <Text numberOfLines={1} style={[styles.baglam, onSale && !isFree && styles.baglamIndirim]}>{altSatir}</Text>
                : altSatir
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

// `game` referansı liste yeniden sıralanmadıkça değişmiyor → gereksiz render yok.
export default memo(GameCard);

// Maket ölçüsü: 26pt sessiz daire.
const CARPI = 26;

const makeStyles = (colors) => StyleSheet.create({
  kart: { gap: KART.metinGap },
  // Maket: r16, surface2, 1px kenarlik. Kapak kartin ICINDE oldugu icin
  // overflow gizleniyor — yoksa kapagin kendi r12'si kartin r16'sinin
  // disina tasip kose ustune biniyor.
  kartYuzey: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.s8, overflow: 'hidden',
  },
  // Kapak zemini kartın kendisiyle aynı: görsel yüklenene kadar boşluk
  // fark edilmiyor. Monogram zaten GameCover içinde devreye giriyor.
  kapak: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  metin: { gap: KART.satirGap },
  // HTML'den ölçüldü: 13 / 600 / 1.3. tokens.json'daki `cardTitle: 17` ile
  // çelişiyor; handoff'un kendi kuralı HTML'i piksel kaynağı sayıyor.
  // 13 / lineHeight 16 / 2 satır = 32pt sabit blok (bkz. KART.adYukseklik).
  ad: {
    color: colors.text, fontSize: type.footnote, fontWeight: '600',
    lineHeight: 16, minHeight: KART.adYukseklik,
  },
  baglam: { color: colors.text3, fontSize: type.caption },
  baglamIndirim: { color: colors.accentText, fontWeight: '700' },

  // Kapak üstü rozetler — konumlar eski karttan AYNEN korundu.
  mcBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    // tema-bagimsiz: oyun kapaginin ustundeki rozet; zemin gorsel
    backgroundColor: 'rgba(8,10,14,0.75)',
    borderRadius: radius.md, paddingHorizontal: spacing.s8, paddingVertical: spacing.s4,
    // tema-bagimsiz: oyun kapaginin ustundeki rozet; zemin gorsel
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  mcText: { fontSize: type.caption, fontWeight: '800' },
  tagBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    borderRadius: radius.md, paddingHorizontal: spacing.s8, paddingVertical: spacing.s4,
  },
  // "×" de sol üstte duruyor. İkisi birden varsa (indirimdeki bir öneri)
  // etiket dairenin ALTINA iniyor — üst üste binmesinler.
  tagBadgeKaydir: { top: spacing.sm + CARPI + spacing.s4 },
  carpi: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    width: CARPI, height: CARPI, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    // tema-bagimsiz: oyun kapaginin ustunde duruyor, zemin gorsel
    backgroundColor: 'rgba(8,10,14,0.6)',
  },
  // tema-bagimsiz: koyu cam dairenin uzerinde
  carpiText: { color: '#fff', fontSize: 15, lineHeight: 18 },
  // tema-bagimsiz: dolu yesil/kirmizi rozet uzerindeki metin
  tagFree: { fontSize: type.caption2, fontWeight: '800', color: '#04130d' },
  // tema-bagimsiz: dolu kirmizi rozet uzerindeki metin
  // FAZ 1: kirmizi dolgu KALKTI. Indirim bir BILGI, eylem degil —
  // kirmizi yalnizca dokunulacak seyde. Metacritic rozetiyle ayni dil:
  // koyu cam zemin + deger rengi.
  // tema-bagimsiz: kapak gorselinin ustunde duruyor
  tagSaleBg: { backgroundColor: 'rgba(8,10,14,0.75)' },
  tagSale: { fontSize: type.caption2, fontWeight: '800', color: colors.green },
});
