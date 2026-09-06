import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  uidForUsername, getProfile, getPrivacy,
} from '../../lib/social-store';
import { countUserReviews, listUserReviews } from '../../lib/review-store';
import { countUserPosts } from '../../lib/post-store';
import { redisCmd, redisGetJSON } from '../../lib/redis';
import { isAvatarPhoto } from '../../lib/avatar-presets';

// ─────────────────────────────────────────────────────────────────────────────
// Herkese açık profil — WEB.
//
// NEDEN VAR: mobil profilin "Paylaş" düğmesinin gidecek bir yeri yoktu.
// Paylaşılan bağlantı yalnızca uygulaması olanlarda açılan bir şema
// (`gamerisen://`) olsaydı, bağlantıyı alan çoğu kişi hiçbir şey görmezdi —
// paylaşmanın anlamı da tam olarak uygulaması OLMAYAN birine göstermek.
//
// SUNUCU BİLEŞENİ, istemci değil. İki sebep:
//   1. Bağlantı ÖNİZLEMESİ (WhatsApp/X/Discord) sunucudan gelen meta
//      etiketlerini okuyor; istemci tarafı bir sayfa boş kart gösterirdi.
//   2. Veri zaten sunucuda: depo fonksiyonları doğrudan çağrılıyor, kendi
//      API'mize HTTP turu atılmıyor.
//
// GİZLİLİK KAPILARI:
//   · discoverable kapalı veya privateProfile açık → kimlik görünür, içerik gizli
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://www.gamerisen.com';

async function profilOku(username) {
  const uid = await uidForUsername(username).catch(() => null);
  if (!uid) return null;

  const profile = await getProfile(uid).catch(() => null);
  if (!profile?.username) return null;

  const privacy = await getPrivacy(uid).catch(() => null);
  const gizli = !!privacy?.privateProfile || privacy?.discoverable === false;

  const [arkadas, gonderi, inceleme, koleksiyonlar, incelemeler] = await Promise.all([
    redisCmd(['SCARD', `friends:${uid}`]).then((n) => Number(n) || 0).catch(() => 0),
    countUserPosts(uid).catch(() => 0),
    countUserReviews(uid).catch(() => 0),
    gizli ? Promise.resolve(null) : redisGetJSON(`user_collections:${uid}`).catch(() => null),
    gizli ? Promise.resolve([]) : listUserReviews(uid, { limit: 3 }).catch(() => []),
  ]);

  // Koleksiyonlar tek ızgaraya düzleşiyor ve tekilleşiyor — mobildeki
  // kuralın aynısı: aynı oyun iki koleksiyonda olabiliyor.
  const gorulen = new Set();
  const oyunlar = [];
  for (const c of Array.isArray(koleksiyonlar) ? koleksiyonlar : []) {
    for (const g of Array.isArray(c?.games) ? c.games : []) {
      const k = String(g?.id ?? g?.appid ?? '');
      if (!k || gorulen.has(k)) continue;
      gorulen.add(k);
      oyunlar.push({ id: k, name: g.name || '', image: g.image || '' });
    }
  }

  return {
    profile, gizli, oyunlar, incelemeler,
    sayac: { arkadas, gonderi, inceleme, oyun: Number(profile.gameCount) || 0 },
  };
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const veri = await profilOku(username).catch(() => null);
  if (!veri) return { title: 'Gamerisen' };

  const ad = veri.profile.displayName || veri.profile.username;
  return {
    title: `${ad} (@${veri.profile.username}) · Gamerisen`,
    description: veri.profile.bio
      || `${ad} Gamerisen'de ${veri.sayac.oyun} oyun, ${veri.sayac.inceleme} inceleme.`,
    openGraph: {
      title: `${ad} (@${veri.profile.username})`,
      description: veri.profile.bio || 'Gamerisen profili',
      url: `${SITE}/u/${veri.profile.username}`,
      type: 'profile',
    },
  };
}

