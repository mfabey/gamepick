import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useLanguage } from '../context/LanguageContext';
import { blockUser } from '../api/social';
import { engelle } from '../services/engel';

// ─────────────────────────────────────────────────────────────────────────────
// ŞİKÂYET + ENGELLEME — tek yerde
//
// NEDEN VAR. App Store Guideline 1.2 bu iki yolun kullanıcı içeriğinin
// göründüğü HER yüzeyde bulunmasını istiyor. "Her yüzey" bu uygulamada altı
// ekran demek ve aynı otuz satır altı kez kopyalanacaktı. Kopyalandığı anda
// da hep aynı şey oluyor: biri güncelleniyor, beşi eskiyor.
//
// 2.6.1 (42) reddi tam olarak bunun küçük hâliydi — şikâyet iki akışta vardı,
// gönderi detayında ve profil ekranlarında yoktu. Eksik olan karar değil,
// kararın taşınmasıydı.
//
// AYRIM: menü KİŞİYE, şikâyet İÇERİĞE ait. Kart hangi kişi olduğunu biliyor,
// ekran hangi içerik olduğunu; `acMenu` ikisini birleştiriyor.
//
// Kullanım:
//   const mod = useModerasyon();
//   <PostCard onMenu={(k) => mod.acMenu(k, { targetType: 'post', targetId: String(p.id) })} />
//   <ModerasyonKatmani mod={mod} />
// ─────────────────────────────────────────────────────────────────────────────
export function useModerasyon() {
  const router = useRouter();
  const { t } = useLanguage();

  const [menuKisi, setMenuKisi] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const acMenu = useCallback((kisi, hedef) => {
    // UID YOKSA MENÜ AÇILMIYOR. Engelleme ve şikâyet ikisi de uid istiyor;
    // menüyü açıp iki seçeneğin de başarısız olmasını izletmek, hiç
    // açmamaktan daha kötü.
    if (!kisi?.uid) return;
    setMenuKisi({ ...kisi, hedef });
  }, []);

  const menuSec = useCallback((anahtar) => {
    // PersonMenu önce `onClose`, sonra `onSec` çağırıyor. `menuKisi` bu
    // render'ın kapanışında hâlâ dolu: React durum güncellemesi senkron
    // uygulanmıyor. u/[username].jsx aynı sırayı zaten kullanıyor.
    const kisi = menuKisi;
    if (!kisi) return;

    if (anahtar === 'profile') {
      if (kisi.username) router.push(`/u/${kisi.username}`);
      return;
    }
    if (anahtar === 'report') { setReportTarget(kisi.hedef); return; }
    if (anahtar !== 'block') return;

    Alert.alert(kisi.displayName || kisi.username || '', t('soc.blockConfirm'), [
      { text: t('soc.cancel'), style: 'cancel' },
      {
        text: t('soc.block'),
        style: 'destructive',
        onPress: async () => {
          // ÖNCE SUNUCU, SONRA YEREL. Ters sırada olsaydı istek başarısızken
          // içerik ekrandan kaybolur, kullanıcı engellediğini sanır ve bir
          // sonraki açılışta geri gelirdi.
          try { await blockUser(kisi.uid); } catch { Alert.alert(t('soc.err.generic')); return; }
          engelle(kisi.uid);
        },
      },
    ]);
  }, [menuKisi, router, t]);

  return { menuKisi, setMenuKisi, reportTarget, setReportTarget, acMenu, menuSec };
}
