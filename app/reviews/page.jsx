'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Topluluk — inceleme ve tartışma akışı (WEB).
//
// Mobildeki `(tabs)/reviews.jsx` ekranının web karşılığı. İki uç da AYNI:
// `/api/social/posts` ve `/api/social/reviews/feed`. Sunucuda tek satır
// değişmedi.
//
// GÖNDERİ VE İNCELEME BİRLİKTE — mobildeki kararın aynısı ve aynı gerekçeyle:
// kullanıcı sayısı azken tek başına gönderi akışı boş kalıyor, boş akış
// "burası ölü" diyor. İnceleme, uygulamanın ilk günden içeriği olan tek türü.
//
// İki uç AYRI sayfalanıyor ve aynı `offset` ile isteniyor; sayfa sınırındaki
// sıralama kusurlu olabilir (bir sayfanın sonundaki inceleme, sonraki sayfanın
// gönderisinden yeni çıkabilir). Mobilde de böyle ve orada da bilinçli:
// birleşik sıra ancak sunucuda ortak bir dizinle düzelir, içerik hacmi onu
// haklı çıkarana kadar bu yeterli.
//
// KAPSAM DIŞI, BİLİNÇLİ:
//   · YAZMA (inceleme/gönderi/beğeni) — uçları jeton istiyor, web çerezi o
//     uçlarda kimlik saymıyor.
//   · "ARKADAŞLAR" SEKMESİ — uç oturumsuzda bilerek boş dönüyor. Webde
//     gösterseydik giriş yapmış kullanıcı da boş görürdü; eksiği özellik
//     gibi sunmak olurdu.
//
// SUNUCUDA ÇİZİLMİYOR, İSTEMCİDE. `u/[username]` deseni (depo fonksiyonlarını
// doğrudan çağıran sunucu bileşeni) burada iki route'un şekillendirme kodunu
// sayfaya kopyalamayı gerektiriyordu; kopya zamanla ayrışır. Ortak yardımcıya
// çıkarmak route'lara dokunmak demek ve uygulama mağaza incelemesinde.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { isAvatarPhoto } from '../lib/avatar-presets';

// Sunucunun sayfa boyutu (listFeed / listRecentReviews ikisi de limit=20).
// "Devamı var mı" kararı buna bakıyor, o yüzden sunucuyla AYNI kalmalı.
const SAYFA = 20;

/** Liste anahtarı — gönderi ve inceleme farklı kimliklendiriliyor. */
function anahtar(x) {
  return x?.id != null ? `p:${x.id}` : `r:${x.appid}:${x.uid}`;
}

/** Göreli zaman. Mutlak tarih hover'da (`title`) duruyor. */
function gecenSure(ts, tr) {
  const sn = Math.max(0, Math.floor((Date.now() - Number(ts || 0)) / 1000));
  if (sn < 60) return tr ? 'az önce' : 'just now';
  const dk = Math.floor(sn / 60);
  if (dk < 60) return tr ? `${dk} dk önce` : `${dk}m ago`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return tr ? `${sa} saat önce` : `${sa}h ago`;
  const g = Math.floor(sa / 24);
  if (g < 30) return tr ? `${g} gün önce` : `${g}d ago`;
  const ay = Math.floor(g / 30);
  if (ay < 12) return tr ? `${ay} ay önce` : `${ay}mo ago`;
  return tr ? `${Math.floor(ay / 12)} yıl önce` : `${Math.floor(ay / 12)}y ago`;
}

