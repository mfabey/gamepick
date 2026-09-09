'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Keşfet — doğal dil ile oyun arama (WEB).
//
// Mobildeki `discover.jsx` ekranının web karşılığı. Uç AYNI:
// `POST /api/smart-search`. Sunucuda tek satır değişmedi.
//
// UCUN TEMEL KARARI (route.js başında yazılı) bu sayfanın da dayanağı: LLM'e
// oyun ADI saydırılmıyor, yalnızca sabit listelerden FİLTRE çıkarılıyor.
// Dönen her oyun gerçekten katalogda — o yüzden sonuçlar sitenin kendi
// `GameCard`'ıyla, fiyatı ve detay bağlantısıyla birlikte çizilebiliyor.
//
// MOBİLDEN AYRILAN İKİ KARAR:
//
//  1. SAHİP OLUNAN OYUNLAR GİZLENMİYOR, ROZETLENİYOR. Mobil onları listeden
//     çıkarıyor; webde `GameCard` zaten "✓ Sahipsin" rozetini basıyor ve
//     `/games` de gizlemiyor. Mobili birebir kopyalamak sitenin kendi
//     yerleşik davranışıyla çelişirdi.
//  2. "İLGİLENMİYORUM" TAŞINMADI — webde böyle bir kavram (ve onu saklayacak
//     bir yer) yok. Uydurma bir yerel liste, mobildekiyle ayrışırdı.
//
// WEBE ÖZGÜ EKLEME: sorgu adreste (`?q=`). Mobilde ekranda kalması yeterli;
// webde geri tuşu, yer imi ve paylaşım bekleniyor.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GameCard from '../components/GameCard';
import { useLanguage } from '../context/LanguageContext';

// Boş ekranı dolduran hazır istemler — kullanıcıya "buraya ne yazılır"ı
// tarif etmenin en kısa yolu. Mobildeki listenin aynısı.
const ORNEKLER = {
  tr: [
    'Sakin, kafa dağıtacak bir oyun',
    'Arkadaşımla oynayabileceğim',
    'Dying Light gibi',
    'Sürükleyici hikayesi olan',
    'Çok zor, meydan okuyan',
  ],
  en: [
    'Something relaxing to unwind',
    'A game to play with a friend',
    'Something like Dying Light',
    'With a gripping story',
    'Really hard and challenging',
  ],
};

const MAX_UZUNLUK = 500;   // sunucudaki şema sınırı (schemas.js:75) ile aynı

/**
 * Hata durumları AYRI. Hepsine "bir hata oluştu" demek kullanıcıyı yanlış
 * eyleme yönlendirir: biri beklemeyi, biri farklı yazmayı, biri hiçbir şey
 * yapmamayı gerektiriyor.
 */
function hataMetni(durum, tr) {
  if (durum === 503) {
    return tr
      ? 'Akıllı arama şu an kullanılamıyor. Bu bizde bir yapılandırma sorunu — birazdan tekrar dene.'
      : 'Smart search is unavailable right now. This is a configuration issue on our side — try again shortly.';
  }
  if (durum === 429) {
    return tr
      ? 'Kısa sürede çok fazla arama yaptın. Bir dakika bekleyip tekrar dene.'
      : 'Too many searches in a short time. Wait a minute and try again.';
  }
  if (durum === 502) {
    return tr
      ? 'Yazdığını çözümleyemedim. Biraz daha açık yazmayı dene — ne tür, kaç kişi, nasıl bir his?'
      : "I couldn't parse that. Try being more specific — what genre, how many players, what mood?";
  }
  return tr
    ? 'Aramaya ulaşılamadı. Bağlantını kontrol edip tekrar dene.'
    : 'Could not reach search. Check your connection and try again.';
}

