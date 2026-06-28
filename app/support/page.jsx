'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const FAQS_TR = [
  { q: 'Fiyatlar ne sıklıkla güncelleniyor?', a: 'Mağaza fiyatlarını gün içinde birden çok kez; büyük indirim dönemlerinde ise saatlik olarak kontrol ederiz. Bir fiyat düştüğünde alarmın anında tetiklenir.' },
  { q: 'Steam kütüphanemi bağlamak güvenli mi?', a: 'Evet. Yalnızca herkese açık oyun listeni okuruz — şifreni asla görmeyiz ve hesabında hiçbir değişiklik yapamayız. Bağlantıyı dilediğin an kaldırabilirsin.' },
  { q: 'Fiyat alarmını nasıl kurarım?', a: 'Bir oyunun sayfasındaki “Fiyat Alarmı” butonuna bas, hedef fiyatını gir; oyun o fiyatın altına düştüğünde sana e-posta ve uygulama bildirimi göndeririz.' },
  { q: 'Premium üyelik ne sunuyor?', a: 'Sınırsız fiyat alarmı, geçmiş fiyat grafikleri, ülke karşılaştırması ve reklamsız bir deneyim. Aylık veya yıllık seçeneklerle gelir, dilediğin an iptal edebilirsin.' },
  { q: 'Para iadesi alabilir miyim?', a: 'Premium aboneliğinde ilk 14 gün içinde koşulsuz iade hakkın var. Aşağıdaki formdan “Premium & Ödeme” konusuyla talep oluşturman yeterli.' },
];

const FAQS_EN = [
  { q: 'How often are prices updated?', a: 'We check store prices multiple times throughout the day, and hourly during major sales. Your alert is triggered instantly when a price drops.' },
  { q: 'Is it safe to connect my Steam library?', a: 'Yes. We only read your public games list — we never see your password and cannot make any changes to your account. You can disconnect at any time.' },
  { q: 'How do I set a price alert?', a: 'Click the "Price Alert" button on a game page, enter your target price, and we will send you email and app notifications when the game falls below that price.' },
  { q: 'What does Premium membership offer?', a: 'Unlimited price alerts, historical price charts, cross-country comparison, and an ad-free experience. It comes with monthly or annual options, cancelable at any time.' },
  { q: 'Can I get a refund?', a: 'You have a 14-day unconditional refund policy on your Premium subscription. Just submit a ticket with the topic "Premium & Payment" in the form below.' },
];

