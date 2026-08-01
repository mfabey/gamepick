// ─────────────────────────────────────────────────────────────────────────────
// Sistem "Hareketi Azalt" ayarını izler.
//
// Erişilebilirlik ayarlarında bunu açan kullanıcılar genelde vestibüler
// rahatsızlık yaşıyor; süslü giriş/çıkış animasyonları onlar için baş dönmesi
// yaratabiliyor. HIG bu ayara uyulmasını istiyor.
//
// NOT: Doğrudan manipülasyon (parmağı takip eden kart gibi) animasyon sayılmaz
// ve kapatılmaz — kapatılırsa etkileşim bozulur. Kapatılan şey DEKORATİF
// hareket: içeri süzülme, yaylanma, ölçeklenme.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduced(!!v); })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (alive) setReduced(!!v);
    });

    return () => {
      alive = false;
      // RN sürümüne göre abonelik ya nesne ya da kaldırma fonksiyonu döndürüyor
      if (sub && typeof sub.remove === 'function') sub.remove();
      else if (typeof sub === 'function') sub();
    };
  }, []);

  return reduced;
}

export default useReducedMotion;
