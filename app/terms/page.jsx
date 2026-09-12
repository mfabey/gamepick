'use client';

import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
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
            {lang === 'tr' ? 'Kullanıcı Sözleşmesi' : 'Terms of Service'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            {lang === 'tr' ? 'Son Güncelleme: 7 Eylül 2026' : 'Last Updated: September 7, 2026'}
          </p>
        </div>

        {/* Content */}
        {lang === 'tr' ? (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Gamerisen platformuna hoş geldiniz. Bu sözleşme, sitemizi ziyaret eden ve hizmetlerimizi kullanan tüm bireyler için geçerlidir. Sitemizi kullanarak bu sayfadaki koşulları peşinen kabul etmiş sayılırsınız.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Hizmetin Tanımı ve Kapsamı</h2>
              <p>
                Gamerisen, farklı dijital oyun mağazalarından (Steam, Epic Games Store, GOG, Humble Bundle, Xbox Store vb.) veri sağlayıcılar aracılığıyla anlık oyun fiyatlarını derleyen ve kullanıcıya karşılaştırma hizmeti sunan bağımsız bir platformdur. Gamerisen kendisi bir oyun mağazası değildir ve doğrudan satış yapmaz. Platform ayrıca kullanıcıların profil oluşturmasına, arkadaş eklemesine, birbirine mesaj göndermesine ve oyun incelemesi, gönderi, liste paylaşmasına imkân tanır.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Fiyat ve Stok Sorumluluğu Reddi</h2>
              <p>
                Sitemizde yer alan tüm fiyatlar, indirim oranları, kampanya bilgileri ve stok durumları üçüncü taraf API'ler (RAWG, IsThereAnyDeal, Steam vb.) aracılığıyla otomatik olarak çekilmektedir. Fiyatların anlık güncelliği veya doğruluğu konusunda hiçbir garanti verilmez. Satın alım esnasında yönlendirildiğiniz mağazadaki nihai fiyat geçerlidir. Gamerisen, mağaza fiyatlarındaki hatalardan veya yanlış yönlendirmelerden yasal olarak sorumlu tutulamaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Üye Hesapları ve Şifre Güvenliği</h2>
              <p>
                Platformumuzda oluşturduğunuz hesap verileri (ad, e-posta ve şifre), endüstri standardı güvenlik standartlarına uygun olarak Google Firebase altyapısı üzerinde güvenle şifrelenerek saklanmaktadır. Şifreleriniz kesinlikle düz metin (plain text) olarak saklanmaz. Üyeler, hesaplarının giriş bilgilerini gizli tutmakla ve şifrelerinin güvenliğini sağlamakla bizzat yükümlüdür. Yetkisiz girişleri önlemek amacıyla güçlü şifreler belirlenmesi ve ortak cihazlarda oturumların kapatılması önerilir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Kullanıcı İçeriği ve Topluluk Kuralları</h2>
              <p>
                Gamerisen; inceleme, gönderi, liste, kullanıcı adı, profil fotoğrafı ve birebir mesaj gibi kullanıcı tarafından üretilen içerik barındırır. Paylaştığınız içerikten siz sorumlusunuz.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Uygunsuz içeriğe ve taciz edici davranışa sıfır tolerans gösterilir.</strong> Aşağıdakiler kesinlikle yasaktır:
              </p>
              <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Taciz, zorbalık, tehdit ve nefret söylemi; ırk, etnik köken, din, cinsiyet, cinsel yönelim veya engellilik temelli aşağılama</li>
                <li>Cinsel içerik, çıplaklık ve çocukların istismarına ilişkin her tür materyal</li>
                <li>Şiddete çağrı, kendine zarar vermeye veya intihara teşvik</li>
                <li>Yasa dışı faaliyet, dolandırıcılık, spam, kimlik avı ve zararlı yazılım bağlantıları</li>
                <li>Başkasının kimliğine bürünme ve izinsiz kişisel bilgi paylaşımı</li>
                <li>Telif hakkı veya marka ihlali</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>Yaptırım.</strong> İhlal tespit edildiğinde içerik önceden uyarı yapılmaksızın kaldırılır. İhlalin ağırlığına göre özelliklere erişim kısıtlanabilir, hesap askıya alınabilir veya kalıcı olarak kapatılabilir.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Raporlama ve engelleme.</strong> Her kullanıcının, gönderinin, incelemenin, listenin ve mesajın yanında raporlama seçeneği bulunur. Raporlar en geç <strong>24 saat içinde</strong> incelenir. Ayrıca dilediğiniz kullanıcıyı engelleyebilirsiniz; engelleme çift yönlüdür — engellenen kullanıcı size mesaj gönderemez ve içerikleriniz karşılıklı olarak birbirinize görünmez.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Otomatik denetim.</strong> Yüklenen görseller yayınlanmadan önce otomatik denetimden geçer, metinler yasaklı ifade süzgecinden geçirilir. Bu denetimler yardımcı araçlardır ve kullanıcının sorumluluğunu ortadan kaldırmaz.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>İçeriğiniz üzerindeki haklar.</strong> Paylaştığınız içeriğin sahibi sizsiniz. Gamerisen'e yalnızca içeriği platformda gösterebilmesi için sınırlı ve telifsiz bir kullanım izni vermiş olursunuz. Hesabınızı sildiğinizde içeriğiniz de kaldırılır.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Bize ulaşın.</strong> Kural ihlali bildirimleri ve yaptırım itirazları için: <a href="mailto:support@gamerisen.com" style={{ color: 'var(--accent)' }}>support@gamerisen.com</a>
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Harici Bağlantılar ve Yönlendirmeler</h2>
              <p>
                Sitemiz, harici oyun mağazalarına ve üçüncü taraf web sitelerine yönlendirme linkleri içermektedir. Bu harici sitelerin içerikleri, güvenlik politikaları veya yapacağınız alışveriş işlemlerinin güvenliğinden hiçbir şekilde sorumluluğumuz bulunmamaktadır. Alışveriş yaptığınız mağazanın kendi kullanıcı sözleşmesini okumanız tavsiye edilir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Telif Hakları ve Marka Bildirimi</h2>
              <p>
                Sitede gösterilen oyun isimleri, kapak görselleri, markalar ve logolar ilgili yayıncı ve geliştirici şirketlerin mülkiyetindedir. Gamerisen, Valve Corporation (Steam), Microsoft (Xbox), Epic Games veya GOG ile hiçbir resmi veya ticari ortaklığa sahip değildir. Tüm ticari markalar hak sahiplerine aittir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>7. Sorumluluğun Sınırlandırılması</h2>
              <p>
                Gamerisen platformu "olduğu gibi" sunulmaktadır. Sitenin kesintisiz çalışması, veri kayıplarının yaşanmaması veya fiyat alarmlarının gecikmesiz iletilmesi konusunda yasal bir taahhüt verilmemektedir. Sitedeki hizmetlerin kullanımından doğabilecek hiçbir doğrudan veya dolaylı maddi/manevi zarardan platform sahipleri sorumlu tutulamaz.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Welcome to Gamerisen. These Terms of Service govern your access to and use of our platform. By accessing or using our services, you agree to be bound by these terms.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Description of Service</h2>
              <p>
                Gamerisen is an independent platform that aggregates live game prices from various digital stores (Steam, Epic Games Store, GOG, Humble Bundle, Xbox Store, etc.) via data APIs, providing price comparison services to users. Gamerisen is not a store and does not sell games directly. The platform also lets users create a profile, add friends, message one another, and share game reviews, posts and lists.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Price and Information Disclaimer</h2>
              <p>
                All prices, discount rates, promotions, and availability shown on our site are fetched automatically via third-party APIs (RAWG, IsThereAnyDeal, Steam, etc.). We do not guarantee the instantaneous accuracy of store prices. The final price displayed on the store at the time of purchase is always binding. Gamerisen is not legally liable for store pricing errors or incorrect redirects.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. User Accounts and Password Security</h2>
              <p>
                Your account credentials (name, email, and passwords) are securely handled and cryptographically hashed using industry-standard Google Firebase authentication services. Passwords are never stored in plain text. Users are entirely responsible for keeping their login credentials confidential and securing their account. We strongly advise using strong passwords and logging out of public or shared devices.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. User-Generated Content and Community Rules</h2>
              <p>
                Gamerisen hosts user-generated content, including reviews, posts, lists, usernames, profile photos and one-to-one messages. You are responsible for the content you share.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>We have zero tolerance for objectionable content and abusive behaviour.</strong> The following are strictly prohibited:
              </p>
              <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Harassment, bullying, threats and hate speech; demeaning content based on race, ethnicity, religion, gender, sexual orientation or disability</li>
                <li>Sexual content, nudity, and any material depicting the exploitation of minors</li>
                <li>Incitement to violence, self-harm or suicide</li>
                <li>Illegal activity, fraud, spam, phishing and links to malicious software</li>
                <li>Impersonation of another person and sharing someone's personal information without consent</li>
                <li>Copyright or trademark infringement</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                <strong>Enforcement.</strong> Content found to be in violation is removed without prior notice. Depending on the severity, access to features may be restricted and the account may be suspended or permanently terminated.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Reporting and blocking.</strong> A report option is available next to every user, post, review, list and message. Reports are reviewed within <strong>24 hours</strong>. You can also block any user; blocking is mutual — a blocked user cannot message you, and your content is hidden from each other in both directions.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Automated moderation.</strong> Uploaded images pass through automated moderation before they are published, and text is checked against a prohibited-terms filter. These tools are an aid and do not remove the user's own responsibility.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Your rights in your content.</strong> You own the content you share. You grant Gamerisen only a limited, royalty-free licence to display that content on the platform. When you delete your account, your content is removed with it.
              </p>
              <p style={{ marginTop: 12 }}>
                <strong>Contact us.</strong> To report a violation or appeal an enforcement decision: <a href="mailto:support@gamerisen.com" style={{ color: 'var(--accent)' }}>support@gamerisen.com</a>
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. External Links and Purchases</h2>
              <p>
                Our site contains redirection links to external digital stores. We have no control over, and assume no responsibility for, the content, privacy policies, or transaction security of any third-party sites. We strongly advise you to read the terms and privacy policy of the store where you make purchases.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Copyrights and Trademarks</h2>
              <p>
                All game titles, images, brands, and logos displayed on this site belong to their respective owners. Gamerisen is not affiliated with Valve Corporation (Steam), Microsoft (Xbox), Epic Games, or GOG in any official or commercial way. All trademarks belong to their respective owners.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>7. Limitation of Liability</h2>
              <p>
                Gamerisen is provided on an "as is" and "as available" basis. We make no warranty that the service will be uninterrupted or error-free. The platform owners shall not be held liable for any direct or indirect damages arising out of your use of our platform.
              </p>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
