// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE İLE GİRİŞ / YENİDEN DOĞRULAMA — ASIL UYGULAMA
//
// BU DOSYA DOĞRUDAN IMPORT EDİLMEZ. `GoogleAuthButton.jsx` yalnızca
// `GOOGLE_YAPILANDIRILDI` iken `require` ediyor: kütüphanenin importu yerel
// modülü `TurboModuleRegistry.getEnforcing` ile istiyor ve modülü olmayan bir
// derlemede uygulamanın TAMAMI düşerdi.
//
// Sunucu tarafı HAZIR ve ÜRETİMDE: `/api/auth/google-signin` id_token'ı
// Firebase'e federe kimlik olarak veriyor ve apple-signin ile birebir aynı
// yanıtı döndürüyor (`main`'de doğrulandı). Buradaki tek iş Google'dan taze
// bir id_token almak; gerisini `session.signInWithGoogle` yapıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import { GOOGLE_YAPI } from '../services/googleAuthConfig';
import { Button } from './ui/Primitives';

// Modül düzeyinde bir kez. iOS istemci kimliği GoogleService-Info.plist'ten
// geliyor; Android'de istemci kimliği verilmiyor (bkz. googleAuthConfig).
GoogleSignin.configure({ webClientId: GOOGLE_YAPI.webClientId });

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
  // Akış açıkken ikinci dokunuş yeni bir akış başlatmasın (kütüphane
  // IN_PROGRESS fırlatıyor ama düğmenin basılabilir görünmesi yanlış).
  const [acik, setAcik] = useState(false);

  const bas = useCallback(async () => {
    if (guard && guard() === false) return;
    setAcik(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      // Önceki Google oturumu kapatılıyor: kapatılmazsa Android son seçilen
      // hesabı SORMADAN döndürüyor — Gamerisen'den çıkıp başka bir Google
      // hesabıyla girmek isteyen kullanıcı hesap seçiciyi hiç görmezdi.
      // Gamerisen oturumu bu SDK'ya bağlı değil; bu çağrı onu etkilemiyor.
      await GoogleSignin.signOut().catch(() => {});
      const r = await GoogleSignin.signIn();
      // Vazgeçme hata değil: kullanıcı kendi kapattı, ekranda kırmızı bir
      // satır görmesi için bir sebep yok.
      if (r?.type !== 'success') return;
      const idToken = r.data?.idToken || null;
      if (!idToken) { onError?.('ID_TOKEN_YOK'); return; }
      await onIdToken?.(idToken);
    } catch (e) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return;
      onError?.(isErrorWithCode(e) ? `${e.message || 'GOOGLE_HATA'} (${e.code})` : (e?.message || 'GOOGLE_HATA'));
    } finally {
      setAcik(false);
    }
  }, [onIdToken, onError, guard]);

  return (
    <Button
      title={title}
      variant={variant}
      height={height}
      disabled={disabled || acik}
      onPress={bas}
      style={style}
    />
  );
}
