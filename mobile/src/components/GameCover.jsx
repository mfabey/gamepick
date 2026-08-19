// ─────────────────────────────────────────────────────────────────────────────
// Oyun kapağı katmanı — görsel + karartma + üstüne konan her şey.
//
// NEDEN VAR. Ölçüldü: aynı görsel iş için DÖRT ayrı karartma reçetesi vardı.
//
//   transparent → 0.92              onboarding, collection, list, GamePostCard
//   transparent → 0.55 → 0.97       swipe
//   transparent → 0.55 → 0.96       GameCard
//   transparent → 0.96 / → 0.94     library / index
//
// 0.92 / 0.94 / 0.96 / 0.97 — tek başına hiçbiri ayırt edilemez, ama yan yana
// gelen kartları birbirinden farklı gösteriyorlardı. Konumlar da ayrışmıştı
// (0.35/0.7/1 · 0.4/1 · 0.45/1), görsel geçiş süresi de (180/200/250ms).
// Yeni bir kart yazan kişinin hangisini seçeceğine dair bir cevap yoktu;
// beşincisi eklenirdi.
//
// KART GÖVDELERİ BİRLEŞTİRİLMEDİ — bilerek. 2 sütunlu ızgara karesi, 132pt'lik
// şerit kartı, tam ekran kaydırma destesi ve seçim ızgarası gerçekten farklı
// şeyler; hepsini tek bileşene sıkıştırmak on proplu bir anahtar üretirdi.
// Ortak olan yalnızca bu katman, paylaşılan da yalnızca o.
//
// ÜÇ DURAKLI REÇETE SEÇİLDİ. İki duraklı olan parlak kapaklarda metni
// tutmuyordu: geçiş kartın alt üçte birinde başlayıp bir anda koyuluyor,
// aradaki parlak şeritte beyaz yazı eriyordu. Orta durak o şeridi kapatıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import PosterImage from './PosterImage';
import Monogram from './Monogram';

// tema-bagimsiz: oyun kapağının üstünde duruyor, zemin görselin kendisi
const SCRIM = ['transparent', 'rgba(6,7,9,0.55)', 'rgba(6,7,9,0.96)'];
const SCRIM_STOPS = [0.35, 0.7, 1];
const FADE_MS = 200;

/**
 * @param {string}  uri           kapak adresi
 * @param {string} [name]         monogram için oyun adı (kapak gelmezse)
 * @param {string} [recyclingKey] FlashList geri dönüşümünde görsel karışmasın
 * @param {object} [style]        dış kap (boyut/oran/köşe burayadan gelir)
 * @param {node}   [children]     rozetler, ad — karartmanın ÜSTÜNDE çizilir
 * @param {bool}  [kapakNotu]     kapak yoksa köşedeki 11pt not (sol alt dolu ise false)
 */
export default function GameCover({ uri, name, recyclingKey, style, children, kapakNotu = true, ...rest }) {
  const [failed, setFailed] = useState(false);

  // GERİ DÖNÜŞÜM SIFIRLAMASI ŞART. FlashList kartları yeniden kullanıyor;
  // sıfırlanmasaydı bir kez başarısız olan kart, sonra gelen SAĞLAM kapaklı
  // oyunda da monogram göstermeye devam ederdi.
  useEffect(() => { setFailed(false); }, [uri]);

  // Monogram karartmanın ALTINDA: üstünde olsaydı gradyan onu da karartır ve
  // harfler okunmazdı. Kapak yüklenince görsel monogramın üstünü örtüyor.
  return (
    <View style={style}>
      {failed || !uri ? (
        <Monogram name={name} style={StyleSheet.absoluteFill} not={kapakNotu} />
      ) : (
        <PosterImage
          uri={uri}
          recyclingKey={recyclingKey}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={FADE_MS}
          onError={() => setFailed(true)}
          {...rest}
        />
      )}
      <LinearGradient colors={SCRIM} locations={SCRIM_STOPS} style={StyleSheet.absoluteFill} />
      {/* BASMA AYDINLANMASI KALKTI (Faz 2). Ortak basma reçetesi tek:
          PRESSED_CARD = .9 opaklık + scale .97 (theme.js). Aydınlanma
          katmanı kartı soldururken kapağı aydınlatıyordu — iki efekt
          birbirini götürüyor, net etki neredeyse sıfırdı. */}
      {children}
    </View>
  );
}
