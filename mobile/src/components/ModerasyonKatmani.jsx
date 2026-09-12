import PersonMenu from './PersonMenu';
import ReportSheet from './ReportSheet';

// ─────────────────────────────────────────────────────────────────────────────
// `useModerasyon`un görünen yüzü — kişi menüsü + şikâyet formu.
//
// TEK BİLEŞEN, İKİ MODAL. Çağıran ekranların altına iki ayrı eleman
// yazdırmak, birini eklemeyi unutmayı mümkün kılıyordu: menü açılır, şikâyet
// seçilir, hiçbir şey olmaz. Bu bileşen ikisini birlikte taşıyor.
//
// HEDEF TÜRÜ SABİT DEĞİL. Önceden şikâyet formu `targetType="review"` diye
// gömülüydü çünkü yalnız incelemeler raporlanabiliyordu; artık gönderi,
// yanıt ve kullanıcı da geçiyor.
// ─────────────────────────────────────────────────────────────────────────────
export default function ModerasyonKatmani({ mod }) {
  const { menuKisi, setMenuKisi, reportTarget, setReportTarget, menuSec } = mod;

  return (
    <>
      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.targetType || 'review'}
        targetId={reportTarget?.targetId || ''}
      />

      <PersonMenu
        visible={!!menuKisi}
        person={menuKisi}
        onClose={() => setMenuKisi(null)}
        onSec={menuSec}
      />
    </>
  );
}