export default async function UserProfilePage({ params }) {
  const { username } = await params;
  const veri = await profilOku(username);
  if (!veri) notFound();

  const { profile, gizli, oyunlar, incelemeler, sayac } = veri;
  const ad = profile.displayName || profile.username;
  const bas = (ad || '?').trim().charAt(0).toUpperCase();

  return (
    <main style={S.sayfa}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/profile" style={S.geriLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Profil Merkezine Dön
        </Link>
      </div>

      <section style={S.kimlik}>
        <div style={S.avatar}>
          {isAvatarPhoto(profile.avatar)
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={profile.avatar} alt="" style={S.avatarImg} />
            : <span style={S.avatarHarf}>{bas}</span>}
        </div>

        <div style={{ minWidth: 0 }}>
          <h1 style={S.ad}>{ad}</h1>
          <p style={S.kullanici}>@{profile.username}</p>
          {profile.bio ? <p style={S.bio}>{profile.bio}</p> : null}
        </div>
      </section>

      {/* Sayaçlar mobildeki üçlüyle AYNI: gönderi · arkadaş · oyun. */}
      <section style={S.sayaclar}>
        <Sayac n={sayac.gonderi} etiket="gönderi" />
        <Sayac n={sayac.arkadas} etiket="arkadaş" />
        <Sayac n={sayac.oyun} etiket="oyun" />
      </section>

      {gizli ? (
        <section style={S.kilit}>
          <h2 style={S.kilitBaslik}>Bu profil gizli</h2>
          <p style={S.kilitMetin}>
            {ad} koleksiyonunu, incelemelerini ve gönderilerini yalnız
            arkadaşlarına gösteriyor.
          </p>
        </section>
      ) : (
        <>
          {oyunlar.length > 0 ? (
            <section>
              <h2 style={S.bolum}>Koleksiyon · {oyunlar.length}</h2>
              <div style={S.izgara}>
                {oyunlar.slice(0, 12).map((g) => (
                  <div key={g.id} style={S.kapak}>
                    {g.image
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={g.image} alt="" style={S.kapakImg} />
                      : null}
                    <span style={S.kapakAd}>{g.name}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {incelemeler.length > 0 ? (
            <section>
              <h2 style={S.bolum}>İncelemeler · {sayac.inceleme}</h2>
              {incelemeler.map((r) => (
                <article key={`${r.appid}:${r.uid}`} style={S.inceleme}>
                  <div style={S.incelemeUst}>
                    <strong style={S.oyunAd}>{r.gameName || r.appid}</strong>
                    <span style={S.saat}>{Math.round(r.hours)} saat · doğrulanmış</span>
                  </div>
                  <p style={S.incelemeMetin}>{r.text}</p>
                </article>
              ))}
            </section>
          ) : null}

          {oyunlar.length === 0 && incelemeler.length === 0 ? (
            <p style={S.bos}>{ad} henüz herkese açık bir şey paylaşmadı.</p>
          ) : null}
        </>
      )}

      {/* Uygulama çağrısı EN ALTTA ve sessiz: sayfanın işi profili göstermek,
          indirme reklamı yapmak değil. Bağlantıyı açan kişi zaten bir kişiyi
          merak ediyor. */}
      <p style={S.altNot}>
        Gamerisen’de profiller, koleksiyonlar ve doğrulanmış incelemeler.{' '}
        <a href={SITE} style={S.link}>Keşfet →</a>
      </p>
    </main>
  );
}

function Sayac({ n, etiket }) {
  return (
    <div style={S.sayac}>
      <span style={S.sayacN}>{n}</span>
      <span style={S.sayacEtiket}>{etiket}</span>
    </div>
  );
}

// Web tarafının kalıbı: satır içi stiller + globals.css değişkenleri.
const S = {
  sayfa: { maxWidth: 720, margin: '0 auto', padding: '40px 20px 64px' },

  geriLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-2)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 8,
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    transition: 'all 0.15s ease',
  },

  kimlik: { display: 'flex', alignItems: 'center', gap: 20 },
  avatar: {
    width: 88, height: 88, borderRadius: '50%', flex: 'none', overflow: 'hidden',
    background: 'var(--bg-input)', border: '1px solid var(--border-hover)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarHarf: { fontSize: 34, fontWeight: 700, color: 'var(--text-3)' },

  ad: { margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' },
  kullanici: { margin: '4px 0 0', fontSize: 15, color: 'var(--text-3)' },
  bio: { margin: '8px 0 0', fontSize: 15, lineHeight: 1.45, color: 'var(--text-2)' },

  sayaclar: { display: 'flex', gap: 32, marginTop: 24 },
  sayac: { display: 'flex', flexDirection: 'column' },
  sayacN: { fontSize: 20, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' },
  sayacEtiket: { fontSize: 13, color: 'var(--text-2)' },

  bolum: {
    margin: '32px 0 12px', fontSize: 12, fontWeight: 700, letterSpacing: 1.1,
    textTransform: 'uppercase', color: 'var(--text-3)',
  },
  izgara: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 },
  kapak: {
    position: 'relative', aspectRatio: '3 / 4', borderRadius: 'var(--radius-lg)',
    overflow: 'hidden', background: 'var(--bg-input)',
    display: 'flex', alignItems: 'flex-end', padding: 8,
  },
  kapakImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  kapakAd: {
    position: 'relative', fontSize: 11, fontWeight: 600, color: '#fff',
    textShadow: '0 1px 6px rgba(0,0,0,.8)',
  },

  inceleme: {
    padding: '16px 0', borderTop: '1px solid var(--border)',
  },
  incelemeUst: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  oyunAd: { fontSize: 15, color: 'var(--text)' },
  saat: { fontSize: 13, color: 'var(--green)' },
  incelemeMetin: { margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--text-2)' },

  kilit: {
    marginTop: 32, padding: 24, borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center',
  },
  kilitBaslik: { margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text)' },
  kilitMetin: { margin: '8px 0 0', fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5 },

  bos: { marginTop: 32, fontSize: 15, color: 'var(--text-3)' },
  altNot: { marginTop: 48, fontSize: 13, color: 'var(--text-3)' },
  link: { color: 'var(--accent)', textDecoration: 'none' },
};