export default function ReviewsPage() {
  const { lang } = useLanguage();
  const tr = lang === 'tr';

  const [items, setItems]   = useState(null);   // null = henüz yüklenmedi
  const [loading, setLoading] = useState(true);
  const [dahaVar, setDahaVar] = useState(true);
  // "Ağ bozuk" ile "kimse yazmamış" AYRI durumlar. Aynı ekranı göstermek
  // kullanıcıya yanlış şey söyler: biri "tekrar dene", diğeri "ilk sen yaz".
  const [bozuk, setBozuk] = useState(false);

  const offsetRef = useRef(0);
  const cekiliyorRef = useRef(false);
  const sentinelRef = useRef(null);

  /**
   * Tek sayfa — iki uç paralel, birleşik ve zamana göre sıralı.
   * @returns {Promise<Array|null>} null = ikisi de düştü (ağ bozuk)
   */
  const sayfaCek = useCallback(async (offset) => {
    const [p, r] = await Promise.all([
      fetch(`/api/social/posts?offset=${offset}`)
        .then((x) => (x.ok ? x.json() : Promise.reject(new Error(String(x.status)))))
        .catch(() => null),
      fetch(`/api/social/reviews/feed?offset=${offset}`)
        .then((x) => (x.ok ? x.json() : Promise.reject(new Error(String(x.status)))))
        .catch(() => null),
    ]);
    if (p === null && r === null) return null;

    const birlesik = [...(p?.posts || []), ...(r?.reviews || [])];
    birlesik.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
    return birlesik;
  }, []);

  // İlk yükleme
  useEffect(() => {
    let iptal = false;
    setLoading(true);
    offsetRef.current = 0;
    // İLK YÜKLEME DE MEŞGUL SAYILIYOR. Ölçüldü: kaydırma kontrolünün 800ms'lik
    // ilk bakışı, bu istek daha uçarken tetikleniyordu; `offsetRef` hâlâ 0
    // olduğu için `offset=0` İKİ KEZ isteniyordu (kayıtta p0/r0 çifti göründü).
    // Yinelenenleri sonradan elemek yetmez — ağa çıkan ikinci tur zaten
    // boşa gitmiş oluyor.
    cekiliyorRef.current = true;

    sayfaCek(0).then((satirlar) => {
      cekiliyorRef.current = false;
      if (iptal) return;
      setBozuk(satirlar === null);
      // Ağ hatasında liste SİLİNMİYOR — varsa önceki içerik duruyor.
      if (satirlar !== null) {
        setItems(satirlar);
        offsetRef.current = satirlar.length;
        // Tam sayfa geldiyse devamı olabilir; eksikse liste bitmiştir.
        // Yoksa her son sayfadan sonra bir boş istek daha atılırdı.
        setDahaVar(satirlar.length >= SAYFA);
      }
      setLoading(false);
    });

    return () => { iptal = true; };
  }, [sayfaCek]);

  const dahaYukle = useCallback(async () => {
    if (cekiliyorRef.current || !dahaVar) return;
    cekiliyorRef.current = true;
    setLoading(true);

    const satirlar = await sayfaCek(offsetRef.current);
    if (satirlar === null) {
      setBozuk(true);
    } else {
      setBozuk(false);
      // Aynı kayıt iki sayfada birden gelebiliyor (iki uç ayrı sayfalanıyor).
      // React anahtarı çakışmasın diye eleniyor.
      setItems((onceki) => {
        const gorulen = new Set((onceki || []).map(anahtar));
        return [...(onceki || []), ...satirlar.filter((x) => !gorulen.has(anahtar(x)))];
      });
      offsetRef.current += satirlar.length;
      setDahaVar(satirlar.length >= SAYFA);
    }

    setLoading(false);
    cekiliyorRef.current = false;
  }, [dahaVar, sayfaCek]);

  // Sonsuz kaydırma — `/games` sayfasındaki desenin aynısı ve aynı iki
  // sebeple:
  //
  //  1. rAF ile KISILMIŞ scroll dinleyicisi. Her olayda
  //     `getBoundingClientRect()` çağırmak yerleşim yeniden hesaplatıyor;
  //     böylece kare başına en çok bir kez bakılıyor.
  //
  //  2. `IntersectionObserver` DENENDİ VE BIRAKILDI: sentinel yüklemeden
  //     sonra hâlâ görünür kalırsa gözlemci bir daha tetiklenmiyor (kesişme
  //     durumu değişmiyor). İlk sayfa ekrandan kısa geldiğinde akış orada
  //     takılıyordu. Aşağıdaki `setTimeout(bak, 800)` tam olarak o durumu
  //     karşılıyor — kaydırma olmadan da bir kez bakıyor.
  useEffect(() => {
    let sirada = false;
    const bak = () => {
      sirada = false;
      const el = sentinelRef.current;
      if (!el) return;
      if (el.getBoundingClientRect().top < window.innerHeight + 500) dahaYukle();
    };
    const onScroll = () => {
      if (sirada) return;
      sirada = true;
      requestAnimationFrame(bak);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const t = setTimeout(bak, 800);
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, [dahaYukle]);

  const bos = items !== null && items.length === 0 && !loading;

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 120 }}>

      {/* ── Başlık ── */}
      <section style={{ padding: '58px 0 26px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
            ● {tr ? 'Oyuncular ne diyor' : 'What players say'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px,4.2vw,50px)', lineHeight: 1.05, letterSpacing: '-1.4px', color: 'var(--text)', marginBottom: 14 }}>
            {tr ? 'Topluluk' : 'Community'}
          </h1>
          <p style={{ fontSize: 16.5, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.55 }}>
            {tr
              ? 'Gamerisen kullanıcılarının incelemeleri ve tartışmaları — en yeni önce.'
              : 'Reviews and discussions from Gamerisen users — newest first.'}
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 0' }}>

        {/* Ağ bozuk — liste varsa üstünde bir bant olarak duruyor, listeyi
            gizlemiyor: bayat içerik hiç içerik olmamasından iyidir. */}
        {bozuk ? (
          <div style={{ padding: '12px 16px', marginBottom: 18, borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--text)', fontSize: 14 }}>
            {tr ? 'Akış şu an yüklenemiyor. Bağlantını kontrol edip tekrar dene.' : 'The feed could not be loaded. Check your connection and try again.'}
          </div>
        ) : null}

        {items === null && loading ? <Iskelet /> : null}

        {bos && !bozuk ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <p style={{ fontSize: 42, marginBottom: 12 }}>💬</p>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {tr ? 'Henüz kimse yazmamış' : 'Nothing here yet'}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 380, margin: '0 auto' }}>
              {tr
                ? 'İnceleme ve gönderi yazmak şimdilik mobil uygulamada. Yazılanlar burada da görünecek.'
                : 'Writing reviews and posts is currently in the mobile app. Anything written there shows up here too.'}
            </p>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(items || []).map((x) => (
            x.id != null
              ? <GonderiKarti key={anahtar(x)} post={x} tr={tr} />
              : <IncelemeKarti key={anahtar(x)} inceleme={x} tr={tr} />
          ))}
        </div>

        {/* Sonsuz kaydırma sentineli */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {loading && items !== null && items.length > 0 ? (
          <p style={{ textAlign: 'center', padding: '22px 0', fontSize: 13.5, color: 'var(--text-3)' }}>
            {tr ? 'Yükleniyor…' : 'Loading…'}
          </p>
        ) : null}

        {!dahaVar && items !== null && items.length > 0 ? (
          <p style={{ textAlign: 'center', padding: '26px 0', fontSize: 13, color: 'var(--text-3)' }}>
            {tr ? 'Akışın sonuna geldin.' : "You've reached the end."}
          </p>
        ) : null}
      </main>
    </div>
  );
}

// ── Kartlar ─────────────────────────────────────────────────────────────────

function Yazar({ author, at, tr }) {
  const ad = author?.displayName || author?.username || (tr ? 'Bilinmeyen' : 'Unknown');
  const bas = (ad || '?').trim().charAt(0).toUpperCase();
  const tarih = new Date(Number(at) || 0);

  // Avatar deseni web'de zaten kararlı (bkz. app/u/[username]/page.jsx):
  // fotoğrafsa <img>, değilse baş harf. Ön ayar kimliğinin renk/simge
  // eşlemesi YALNIZ mobil istemcide ve oraya bağımlı olmak istemiyoruz.
  const avatar = (
    <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-hover)', display: 'grid', placeItems: 'center' }}>
      {isAvatarPhoto(author?.avatar)
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-3)' }}>{bas}</span>}
    </div>
  );

  const icerik = (
    <>
      {avatar}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)' }} title={tarih.toLocaleString(tr ? 'tr-TR' : 'en-US')}>
          {author?.username ? `@${author.username} · ` : ''}{gecenSure(at, tr)}
        </p>
      </div>
    </>
  );

  // Kullanıcı adı yoksa profil adresi de yok — bağlantı kurmak 404 üretirdi.
  return author?.username ? (
    <Link href={`/u/${author.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {icerik}
    </Link>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>{icerik}</div>
  );
}

function Sayac({ simge, n, etiket }) {
  if (!n) return null;
  return (
    <span title={etiket} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}>
      {simge} {n}
    </span>
  );
}

function IncelemeKarti({ inceleme, tr }) {
  const oyunAdi = inceleme.gameName || `Steam ${inceleme.appid}`;
  const saat = Number(inceleme.hours);

  return (
    <article style={K.kart}>
      {/* Oyun başlığı — görsel adresi appid'den TÜRETİLİYOR, uç onu böyle
          gönderiyor; ayrıca saklanmıyor. */}
      <Link href={`/game/rawg/rawg_${inceleme.appid}`} style={{ display: 'block', position: 'relative' }}>
        {inceleme.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={inceleme.image}
            alt={oyunAdi}
            loading="lazy"
            style={{ width: '100%', aspectRatio: '460 / 215', objectFit: 'cover', display: 'block', background: 'var(--bg-hover)' }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 52%)' }} />
        <h3 style={{ position: 'absolute', left: 16, right: 16, bottom: 12, fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 750, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
          {oyunAdi}
        </h3>
      </Link>

      <div style={K.govde}>
        <div style={K.ust}>
          <Yazar author={inceleme.author} at={inceleme.at} tr={tr} />
          {/* Renkler CSS SINIFINDA, satır içi değil: iki tema için ayrı ön plan
              rengi gerekiyor ve satır içi stil `[data-theme]` seçicisi yazamaz.
              Ölçülen kontrast oranları globals.css'teki `.rev-badge` notunda. */}
          <span className={`rev-badge ${inceleme.recommended ? 'rev-badge-yes' : 'rev-badge-no'}`}>
            {inceleme.recommended ? '👍' : '👎'}
            {inceleme.recommended ? (tr ? 'Tavsiye ediyor' : 'Recommended') : (tr ? 'Tavsiye etmiyor' : 'Not recommended')}
          </span>
        </div>

        <p style={K.metin}>{inceleme.text}</p>

        <div style={K.alt}>
          {saat > 0 ? (
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              🕒 {tr ? `${saat} saat oynamış` : `${saat}h played`}
            </span>
          ) : null}
          <Sayac simge="💬" n={inceleme.replyCount} etiket={tr ? 'yanıt' : 'replies'} />
        </div>
      </div>
    </article>
  );
}

function GonderiKarti({ post, tr }) {
  return (
    <article style={{ ...K.kart, padding: 0 }}>
      <div style={K.govde}>
        <div style={K.ust}>
          <Yazar author={post.author} at={post.at} tr={tr} />
        </div>

        <p style={K.metin}>{post.text}</p>

        {post.game?.appid ? (
          <Link
            href={`/game/rawg/rawg_${post.game.appid}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 12, padding: '7px 12px 7px 7px', borderRadius: 999, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
          >
            {post.game.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={post.game.image} alt="" loading="lazy" style={{ width: 34, height: 16, objectFit: 'cover', borderRadius: 3 }} />
            ) : null}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{post.game.name}</span>
          </Link>
        ) : null}

        <div style={K.alt}>
          <Sayac simge="❤️" n={post.likeCount} etiket={tr ? 'beğeni' : 'likes'} />
          <Sayac simge="💬" n={post.replyCount} etiket={tr ? 'yanıt' : 'replies'} />
        </div>
      </div>
    </article>
  );
}

function Iskelet() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ ...K.kart, padding: 18, opacity: 1 - i * 0.22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-hover)' }} />
            <div>
              <div style={{ width: 120, height: 11, borderRadius: 4, background: 'var(--bg-hover)', marginBottom: 6 }} />
              <div style={{ width: 78, height: 9, borderRadius: 4, background: 'var(--bg-hover)' }} />
            </div>
          </div>
          <div style={{ width: '100%', height: 11, borderRadius: 4, background: 'var(--bg-hover)', marginBottom: 7 }} />
          <div style={{ width: '82%', height: 11, borderRadius: 4, background: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  );
}

const K = {
  kart: {
    borderRadius: 14,
    overflow: 'hidden',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
  },
  govde: { padding: 18 },
  ust: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  metin: {
    fontSize: 15,
    lineHeight: 1.62,
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  alt: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' },
};
