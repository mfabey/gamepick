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
            {lang === 'tr' ? 'Son Güncelleme: 11 Ağustos 2026' : 'Last Updated: August 11, 2026'}
          </p>
        </div>

        {/* Content */}
        {lang === 'tr' ? (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Gizliliğiniz bizim için son derece önemlidir. Gamerisen olarak, web sitemizi veya mobil uygulamamızı ziyaret ederken ya da hizmetlerimizi kullanırken kişisel verilerinizin nasıl toplandığı, saklandığı, işlendiği ve korunduğuna dair sizi en şeffaf şekilde bilgilendirmek isteriz.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Hesap Altyapısı ve Veri Güvenliği (Firebase)</h2>
              <p>
                Gamerisen, üye kayıt, giriş ve kimlik doğrulama işlemlerini gerçekleştirmek amacıyla endüstri standardı güvenlik protokollerine sahip olan **Google Firebase** authentication altyapısını kullanmaktadır.
              </p>
              <p style={{ marginTop: 8 }}>
                Kayıt oluşturduğunuzda veya profilinizi güncellediğinizde kullanılan temel hesap bilgileri (ad, soyad, e-posta adresi, profil fotoğrafı ve kriptografik olarak hash'lenmiş şifreniz), Google Firebase'in şifrelenmiş güvenli bulut sunucularında saklanır. Şifreleriniz kesinlikle düz metin (plain text) olarak veya yerel depolama alanlarımızda saklanmaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Birebir Sohbet ve Güvenli Mesajlaşma (Pusher & BLOB Sunucuları)</h2>
              <p>
                Mobil uygulamamız üzerinden arkadaşlarınızla anlık olarak yazışabilir, görsel/video paylaşabilir veya oyun kartları gönderebilirsiniz. Bu özellik kapsamında uygulanan gizlilik ve veri güvenlik önlemleri şunlardır:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Yalnızca Arkadaşlar Arası İletişim:</strong> Güvenliğiniz ve spam mesajların engellenmesi amacıyla, anlık mesajlaşma (Direct Messaging) özelliği yalnızca karşılıklı arkadaş olan (mutual friends) kullanıcılar arasında gerçekleştirilebilir. Bir kullanıcıyı engellediğinizde veya arkadaşlıktan çıkardığınızda iletişim anında kesilir.</li>
                <li><strong>Uçtan Uca Güvenli Veri İletimi:</strong> Mesajlaşma trafiği ve sohbet meta verileri veritabanlarımızda (Upstash Redis) saklanır. Anlık mesajların iletimi tamamen şifreli HTTPS protokolü ve TLS-şifreli Pusher WebSocket kanalları üzerinden güvenle taşınır.</li>
                <li><strong>Medya Dosyaları ve BLOB Depolama:</strong> Sohbet sırasında gönderdiğiniz tüm medya dosyaları (fotoğraflar, video klipler vb.), **Vercel Blob Storage ("BLOB" platform sunucuları)** üzerindeki şifrelenmiş/güvenli adreslerde barındırılır. Bu dosyalar, sızdırılmayı ve yetkisiz üçüncü şahısların erişimini engellemek amacıyla sadece gönderen kullanıcının benzersiz kimliğiyle ilişkili izole klasör yapısında (<code>/dm/&#123;uid&#125;/</code>) saklanır ve doğrudan erişime kapalıdır.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Konum İzinleri ve Şehir Etiketleri</h2>
              <p>
                Mobil uygulamamızda oyun kartları oluştururken veya kartları paylaşmadan önce, kartın üzerine şehir etiketi ekleyebilmeniz amacıyla tek seferlik konum izni (foreground location permission) istenir.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Cihaz İçi Çözümleme (Client-Side Geocoding):</strong> GPS koordinatlarınız (enlem ve boylam) **kesinlikle sunucularımıza veya üçüncü şahıslara gönderilmez**. Konumun çözümlenerek şehir adına çevrilmesi işlemi tamamen kullanıcının kendi cihazı üzerinde (lokal olarak) yapılır.</li>
                <li><strong>Veri Minimizasyonu:</strong> Sunucularımızda ve veritabanlarımızda sokak, mahalle gibi açık adres bilgileri veya GPS koordinatları hiçbir şekilde iletilmez ve saklanmaz. Sadece cihazınız tarafından çözümlenen genel şehir/bölge ismi karta etiket olarak eklenir.</li>
                <li><strong>Arka Plan Takibi Yoktur:</strong> Konum servisleri yalnızca siz kart paylaşmak istediğinizde, sizin açık onayınızla ve tek seferlik çağrılır. Arka planda konum takibi veya konum geçmişi kaydı kesinlikle yapılmaz.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Bildirimler ve Push Token Yönetimi</h2>
              <p>
                Mobil cihazlarda yeni mesajları, arkadaşlık isteklerini veya istek listenizdeki oyunlara ait fiyat alarmlarını anında iletebilmek amacıyla **Expo Push Notification** servisi kullanılır.
              </p>
              <p style={{ marginTop: 8 }}>
                Cihazınıza özel üretilen geçici Push Token değeri, yalnızca size bildirim ulaştırmak amacıyla güvenli bir şekilde sunucularımızda saklanır. Hesabınızdan çıkış yaptığınızda (Logout) veya hesabınızı sildiğinizde bu token değeri veritabanlarımızdan tamamen temizlenir, böylece cihazı devretmeniz durumunda bildirim sızıntısı engellenir.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Üçüncü Taraf Hesap Bağlantıları (Steam & Xbox)</h2>
              <p>
                Kütüphanenizi entegre ettiğinizde (Steam & Xbox Live resmi API entegrasyonu), yalnızca herkese açık olan oyun listeleriniz, başarılarınız ve hesap adlarınız sorgulanır.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Hesap şifrelerinize veya ödeme yöntemlerinize hiçbir şekilde erişilmez, bu veriler sunucularımızda görülmez ve tutulmaz.</li>
                <li>Bağlantı verileriniz (profil bilgileri ve senkronizasyon belirteçleri) Firebase hesap kimliğinizle eşleşecek şekilde güvenli **Upstash Redis** veritabanında saklanır.</li>
                <li>Profil ayarlarınızdan entegrasyon bağlantısını kaldırdığınızda, tüm senkronize edilen veriler veritabanımızdan anında ve kalıcı olarak silinir.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Yerel Tercihler ve İstek Listesi</h2>
              <p>
                Uygulama ve sitemiz, kullanıcı deneyimini optimize etmek amacıyla cihaz içi depolama alanını (<code>localStorage</code> / <code>AsyncStorage</code>) kullanır. Bu tercihler şunlardır:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Seçtiğiniz dil tercihi (TR veya EN),</li>
                <li>Tema tercihiniz (Koyu veya Açık mod),</li>
                <li>Oyun istek listeniz (wishlist verileri).</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Bu veriler hiçbir reklam veya pazarlama amacıyla kullanılmaz ve üçüncü şahıslarla paylaşılmaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>7. Sosyal Gizlilik Ayarları ve Kullanıcı Denetimi</h2>
              <p>
                Kullanıcılarımız kendi verilerinin paylaşımını profil ayarları bölümünden doğrudan denetleyebilirler:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>shareActivity (Aktivite Paylaşımı):</strong> Kapatıldığında, oyun oynama veya istek listesi güncellemeleriniz gibi aktiviteleriniz veritabanına hiçbir şekilde yazılmaz ve arkadaşlarınızla paylaşılmaz.</li>
                <li><strong>discoverable (Keşfedilebilirlik):</strong> Kapatıldığında, diğer kullanıcılar sizi kullanıcı adınızla aratarak bulamazlar.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>8. Hesap Silme ve Veri İmha Hakkı (Account Deletion)</h2>
              <p>
                Kullanıcılarımız hem web sitemizdeki ayarlar sekmesinden hem de mobil uygulamamızın profil ekranından hesaplarını diledikleri an kalıcı olarak silebilirler.
              </p>
              <p style={{ marginTop: 8 }}>
                Hesap silme işlemi onaylandığında; kullanıcı profil bilgileriniz, e-posta adresiniz, Steam/Xbox entegrasyon verileriniz, arkadaşlık ilişkileriniz ve tüm mesajlaşma geçmişiniz sistemlerimizden ve veritabanlarımızdan **kalıcı olarak ve derhal imha edilir**. Bu işlem geri alınamaz.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>9. İletişim ve Destek</h2>
              <p>
                Gizlilik politikamız veya platformdaki verilerinizle ilgili her türlü soru, hak talebi ve yasal bildirimleri destek sayfamızda yer alan iletişim formu üzerinden bize iletebilirsiniz.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 15, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p>
              Your privacy is extremely important to us. This Privacy Policy describes how Gamerisen collects, processes, stores, and protects your personal data when you visit or use our services across both the Gamerisen Web platform and the Mobile application.
            </p>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>1. Account Infrastructure & Data Security (Firebase)</h2>
              <p>
                Gamerisen uses **Google Firebase** authentication services, featuring industry-standard security protocols, to handle user registration, logins, and password security.
              </p>
              <p style={{ marginTop: 8 }}>
                The basic account details you provide (first name, last name, email address, profile picture, and cryptographically hashed passwords) are securely stored on Google Firebase cloud servers. Your passwords are never stored in plain text or in your device's local storage.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>2. Friends Chat & Secure Messaging (Pusher & BLOB Servers)</h2>
              <p>
                Through our mobile application, you can chat with your friends in real-time, share images/videos, or send game cards. The privacy and data security measures applied under this feature are as follows:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Communication Limited to Mutual Friends:</strong> For your security and to prevent spam, direct messaging (DM) is restricted strictly to mutual friends. When you block or unfriend a user, all communication is immediately cut off.</li>
                <li><strong>Secure Transmission:</strong> Messaging content and chat metadata are stored in our databases (Upstash Redis). Real-time message delivery is securely carried out over encrypted HTTPS protocols and TLS-encrypted Pusher WebSocket connections.</li>
                <li><strong>Media Files & BLOB Storage:</strong> All media files shared in chats (photos, video clips, etc.) are hosted on encrypted, secure links on **Vercel Blob Storage ("BLOB" platform servers)**. To prevent leaks and unauthorized access, these files are stored in isolated directories associated with the sender's unique user ID (<code>/dm/&#123;uid&#125;/</code>) and are closed to direct public access.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>3. Location Permissions & City Labels</h2>
              <p>
                In our mobile application, optional one-time foreground location permission (Expo Location) is requested to allow you to add city labels onto your game cards before sharing them.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Client-Side Geocoding:</strong> Your exact GPS coordinates (latitude and longitude) **never leave your device**. The reverse geocoding process (converting coordinates to a city name) is performed entirely client-side (locally on your device).</li>
                <li><strong>Data Minimization:</strong> No GPS coordinates, street-level addresses, or location histories are sent to or stored on our servers or databases. Only the general city name resolved by your device is added as a label to the card.</li>
                <li><strong>No Background Tracking:</strong> Location services are only invoked once when you explicitly request to share a card with your approval. Background tracking or continuous location logs are strictly never performed.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>4. Notifications & Push Token Management</h2>
              <p>
                To deliver real-time chat messages, friend requests, and game price alerts on mobile devices, we use the **Expo Push Notification** service.
              </p>
              <p style={{ marginTop: 8 }}>
                The temporary Push Token unique to your device is securely stored on our servers solely for delivering notifications. When you log out of your account or delete it, this token is completely cleared from our databases, preventing notification leaks if you transfer the device.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>5. Third-Party Integrations (Steam & Xbox Live)</h2>
              <p>
                When you connect your library (Steam & Xbox Live integration), we query only your public game lists, achievements, and account names through official secure APIs.
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>We do not access, view, or store your account passwords or payment details.</li>
                <li>Your connection metadata and sync tokens are stored securely in our **Upstash Redis** database, mapped to your unique user ID.</li>
                <li>Unlinking your account from your settings page deletes all sync metadata from our database instantly and permanently.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>6. Cookies and Local Preferences</h2>
              <p>
                We use browser and device local storage (<code>localStorage</code> / <code>AsyncStorage</code>) to save local preferences and optimize your experience. This includes:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Language selection (TR or EN),</li>
                <li>Theme selection (Dark or Light mode),</li>
                <li>Your game wishlist.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Wishlist and preference data stored in your local storage is not used for profiling or marketing, and it is never shared with third parties.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>7. Social Privacy & User Control</h2>
              <p>
                Users can manage their sharing options directly from the profile settings section:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>shareActivity:</strong> If turned off, your gaming activities or wishlist updates will not be logged to the database or shared with your friends.</li>
                <li><strong>discoverable:</strong> If turned off, other users will not be able to find your profile via username searches.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>8. Account Deletion & Data Eradication</h2>
              <p>
                Users can permanently delete their accounts at any time through either the settings tab on our website or the profile screen in our mobile application.
              </p>
              <p style={{ marginTop: 8 }}>
                Once account deletion is confirmed, all user profile details, email addresses, Steam/Xbox sync metadata, friendship lists, and chat histories are **immediately and permanently erased** from all our systems and databases. This action is irreversible.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>9. Contact and Support</h2>
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
