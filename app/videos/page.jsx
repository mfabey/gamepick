'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Oyun videoları — dikey, tam ekran, Reels tarzı akış (WEB).
//
// Mobildeki `(tabs)/videos.jsx` ekranının web karşılığı. Veri kaynağı AYNI uç:
// `/api/video-feed`. Sunucuda tek satır değişmedi — mobil uygulama App Store
// incelemesindeyken paylaşılan uçlara dokunmamak şarttı.
//
// MOBİLDEN DEVRALINAN KARAR — OYNATICI HAVUZU. Liste elemanı başına oynatıcı
// açmak klasik hata: mobilde 20 AVPlayer belleği şişiriyordu, webde her HLS
// örneğinin kendi segment buffer'ı var ve aynı şey bant genişliğinde oluyor.
// Burada AKTİF + BİR KOMŞU dışındaki her motor yıkılıyor; menzilden çıkan
// <video> kaynağından da koparılıyor, yoksa tarayıcı indirmeye devam ediyor.
//
// KAPLAMA EKRANIN YÖNÜNE GÖRE. Geniş ekranda `contain`: fragman 16:9 ve
// kırpmak görüntünün yarısını atmak demek; boş kalan yerler bulanık zeminle
// dolduruluyor — anasayfadaki hero ile aynı reçete: blur tek başına kenarlarda
// açık bir çerçeve bırakıyor, `scale(1.12)` onu kırpıyor. Dikey ekranda
// `cover`, mobil uygulamadaki gibi: 375×812'de `contain` ölçüldüğünde
// görüntü 812px'in yalnızca 211'ini kullanıyor, kalan 600px boş duruyordu.
//
// SESSİZ BAŞLIYOR. Tercih değil zorunluluk: sesli otomatik oynatmayı hiçbir
// tarayıcı kullanıcı etkileşimi olmadan kabul etmiyor, `play()` reddediliyor
// ve akış ilk karede duruyordu.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

// Yalnızca ÖLÇÜM GELENE KADAR geçerli yedek. Önce anasayfa hero'sundaki
// `calc(100vh - 56px)` kopyalanmıştı; gerçek `header.nav-header` 1280×720'de
// 65px çıktı ve akış 9px taşıyordu. Asıl değer çalışma zamanında ölçülüyor
// (aşağıdaki `yukseklik` notu).
const VARSAYILAN_UST = 65;

// Alt kaplamaların temizlemesi gereken SABİT arayüz. İki ekranda da ölçüldü,
// değer büyük olana göre seçildi:
//   · 1280×720 — `.bottom-nav` alt kenardan 106px yukarı çıkıyor.
//   · 375×812  — `.ai-widget-trigger` mobil kuralıyla yukarı kayıyor ve alt
//                kenardan 126px'e ulaşıyor (bu değerde 120px denendi, bilgi
//                bloğunun düğmeleri widget'ın altında kaldı).
// Üstüne nefes payı → 140. Sağ eylem şeridi ayrıca dikeyde ortalanıyor: sağ
// alt köşe her iki ekranda da dolu.
const ALT_CHROME = 140;

const ONYUKLE = 1;         // aktifin kaç komşusuna motor bağlanacak
const SAYFA_ESIGI = 3;     // sondan bu kadar öğe kala sonraki sayfa istenir

/**
 * Videoya oynatma motoru bağlar.
 *
 * SIRA hls.js'in kendi önerdiği sıra: ÖNCE MediaSource, sonra yerel HLS.
 * Tersi denendi ve ölçümde yanıldı — bu ortamın Chromium'u
 * `canPlayType('application/vnd.apple.mpegurl')` çağrısına `"maybe"` diyor.
 * `"maybe"` bir söz değil tahmin; ona güvenip yerel yola sapmak, aynı yanıtı
 * verip oynatamayan bir tarayıcıda sessiz siyah ekran demek. MediaSource ise
 * varsa gerçekten çalışıyor.
 *
 * Yerel yol yine duruyor: iOS Safari'de video için MediaSource yok, HLS'i
 * doğrudan oynatıyor. Modül DİNAMİK yükleniyor — o kullanıcı paketi hiç
 * indirmiyor.
 *
 * @returns {Promise<{destroy: () => void}|null>} yıkılacak motor, yerelse null
 */
