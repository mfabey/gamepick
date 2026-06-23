'use client';

import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '120px 24px 80px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 32px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span>←</span> {lang === 'tr' ? 'Geri Dön' : 'Go Back'}
          </button>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            {lang === 'tr' ? 'Son Güncelleme: 21 Haziran 2026' : 'Last Updated: June 21, 2026'}
          </p>
        </div>

        {/* Content */}
        {lang === 'tr' ? (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Gizliliğiniz bizim için son derece önemlidir. Gamerisen olarak, sitemizi ziyaret ederken veya hizmetlerimizi kullanırken kişisel verilerinizin nasıl toplandığı, saklandığı ve kullanıldığına dair sizi bilgilendirmek isteriz.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Toplanan Veriler ve Güvenli Sunucu Altyapısı (Firebase)</h2>
              <p>
                Gamerisen, üye kayıt ve giriş işlemlerini gerçekleştirmek amacıyla endüstri standardı güvenlik protokollerine sahip olan **Google Firebase** kimlik doğrulama hizmetini kullanmaktadır.
              </p>
              <p style={{ marginTop: 8 }}>
                Kayıt oluşturduğunuzda veya profilinizi güncellediğinizde kullanılan hesap bilgileri (ad, e-posta adresi, kriptografik olarak hash'lenmiş şifreniz), Google Firebase'in şifrelenmiş güvenli bulut sunucularında saklanır. Şifreleriniz kesinlikle düz metin (plain text) olarak veya yerel depolama alanımızda saklanmaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Üçüncü Taraf Hesap Bağlantıları (Steam & Xbox)</h2>
              <p>
                Kütüphanenizi bağladığınızda (Steam & Xbox Live entegrasyonu), ilgili resmi API'ler aracılığıyla yalnızca herkese açık olan oyun listeleriniz, başarılarınız ve hesap isimleriniz sorgulanır.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Hesap şifrelerinize veya ödeme bilgilerinize hiçbir şekilde erişilmez ve bu veriler görülmez.</li>
                <li>Bağlantı verileriniz (profil bilgileri ve senkronizasyon belirteçleri) Firebase hesap kimliğinizle eşleşecek şekilde güvenli **Upstash Redis** veritabanında saklanır.</li>
                <li>Giriş işlemleri Steam OpenID veya Microsoft OAuth gibi tamamen resmi ve güvenli sistemler üzerinden gerçekleşir.</li>
                <li>Bağlantıyı profil ayarlarından kaldırdığınızda, senkronizasyon verileri veritabanımızdan derhal silinir.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Yerel Tercihler ve İstek Listesi</h2>
              <p>
                Sitemiz, kullanıcı deneyimini iyileştirmek amacıyla yerel tercihleri saklamak için tarayıcı depolama alanını (<code>localStorage</code>) kullanır. Bu tercihler şunlardır:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Seçtiğiniz dil tercihi (TR veya EN),</li>
                <li>Tema tercihiniz (Koyu veya Açık mod),</li>
                <li>Oyun istek listeniz (wishlist verileri).</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Yerel depolamada saklanan istek listeniz ve tercihleriniz hiçbir reklam veya pazarlama amacıyla kullanılmaz ve üçüncü şahıslarla paylaşılmaz. Tarayıcı önbelleğinizi temizlediğinizde veya oturumu kapattığınızda bu yerel ayarlar sıfırlanabilir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Veri Güvenliği ve Kullanıcı Sorumluluğu</h2>
              <p>
                Hesap güvenliğiniz için şifrenizin gizliliğini korumak ve güvenli şifreler belirlemek tamamen kullanıcının sorumluluğundadır. Güvenliğiniz için ortak veya güvenilmeyen cihazlarda oturumunuzu açık bırakmamanız, işiniz bittiğinde "Çıkış Yap" butonunu kullanmanız tavsiye edilir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. İletişim ve Destek</h2>
              <p>
                Gizlilik politikamız veya platformdaki verilerinizle ilgili her türlü soru ve geri bildirimi destek sayfamızda yer alan iletişim formu üzerinden bize iletebilirsiniz.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Your privacy is extremely important to us. This Privacy Policy describes how Gamerisen processes, stores, and handles your data when you visit or use our services.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Collected Data and Secure Infrastructure (Firebase)</h2>
              <p>
                Gamerisen uses **Google Firebase** authentication services, featuring industry-standard security protocols, to handle user registration, logins, and password security.
              </p>
              <p style={{ marginTop: 8 }}>
                The account details you provide (name, email, and cryptographically hashed passwords) are securely stored on Google Firebase cloud servers. Your passwords are never stored in plain text or in your browser's local storage.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Third-Party Connections (Steam & Xbox)</h2>
              <p>
                When you connect your library (Steam & Xbox Live integration), we query only your public game lists, achievements, and account names through official APIs.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>We do not access, view, or modify your account passwords or payment details.</li>
                <li>Your connection metadata and sync tokens are stored securely in our **Upstash Redis** database, mapped to your unique user ID.</li>
                <li>Authentication is handled entirely via secure official portals like Steam OpenID or Microsoft OAuth.</li>
                <li>Unlinking your account from your settings page deletes all sync metadata from our database instantly.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Cookies and Local Preferences</h2>
              <p>
                We use browser local storage (<code>localStorage</code>) to save your local preferences and optimize your experience. This includes:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Language selection (TR or EN),</li>
                <li>Theme selection (Dark or Light mode),</li>
                <li>Your game wishlist.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Wishlist and preference data stored in your local storage is not used for advertising or marketing, and it is never shared with third parties.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Data Security and User Responsibility</h2>
              <p>
                It is the user's sole responsibility to select a strong password and keep their account credentials confidential. To secure your account, we recommend avoiding leaving your account logged in on public or untrusted devices and clicking "Logout" when you finish your session.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Contact and Support</h2>
              <p>
                If you have any questions or feedback regarding this Privacy Policy or how your data is handled, feel free to contact us via the form on our Support page.
              </p>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
