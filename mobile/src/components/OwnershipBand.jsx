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
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useConnectedLibrary } from '../hooks/useConnectedLibrary';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import { normalizeName } from '../services/recommend';
import { radius, spacing, type, PRESSED } from '../theme';

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
    return { anahtar: 'own.steam', ikon: 'checkmark-circle', olumlu: true, hedef: null };
  }
  if (xboxGames.some((g) => normalizeName(g.name) === n)) {
    return { anahtar: 'own.xbox', ikon: 'checkmark-circle', olumlu: true, hedef: null };
  }

  // Xbox oturumu düşmüşse sessizce "sahibi değil" demek YALAN olurdu:
  // oyun kütüphanede olabilir, biz bakamıyoruz.
  if (xboxBagli && xbox?.expired) {
    return { anahtar: 'own.xboxExpired', ikon: 'time-outline', olumlu: false, hedef: 'account' };
  }

  // Hiçbir hesap bağlı değilse sahiplik BİLİNEMİYOR — boş bir kutu bilgi
  // vermiyor, yalnızca yer kaplıyor. Bant hiç çizilmiyor.
  if (!steamBagli && !xboxBagli) return null;

  if (!steamBagli) {
    return { anahtar: 'own.noSteam', ikon: 'ellipse-outline', olumlu: false, hedef: 'account' };
  }
  return {
    anahtar: istekte ? 'own.notOwnedWish' : 'own.notOwned',
    ikon: 'ellipse-outline', olumlu: false, hedef: null,
  };
}

export default function OwnershipBand({ name, istekte, onGit }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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

  const govde = (
    <>
      <Ionicons
        name={durum.ikon}
        size={15}
        color={durum.olumlu ? colors.green : colors.text3}
      />
      <Text numberOfLines={1} style={[styles.metin, durum.olumlu && styles.metinOlumlu]}>
        {t(durum.anahtar)}
      </Text>
      {durum.hedef ? <Ionicons name="chevron-forward" size={14} color={colors.text3} /> : null}
    </>
  );

  if (!durum.hedef) return <View style={styles.bant}>{govde}</View>;

  return (
    <Pressable
      onPress={() => onGit?.(durum.hedef)}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.bant, pressed && PRESSED]}
    >
      {govde}
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  bant: {
    height: BANT_Y,
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s12,
    borderRadius: radius.md,
    backgroundColor: colors.bgInput,
  },
  iskelet: { height: BANT_Y },
  metin: { fontSize: type.footnote, fontWeight: '600', color: colors.text2 },
  metinOlumlu: { color: colors.green },
});
