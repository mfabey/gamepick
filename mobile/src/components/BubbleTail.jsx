import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

// ─────────────────────────────────────────────────────────────────────────────
// Baloncuk kuyruğu — iOS Messages'ın o küçük çengeli.
//
// ── NEDEN SVG DEĞİL ──
// Kuyruk tek bir eğri değil, İKİ dikdörtgenin farkı: dışarı taşan yuvarlak
// köşeli bir DOLGU, üstüne sayfa zemini renginde yuvarlak köşeli bir KESİCİ.
// Aradaki hilal kuyruğun kendisi. Bu, tarayıcıda ölçülüp doğrulanmış bir
// geometri (bkz. samuelkraft, "iOS chat bubbles in CSS") ve React Native'de
// birebir karşılığı var — iki View, iki yarıçap. SVG'ye çevirmek aynı şekli
// elle Bezier'e dökmek demekti: daha çok kod, doğrulaması daha zor.
//
// ── SIRALAMA ŞART ──
// İkisi de baloncuğun İLK çocukları olmalı:
//   • baloncuğun kendi zemininin ÜSTÜNE binerler (köşeyi kuyruğa bağlar)
//   • metnin ALTINDA kalırlar (dolgu baloncukla aynı renk, metni yemez)
// Sonraya konurlarsa dolgu metnin son satırını örter.
//
// ── KESİCİ NEYİ BOYAR ──
// Kesici baloncuğun DIŞINDA, kenar boşluğunda duruyor: kendi mesajımda
// baloncuğun sağında, karşı tarafınkinde solunda. İki hizalama da ekran
// kenarına yaslı olduğu için kesicinin altında sayfa zemininden başka bir
// şey yok — başka bir baloncuğu boyaması mümkün değil.
//
// ── ELİPTİK YARIÇAP YOK ──
// Kaynak CSS `16px 14px` eliptik yarıçap kullanıyor; RN yalnızca dairesel
// yarıçap destekliyor. İkisinin ortası olan 15 alındı ve iki temada da
// tarayıcıda karşılaştırıldı — silüette gözle görülür fark yok.
// ─────────────────────────────────────────────────────────────────────────────

/** Kuyruğun baloncuk kenarından DIŞARI taştığı miktar. */
export const KUYRUK_TASMA = 7;

// ─────────────────────────────────────────────────────────────────────────────
// GÖRSEL BALONCUKTA KUYRUK
//
// Salt görsel bir baloncukta ZEMİN RENGİ YOK — baloncuğu görselin kendisi
// dolduruyor. Düz renkli bir dolgu oraya konsa fotoğrafın köşesine takoz
// gibi otururdu. iOS bunu görseli kuyruk siluetine KIRPARAK çözüyor.
//
// Buradaki karşılığı: kuyruk kabı `overflow:'hidden'` ve içinde AYNI
// GÖRSELİN İKİNCİ BİR KOPYASI, resmin kuyruğa doğru devam edeceği ofsetle
// duruyor. Kopya ucuz: `expo-image` aynı kaynağı bellek önbelleğinden
// veriyor, ikinci bir ağ isteği yok.
//
// `@react-native-masked-view` BİLEREK EKLENMEDİ: yerel modül, OTA
// güncellemesini kırar. Bu depo o kısıtı başka yerde de koruyor
// (bkz. services/realtime.js — "Native modül YOK — OTA korunuyor").
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {boolean} p.mine    kendi mesajım mı (kuyruk sağda mı solda mı)
 * @param {string}  [p.dolgu] baloncuğun zemin rengi (düz renkli baloncuklar)
 * @param {object}  [p.gorsel] `{ url, w, h, fit }` — görsel baloncuklar için
 * @param {string}  p.zemin   sayfanın zemin rengi (kesici bunu boyuyor)
 */
export default function BubbleTail({ mine, dolgu, gorsel, zemin }) {
  return (
    <>
      {gorsel ? (
        <View
          pointerEvents="none"
          style={[s.dolgu, mine ? s.dolguBenim : s.dolguOnun, s.kirp]}
        >
          {/* ── KOPYA NEDEN BALONCUKTAN GENİŞ ──
              Kaynak görselde baloncuğun kenarından ÖTEYE piksel yok; kopya
              baloncukla aynı genişlikte olsaydı çengelin dış KUYRUK_TASMA
              kadarı boş kalırdı (ölçüldü: köşe kare görünüp altında bir
              çentik kalıyordu).
              iOS de aynı şeyi yapıyor: görseli baloncuk+kuyruk siluetinin
              TAMAMINA aspect-fill ediyor. Buradaki karşılığı %3'lük bir
              genişleme — fotoğrafta ve GIF'te görünmüyor. */}
          <Image
            source={gorsel.url}
            style={[
              s.gorselKopya,
              { width: gorsel.w + KUYRUK_TASMA, height: gorsel.h },
              mine ? { right: 0 } : { left: 0 },
            ]}
            contentFit={gorsel.fit || 'cover'}
          />
        </View>
      ) : (
        <View
          pointerEvents="none"
          style={[s.dolgu, mine ? s.dolguBenim : s.dolguOnun, { backgroundColor: dolgu }]}
        />
      )}
      <View
        pointerEvents="none"
        style={[s.kesici, mine ? s.kesiciBenim : s.kesiciOnun, { backgroundColor: zemin }]}
      />
    </>
  );
}

const s = StyleSheet.create({
  // Yükseklik 25: en kısa baloncuk 40pt (9 + 22 + 9), yani kuyruk hiçbir
  // zaman baloncuktan taşmıyor.
  dolgu: { position: 'absolute', bottom: 0, height: 25, width: 20 },
  // Kesicinin İÇ kenarı baloncuğun kenarına oturuyor, dışa doğru 26pt
  // uzuyor: dolgunun taştığı 7pt'yi örtüp geri kalanı boş kenar boşluğu.
  kesici: { position: 'absolute', bottom: 0, height: 25, width: 26 },

  dolguBenim: { right: -KUYRUK_TASMA, borderBottomLeftRadius: 15 },
  dolguOnun:  { left: -KUYRUK_TASMA, borderBottomRightRadius: 15 },

  // Görsel kopyası kabın DIŞINA taşıyor; kırpma onu kuyruk siluetine
  // indiriyor. Yuvarlak köşe kabın kendisinde olduğu için kırpma o köşeyi
  // de takip ediyor.
  kirp: { overflow: 'hidden' },
  gorselKopya: { position: 'absolute', bottom: 0 },

  // right/left = -26 → kesicinin iç kenarı tam baloncuğun kenarına oturuyor.
  kesiciBenim: { right: -26, borderBottomLeftRadius: 10 },
  kesiciOnun:  { left: -26, borderBottomRightRadius: 10 },
});
