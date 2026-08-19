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
import { type, radius, spacing, PRESSED, PRESSED_CARD, metacriticColor } from '../../theme';
import { KART, VARYANT } from './variants';
import { turAdi } from '../../services/genreName';

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
      {v.sinyal.has('puan') && game?.metacritic ? (
        <View style={styles.mcBadge}>
          <Text style={[styles.mcText, { color: metacriticColor(game.metacritic) }]}>{game.metacritic}</Text>
        </View>
      ) : null}
      {!v.sinyal.has('indirim') ? null : isFree ? (
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
  // ── AD ALTI (sözleşmeye bağlı) ──
  // Eskiden burası tek bir "bağlam" satırıydı ve varyant ne olursa olsun
  // fiyata düşüyordu — şerit kartında da fiyat çıkıyordu. Faz 2 bunu açıkça
  // yasaklıyor: "şerit karar verdirmez, detaya gönderir."
  //
  // `context` propu SÖZLEŞMEYİ DELMİYOR: yalnız 'baglam' taşıyan varyantlar
  // (sosyal) kabul ediyor; ötekilerde geliştirmede uyarı çıkıyor.
  if (__DEV__ && context !== undefined && !v.sinyal.has('baglam')) {
    console.warn(
      `[GameCard] "${variant}" varyantı bağlam satırı taşımıyor ` +
      `(izinli: ${v.sinyal.liste.join(', ')}). Sözleşme için bkz. variants.js.`
    );
  }

  const baglamSatiri = v.sinyal.has('baglam') ? context : undefined;
  const fiyatMetni = !v.sinyal.has('fiyat') ? null
    : isFree ? t('card.free')
    : price?.price != null ? formatPrice(price.price)
    : null;
  // Tür satırı ızgarada fiyatla AYNI SATIRI paylaşıyor (maket: space-between,
  // baseline hizası). İki ayrı satır olsaydı kart 19pt uzardı ve 302'lik
  // sabit yükseklik tutmazdı.
  // Tür adları kaynaktan KARIŞIK dilde geliyor (RAWG İngilizce, curated
  // Türkçe) — `turAdi` ikisini de arayüz diline çeviriyor. Ayrıntı orada.
  const turMetni = v.sinyal.has('tur')
    ? (game?.genres || []).slice(0, 2).map((g) => turAdi(g, t)).filter(Boolean).join(' · ')
    : null;

  // Yarıçap VARYANTTAN (Faz 2 eşmerkezli kuralı): A 16 · B 12 · sosyal 12.
  const kapakStil = [
    styles.kapak,
    { borderRadius: v.yaricap },
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
            style={kapakStil}
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
            <Text numberOfLines={v.ad.satir} style={[styles.ad, v.ad.stil]}>{game?.name}</Text>

            {/* Izgara: tür solda, fiyat sağda, tek satırda (maket ölçüsü).
                Tür ESNEK ve kırpılıyor, fiyat KIRPILMIYOR — fiyat yarım
                okunursa yanlış okunuyor, tür yarım okunursa yalnız eksik. */}
            {turMetni || fiyatMetni ? (
              <View style={styles.bilgi}>
                {turMetni ? (
                  <Text numberOfLines={1} style={styles.tur}>{turMetni}</Text>
                ) : <View style={{ flex: 1 }} />}
                {fiyatMetni ? (
                  <Text numberOfLines={1} style={[styles.fiyat, onSale && !isFree && styles.fiyatIndirim]}>
                    {fiyatMetni}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {baglamSatiri ? (
              typeof baglamSatiri === 'string'
                ? <Text numberOfLines={1} style={styles.baglam}>{baglamSatiri}</Text>
                : baglamSatiri
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
  // Punto/satır yüksekliği VARYANTTAN geliyor (AD kademeleri, variants.js):
  // şerit 13/16/32, ızgara 15/19/38. Burada yalnız renk ve ağırlık.
  ad: { color: colors.text, fontWeight: '600' },
  // Tür ↔ fiyat aynı satırda. baseline hizası: 12pt tür ile 15pt fiyatın
  // ALT kenarları hizalanıyor, ortaları değil — maketteki hâli bu.
  bilgi: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s8 },
  tur: { flex: 1, color: colors.text3, fontSize: type.caption },
  fiyat: { flexShrink: 0, color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  fiyatIndirim: { color: colors.accentText },
  baglam: { color: colors.text3, fontSize: type.caption },

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
