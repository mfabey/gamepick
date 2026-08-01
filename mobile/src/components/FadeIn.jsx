import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Genel giriş animasyonu — içerik hafifçe yukarı kayarak belirir.
 * Native driver ile UI thread'de çalışır (kaydırmayı bloklamaz).
 *
 *   <FadeIn delay={80}><Card /></FadeIn>
 *
 * Sistem "Hareketi Azalt" açıksa animasyon HİÇ oynatılmaz; içerik doğrudan
 * son hâlinde görünür. Bu dekoratif bir hareket, kapatılması bir şey
 * kaybettirmiyor (HIG erişilebilirlik gereği).
 */
export default function FadeIn({
  children,
  delay = 0,
  duration = 380,
  offset = 14,      // dikey kayma miktarı (px); 0 = sadece solma
  style,
}) {
  const reduced = useReducedMotion();

  // Hareket azaltılmışsa baştan son değerlerle başla — bir kare bile
  // yanlış konumda görünmesin
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : offset)).current;

  useEffect(() => {
    if (reduced) {
      // Ayar sonradan açıldıysa da anında son hâle geç
      opacity.setValue(1);
      translateY.setValue(0);
      return undefined;
    }

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