const TOPICS_TR = [
  { t: 'Hesap & Üyelik', d: 'Giriş yapma, şifre sıfırlama ve profil ayarları.', icon: <><circle cx="12" cy="8" r="4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></> },
  { t: 'Fiyat & Mağazalar', d: 'Fiyat takibi, mağaza karşılaştırma ve doğruluk.', icon: <><path d="M3 11.5 11.5 3l9.5 9.5-8.5 8.5z" /><circle cx="8" cy="8" r="1.4" /></> },
  { t: 'Kütüphane Senkronu', d: 'Steam ve Xbox kütüphaneni bağlama, çözme.', icon: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></> },
  { t: 'Bildirimler & Alarmlar', d: 'İndirim ve fiyat uyarılarını yönetme.', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
  { t: 'Ödeme & Üyelik', d: 'Premium abonelik, faturalandırma ve iade.', icon: <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></> },
  { t: 'Teknik Sorunlar', d: 'Hata bildir, bilinen çözümleri keşfet.', icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.6" /><path d="M5.2 5.2 9 9M15 15l3.8 3.8M18.8 5.2 15 9M9 15l-3.8 3.8" /></> },
];

const TOPICS_EN = [
  { t: 'Account & Membership', d: 'Login, password reset, and profile settings.', icon: <><circle cx="12" cy="8" r="4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></> },
  { t: 'Price & Stores', d: 'Price tracking, store comparison, and accuracy.', icon: <><path d="M3 11.5 11.5 3l9.5 9.5-8.5 8.5z" /><circle cx="8" cy="8" r="1.4" /></> },
  { t: 'Library Sync', d: 'Connecting and disconnecting Steam and Xbox libraries.', icon: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></> },
  { t: 'Notifications & Alerts', d: 'Managing discount and price alerts.', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></> },
  { t: 'Payment & Membership', d: 'Premium subscription, billing, and refunds.', icon: <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></> },
  { t: 'Technical Issues', d: 'Report bugs, discover known solutions.', icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.6" /><path d="M5.2 5.2 9 9M15 15l3.8 3.8M18.8 5.2 15 9M9 15l-3.8 3.8" /></> },
];

const inputBase = {
  width: '100%', height: 48, padding: '0 15px', border: '1.5px solid var(--border-hover)',
  borderRadius: 11, background: 'var(--bg-body)', fontFamily: 'inherit', fontSize: 15,
  color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s',
};

export default function SupportPage() {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(lang === 'tr' ? 'Genel Soru' : 'General Inquiry');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  const FAQS = lang === 'tr' ? FAQS_TR : FAQS_EN;
  const TOPICS = lang === 'tr' ? TOPICS_TR : TOPICS_EN;
  const subjectOptions = lang === 'tr' ? [
    'Genel Soru', 'Hesap & Üyelik', 'Fiyat & Mağaza', 'Premium & Ödeme', 'Hata Bildirimi', 'İş Birliği'
  ] : [
    'General Inquiry', 'Account & Membership', 'Price & Store', 'Premium & Payment', 'Bug Report', 'Partnership'
  ];

  useEffect(() => {
    setSubject(lang === 'tr' ? 'Genel Soru' : 'General Inquiry');
  }, [lang]);

  const submit = e => {
    e.preventDefault();
    if (name && email && msg) setSent(true);
  };
  
  const reset = () => {
    setSent(false);
    setName('');
    setEmail('');
    setMsg('');
    setSubject(lang === 'tr' ? 'Genel Soru' : 'General Inquiry');
  };

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '62px 0 44px', background: 'var(--hero-bg)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 36px', textAlign: 'center' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14 }}>
            {lang === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(34px,4.4vw,52px)', lineHeight: 1.06, letterSpacing: '-1.4px', color: 'var(--text)', marginBottom: 16, textWrap: 'balance' }}>
            {lang === 'tr' ? 'Size nasıl yardımcı olabiliriz?' : 'How can we help you?'}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto 30px', lineHeight: 1.55 }}>
            {lang === 'tr' 
              ? 'Bir konu seç, sık sorulanlara göz at ya da doğrudan bize yaz. Genelde 24 saat içinde dönüyoruz.' 
              : 'Select a topic, browse FAQs, or write to us directly. We usually respond within 24 hours.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1.5px solid var(--border-hover)', borderRadius: 14, height: 58, padding: '0 18px', maxWidth: 540, margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input 
              placeholder={lang === 'tr' ? 'Bir soru veya konu ara… (ör. fiyat alarmı)' : 'Search a question or topic... (e.g., price alert)'} 
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15.5, color: 'var(--text)' }} 
            />
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '46px 36px 0' }}>

        {/* ── Konu kartları ── */}
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 18 }}>
          {lang === 'tr' ? 'Konuya göz at' : 'Browse by topic'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(312px,1fr))', gap: 18, marginBottom: 48 }}>
          {TOPICS.map(t => (
            <div key={t.t} className="card" style={{ padding: 22, cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(74,52,28,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ display: 'flex', width: 46, height: 46, borderRadius: 12, background: 'var(--accent-bg)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t.t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{t.d}</p>
            </div>
          ))}
        </div>

        {/* ── İletişim kanalları ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18, marginBottom: 52 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20 }}>
            <span style={{ display: 'flex', width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--accent-bg)', alignItems: 'center', justifyContent: 'center' }}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>{lang === 'tr' ? 'E-posta' : 'Email'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>destek@gamepick.com</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{lang === 'tr' ? '~24 saat içinde yanıt' : '~24 hours response time'}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20 }}>
            <span style={{ display: 'flex', width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--accent-bg)', alignItems: 'center', justifyContent: 'center' }}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-9A8.4 8.4 0 1 1 21 11.5z" /></svg></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                {lang === 'tr' ? 'Canlı Destek' : 'Live Support'}{' '}
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px rgba(47,158,107,0.2)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{lang === 'tr' ? 'Şu an çevrimiçi' : 'Online now'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{lang === 'tr' ? 'Hafta içi 09:00 – 18:00' : 'Weekdays 09:00 – 18:00'}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20 }}>
            <span style={{ display: 'flex', width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--accent-bg)', alignItems: 'center', justifyContent: 'center' }}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8a5 5 0 0 0-10 0v3l-2 4h14l-2-4z" /><circle cx="9" cy="9" r="1" /><circle cx="15" cy="9" r="1" /></svg></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>{lang === 'tr' ? 'Topluluk' : 'Community'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{lang === 'tr' ? 'Discord sunucusu' : 'Discord server'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{lang === 'tr' ? 'Binlerce oyuncuyla anında' : 'Instantly with thousands of players'}</div>
            </div>
          </div>
        </div>

        {/* ── Form + SSS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 34, alignItems: 'start' }}>

          <div className="card" style={{ borderRadius: 20, padding: 30, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 5 }}>
              {lang === 'tr' ? 'Bize yazın' : 'Write to us'}
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-2)', marginBottom: 24 }}>
              {lang === 'tr' ? 'Formu doldur, ekibimiz en kısa sürede dönsün.' : 'Fill in the form, and our team will get back to you shortly.'}
            </p>

            {sent && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 13, padding: '16px 18px', marginBottom: 22 }}>
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>✓</span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>
                    {lang === 'tr' ? 'Mesajın bize ulaştı!' : 'Message received!'}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {lang === 'tr' ? 'En kısa sürede e-posta ile döneceğiz.' : 'We will respond via email as soon as possible.'}{' '}
                    <span onClick={reset} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      {lang === 'tr' ? 'Yeni mesaj gönder' : 'Send another message'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7 }}>
                    {lang === 'tr' ? 'Ad Soyad' : 'Full Name'}
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'tr' ? 'Adınız' : 'Your name'} style={inputBase}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7 }}>
                    {lang === 'tr' ? 'E-posta' : 'Email'}
                  </label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={lang === 'tr' ? 'ornek@posta.com' : 'example@mail.com'} style={inputBase}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7 }}>
                  {lang === 'tr' ? 'Konu' : 'Subject'}
                </label>
                <div style={{ position: 'relative' }}>
                  <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputBase, padding: '0 40px 0 15px', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'}>
                    {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', fontSize: 12 }}>▼</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7 }}>
                  {lang === 'tr' ? 'Mesajınız' : 'Your Message'}
                </label>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={lang === 'tr' ? 'Sorununu veya sorunu olabildiğince ayrıntılı anlat…' : 'Describe your problem or question in detail...'} style={{ ...inputBase, height: 'auto', minHeight: 130, padding: '13px 15px', lineHeight: 1.5, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-hover)'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="submit" className="btn btn-red" style={{ height: 50 }}>
                  {lang === 'tr' ? 'Mesajı Gönder →' : 'Send Message →'}
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  {lang === 'tr' ? 'Yanıt süresi ~24 saat' : 'Response time ~24 hours'}
                </span>
              </div>
            </form>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 18 }}>
              {lang === 'tr' ? 'Sık sorulan sorular' : 'Frequently asked questions'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {FAQS.map((f, i) => {
                const open = faqOpen === i;
                return (
                  <div key={i} className="card" style={{ borderRadius: 14, overflow: 'hidden' }}>
                    <div onClick={() => setFaqOpen(open ? -1 : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 18px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{f.q}</span>
                      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{open ? '–' : '+'}</span>
                    </div>
                    {open && <div style={{ padding: '0 18px 17px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
