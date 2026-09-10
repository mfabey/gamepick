// ─────────────────────────────────────────────────────────────────────────────
// İÇERİK ALANI — geniş ekranda kolonu ortalamanın TEK yolu
//
// TAVAN LİSTENİN İÇİNE, EKRANIN KÖKÜNE DEĞİL. Ekran kökünü (SafeAreaView)
// daraltmak daha kısa yoldu ve BİLEREK seçilmedi: bu ağaçta üç yer pencere
// koordinatıyla çalışıyor —
//   · `useKapakOlcum` / `CardExpand` (kapak büyüme geçişi, measureInWindow)
//   · `MessageMenu` / `PersonMenu` (baloncuğa tutturulan menü)
//   · `GamePostCard` (kart çerçevesi ölçümü)
// Kökü içeri almak, `measureInWindow`un döndürdüğü pencere koordinatıyla
// öğenin gerçek yerini birbirinden ayırırdı: kapak animasyonu başlarken
// kenar payı kadar yana sıçrardı. Liste dolgusu bu ayrımı yaratmıyor —
// pencere hâlâ ekranın tamamı, yalnızca satırlar içeri giriyor.
//
// DOLGU, `maxWidth` DEĞİL. FlashList'in içerik kabı genişliği kaydırma
// görünümünden alıyor; oraya `maxWidth` + `alignSelf` yazmak platformlar
// arasında güvenilir değil. Yatay dolgu her listede, her sürümde aynı
// davranıyor — ve ayırıcı çizgiler de kolonla birlikte içeri giriyor, yani
// kolon kenarı gerçekten kolon kenarı gibi görünüyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useWindowDimensions } from 'react-native';

import { ICERIK_MAX, SAYFA_MAX } from '../theme';

/**
 * Kolonu ortalamak için gereken yatay dolgu (pt).
 * Pencere tavandan darsa 0 — telefonda hiçbir şey değişmiyor.
 */
export function useYanBosluk(tavan = ICERIK_MAX) {
  const { width } = useWindowDimensions();
  return Math.max(0, Math.round((width - tavan) / 2));
}

/**
 * İçeriğin gerçekte kaplayacağı genişlik (pt).
 * Hücre genişliği hesaplayan ızgaralar bunu kullanıyor: `useWindowDimensions`
 * pencereyi verir, ızgara ise kolonun içinde yaşar.
 */
export function useIcerikGenislik(tavan = ICERIK_MAX) {
  const { width } = useWindowDimensions();
  return Math.min(width, tavan);
}

/** Izgara gibi genişlikten faydalanan yüzeyler için sayfa tavanı. */
export function useSayfaGenislik() {
  return useIcerikGenislik(SAYFA_MAX);
}

export function useSayfaBosluk() {
  return useYanBosluk(SAYFA_MAX);
}

/**
 * Kart ızgarası için sütun sayısı — SÜTUN ARTAR, HÜCRE BÜYÜMEZ.
 *
 * `numColumns={2}` telefon için doğruydu; iPad'de (820 pt) aynı iki sütun
 * hücreyi 400 pt'ye çıkarıyor — iki oyun kartı bütün ekranı kaplıyor.
 * Izgaranın vaadi "bir bakışta çok oyun"; o vaat sütun sayısıyla tutuluyor.
 *
 * @param hedef  telefonda ölçülen hücre genişliği (pt)
 * @param enAz   maketin sütun sayısı — dar cihazda buranın altına inilmiyor
 */
export function useKartSutun(hedef, enAz = 2) {
  const { width } = useWindowDimensions();
  return Math.max(enAz, Math.floor((width - 20) / hedef));
}
