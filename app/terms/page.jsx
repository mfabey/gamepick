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
            {lang === 'tr' ? 'Son Güncelleme: 21 Haziran 2026' : 'Last Updated: June 21, 2026'}
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
                Gamerisen, farklı dijital oyun mağazalarından (Steam, Epic Games Store, GOG, Humble Bundle, Xbox Store vb.) veri sağlayıcılar aracılığıyla anlık oyun fiyatlarını derleyen ve kullanıcıya karşılaştırma hizmeti sunan bağımsız bir platformdur. Gamerisen kendisi bir oyun mağazası değildir ve doğrudan satış yapmaz.
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Harici Bağlantılar ve Yönlendirmeler</h2>
              <p>
                Sitemiz, harici oyun mağazalarına ve üçüncü taraf web sitelerine yönlendirme linkleri içermektedir. Bu harici sitelerin içerikleri, güvenlik politikaları veya yapacağınız alışveriş işlemlerinin güvenliğinden hiçbir şekilde sorumluluğumuz bulunmamaktadır. Alışveriş yaptığınız mağazanın kendi kullanıcı sözleşmesini okumanız tavsiye edilir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Telif Hakları ve Marka Bildirimi</h2>
              <p>
                Sitede gösterilen oyun isimleri, kapak görselleri, markalar ve logolar ilgili yayıncı ve geliştirici şirketlerin mülkiyetindedir. Gamerisen, Valve Corporation (Steam), Microsoft (Xbox), Epic Games veya GOG ile hiçbir resmi veya ticari ortaklığa sahip değildir. Tüm ticari markalar hak sahiplerine aittir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Sorumluluğun Sınırlandırılması</h2>
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
                Gamerisen is an independent platform that aggregates live game prices from various digital stores (Steam, Epic Games Store, GOG, Humble Bundle, Xbox Store, etc.) via data APIs, providing price comparison services to users. Gamerisen is not a store and does not sell games directly.
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
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. External Links and Purchases</h2>
              <p>
                Our site contains redirection links to external digital stores. We have no control over, and assume no responsibility for, the content, privacy policies, or transaction security of any third-party sites. We strongly advise you to read the terms and privacy policy of the store where you make purchases.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Copyrights and Trademarks</h2>
              <p>
                All game titles, images, brands, and logos displayed on this site belong to their respective owners. Gamerisen is not affiliated with Valve Corporation (Steam), Microsoft (Xbox), Epic Games, or GOG in any official or commercial way. All trademarks belong to their respective owners.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Limitation of Liability</h2>
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
