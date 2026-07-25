// ─────────────────────────────────────────────────────────────────────────────
// Performans araç seti — YALNIZCA geliştirmede (__DEV__). Production'da no-op.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect } from 'react';

// Bir bloğun süresini ölçer.
export function measure(label, fn) {
  if (!__DEV__) return fn();
  const t0 = Date.now();
  const result = fn();
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}: ${Date.now() - t0}ms`);
  return result;
}

// Bir bileşenin kaç kez render olduğunu sayar → memoization'ı doğrulamak için.
//   function GameCard(props){ useRenderCount('GameCard'); ... }
export function useRenderCount(label) {
  const count = useRef(0);
  count.current += 1;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[render] ${label} #${count.current}`);
  }
  return count.current;
}

// Ekran mount'undan ilk veri gelene kadar geçen süre (TTI benzeri).
//   useTimeToData('Games', games.length > 0);
export function useTimeToData(label, hasData) {
  const start = useRef(Date.now());
  const logged = useRef(false);
  useEffect(() => {
    if (hasData && !logged.current) {
      logged.current = true;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`[TTI] ${label}: ${Date.now() - start.current}ms`);
      }
    }
  }, [hasData, label]);
}
