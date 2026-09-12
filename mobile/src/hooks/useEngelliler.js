import { useEffect, useState } from 'react';
import { abone } from '../services/engel';

// ─────────────────────────────────────────────────────────────────────────────
// Engel kümesi değiştiğinde yeniden çizdiren kanca.
//
// SAYAÇ DÖNÜYOR, KÜME DEĞİL. Küme değişebilir (mutable) bir nesne; onu
// döndürseydik referans hiç değişmez ve `useMemo` bağımlılığı olarak işe
// yaramazdı. Artan bir sayı, "süzgeci yeniden çalıştır" demenin en ucuz yolu.
//
// Kullanım:
//   const engelSurumu = useEngelliler();
//   const gorunen = useMemo(() => suz(items, (x) => x.author?.uid), [items, engelSurumu]);
// ─────────────────────────────────────────────────────────────────────────────
export function useEngelliler() {
  const [surum, setSurum] = useState(0);
  useEffect(() => abone(() => setSurum((n) => n + 1)), []);
  return surum;
}
