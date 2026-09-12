'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LOGO_SRC } from '../../lib/logo';
import { useLanguage } from '../../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// E-POSTA DOĞRULAMA / ŞİFRE SIFIRLAMA — Firebase action URL'inin indiği sayfa
//
// Kullanıcı bu sayfayı hesabını açtıktan hemen sonra, postadaki bağlantıdan
// görüyor. Yani ürünle kurduğu İLK temaslardan biri ve markanın taşınması
// gereken bir yer.
//
// ÖNCEKİ HÂLİN SORUNU ÖLÇÜLDÜ: 27 ayrı satır içi stil bloğu, sitenin hazır
// `.card` / `.btn` sınıfları yerine elle kurulmuş düğmeler, ve logo yerine
// jenerik bir gamepad SVG'si. Sayfa sitenin değil, bir iskeletin parçası gibi
// duruyordu.
//
// MANTIK DEĞİŞMEDİ: `/api/auth/action` çağrıları, doğrulama akışı ve hata
// metinleri aynı. Değişen yalnızca sunum ve bitiş yolları.
// ─────────────────────────────────────────────────────────────────────────────

function AuthActionContent() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const mode = searchParams.get('mode'); // 'resetPassword' or 'verifyEmail'
  const oobCode = searchParams.get('oobCode');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // For Password Reset form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!mode || !oobCode) {
      setError(
        lang === 'tr'
          ? 'Bağlantı eksik ya da bozuk görünüyor. E-postandaki bağlantıya yeniden dokun.'
          : 'This link looks incomplete or broken. Please open the link from your email again.'
      );
      setLoading(false);
      return;
    }

    // If it is verifyEmail, we perform the action automatically on load
    if (mode === 'verifyEmail') {
      verifyEmailAction();
    } else if (mode === 'resetPassword') {
      setLoading(false);
    } else {
      setError(
        lang === 'tr'
          ? 'Bu bağlantı tanınmayan bir işlem taşıyor.'
          : 'This link carries an unrecognized action.'
      );
      setLoading(false);
    }
  }, [mode, oobCode, lang]);

  const verifyEmailAction = async () => {
    try {
      const res = await fetch('/api/auth/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'verifyEmail', oobCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'tr' ? 'E-posta doğrulanırken bir hata oluştu.' : 'An error occurred while verifying your email.'));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(
        lang === 'tr'
          ? 'Şifre en az 6 karakter olmalıdır.'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === 'tr'
          ? 'Şifreler eşleşmiyor.'
          : 'Passwords do not match.'
      );
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch('/api/auth/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'resetPassword', oobCode, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (lang === 'tr' ? 'Şifre sıfırlanırken bir hata oluştu.' : 'An error occurred while resetting your password.'));
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    fontSize: 15, color: 'var(--text)', outline: 'none',
    background: 'var(--bg-input)',
    transition: 'border-color 0.15s',
  };

  // ── BİTİŞ EYLEMLERİ: İKİSİ DE GÖRÜNÜR ───────────────────────────────────────
  //
  // Bu bağlantıya tıklayanların çoğu hesabı MOBİL UYGULAMADA açtı ve linki
  // telefonunda açıyor; onları yalnızca web girişine göndermek geldikleri yere
  // dönmek için fazladan iş çıkarıyordu (eski metin "Sitemize giriş
  // yapabilirsiniz" diyordu). Ama kayıt web'den de yapılabiliyor ve sayfa
  // hangisinden gelindiğini BİLEMİYOR.
  //
  // Bu yüzden tahmin yok: iki yol da görünür. Özel şemanın tek başına
  // yetmediği bu depoda zaten yazılı (bkz. app/u/[username]/page.jsx) —
  // uygulama kurulu değilse `gamerisen://` hiçbir şey yapmaz, o yüzden web
  // seçeneği soluk bir bağlantı değil tam bir düğme.
  //
  // Hedef KÖK: expo-router derin bağlantısında rota çözümü cihazda
  // doğrulanmadı; kökü açmak kurulu her sürümde çalışıyor.
  const bitisEylemleri = (
    <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
      {/* `.btn` alt çizgiyi kaldırmıyor (düğmeler için yazılmış, bağlantılar
          için değil); bağlantı olarak kullanınca elle kapatılıyor. */}
      <a href="gamerisen://" className="btn btn-red" style={{ width: '100%', textDecoration: 'none' }}>
        {lang === 'tr' ? 'Uygulamada devam et' : 'Continue in the app'}
      </a>
      <Link href="/login" className="btn btn-ghost" style={{ width: '100%', textDecoration: 'none' }}>
        {lang === 'tr' ? 'Web’de giriş yap' : 'Log in on the web'}
      </Link>
    </div>
  );

  const baslik = mode === 'verifyEmail'
    ? (lang === 'tr' ? 'E-posta doğrulama' : 'Email verification')
    : mode === 'resetPassword'
      ? (lang === 'tr' ? 'Şifre sıfırlama' : 'Reset password')
      : (lang === 'tr' ? 'Hesap işlemi' : 'Account action');

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--hero-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* MARKA BAŞLIĞI — jenerik gamepad SVG'si yerine gerçek logo.
            Kullanıcı bu sayfayı e-postadan geliyor; hangi ürünün sayfasında
            olduğunu ilk bakışta görmesi gerekiyor. */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* MARKA İŞARETİ TEK KAYNAKTAN: `LOGO_SRC`, üst çubuğun da
              kullandığı gömülü işaret (app/lib/logo.js). İlk denemede
              `/logo.png` kullanılmıştı — o BAŞKA ve zayıf bir varlık, 56px'te
              küçük bir kırmızı işarete düşüyordu (tarayıcıda görüldü).
              Gölge de üst çubuktakiyle aynı, iki yerde aynı işaret aynı
              görünsün diye.

              Ortalama işi flex kabında: `<img>` blok öğe, ebeveynin
              `textAlign: center`ı ona işlemiyor. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={LOGO_SRC} alt="Gamerisen" width={56} height={56}
              style={{ display: 'block', filter: 'drop-shadow(0 4px 12px var(--accent-glow))' }}
            />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 26, fontWeight: 700, color: 'var(--text)',
            letterSpacing: '-0.3px', marginTop: 14,
          }}>
            {baslik}
          </h1>
        </div>

        <div className="card" style={{ padding: 28 }}>

          {/* Durum bölgesi ekran okuyucuya DUYURULUYOR: doğrulama kendiliğinden
              çalışıyor ve sonucu yalnızca görsel olarak bildirmek, ekranı
              görmeyen kullanıcıya hiçbir şey söylemezdi. */}
          <div role="status" aria-live="polite" aria-busy={loading}>

            {loading && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div className="spinner" style={{
                  width: 34, height: 34, border: '3px solid var(--border)',
                  borderTopColor: 'var(--accent)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite', margin: '0 auto 16px',
                }} />
                <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
                  {mode === 'verifyEmail'
                    ? (lang === 'tr' ? 'E-postan doğrulanıyor…' : 'Verifying your email…')
                    : (lang === 'tr' ? 'Bağlantı kontrol ediliyor…' : 'Checking your link…')}
                </p>
              </div>
            )}

            {!loading && error && (
              <div style={{ textAlign: 'center' }}>
                {/* Hata simgesi AMBER, marka kırmızısı değil: accent bu sitede
                    markanın rengi ve aynı tonu hataya da vermek, ikisini
                    birbirinden ayırt edilemez kılıyordu. Renk tek sinyal
                    değil — başlık ve simge de durumu söylüyor. */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--amber-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--amber)"
                       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 9v4" /><path d="M12 17h.01" />
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                  {lang === 'tr' ? 'Bu bağlantı işe yaramadı' : 'This link didn’t work'}
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                  {error}
                </p>
                {/* §8 error-recovery: hata mesajı tek başına yetmez, çıkış yolu
                    da olmalı. Bağlantının süresi dolduysa yenisini istemenin
                    yeri giriş ekranı. */}
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>
                  {lang === 'tr'
                    ? 'Bağlantının süresi dolmuş olabilir. Giriş ekranından yeni bir doğrulama postası isteyebilirsin.'
                    : 'The link may have expired. You can request a new verification email from the login screen.'}
                </p>
                {bitisEylemleri}
              </div>
            )}

            {!loading && !error && success && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--green-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)"
                       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                  {mode === 'verifyEmail'
                    ? (lang === 'tr' ? 'E-postan doğrulandı' : 'Your email is verified')
                    : (lang === 'tr' ? 'Şifren güncellendi' : 'Your password is updated')}
                </p>
                <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20, lineHeight: 1.55 }}>
                  {mode === 'verifyEmail'
                    ? (lang === 'tr'
                        ? 'Hesabın hazır. Kütüphaneni bağlayıp arkadaşlarını eklemeye başlayabilirsin.'
                        : 'Your account is ready. Connect your library and start adding friends.')
                    : (lang === 'tr'
                        ? 'Yeni şifrenle giriş yapabilirsin.'
                        : 'You can now log in with your new password.')}
                </p>
                {bitisEylemleri}
              </div>
            )}

          </div>

          {/* Şifre sıfırlama formu — durum bölgesinin DIŞINDA: bir form
              "duyurulacak durum" değil, doldurulacak bir alan. */}
          {!loading && !error && !success && mode === 'resetPassword' && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="yeni-sifre" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni şifre' : 'New password'}
                </label>
                <input
                  id="yeni-sifre" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" style={fieldStyle}
                  autoComplete="new-password"
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label htmlFor="yeni-sifre-tekrar" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  {lang === 'tr' ? 'Yeni şifre (tekrar)' : 'Confirm new password'}
                </label>
                <input
                  id="yeni-sifre-tekrar" type="password" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" style={fieldStyle}
                  autoComplete="new-password"
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>

              <button type="submit" disabled={formLoading} className="btn btn-red" style={{ width: '100%' }}>
                {formLoading
                  ? (lang === 'tr' ? 'Güncelleniyor…' : 'Updating…')
                  : (lang === 'tr' ? 'Şifreyi güncelle' : 'Update password')}
              </button>
            </form>
          )}

        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
          {lang === 'tr'
            ? 'Bu işlemi sen başlatmadıysan bu postayı yok sayabilirsin.'
            : 'If you didn’t start this, you can safely ignore the email.'}
        </p>

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--hero-bg)',
      }}>
        <div className="spinner" style={{
          width: 34, height: 34, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  );
}