async function motorBagla(video, url) {
  let Hls;
  try {
    ({ default: Hls } = await import('hls.js'));
  } catch {
    Hls = null;               // paket yüklenemedi: aşağıdaki yerel yola düş
  }

  if (!Hls?.isSupported?.()) {
    if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
    return null;              // yerel de oynatamıyorsa poster kalır, sayfa kırılmaz
  }

  // maxBufferLength DÜŞÜK: komşu video da bağlı ve varsayılan 30 sn'lik
  // buffer ile iki akış paralel iniyordu. Kaydırma sırasında izlenmeyen bir
  // videoya harcanan bant genişliği doğrudan aktif videonun kalitesinden
  // düşüyor.
  const hls = new Hls({ maxBufferLength: 10, maxMaxBufferLength: 20, capLevelToPlayerSize: true });
  hls.on(Hls.Events.ERROR, (_olay, veri) => {
    if (veri?.fatal) { try { hls.destroy(); } catch {} }
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return hls;
}

export default function VideosPage() {
  const { lang } = useLanguage();
  const tr = lang === 'tr';

  const [items, setItems]     = useState([]);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [active, setActive]   = useState(0);
  const [muted, setMuted]     = useState(true);
  const [paused, setPaused]   = useState(false);

  // Oturum başına tek tohum — mobildeki ile aynı sözleşme: aynı oturumda
  // sayfalama tutarlı, farklı oturumda sıra değişiyor.
  const seedRef = useRef(null);
  if (seedRef.current === null) seedRef.current = Math.random().toString(36).slice(2, 10);

  const scrollerRef = useRef(null);
  const videoRefs   = useRef([]);
  const motorRef    = useRef(new Map());   // index -> motor | null (yerel oynatma)

  // Akış yüksekliği — HESAPLANMIYOR, ÖLÇÜLÜYOR (bkz. VARSAYILAN_UST notu).
  //
  // `calc(100dvh - <ust>)` de denendi ve tutmadı: bu tarayıcıda `100dvh` 728px
  // dönerken `innerHeight` 720px — akış 8px taşıyordu ve ilk öğe hiçbir zaman
  // tam oturmuyordu. `innerHeight - başlık` ikisini de tahmin etmiyor, o anki
  // gerçek boşluğu veriyor.
  //
  // `visualViewport` DA dinleniyor: mobil tarayıcılarda adres çubuğu
  // gizlenirken `resize` her zaman tetiklenmiyor, görsel görüntü alanı ise
  // tetikliyor. dvh'nin çözdüğü sorun bu yolla çözülüyor.
  // ÖLÇÜLEN ŞEY BAŞLIĞIN YÜKSEKLİĞİ DEĞİL, AKIŞIN KENDİ ÜST KENARI. Başlık
  // ölçülmüştü ve iki farklı okumada 65px ile 57px verdi (yükseklik sabit
  // değil); akışın `offsetTop`u ise aradaki her şeyi zaten kapsıyor ve tek
  // varsayım bırakmıyor. Sayfa gövdesinin kaydırma konumundan etkilenmesin
  // diye `getBoundingClientRect().top` değil `offsetTop` kullanılıyor.
  const [olcum, setOlcum] = useState({ yukseklik: null, dikey: false });
  useEffect(() => {
    const olc = () => {
      const el = scrollerRef.current;
      // innerHeight 0 GÖRÜLDÜ (arka plandaki sekmede ölçüm). O değeri kabul
      // etmek akışı taban yüksekliğine kilitlerdi; ölçüm anlamsızsa yedek
      // kalıyor.
      if (!el || !(window.innerHeight > 0)) return;

      // `offsetTop` DEĞİL. Denendi ve mobilde 0 döndü: orada başlık `fixed`,
      // dolayısıyla akışın konumlandırma atası gövde ve ofseti sıfır — akış
      // 812px yüksekliğe kurulup görünür alanı 57px aşıyordu. Rect + scrollY
      // ikisinde de akışın belge içindeki gerçek üst kenarını veriyor.
      const ust = Math.round(el.getBoundingClientRect().top + window.scrollY);
      const yukseklik = Math.max(320, window.innerHeight - ust);
      setOlcum({ yukseklik, dikey: yukseklik > window.innerWidth });
    };
    olc();
    window.addEventListener('resize', olc);
    window.visualViewport?.addEventListener('resize', olc);
    return () => {
      window.removeEventListener('resize', olc);
      window.visualViewport?.removeEventListener('resize', olc);
    };
  }, [items.length]);

  // Ölçüm ilk boyamadan SONRA geliyor; o ana kadar dvh yedeği kullanılıyor,
  // aksi hâlde sunucu çıktısıyla istemci ilk render'ı ayrışırdı.
  const akisH = olcum.yukseklik ? `${olcum.yukseklik}px` : `calc(100dvh - ${VARSAYILAN_UST}px)`;

  // DİKEYDE `cover`, YATAYDA `contain`.
  //
  // Sayfa baştan `contain` ile yazılmıştı — geniş ekranda doğru karar, ama
  // 375×812'de ölçüldüğünde 16:9 fragman ekranın ortasında ince bir şerite
  // düşüyordu: 812px'lik alanın yalnızca 211'i görüntü, kalan 600px boş.
  // Dikey ekranda mobil uygulamanın kararı doğru olan: kırp, ekranı doldur.
  const kaplama = olcum.dikey ? 'cover' : 'contain';

  // ── Veri ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let iptal = false;
    const sayfa = page;
    setLoading(true);

    fetch(`/api/video-feed?lang=${lang}&page=${sayfa}&seed=${seedRef.current}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => {
        if (iptal) return;
        const gelen = Array.isArray(d.results) ? d.results : [];
        setItems((onceki) => (sayfa === 1 ? gelen : [...onceki, ...gelen]));
        setHasMore(!!d.hasMore);
        setError(sayfa === 1 && gelen.length === 0);
        setLoading(false);
      })
      .catch(() => {
        if (iptal) return;
        setError(true);
        setLoading(false);
      });

    return () => { iptal = true; };
  }, [lang, page]);

  // Dil değişince akış baştan kurulur. `page` 1 değilse buradaki sıfırlama
  // yukarıdaki etkiyi tetikliyor; 1 ise etki zaten `lang` üzerinden koşuyor.
  useEffect(() => {
    setActive(0);
    setPage(1);
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [lang]);

  // Sondan SAYFA_ESIGI öğe kala sonrakini iste — akışın sonuna varıldığında
  // bekleme olmasın.
  useEffect(() => {
    if (!hasMore || loading || items.length === 0) return;
    if (active >= items.length - SAYFA_ESIGI) setPage((p) => p + 1);
  }, [active, items.length, hasMore, loading]);

  // ── Aktif öğe tespiti ──────────────────────────────────────────────────────
  useEffect(() => {
    const kok = scrollerRef.current;
    if (!kok || items.length === 0) return;

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        for (const g of girisler) {
          if (g.isIntersecting && g.intersectionRatio >= 0.6) {
            setActive(Number(g.target.dataset.i));
          }
        }
      },
      { root: kok, threshold: [0.6] }
    );

    kok.querySelectorAll('[data-i]').forEach((el) => gozlemci.observe(el));
    return () => gozlemci.disconnect();
  }, [items.length]);

  // ── Motor havuzu ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (items.length === 0) return;
    let iptal = false;

    const istenen = new Set();
    for (let i = active; i <= active + ONYUKLE && i < items.length; i++) istenen.add(i);

    // Menzil dışı: motoru yık VE kaynağı kopar. Yalnızca `pause()` yetmiyor —
    // motor bağlıyken tarayıcı arka planda segment indirmeye devam ediyor.
    for (const [i, motor] of motorRef.current) {
      if (istenen.has(i)) continue;
      try { motor?.destroy?.(); } catch {}
      motorRef.current.delete(i);
      const v = videoRefs.current[i];
      if (v) {
        try { v.pause(); v.removeAttribute('src'); v.load(); } catch {}
      }
    }

    (async () => {
      for (const i of istenen) {
        if (motorRef.current.has(i)) continue;
        const v = videoRefs.current[i];
        const url = items[i]?.hls;
        if (!v || !url) continue;

        // await ÖNCESİ yer tutuluyor: aksi hâlde etki hızlı kaydırmada
        // yeniden koşup aynı indekse ikinci bir motor açıyordu.
        motorRef.current.set(i, null);
        const motor = await motorBagla(v, url);

        // Bekleme sırasında menzil değişmiş olabilir.
        if (iptal || !motorRef.current.has(i)) {
          try { motor?.destroy?.(); } catch {}
          continue;
        }
        motorRef.current.set(i, motor);

        // Oynatmayı BURADA da tetiklemek şart: motor bağlandığında hiçbir
        // durum değişmiyor, dolayısıyla aşağıdaki oynat/duraklat etkisi
        // yeniden koşmuyor ve aktif video sessizce duruyordu.
        if (i === active && !paused) {
          v.muted = muted;
          v.play().catch(() => {});
        }
      }
    })();

    return () => { iptal = true; };
  }, [active, items, paused, muted]);

  // Bileşen sökülürken açık kalan her motoru yık.
  useEffect(() => {
    const havuz = motorRef.current;
    return () => {
      for (const [, motor] of havuz) {
        try { motor?.destroy?.(); } catch {}
      }
      havuz.clear();
    };
  }, []);

  // ── Oynat / duraklat / ses ─────────────────────────────────────────────────
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.muted = muted;
        if (paused) v.pause();
        else v.play().catch(() => {});   // otomatik oynatma reddi sessiz geçilir
      } else {
        try { v.pause(); v.currentTime = 0; } catch {}
      }
    });
  }, [active, paused, muted, items.length]);

  // Sekme arkaplana düşünce durdur. Görünmeyen videoyu indirmeye devam etmek
  // hem bant genişliği hem pil.
  useEffect(() => {
    const onGizle = () => {
      if (document.hidden) videoRefs.current.forEach((v) => { try { v?.pause(); } catch {} });
      else if (!paused) videoRefs.current[active]?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onGizle);
    return () => document.removeEventListener('visibilitychange', onGizle);
  }, [active, paused]);

  // ── Gezinme ────────────────────────────────────────────────────────────────
  const git = useCallback((i) => {
    const hedef = Math.max(0, Math.min(i, items.length - 1));
    const el = scrollerRef.current?.querySelector(`[data-i="${hedef}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [items.length]);

  // Klavye — masaüstünde ok tuşları. Mobilde karşılığı yok, orada parmak
  // zaten aynı işi yapıyor.
  useEffect(() => {
    const onTus = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); git(active + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); git(active - 1); }
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onTus);
    return () => window.removeEventListener('keydown', onTus);
  }, [active, git]);

  // ── Durumlar ───────────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <Perde yukseklik={akisH}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.18)', borderTopColor: 'var(--accent)', animation: 'videos-spin 0.8s linear infinite' }} />
        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          {tr ? 'Fragmanlar hazırlanıyor…' : 'Loading trailers…'}
        </p>
        <style>{'@keyframes videos-spin{to{transform:rotate(360deg)}}'}</style>
      </Perde>
    );
  }

  if (error && items.length === 0) {
    return (
      <Perde yukseklik={akisH}>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, marginBottom: 16 }}>
          {tr ? 'Şu an fragman akışı yüklenemedi.' : 'The trailer feed could not be loaded.'}
        </p>
        <button
          onClick={() => { setError(false); setLoading(true); setPage(1); }}
          style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600 }}
        >
          {tr ? 'Tekrar dene' : 'Try again'}
        </button>
      </Perde>
    );
  }

  return (
    <div
      ref={scrollerRef}
      style={{
        height: akisH,
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'contain',
        background: '#000',
        position: 'relative',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((it, i) => (
        <section
          key={`${it.id}-${i}`}
          data-i={i}
          style={{
            position: 'relative',
            height: '100%',
            scrollSnapAlign: 'start',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Bulanık zemin — hero ile aynı reçete: blur tek başına kenarlarda
              açık bir çerçeve bırakıyor, scale onu kırpıyor. */}
          {it.image ? (
            <img
              src={it.image}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', filter: 'blur(26px) brightness(0.4)',
                transform: 'scale(1.12)',
              }}
            />
          ) : null}

          <video
            ref={(el) => { videoRefs.current[i] = el; }}
            poster={it.thumbnail || it.image}
            muted
            playsInline
            loop
            preload="none"
            onClick={() => setPaused((p) => !p)}
            style={{
              position: 'relative', width: '100%', height: '100%',
              objectFit: kaplama, cursor: 'pointer', background: 'transparent',
            }}
          />

          {/* Okunabilirlik karartması */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%, transparent 58%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          {/* Duraklatma göstergesi — video donmuş sanılmasın */}
          {i === active && paused ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          ) : null}

          {/* Bilgi bloğu */}
          <div style={{ position: 'absolute', left: 'clamp(16px,4vw,40px)', bottom: ALT_CHROME, maxWidth: 'min(560px, 72%)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(22px,3vw,34px)', lineHeight: 1.12, color: '#fff', margin: '0 0 10px', textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>
              {it.name}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {it.isFree ? (
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: '#fff' }}>
                  {tr ? 'Ücretsiz' : 'Free'}
                </span>
              ) : null}
              {(it.genres || []).map((g) => (
                <span key={g} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
                  {g}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link
                href={`/game/rawg/${it.id}`}
                style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}
              >
                {tr ? 'Oyunu incele' : 'View game'}
              </Link>
              {it.steamUrl ? (
                <a
                  href={it.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.16)', color: '#fff', backdropFilter: 'blur(8px)' }}
                >
                  {tr ? 'Steam sayfası' : 'Steam page'}
                </a>
              ) : null}
            </div>
          </div>

          {/* Eylem şeridi — kimlik gerektiren eylemler (istek listesi,
              koleksiyona kaydet, arkadaşa gönder) BİLİNÇLİ olarak yok: web
              oturumu, sosyal uçların beklediği Bearer jetonunu taşımıyor.
              DİKEYDE ORTALI, mobildeki gibi altta değil: sağ alt köşe
              `.ai-widget-trigger` tarafından tutulmuş ve o düğme dar
              ekranlarda alt kenardan 136px'e kadar yükseliyor. */}
          <div style={{ position: 'absolute', right: 'clamp(12px,2.5vw,28px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <RayDugmesi
              etiket={muted ? (tr ? 'Sesi aç' : 'Unmute') : (tr ? 'Sesi kapat' : 'Mute')}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? (
                <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.94 8.94 0 0 0 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z" /></svg>
              ) : (
                <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
              )}
            </RayDugmesi>

            <RayDugmesi
              etiket={paused ? (tr ? 'Oynat' : 'Play') : (tr ? 'Duraklat' : 'Pause')}
              onClick={() => setPaused((p) => !p)}
            >
              {paused
                ? <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                : <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>}
            </RayDugmesi>

            <RayDugmesi etiket={tr ? 'Sonraki' : 'Next'} onClick={() => git(active + 1)}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff"><path d="M12 16.5 5.5 10l1.4-1.4 5.1 5.1 5.1-5.1L18.5 10z" /></svg>
            </RayDugmesi>
          </div>

          {/* İlerleme sayacı */}
          <div style={{ position: 'absolute', top: 16, right: 'clamp(12px,2.5vw,28px)', padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
            {i + 1} / {items.length}
          </div>
        </section>
      ))}

      {loading && items.length > 0 ? (
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', padding: '6px 14px', borderRadius: 999, fontSize: 12, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.45)' }}>
          {tr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      ) : null}
    </div>
  );
}

/** Tam ekran orta hizalı perde — yükleme ve hata durumları için. */
function Perde({ ust, children }) {
  return (
    <div style={{ height: `calc(100dvh - ${ust}px)`, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

function RayDugmesi({ etiket, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiket}
      title={etiket}
      style={{
        width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(8px)',
        display: 'grid', placeItems: 'center',
      }}
    >
      {children}
    </button>
  );
}
