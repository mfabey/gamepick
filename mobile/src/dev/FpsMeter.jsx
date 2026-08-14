import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { type } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Canlı FPS ölçer — YALNIZCA geliştirmede (__DEV__).
// requestAnimationFrame ile JS thread frame hızını sayar; kaydırma jank'ı
// olduğunda değer düşer. Production'da hiç render/mount olmaz (bkz. _layout).
// ─────────────────────────────────────────────────────────────────────────────
export default function FpsMeter() {
  const [fps, setFps] = useState(60);
  const frames = useRef(0);
  const last = useRef(Date.now());
  const raf = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      frames.current += 1;
      const t = Date.now();
      const dt = t - last.current;
      if (dt >= 1000) {
        if (mounted) setFps(Math.round((frames.current * 1000) / dt));
        frames.current = 0;
        last.current = t;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { mounted = false; if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const color = fps >= 55 ? '#00d26e' : fps >= 40 ? '#fbbf24' : '#ef4444';

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.text, { color }]}>{fps} FPS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 50, right: 10, zIndex: 9999 },
  badge: {
    // tema-bagimsiz: yalnizca gelistirme araci
    backgroundColor: 'rgba(8,10,13,0.82)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { fontSize: type.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
