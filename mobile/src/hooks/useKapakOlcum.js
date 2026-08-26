import { useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// BÜYÜME GEÇİŞİNİN ÖLÇÜM SÖZLEŞMESİ — tek yerde.
//
// Bu mantık `GameCard` içinde gömülüydü ve geçiş yalnız şerit kartlarında
// vardı. Anasayfada detaya giden yedi giriş var; kapağı olan altısının aynı
// davranması isteniyor. Üç bileşene kopyalanacak on satır yerine bir kanca:
// sözleşme (hangi alanlar, hata durumunda ne olur) tek yerde tanımlı kalıyor.
//
// SÖZLEŞME: `onExpand(cerceve | null, yuk)`
//   cerceve = { x, y, width, height, image, name }  ekran koordinatlarında
//   null    = ölçüm yapılamadı → çağrı yeri DÜZ GEZİNMEYE düşer
//
// Geçiş bir SÜSLEME: ölçüm başarısız olursa yol kapanmaz, yalnız animasyon
// olmaz. Bu yüzden hata yolu sessizce null döndürüyor, atmıyor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {func}   onExpand  çerçeveyi alan çağrı yeri (yoksa kanca etkisiz)
 * @param {object} yuk       gezinme yükü — `onExpand`'e ikinci argüman
 * @param {object} [gorsel]  { image, name }; verilmezse `yuk`tan okunur
 * @returns {[object, func]} [ref, ac] — ref ölçülecek View'e, `ac` dokunuşa
 */
export function useKapakOlcum(onExpand, yuk, gorsel) {
  const ref = useRef(null);

  const ac = useCallback(() => {
    if (!onExpand) return;
    const el = ref.current;
    if (!el?.measureInWindow) { onExpand(null, yuk); return; }
    el.measureInWindow((x, y, width, height) => {
      const kaynak = gorsel || yuk;
      onExpand(
        (width && height)
          ? { x, y, width, height, image: kaynak?.image, name: kaynak?.name }
          : null,
        yuk
      );
    });
  }, [onExpand, yuk, gorsel]);

  return [ref, ac];
}
