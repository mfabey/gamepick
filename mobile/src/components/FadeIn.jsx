import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Genel giriş animasyonu — içerik hafifçe yukarı kayarak belirir.
 * Native driver ile UI thread'de çalışır (kaydırmayı bloklamaz).
 *
 *   <FadeIn delay={80}><Card /></FadeIn>
 */
export default function FadeIn({
  children,
  delay = 0,
  duration = 380,
  offset = 14,      // dikey kayma miktarı (px); 0 = sadece solma
  style,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
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
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
