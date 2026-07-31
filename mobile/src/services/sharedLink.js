// ─────────────────────────────────────────────────────────────────────────────
// Share Extension köprüsü — Safari'den paylaşılan bir Steam linkinin appid'ini
// App Group'tan okuyup oyun detayına gider.
//
// Uygulama önplana her geldiğinde kontrol eder (soğuk başlangıç dahil — kullanıcı
// paylaşıp doğrudan uygulamayı ilk kez o an açmış olabilir).
// ─────────────────────────────────────────────────────────────────────────────
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { getSharedValue } from '../../modules/gamerisen-widget-module';

const KEY = 'pending_shared_appid';
let watching = false;

async function checkPendingShare() {
  try {
    const appid = await getSharedValue(KEY);
    if (appid && /^\d+$/.test(appid)) {
      router.push({
        pathname: '/game/[id]',
        params: { id: `rawg_${appid}`, appid, name: '', image: '' },
      });
    }
  } catch { /* native modül yoksa (Android/Expo Go) sessizce geç */ }
}

// Yalnızca bir kez kurulur (_layout kök bileşeninde çağrılır)
export function startSharedLinkWatcher() {
  if (watching) return;
  watching = true;
  checkPendingShare();   // soğuk başlangıçta da kontrol et
  AppState.addEventListener('change', (state) => {
    if (state === 'active') checkPendingShare();
  });
}
