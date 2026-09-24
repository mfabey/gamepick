// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE İLE GİRİŞ / YENİDEN DOĞRULAMA — ASIL UYGULAMA
//
// BU DOSYA DOĞRUDAN IMPORT EDİLMEZ. `GoogleAuthButton.jsx` yalnızca kimlikler
// yapılandırılmışsa `require` ediyor; sebebi CİHAZDA ÖLÇÜLDÜ: statik import
// expo-auth-session → expo-crypto zincirini kuruyor ve yerel modülü olmayan
// bir yapıda uygulamanın TAMAMI "Cannot find native module 'ExpoCrypto'" ile
// düşüyordu. Tembel require ile özellik yapılandırılana kadar zincir hiç
// yüklenmiyor.
//
// Sunucu tarafı HAZIR ve ÜRETİMDE: `/api/auth/google-signin` id_token'ı
// Firebase'e federe kimlik olarak veriyor ve apple-signin ile birebir aynı
// yanıtı döndürüyor (`main`'de doğrulandı). Buradaki tek iş Google'dan taze
// bir id_token almak; gerisini `session.signInWithGoogle` yapıyor.
//
// Kimlikler eklendikten sonra YENİ YEREL DERLEME gerekiyor; yönlendirme şeması
// ve expo-crypto yerel yapılandırmadan geliyor, OTA ile gitmez.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { GOOGLE_YAPI } from '../services/googleAuthConfig';
import { Button } from './ui/Primitives';

// Tarayıcıdan dönen oturumu kapatır — modül düzeyinde çağrılması gerekiyor.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google düğmesi. Yalnızca `GOOGLE_YAPILANDIRILDI` iken mount edilmeli.
 *
 * @param onIdToken  başarılı akışta taze id_token ile çağrılır
 * @param onError    kullanıcı vazgeçtiğinde ÇAĞRILMAZ; yalnız gerçek hatada
 * @param guard      false dönerse Google akışı HİÇ açılmaz (ör. sözleşme onayı
 *                   eksik). Düğmeyi pasifleştirmek yerine bu yol seçildi:
 *                   pasif düğme nedenini söylemiyor, guard hata metnini
 *                   gösterebiliyor.
 */
export default function GoogleAuthButton({ title, onIdToken, onError, guard, disabled, height = 52, variant = 'secondary', style }) {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_YAPI.androidClientId,
    iosClientId: GOOGLE_YAPI.iosClientId,
    webClientId: GOOGLE_YAPI.webClientId,
  });

  const bas = useCallback(async () => {
    if (guard && guard() === false) return;
    try {
      const r = await promptAsync();
      if (r?.type !== 'success') {
        // Vazgeçme hata değil: kullanıcı kendi kapattı, ekranda kırmızı
        // bir satır görmesi için bir sebep yok.
        if (r?.type === 'error') onError?.(r?.error?.message || 'GOOGLE_HATA');
        return;
      }
      const idToken = r.params?.id_token || r.authentication?.idToken || null;
      if (!idToken) { onError?.('ID_TOKEN_YOK'); return; }
      await onIdToken?.(idToken);
    } catch (e) {
      onError?.(e?.message || 'GOOGLE_HATA');
    }
  }, [promptAsync, onIdToken, onError, guard]);

  return (
    <Button
      title={title}
      variant={variant}
      height={height}
      // `request` hazırlanana kadar basılamaz: erken dokunuş sessizce düşerdi.
      disabled={disabled || !request}
      onPress={bas}
      style={style}
    />
  );
}
