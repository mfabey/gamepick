'use client';

import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';

export default function PrivacyPage() {
  const { lang } = useLanguage();

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '120px 24px 80px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 32px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span>←</span> {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
          </Link>
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
              Gizliliğiniz bizim için son derece önemlidir. GamePick olarak, sitemizi ziyaret ederken veya hizmetlerimizi kullanırken kişisel verilerinizin nasıl toplandığı, saklandığı ve kullanıldığına dair sizi bilgilendirmek isteriz.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Toplanan Veriler ve Saklama Yöntemi</h2>
              <p>
                GamePick, sunucularında (veritabanında) herhangi bir kişisel bilgi, e-posta veya şifre verisi **saklamamaktadır**.
              </p>
              <p style={{ marginTop: 8 }}>
                Kayıt oluşturduğunuzda veya giriş yaptığınızda kullandığınız hesap bilgileri (ad, e-posta, şifre) tamamen tarayıcınızın yerel depolama alanında (<code>localStorage</code>) saklanır. Bu veriler sadece tarayıcınız tarafından kontrol edilir. Tarayıcınızın geçmişini veya önbelleğini temizlediğinizde ya da "Çıkış Yap" butonunu kullandığınızda bu veriler cihazınızdan tamamen silinir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Üçüncü Taraf Hesap Bağlantıları (Steam & Xbox)</h2>
              <p>
                Kütüphanenizi bağladığınızda (Steam & Xbox Live entegrasyonu), ilgili resmi API'ler aracılığıyla yalnızca herkese açık olan oyun listeleriniz ve hesap isimleriniz sorgulanır.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Hesap şifrelerinize veya ödeme bilgilerinize hiçbir şekilde erişilmez ve görülmez.</li>
                <li>Giriş işlemleri Steam OpenID veya Microsoft OAuth gibi tamamen resmi ve güvenli sistemler üzerinden gerçekleşir.</li>
                <li>Bağlantıyı kaldırdığınızda, oturum bilgileri tarayıcınızdan ve ilgili API oturumlarından derhal silinir.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Çerezler (Cookies) ve Yerel Tercihler</h2>
              <p>
                Sitemiz, kullanıcı deneyimini iyileştirmek amacıyla yerel tercihleri saklamak için çerezleri ve tarayıcı depolama alanını kullanır. Bu tercihler şunlardır:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Seçtiğiniz dil tercihi (TR veya EN),</li>
                <li>Tema tercihiniz (Koyu veya Açık mod),</li>
                <li>Oturum durumu bilgisi.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Bu veriler hiçbir reklam veya pazarlama amacıyla kullanılmaz ve üçüncü şahıslarla paylaşılmaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Veri Güvenliği Sorumluluğu</h2>
              <p>
                Hesap bilgileriniz sunucu yerine tarayıcınızın yerel depolama alanında saklandığından, cihazınızın ve tarayıcınızın fiziksel/dijital güvenliği tamamen sizin sorumluluğunuzdadır. Tarayıcı eklentileri, virüsler veya cihazınıza erişimi olan üçüncü şahıslardan kaynaklanabilecek veri ihlallerinde GamePick sorumlu tutulamaz. Güvenliğiniz için tanımadığınız cihazlarda hesabınıza giriş yapmamanız tavsiye edilir.
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
              Your privacy is extremely important to us. This Privacy Policy describes how GamePick processes, stores, and handles your data when you visit or use our services.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Collected Data and Storage Method</h2>
              <p>
                GamePick **does not store** any personal credentials, emails, or password data on its servers.
              </p>
              <p style={{ marginTop: 8 }}>
                The credentials you use when registering or logging in (name, email, password) are stored locally in your browser's local storage (<code>localStorage</code>). This data is controlled entirely by your browser. Clearing your browser cache or clicking "Logout" completely deletes this data from your device.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Third-Party Connections (Steam & Xbox)</h2>
              <p>
                When you connect your library (Steam & Xbox Live integration), we query only your public game lists and account names through official APIs.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>We do not access, view, or modify your account passwords or payment details.</li>
                <li>Authentication is handled entirely via secure official portals like Steam OpenID or Microsoft OAuth.</li>
                <li>Unlinking your account deletes the connection data from your browser cache instantly.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Cookies and Local Preferences</h2>
              <p>
                We use cookies and browser local storage to save your preferences and optimize your experience. This includes:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Language selection (TR or EN),</li>
                <li>Theme selection (Dark or Light mode),</li>
                <li>Authentication session states.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                This data is not used for advertising or marketing, and it is never shared with third parties.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Data Security Disclaimer</h2>
              <p>
                Since your account data is stored locally in your browser, the physical and digital security of your device is entirely your responsibility. GamePick is not liable for data breaches arising from browser extensions, device malware, or unauthorized physical access. We recommend avoiding logging in on public or untrusted devices.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Contact and Support</h2>
              <p>
                If you have any questions or feedback regarding this Privacy Policy or how your local data is handled, feel free to contact us via the form on our Support page.
              </p>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
