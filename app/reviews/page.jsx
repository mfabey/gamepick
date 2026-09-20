'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Topluluk — İnceleme, Tartışma ve Sosyal Akış (WEB & MOBİL ENTEGRELİ).
//
// Mobil uygulamadaki topluluk akışı ve veri tabanıyla tam eşzamanlı çalışır.
// - Web üzerinden yeni gönderi / tartışma paylaşma (oyun etiketleme ile)
// - Gönderi ve incelemeleri beğenme (optimistic UI)
// - Gönderilere ve incelemelere yorum / yanıt yazma ve okuma (Thread Modal)
// - Kendi gönderilerini silme
// - Keşfet, Tartışmalar, İncelemeler ve Arkadaşlar sekmeleri
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { isAvatarPhoto } from '../lib/avatar-presets';

// Sunucunun sayfa boyutu
const SAYFA = 20;
const MAX_POST_LEN = 500;

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
  const { user } = useAuth();

  const [tab, setTab] = useState('all'); // 'all' | 'posts' | 'reviews' | 'friends'
  const [items, setItems] = useState(null); // null = henüz yüklenmedi
  const [loading, setLoading] = useState(true);
  const [dahaVar, setDahaVar] = useState(true);
  const [bozuk, setBozuk] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);

  const offsetRef = useRef(0);
  const cekiliyorRef = useRef(false);
  const sentinelRef = useRef(null);

  /**
   * Sayfa çekme — seçilen sekmeye göre
   */
  const sayfaCek = useCallback(async (offset, currentTab) => {
    try {
      if (currentTab === 'friends') {
        const p = await fetch(`/api/social/posts?scope=friends&offset=${offset}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null);
        return p?.posts || [];
      }

      if (currentTab === 'posts') {
        const p = await fetch(`/api/social/posts?offset=${offset}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null);
        return p?.posts || [];
      }

      if (currentTab === 'reviews') {
        const r = await fetch(`/api/social/reviews/feed?offset=${offset}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null);
        return r?.reviews || [];
      }

      // 'all' -> Hem gönderiler hem incelemeler
      const [p, r] = await Promise.all([
        fetch(`/api/social/posts?offset=${offset}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null),
        fetch(`/api/social/reviews/feed?offset=${offset}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null),
      ]);

      if (p === null && r === null) return null;

      const birlesik = [...(p?.posts || []), ...(r?.reviews || [])];
      birlesik.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
      return birlesik;
    } catch {
      return null;
    }
  }, []);

  // Sekme değiştiğinde veya ilk yüklemede
  useEffect(() => {
    let iptal = false;
    setLoading(true);
    setItems(null);
    offsetRef.current = 0;
    cekiliyorRef.current = true;

    sayfaCek(0, tab).then((satirlar) => {
      cekiliyorRef.current = false;
      if (iptal) return;
      setBozuk(satirlar === null);
      if (satirlar !== null) {
        setItems(satirlar);
        offsetRef.current = satirlar.length;
        setDahaVar(satirlar.length >= SAYFA);
      }
      setLoading(false);
    });

    return () => { iptal = true; };
  }, [tab, sayfaCek]);

  // Sayfalama (Daha fazla yükle)
  const dahaYukle = useCallback(async () => {
    if (cekiliyorRef.current || !dahaVar) return;
    cekiliyorRef.current = true;
    setLoading(true);

    const satirlar = await sayfaCek(offsetRef.current, tab);
    if (satirlar === null) {
      setBozuk(true);
    } else {
      setBozuk(false);
      setItems((onceki) => {
        const gorulen = new Set((onceki || []).map(anahtar));
        return [...(onceki || []), ...satirlar.filter((x) => !gorulen.has(anahtar(x)))];
      });
      offsetRef.current += satirlar.length;
      setDahaVar(satirlar.length >= SAYFA);
    }

    setLoading(false);
    cekiliyorRef.current = false;
  }, [dahaVar, tab, sayfaCek]);

  // Sonsuz kaydırma
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

  // Yeni gönderi başarıyla eklendiğinde
  const handlePostCreated = (newPost) => {
    setItems((prev) => [newPost, ...(prev || [])]);
  };

  // Gönderi silindiğinde
  const handlePostDeleted = (postId) => {
    setItems((prev) => (prev || []).filter((item) => item.id !== postId));
  };

  // Beğeni değiştiğinde
  const handleLikeToggled = (postId, liked, likeCount) => {
    setItems((prev) =>
      (prev || []).map((item) => {
        if (item.id === postId) {
          return { ...item, likedByMe: liked, likeCount };
        }
        return item;
      })
    );
  };

  // Yorum sayısı güncellendiğinde
  const handleReplyCountIncrement = (targetId) => {
    setItems((prev) =>
      (prev || []).map((item) => {
        const k = anahtar(item);
        if (k === targetId || item.id === targetId) {
          return { ...item, replyCount: (item.replyCount || 0) + 1 };
        }
        return item;
      })
    );
  };

  const bos = items !== null && items.length === 0 && !loading;

  return (
    <div className="page-transition" style={{ minHeight: '100vh', background: 'var(--bg-body)', paddingBottom: 120 }}>

      {/* ── Başlık ── */}
      <section style={{ padding: '54px 0 26px', background: 'var(--hero-bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>
                ● {tr ? 'Oyuncular ne diyor' : 'What players say'}
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.1, letterSpacing: '-1.2px', color: 'var(--text)', marginBottom: 8 }}>
                {tr ? 'Topluluk & Akış' : 'Community & Feed'}
              </h1>
              <p style={{ fontSize: 15.5, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.5 }}>
                {tr
                  ? 'Gamerisen kullanıcılarının incelemeleri, oyun önerileri ve anlık tartışmaları — web & mobil eşzamanlı.'
                  : 'Reviews, game recommendations, and discussions from Gamerisen users — synced across web & mobile.'}
              </p>
            </div>
          </div>

          {/* ── Sekmeler ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 24, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setTab('all')}
              style={{
                ...K.tabBtn,
                background: tab === 'all' ? 'var(--accent)' : 'var(--bg-card)',
                color: tab === 'all' ? '#fff' : 'var(--text-2)',
                borderColor: tab === 'all' ? 'var(--accent)' : 'var(--border)',
              }}
            >
              🌟 {tr ? 'Keşfet' : 'Discover'}
            </button>
            <button
              onClick={() => setTab('posts')}
              style={{
                ...K.tabBtn,
                background: tab === 'posts' ? 'var(--accent)' : 'var(--bg-card)',
                color: tab === 'posts' ? '#fff' : 'var(--text-2)',
                borderColor: tab === 'posts' ? 'var(--accent)' : 'var(--border)',
              }}
            >
              💬 {tr ? 'Tartışmalar' : 'Discussions'}
            </button>
            <button
              onClick={() => setTab('reviews')}
              style={{
                ...K.tabBtn,
                background: tab === 'reviews' ? 'var(--accent)' : 'var(--bg-card)',
                color: tab === 'reviews' ? '#fff' : 'var(--text-2)',
                borderColor: tab === 'reviews' ? 'var(--accent)' : 'var(--border)',
              }}
            >
              ⭐ {tr ? 'İncelemeler' : 'Reviews'}
            </button>
            {user ? (
              <button
                onClick={() => setTab('friends')}
                style={{
                  ...K.tabBtn,
                  background: tab === 'friends' ? 'var(--accent)' : 'var(--bg-card)',
                  color: tab === 'friends' ? '#fff' : 'var(--text-2)',
                  borderColor: tab === 'friends' ? 'var(--accent)' : 'var(--border)',
                }}
              >
                👥 {tr ? 'Arkadaşlar' : 'Friends'}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px 0' }}>

        {/* Gönderi Yazma Kutusu (Giriş yapılmışsa) veya Giriş Davet Kutusu */}
        {user ? (
          <PostComposer user={user} onPostCreated={handlePostCreated} tr={tr} />
        ) : (
          <GuestPrompt tr={tr} />
        )}

        {/* Ağ Hatası Uyarısı */}
        {bozuk ? (
          <div style={{ padding: '12px 16px', marginBottom: 18, borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--text)', fontSize: 14 }}>
            {tr ? 'Akış şu an yüklenemiyor. Bağlantını kontrol edip tekrar dene.' : 'The feed could not be loaded. Check your connection and try again.'}
          </div>
        ) : null}

        {/* İskelet Yükleme Ekranı */}
        {items === null && loading ? <Iskelet /> : null}

        {/* Boş Akış */}
        {bos && !bozuk ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 44, marginBottom: 12 }}>💬</p>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {tr ? 'Henüz paylaşım yapılmamış' : 'Nothing shared yet'}
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 400, margin: '0 auto' }}>
              {tab === 'friends'
                ? (tr ? 'Arkadaşlarının henüz bir paylaşımı yok.' : "Your friends haven't posted yet.")
                : (tr ? 'İlk tartışmayı veya düşünceni yukarıdan paylaşarak başlatabilirsin!' : 'Start the conversation by sharing your thoughts above!')}
            </p>
          </div>
        ) : null}

        {/* Akış Listesi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(items || []).map((x) => (
            x.id != null
              ? (
                <GonderiKarti
                  key={anahtar(x)}
                  post={x}
                  currentUser={user}
                  onLikeToggle={handleLikeToggled}
                  onOpenThread={setActiveThreadId}
                  onDelete={handlePostDeleted}
                  tr={tr}
                />
              ) : (
                <IncelemeKarti
                  key={anahtar(x)}
                  inceleme={x}
                  currentUser={user}
                  onOpenThread={setActiveThreadId}
                  onDeleteReview={(appid, uid) => {
                    setItems((prev) => (prev || []).filter((i) => !(String(i.appid) === String(appid) && String(i.uid) === String(uid))));
                  }}
                  tr={tr}
                />
              )
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

      {/* ── Thread / Yorum Modalı ── */}
      {activeThreadId ? (
        <ThreadModal
          threadId={activeThreadId}
          currentUser={user}
          onClose={() => setActiveThreadId(null)}
          onReplyAdded={() => handleReplyCountIncrement(activeThreadId)}
          onDeleteRoot={(postId) => handlePostDeleted(postId)}
          tr={tr}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Composer (Gönderi Oluşturucu)
// ─────────────────────────────────────────────────────────────────────────────

function PostComposer({ user, onPostCreated, tr }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Oyun Etiketleme Durumu
  const [gameSearchOpen, setGameSearchOpen] = useState(false);
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [gameSearching, setGameSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const searchTimerRef = useRef(null);

  // Oyun Arama Autocomplete
  useEffect(() => {
    if (!gameQuery.trim() || gameQuery.trim().length < 2) {
      setGameResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setGameSearching(true);
      try {
        const res = await fetch(`/api/games?q=${encodeURIComponent(gameQuery.trim())}&num=6`);
        if (res.ok) {
          const data = await res.json();
          setGameResults(data.results || []);
        }
      } catch {}
      setGameSearching(false);
    }, 280);

    return () => clearTimeout(searchTimerRef.current);
  }, [gameQuery]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (trimmed.length > MAX_POST_LEN) {
      setError(tr ? `En fazla ${MAX_POST_LEN} karakter yazabilirsin.` : `Maximum ${MAX_POST_LEN} characters allowed.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        action: 'create',
        text: trimmed,
        game: selectedGame ? {
          appid: selectedGame.rawgId || selectedGame.id?.replace('rawg_', ''),
          name: selectedGame.name,
          image: selectedGame.image || selectedGame.heroImage || null,
        } : null,
      };

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error === 'RATE_LIMIT'
          ? (tr ? 'Çok hızlı paylaşım yapıyorsun. Lütfen biraz bekle.' : 'You are posting too fast. Please slow down.')
          : (tr ? 'Gönderi paylaşılamadı.' : 'Failed to create post.'));
        setLoading(false);
        return;
      }

      setText('');
      setSelectedGame(null);
      setGameSearchOpen(false);
      setGameQuery('');
      if (data.post) onPostCreated(data.post);
    } catch {
      setError(tr ? 'Bağlantı hatası oluştu.' : 'Network error occurred.');
    }
    setLoading(false);
  };

  const ad = user.displayName || user.name || user.username || (tr ? 'Kullanıcı' : 'User');
  const bas = (ad || '?').trim().charAt(0).toUpperCase();

  return (
    <div style={{ ...K.kart, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Kullanıcı Avatarı */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-hover)', display: 'grid', placeItems: 'center' }}>
          {isAvatarPhoto(user.avatar)
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{bas}</span>}
        </div>

        {/* Form Alanı */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr ? 'Oyunlar veya topluluk hakkında bir şeyler paylaş...' : 'Share your thoughts on games or the community...'}
            rows={text.length > 80 ? 3 : 2}
            style={K.textarea}
          />

          {/* Seçili Oyun Çipi */}
          {selectedGame ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 20, margin: '8px 0' }}>
              {selectedGame.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={selectedGame.image} alt="" style={{ width: 28, height: 14, borderRadius: 3, objectFit: 'cover' }} />
              ) : <span>🎮</span>}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{selectedGame.name}</span>
              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-3)', padding: '0 2px' }}
                title={tr ? 'Kaldır' : 'Remove'}
              >
                ✕
              </button>
            </div>
          ) : null}

          {/* Oyun Arama Popover */}
          {gameSearchOpen && !selectedGame ? (
            <div style={{ margin: '8px 0', padding: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                  placeholder={tr ? 'Oyun adı ara...' : 'Search game name...'}
                  autoFocus
                  style={K.input}
                />
                <button
                  type="button"
                  onClick={() => { setGameSearchOpen(false); setGameQuery(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}
                >
                  {tr ? 'Kapat' : 'Close'}
                </button>
              </div>

              {gameSearching ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '4px 0' }}>{tr ? 'Aranıyor…' : 'Searching…'}</p>
              ) : null}

              {gameResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {gameResults.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGame(g);
                        setGameSearchOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                      }}
                    >
                      {g.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={g.image} alt="" style={{ width: 34, height: 16, objectFit: 'cover', borderRadius: 3 }} />
                      ) : null}
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Hata Mesajı */}
          {error ? (
            <p style={{ color: 'var(--accent)', fontSize: 12.5, marginTop: 6 }}>{error}</p>
          ) : null}

          {/* Alt Araç Çubuğu */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!selectedGame && !gameSearchOpen ? (
                <button
                  type="button"
                  onClick={() => setGameSearchOpen(true)}
                  style={K.iconBtn}
                >
                  🎮 {tr ? 'Oyun Etiketle' : 'Tag Game'}
                </button>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: text.length > MAX_POST_LEN ? 'var(--accent)' : 'var(--text-3)' }}>
                {text.length}/{MAX_POST_LEN}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !text.trim() || text.length > MAX_POST_LEN}
                style={{
                  ...K.btnPrimary,
                  opacity: loading || !text.trim() || text.length > MAX_POST_LEN ? 0.5 : 1,
                  cursor: loading || !text.trim() || text.length > MAX_POST_LEN ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (tr ? 'Gönderiliyor…' : 'Posting…') : (tr ? 'Paylaş' : 'Post')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestPrompt({ tr }) {
  return (
    <div style={{ ...K.kart, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>✨</span>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {tr ? 'Topluluğa sen de katıl!' : 'Join the conversation!'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {tr ? 'Tartışmalara katılmak, oyunlar hakkında fikir belirtmek ve beğenmek için giriş yap.' : 'Log in to join discussions, comment on games, and like posts.'}
          </p>
        </div>
      </div>
      <Link href="/login" style={K.btnPrimary}>
        {tr ? 'Giriş Yap / Kaydol' : 'Log In / Sign Up'}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kartlar (Gönderi & İnceleme)
// ─────────────────────────────────────────────────────────────────────────────

function Yazar({ author, at, tr }) {
  const ad = author?.displayName || author?.username || (tr ? 'Bilinmeyen' : 'Unknown');
  const bas = (ad || '?').trim().charAt(0).toUpperCase();
  const tarih = new Date(Number(at) || 0);

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
        <p style={{ fontSize: 12, color: 'var(--text-3)' }} title={tarih.toLocaleString(tr ? 'tr-TR' : 'en-US')}>
          {author?.username ? `@${author.username} · ` : ''}{gecenSure(at, tr)}
        </p>
      </div>
    </>
  );

  return author?.username ? (
    <Link href={`/u/${author.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, textDecoration: 'none' }}>
      {icerik}
    </Link>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>{icerik}</div>
  );
}

function isPrivilegedUser(u) {
  if (!u) return false;
  const uname = String(u.username || '').replace(/^@/, '').toLowerCase().trim();
  return ['batuta', 'test'].includes(uname);
}

function GonderiKarti({ post, currentUser, onLikeToggle, onOpenThread, onDelete, tr }) {
  const [likePending, setLikePending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDev = isPrivilegedUser(currentUser);
  const isMine = (currentUser && currentUser.uid === post.uid) || post.isMine;
  const canDelete = isMine || isDev;

  const handleLike = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    if (likePending) return;
    setLikePending(true);

    const nextLiked = !post.likedByMe;
    const nextCount = Math.max(0, (post.likeCount || 0) + (nextLiked ? 1 : -1));
    onLikeToggle(post.id, nextLiked, nextCount);

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', id: post.id }),
      });
      const data = await res.json();
      if (res.ok && data.liked !== undefined) {
        onLikeToggle(post.id, data.liked, data.likeCount);
      }
    } catch {}
    setLikePending(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(tr ? 'Bu gönderiyi silmek istediğinden emin misin?' : 'Are you sure you want to delete this post?')) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: post.id }),
      });
      if (res.ok) {
        onDelete(post.id);
      }
    } catch {}
    setDeleting(false);
  };

  return (
    <article style={{ ...K.kart, opacity: deleting ? 0.4 : 1 }}>
      <div style={K.govde}>
        <div style={K.ust}>
          <Yazar author={post.author} at={post.at} tr={tr} />
          {canDelete ? (
            <button
              onClick={handleDelete}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12,
                color: '#ef4444',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
              title={isDev && !isMine ? (tr ? 'Moderatör Olarak Sil' : 'Delete as Moderator') : (tr ? 'Sil' : 'Delete')}
            >
              <span>🗑️</span>
              <span>{tr ? 'Sil' : 'Delete'}</span>
            </button>
          ) : null}
        </div>

        <p style={K.metin}>{post.text}</p>

        {post.game?.appid ? (
          <Link
            href={`/game/rawg/rawg_${post.game.appid}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 12, padding: '7px 12px 7px 7px', borderRadius: 999, background: 'var(--bg-hover)', border: '1px solid var(--border)', textDecoration: 'none' }}
          >
            {post.game.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={post.game.image} alt="" loading="lazy" style={{ width: 34, height: 16, objectFit: 'cover', borderRadius: 3 }} />
            ) : null}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{post.game.name}</span>
          </Link>
        ) : null}

        {/* Eylem Butonları */}
        <div style={K.alt}>
          <button
            type="button"
            onClick={handleLike}
            style={{
              ...K.actionBtn,
              color: post.likedByMe ? 'var(--accent)' : 'var(--text-3)',
            }}
          >
            <span style={{ fontSize: 15 }}>{post.likedByMe ? '❤️' : '🤍'}</span>
            <span style={{ fontWeight: 600 }}>{post.likeCount || 0}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenThread(post.id)}
            style={K.actionBtn}
          >
            <span style={{ fontSize: 15 }}>💬</span>
            <span style={{ fontWeight: 600 }}>{post.replyCount || 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function IncelemeKarti({ inceleme, currentUser, onOpenThread, onDeleteReview, tr }) {
  const [deleting, setDeleting] = useState(false);
  const isDev = isPrivilegedUser(currentUser);
  const isMine = currentUser && (currentUser.uid === inceleme.uid);
  const canDelete = isMine || isDev;

  const oyunAdi = inceleme.gameName || `Steam ${inceleme.appid}`;
  const saat = Number(inceleme.hours);
  const threadRef = `r:${inceleme.appid}:${inceleme.uid}`;

  const handleDelete = async (e) => {
    e?.stopPropagation();
    if (!window.confirm(tr ? 'Bu incelemeyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this review?')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/social/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: inceleme.appid, targetUid: inceleme.uid }),
      });
      if (res.ok) {
        onDeleteReview?.(inceleme.appid, inceleme.uid);
      }
    } catch {}
    setDeleting(false);
  };

  return (
    <article style={{ ...K.kart, opacity: deleting ? 0.4 : 1 }}>
      <Link href={`/game/rawg/rawg_${inceleme.appid}`} style={{ display: 'block', position: 'relative' }}>
        {inceleme.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={inceleme.image}
            alt={oyunAdi}
            loading="lazy"
            style={{ width: '100%', aspectRatio: '460 / 200', objectFit: 'cover', display: 'block', background: 'var(--bg-hover)' }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.84) 0%, transparent 55%)' }} />
        <h3 style={{ position: 'absolute', left: 16, right: 16, bottom: 12, fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 750, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
          {oyunAdi}
        </h3>
      </Link>

      <div style={K.govde}>
        <div style={K.ust}>
          <Yazar author={inceleme.author} at={inceleme.at} tr={tr} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`rev-badge ${inceleme.recommended ? 'rev-badge-yes' : 'rev-badge-no'}`}>
              {inceleme.recommended ? '👍' : '👎'}
              {inceleme.recommended ? (tr ? 'Tavsiye ediyor' : 'Recommended') : (tr ? 'Tavsiye etmiyor' : 'Not recommended')}
            </span>
            {canDelete ? (
              <button
                onClick={handleDelete}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#ef4444',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                title={isDev && !isMine ? (tr ? 'Moderatör Olarak Sil' : 'Delete as Moderator') : (tr ? 'Sil' : 'Delete')}
              >
                <span>🗑️</span>
                <span>{tr ? 'Sil' : 'Delete'}</span>
              </button>
            ) : null}
          </div>
        </div>

        <p style={K.metin}>{inceleme.text}</p>

        <div style={K.alt}>
          {saat > 0 ? (
            <span style={{ fontSize: 12.5, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              🕒 {tr ? `${saat} saat oynandı` : `${saat}h played`}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenThread(threadRef)}
            style={K.actionBtn}
          >
            <span style={{ fontSize: 15 }}>💬</span>
            <span style={{ fontWeight: 600 }}>{inceleme.replyCount || 0} {tr ? 'yanıt' : 'replies'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread Modal (Yorumlar ve Yanıtlar Görünümü)
// ─────────────────────────────────────────────────────────────────────────────

function ThreadModal({ threadId, currentUser, onClose, onReplyAdded, onDeleteRoot, tr }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const replyEndRef = useRef(null);
  const isDev = isPrivilegedUser(currentUser);

  useEffect(() => {
    let iptal = false;
    setLoading(true);
    fetch(`/api/social/posts/${encodeURIComponent(threadId)}`)
      .then((r) => r.json())
      .then((res) => {
        if (!iptal && !res.error) {
          setData(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!iptal) setLoading(false);
      });

    return () => { iptal = true; };
  }, [threadId]);

  const handleDeleteRoot = async () => {
    if (!window.confirm(tr ? 'Bu gönderiyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: data.post.id }),
      });
      if (res.ok) {
        onClose();
        onDeleteRoot?.(data.post.id);
      }
    } catch {}
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm(tr ? 'Bu yanıtı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this reply?')) return;
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: replyId }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          replies: (prev?.replies || []).filter((r) => r.id !== replyId),
        }));
      }
    } catch {}
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    const trimmed = replyText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          replyTo: threadId,
          text: trimmed,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        setError(tr ? 'Yanıt gönderilemedi.' : 'Failed to send reply.');
        setSending(false);
        return;
      }

      setReplyText('');
      if (resData.post) {
        setData((prev) => ({
          ...prev,
          replies: [...(prev?.replies || []), resData.post],
        }));
        onReplyAdded();
        setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {
      setError(tr ? 'Bağlantı hatası.' : 'Network error.');
    }
    setSending(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Başlığı */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {tr ? 'Konuşma & Yanıtlar' : 'Conversation & Replies'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-3)', padding: '2px 6px' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: 30 }}>{tr ? 'Yükleniyor…' : 'Loading…'}</p>
          ) : data?.post ? (
            <div>
              {/* Ana Kök Gönderi / İnceleme */}
              <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Yazar author={data.post.author} at={data.post.at} tr={tr} />
                  {currentUser && data.post.id && (data.post.uid === currentUser.uid || data.post.author?.uid === currentUser.uid || isDev) ? (
                    <button
                      type="button"
                      onClick={handleDeleteRoot}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-3)',
                        padding: '2px 6px',
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                      title={isDev ? (tr ? 'Sil (Moderatör)' : 'Delete (Mod)') : (tr ? 'Sil' : 'Delete')}
                    >
                      🗑️
                    </button>
                  ) : null}
                </div>
                <p style={{ ...K.metin, marginTop: 10, fontSize: 15.5 }}>{data.post.text}</p>
                {data.post.game?.name ? (
                  <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>
                    🎮 {data.post.game.name}
                  </span>
                ) : null}
              </div>

              {/* Yanıtlar Listesi */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {tr ? `Yanıtlar (${(data.replies || []).length})` : `Replies (${(data.replies || []).length})`}
                </p>

                {(data.replies || []).length === 0 ? (
                  <p style={{ fontSize: 13.5, color: 'var(--text-3)', fontStyle: 'italic', padding: '12px 0' }}>
                    {tr ? 'Henüz yanıt yazılmamış. İlk yanıtı sen yaz!' : 'No replies yet. Be the first to reply!'}
                  </p>
                ) : null}

                {(data.replies || []).map((rep) => {
                  const isReplyMine = currentUser && (
                    rep.uid === currentUser.uid ||
                    rep.author?.uid === currentUser.uid ||
                    isDev
                  );

                  return (
                    <div key={rep.id} style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Yazar author={rep.author} at={rep.at} tr={tr} />
                        {isReplyMine ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteReply(rep.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 13,
                              color: 'var(--text-3)',
                              padding: '2px 6px',
                              opacity: 0.7,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                            title={isDev && rep.uid !== currentUser.uid ? (tr ? 'Yanıtı Sil (Moderatör)' : 'Delete Reply (Mod)') : (tr ? 'Yanıtı Sil' : 'Delete Reply')}
                          >
                            🗑️
                          </button>
                        ) : null}
                      </div>
                      <p style={{ ...K.metin, marginTop: 8, fontSize: 14.5 }}>{rep.text}</p>
                    </div>
                  );
                })}
                <div ref={replyEndRef} />
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: 30 }}>
              {tr ? 'Konu bulunamadı.' : 'Thread not found.'}
            </p>
          )}
        </div>

        {/* Yanıt Yazma Alanı (Alt kısım) */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder={tr ? 'Yanıtını yaz...' : 'Write your reply...'}
                  maxLength={MAX_POST_LEN}
                  style={{ ...K.input, paddingRight: replyText ? 32 : 12, width: '100%' }}
                />
                {replyText ? (
                  <button
                    type="button"
                    onClick={() => setReplyText('')}
                    style={{
                      position: 'absolute',
                      right: 8,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      fontSize: 14,
                      padding: 4,
                    }}
                    title={tr ? 'Temizle' : 'Clear'}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                style={{
                  ...K.btnPrimary,
                  opacity: sending || !replyText.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {sending ? '…' : (tr ? 'Yanıtla' : 'Reply')}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <Link href="/login" style={{ fontSize: 13.5, color: 'var(--accent)', fontWeight: 600 }}>
                {tr ? 'Yanıt yazmak için giriş yap' : 'Log in to write a reply'}
              </Link>
            </div>
          )}
          {error ? <p style={{ color: 'var(--accent)', fontSize: 12, marginTop: 4 }}>{error}</p> : null}
        </div>
      </div>
    </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// Stiller
// ─────────────────────────────────────────────────────────────────────────────

const K = {
  kart: {
    borderRadius: 14,
    overflow: 'hidden',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
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
  alt: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' },
  tabBtn: {
    padding: '7px 14px',
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 650,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14.5,
    color: 'var(--text)',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13.5,
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    borderRadius: 8,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 650,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.15s',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 6,
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-2)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 6,
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-2)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.12s, color 0.12s',
  },
};