function KesfetIcerik() {
  const { lang } = useLanguage();
  const tr = lang === 'tr';
  const router = useRouter();
  const searchParams = useSearchParams();
  const adresQ = searchParams.get('q') || '';

  const [query, setQuery]     = useState(adresQ);
  const [loading, setLoading] = useState(false);
  const [hata, setHata]       = useState(null);    // HTTP durumu ya da 0 (ağ)
  const [data, setData]       = useState(null);    // { filters, results }

  // Aynı sorgunun iki kez koşmasını engeller: adres etkisi ile düğme aynı
  // aramayı tetikleyebiliyor.
  const sonCalisanRef = useRef(null);

  const ara = useCallback(async (metin) => {
    const q = (metin ?? '').trim();
    if (!q) return;

    sonCalisanRef.current = q;
    setLoading(true);
    setHata(null);
    setData(null);

    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.slice(0, MAX_UZUNLUK), lang }),
      });

      // Yanıt geç geldiyse ve kullanıcı yeni arama başlattıysa bu sonuç artık
      // geçersiz — eski sonuçla yenisinin üstüne yazmamak için mühür.
      if (sonCalisanRef.current !== q) return;

      if (!res.ok) { setHata(res.status); return; }
      setData(await res.json());
    } catch {
      if (sonCalisanRef.current !== q) return;
      setHata(0);
    } finally {
      if (sonCalisanRef.current === q) setLoading(false);
    }
  }, [lang]);

  // Adresteki sorgu ile durum eşitleniyor. Kaynak ADRES: geri/ileri tuşu ve
  // paylaşılan bağlantı böylece kendiliğinden çalışıyor.
  useEffect(() => {
    if (!adresQ) { setData(null); setHata(null); return; }
    setQuery(adresQ);
    ara(adresQ);
  }, [adresQ, ara]);

  // Gönderim ADRESİ değiştiriyor, doğrudan aramıyor — tek kaynak kalsın.
  // `push` değil `replace`: her arama geçmişe bir kayıt eklerse geri tuşu
  // sayfadan çıkmak için art arda basmayı gerektirirdi.
  const gonder = useCallback((metin) => {
    const q = (metin ?? query).trim();
    if (!q || loading) return;
    if (q === adresQ) { ara(q); return; }   // aynı sorgu → adres değişmez, elle çalıştır
    router.replace(`/discover?q=${encodeURIComponent(q.slice(0, MAX_UZUNLUK))}`);
  }, [query, loading, adresQ, ara, router]);

  const sonuclar = data?.results || [];
  const etiketler = data?.filters?.tags || [];
  const bos = data && !loading && sonuclar.length === 0;

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 120 }}>

      {/* ── Başlık ── */}
      <section style={{ padding: '58px 0 22px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>
            ● {tr ? 'Ne istediğini yaz, oyunu biz bulalım' : 'Describe it, we find the game'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(32px,4.2vw,50px)', lineHeight: 1.05, letterSpacing: '-1.4px', color: 'var(--text)', marginBottom: 12 }}>
            {tr ? 'Keşfet' : 'Discover'}
          </h1>
          <p style={{ fontSize: 16.5, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55 }}>
            {tr
              ? 'Tür adı bilmene gerek yok. Nasıl bir şey istediğini kendi cümlelerinle anlat.'
              : 'No need to know genre names. Just describe what you feel like playing.'}
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 0' }}>

        {/* ── Sorgu kutusu ── */}
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter arar, Shift+Enter satır atlar — çok satırlı bir kutuda
              // beklenen davranış bu.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(); }
            }}
            placeholder={tr
              ? 'Örn. Dying Light gibi, arkadaşımla oynayabileceğim, hikayesi olan bir oyun'
              : 'e.g. Something like Dying Light, co-op, with a good story'}
            rows={3}
            maxLength={MAX_UZUNLUK}
            style={{
              width: '100%', resize: 'vertical', minHeight: 92,
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 16, lineHeight: 1.5,
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              {query.length} / {MAX_UZUNLUK}
            </span>
            <button
              type="button"
              onClick={() => gonder()}
              disabled={!query.trim() || loading}
              style={{
                padding: '11px 26px', borderRadius: 10, border: 'none',
                fontSize: 15, fontWeight: 650, color: '#fff',
                background: 'var(--accent)',
                cursor: (!query.trim() || loading) ? 'not-allowed' : 'pointer',
                opacity: (!query.trim() || loading) ? 0.55 : 1,
                boxShadow: '0 6px 18px var(--accent-bg)',
              }}
            >
              {loading ? (tr ? 'Aranıyor…' : 'Searching…') : (tr ? 'Oyun bul' : 'Find games')}
            </button>
          </div>

          {/* Örnek istemler — yalnızca henüz arama yapılmadıysa */}
          {!data && !loading && !hata ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              {(ORNEKLER[lang] || ORNEKLER.tr).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setQuery(ex); gonder(ex); }}
                  style={{
                    padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-2)', fontSize: 13.5,
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          ) : null}

          {/* Sistemin ne anladığı — mobildeki şeffaflık kararı. Kullanıcı
              sonucu beğenmediğinde nereyi düzelteceğini ancak böyle görüyor. */}
          {etiketler.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {tr ? 'Şunu anladım' : 'What I understood'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {etiketler.map((tg) => (
                  <span key={tg} style={{ padding: '4px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    {tg}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {hata !== null ? (
            <div style={{ marginTop: 20, padding: '13px 16px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--text)', fontSize: 14.5, lineHeight: 1.5 }}>
              {hataMetni(hata, tr)}
            </div>
          ) : null}

          {bos ? (
            <div style={{ marginTop: 26, textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ fontSize: 15.5, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 420, margin: '0 auto' }}>
                {tr
                  ? 'Bu tarife uyan oyun bulamadım. Daha az koşulla ya da başka kelimelerle dene.'
                  : 'No games matched that description. Try fewer conditions or different words.'}
              </p>
            </div>
          ) : null}
        </div>

        {/* ── Sonuçlar ── */}
        {loading ? (
          <div className="grid-auto" style={{ marginTop: 30 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 1 - i * 0.09 }}>
                <div style={{ width: '100%', aspectRatio: '460 / 215', background: 'var(--bg-hover)' }} />
                <div style={{ padding: 14 }}>
                  <div style={{ width: '76%', height: 12, borderRadius: 4, background: 'var(--bg-hover)', marginBottom: 8 }} />
                  <div style={{ width: '44%', height: 10, borderRadius: 4, background: 'var(--bg-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {sonuclar.length > 0 ? (
          <>
            <p style={{ margin: '30px 0 14px', fontSize: 13.5, color: 'var(--text-3)' }}>
              {tr ? `${sonuclar.length} oyun bulundu` : `${sonuclar.length} games found`}
            </p>
            <div className="grid-auto">
              {sonuclar.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function DiscoverPage() {
  const { lang } = useLanguage();
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingTop: 80, textAlign: 'center', color: 'var(--text-3)' }}>
        {lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
      </div>
    }>
      <KesfetIcerik />
    </Suspense>
  );
}
