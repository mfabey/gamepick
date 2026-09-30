// ─────────────────────────────────────────────────────────────────────────────
// SAHİPLİK BANDI — "zaten bende mi?" (Faz 3)
//
// Oyun detayının üç sorusundan biri bu ve ekran onu hiç sormuyordu. Adın
// HEMEN ALTINDA, meta çiplerinin üstünde duruyor: soru fiyattan ÖNCE gelir.
//
// KAYNAK İKİ ÇAĞRI, ÜÇÜNCÜSÜ YOK. `useConnectedLibrary` zaten anasayfa ve
// Kütüphane ekranıyla aynı önbellek anahtarını paylaşıyor — bu bant yeni bir
// istek AÇMIYOR, sıcak veriyi okuyor. Soğuk açılışta 36pt yer tutuyor
// (iskelet), sonradan girip sayfayı aşağı itmiyor.
//
// RENK YALNIZ DOĞRULANMIŞ SAHİPLİKTE. Green = "bu senin". Belirsizlik
// (bağlı değil, süresi dolmuş) nötr kalıyor: bir başarı değil bir durum.
// Kırmızı hiç yok — "Bağla" bir teklif, zorlama değil.
//
// UYDURULMAYAN ŞEY: `fetchXboxLibrary` kütüphane döndürüyor, ABONELİK HAKKI
// döndürmüyor. Bu yüzden bant "Game Pass'te" demiyor, "Xbox kütüphanende"
// diyor. Veri desteklemedikçe ayrım iddia edilmiyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';

import { useConnectedLibrary } from '../hooks/useConnectedLibrary';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { normalizeName } from '../services/recommend';
import { PRESSED } from '../theme';
import { component as K, space } from '../theme/tokens';

export const BANT_Y = 36;

/**
 * Durumu SAF olarak hesaplıyor — test edilebilsin ve JSX'e karar mantığı
 * sızmasın diye ayrı.
 *
 * @returns {null|{anahtar, ikon, olumlu, hedef}} null → bant çizilmez
 */
export function sahiplikDurumu({ ad, steamGames, xboxGames, xbox, steamBagli, xboxBagli, istekte }) {
  const n = normalizeName(ad || '');
  if (!n) return null;

  if (steamGames.some((g) => normalizeName(g.name) === n)) {
    return { anahtar: 'own.steam', ikon: 'checkc', olumlu: true, hedef: null };
  }
  if (xboxGames.some((g) => normalizeName(g.name) === n)) {
    return { anahtar: 'own.xbox', ikon: 'checkc', olumlu: true, hedef: null };
  }

  // Xbox oturumu düşmüşse sessizce "sahibi değil" demek YALAN olurdu:
  // oyun kütüphanede olabilir, biz bakamıyoruz.
  if (xboxBagli && xbox?.expired) {
    return { anahtar: 'own.xboxExpired', ikon: 'clock', olumlu: false, hedef: 'account' };
  }

  // Hiçbir hesap bağlı değilse sahiplik BİLİNEMİYOR — boş bir kutu bilgi
  // vermiyor, yalnızca yer kaplıyor. Bant hiç çizilmiyor.
  if (!steamBagli && !xboxBagli) return null;

  if (!steamBagli) {
    return { anahtar: 'own.noSteam', ikon: 'link', olumlu: false, hedef: 'account' };
  }
  return {
    anahtar: istekte ? 'own.notOwnedWish' : 'own.notOwned',
    ikon: 'bag', olumlu: false, hedef: null,
  };
}

// 2.0 (27 Eyl): G-07'deki StatusPill dili — hap köşe (6), olumluda yeşil ton,
// belirsizde nötr; 2.0 ikonlar. Yükseklik BANT_Y yer tutucusuyla aynı kalıyor
// (soğuk açılışta sayfa zıplamasın), hap kendisi ortalanıyor.
export default function OwnershipBand({ name, istekte, onGit }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const { steamAccounts = [], xbox: xboxSession } = useAuth();
  const { steamGames, xboxGames, xbox, loading } = useConnectedLibrary();

  const steamBagli = steamAccounts.length > 0;
  const xboxBagli = !!xboxSession;

  const durum = useMemo(
    () => sahiplikDurumu({ ad: name, steamGames, xboxGames, xbox, steamBagli, xboxBagli, istekte }),
    [name, steamGames, xboxGames, xbox, steamBagli, xboxBagli, istekte]
  );

  // Yükleniyor: bant YERİNİ TUTUYOR. Sonradan girip sayfayı itmesin.
  if (loading && (steamBagli || xboxBagli)) return <View style={styles.iskelet} />;
  if (!durum) return null;

  const renk = durum.olumlu ? colors.green : colors.text2;
  const hap = (
    <View style={[styles.hap, { backgroundColor: durum.olumlu ? colors.greenTint : colors.pillNeutralSoft }]}>
      <Icon name={durum.ikon} size={14} color={renk} strokeWidth={2.2} />
      <Txt variant="captionStrong" numberOfLines={1} style={{ color: renk }}>{t(durum.anahtar)}</Txt>
      {durum.hedef ? <Icon name="chev" size={13} color={colors.text3} strokeWidth={2.4} /> : null}
    </View>
  );

  if (!durum.hedef) return <View style={styles.bant}>{hap}</View>;

  return (
    <Pressable
      onPress={() => onGit?.(durum.hedef)}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.bant, pressed && PRESSED]}
    >
      {hap}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bant: { height: BANT_Y, justifyContent: 'center', alignSelf: 'flex-start' },
  hap: {
    height: 28, flexDirection: 'row', alignItems: 'center', gap: space[4] + 2,
    paddingHorizontal: space[8] + 2, borderRadius: K.statusPill.radius,
  },
  iskelet: { height: BANT_Y },
});
