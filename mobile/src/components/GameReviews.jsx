import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import DevBadge from './DevBadge';
import ReviewComposer from './ReviewComposer';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '../hooks/useQuery';
import { useModerasyon } from '../hooks/useModerasyon';
import { useEngelliler } from '../hooks/useEngelliler';
import { suz } from '../services/engel';
import ModerasyonKatmani from './ModerasyonKatmani';
import { getGameReviews } from '../api/social';
import { getSession } from '../services/session';
import { Icon } from './Icon';
import { Button, Txt } from './ui/Primitives';
import { Badge, PostHeader } from './ui/Social';
import { StatusPill } from './ui/Commerce';
import { PRESSED, NUMERIC } from '../theme';
import { useDesignTheme } from '../theme/useDesignTheme';
import { control, radius, space } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Oyun sayfasındaki KULLANICI incelemeleri.
//
// BU BÖLÜM UZUN SÜRE BİLEREK YOKTU. Gerekçe dosyalarda yazılıydı: kullanıcı
// sayısı azken her oyunun altında "0 inceleme" görmek uygulamanın ölü
// olduğunu söyler — seyrek kullanıcı içeriği, hiç içerik olmamasından kötüdür.
//
// GEREKÇE ÇÜRÜMEDİ, KOŞULU DEĞİŞTİ: bölüm artık boş sayı göstermiyor.
//   · İnceleme varsa       → en çok 3 tanesi, kendi incelemen en üstte
//   · İnceleme yoksa ama SEN o oyunu oynadıysan → davet bloğu
//   · İkisi de değilse     → BÖLÜM HİÇ ÇİZİLMİYOR
// "0 inceleme" cümlesi hiçbir durumda kurulmuyor.
//
// STEAM'İN TOPLU YÜZDESİ KALIYOR ve bu bölümün ÜSTÜNDE: o sayı binlerce
// oyuncunun toplu yargısı, buradaki üç satır ise tanıdıkların sesi. İkisi
// birbirinin yerine geçmiyor.
//
// YANIT METNİ BURADA YOK. İncelemeye yazılan yanıtlar topluluk konusunda
// okunuyor; satır yalnızca SAYIYI taşıyor ve o konuyu açan kapı oluyor.
// Sebep: oyun sayfası oyun hakkında, tartışma topluluk hakkında.
// ─────────────────────────────────────────────────────────────────────────────

const GOSTERILEN = 3;

/** Tek inceleme satırı — oyun sayfasında oyun adı YOK, zaten o sayfadayız. */
function Row({ review, onOpenThread, onAuthor, onMenu }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const ad = review.author?.displayName || review.author?.username || '';
  const saat = Math.round(Number(review.hours) || 0);
  const kullanici = review.author?.username;
  // 2.0 (27 Eyl): Topluluk'taki ReviewCard ile aynı parçalar — PostHeader
  // (avatar, ad, geliştirici + doğrulanmış saat rozeti, ⋯), metin, öneri
  // StatusPill'i ve yanıt bağlantısı. ⋯ PostHeader'ın kendi düğmesi: başlığa
  // basmak profile, ⋯ menüye gidiyor (iç içe Pressable sorunu yok).
  // Guideline 1.2: oyun sayfasındaki incelemeler de kullanıcı içeriği; ⋯ şikâyet yolu.
  return (
    <View style={[styles.row, { borderTopColor: colors.line }]}>
      <PostHeader
        avatar={review.author?.avatar}
        name={ad}
        handle={kullanici ? `@${kullanici}` : ''}
        time=""
        badge={<>
          <DevBadge user={review.author} username={kullanici} isDeveloper={review.author?.isDeveloper} size={11} />
          <Badge kind="verified" label={`${saat} ${t('rev.hoursShort')}`} />
        </>}
        onProfile={onAuthor}
        onMore={onMenu ? () => onMenu(review.author) : undefined}
      />
      <Txt variant="body" numberOfLines={3} style={[styles.text, { color: colors.text }]}>{review.text}</Txt>
      <View style={styles.altSatir}>
        <StatusPill kind={review.recommended ? 'recommends' : 'notRecommends'} />
        {/* ── YANIT KAPISI HER ZAMAN AÇIK ──
            Bir sürüm boyunca YALNIZ `replyCount > 0` iken çizildi: ilk yanıtı
            yazmanın yolu yoktu. Sayı yoksa satır bir DAVET: "Yanıtla". */}
        <Pressable onPress={onOpenThread} hitSlop={8} accessibilityRole="button"
                   style={({ pressed }) => [styles.threadBtn, pressed && PRESSED]}>
          <Icon name="reply" size={15} color={colors.text2} strokeWidth={control.iconStroke} />
          <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>
            {Number(review.replyCount) > 0 ? (
              <><Text style={NUMERIC}>{review.replyCount}</Text> {t('post.repliesCount')}</>
            ) : t('post.replyTitle')}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * @param appid    Steam uygulama kimliği
 * @param gameName kapak/başlıktan gelen ad — kompozitöre veriliyor
 */
// `hideTitle`: oyun detayı (G-07) bölümü kendi "Oyuncu İncelemeleri" başlığıyla
// açıyor; ikinci bir başlık tekrar olurdu. Düzenle düğmesi yine görünüyor.
export default function GameReviews({ appid, gameName, hideTitle = false }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [yazma, setYazma] = useState(false);
  // MODERASYON KATMANI BURADA, ÇAĞIRANDA DEĞİL. Oyun detayı ekranı zaten
  // uzun; incelemeler bu bileşenin işi, moderasyonları da öyle. Prop zinciri
  // kurmak çağıranı bu bileşenin iç yapısına bağlardı.
  const mod = useModerasyon();
  const engelSurumu = useEngelliler();

  const { data, refetch } = useQuery(
    appid ? `gamerev:${appid}` : null,
    () => getGameReviews(appid),
    { ttl: 5 * 60 * 1000, enabled: !!appid }
  );

  // KENDİ İNCELEMEN EN ÜSTTE ve listede İKİ KEZ ÇIKMIYOR: sunucu onu hem
  // `mine` hem de listenin içinde döndürüyor.
  const liste = useMemo(() => {
    const hepsi = data?.reviews || [];
    const benimUid = data?.mine?.uid;
    const digerleri = benimUid ? hepsi.filter((r) => r.uid !== benimUid) : hepsi;
    const benim = benimUid ? hepsi.find((r) => r.uid === benimUid) : null;
    // Engellenen kişinin incelemesi ANINDA düşüyor; sunucu bir sonraki
    // çekimde zaten süzüyor (bkz. services/engel.js).
    const sonuc = benim ? [benim, ...digerleri] : digerleri;
    return suz(sonuc, (r) => r?.author?.uid || r?.uid);
  }, [data, engelSurumu]);

  const [hepsiAcik, setHepsiAcik] = useState(false);
  const gorunen = hepsiAcik ? liste : liste.slice(0, GOSTERILEN);

  // ── EKRANA DÖNÜNCE TAZELE ──
  // Yanıt yazmak KONU ekranında oluyor; oraya gidip dönen kullanıcı 5 dakikalık
  // önbellek yüzünden kendi yazdığı yanıtı sayaçta göremiyordu — satır hâlâ
  // "Yanıtla" diyordu. Emülatörde görüldü; sunucunun doğru saydığı ayrıca
  // canlı uçtan doğrulandı (replyCount=1), yani sorun yalnız bayat önbellekti.
  //
  // İLK ODAK ATLANIYOR: useQuery zaten mount'ta çekiyor; burada da çekmek her
  // açılışta ikinci bir istek olurdu.
  const ilkOdak = useRef(true);
  useFocusEffect(useCallback(() => {
    if (ilkOdak.current) { ilkOdak.current = false; return; }
    refetch();
  }, [refetch]));

  const yaz = useCallback(() => {
    if (!getSession()) { router.push('/account'); return; }
    setYazma(true);
  }, [router]);

  const konuAc = useCallback((r) => {
    // Kök kimliği sunucunun biçimi (`r:{appid}:{uid}`); yol parçası olarak
    // kodlanıyor çünkü iki nokta üst üste taşıyor.
    router.push(`/post/${encodeURIComponent(`r:${r.appid}:${r.uid}`)}`);
  }, [router]);

  // ── Hiç inceleme yok ──
  if (liste.length === 0) {
    const saat = Math.round(Number(data?.eligible?.hours) || 0);
    // KARAR: oynamadıysan bölüm HİÇ ÇİZİLMİYOR. Sayfa Steam yüzdesinden
    // doğrudan sonraki bölüme geçiyor; boş bir başlık bile bırakılmıyor.
    if (!data || saat <= 0) return null;

    return (
      <View style={[styles.invite, { backgroundColor: colors.surface1 }]}>
        <Badge kind="verified" label={`${saat} ${t('rev.hoursShort')}`} />
        <Txt variant="headline" style={[styles.inviteTitle, { color: colors.text }]}>{t('rev.inviteTitle')}</Txt>
        <Txt variant="footnote" style={[styles.inviteText, { color: colors.text2 }]}>{t('rev.inviteDesc')}</Txt>
        <Button title={t('rev.write')} icon="edit" onPress={yaz} style={styles.inviteBtn} />

        <ReviewComposer
          visible={yazma}
          onClose={() => setYazma(false)}
          appid={appid}
          gameName={data?.eligible?.name || gameName}
          existing={null}
          onSaved={() => { setYazma(false); refetch(); }}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.head}>
        {hideTitle ? <View /> : <Txt variant="title2" accessibilityRole="header">{t('detail.userReviews')}</Txt>}
        {/* Düzenleme çağrısı yalnız kendi incelemesi olanda; olmayan ve
            oynamış olan kullanıcı aşağıdaki davet bloğunu görüyor. */}
        {data?.mine ? (
          <Button title={t('rev.edit')} variant="secondary" height={32} icon="edit" onPress={yaz} />
        ) : null}
      </View>

      {gorunen.map((r) => (
        <Row
          key={`${r.appid}:${r.uid}`}
          review={r}
          onOpenThread={() => konuAc(r)}
          onAuthor={() => r.author?.username && router.push(`/u/${r.author.username}`)}
          onMenu={(k) => mod.acMenu(k, { targetType: 'review', targetId: `${r.appid}:${r.uid}` })}
        />
      ))}

      {!hepsiAcik && liste.length > GOSTERILEN ? (
        <Pressable onPress={() => setHepsiAcik(true)} accessibilityRole="button"
                   style={({ pressed }) => [styles.moreBtn, { backgroundColor: colors.surface2 }, pressed && PRESSED]}>
          <Txt variant="subhead" style={{ color: colors.text, fontWeight: '600' }}>
            {/* AYRI EKRAN AÇILMIYOR: sunucu zaten en çok 20 kayıt döndürüyor
                ve hepsi elde. Bir liste ekranı için ikinci bir uç, ikinci bir
                sayfalama ve geri gelince kaybolan kaydırma konumu demekti. */}
            <Text style={NUMERIC}>{liste.length}</Text> {t('rev.seeAll')}
          </Txt>
        </Pressable>
      ) : null}

      {/* Oynadığı hâlde yazmamış kullanıcıya davet, listenin ALTINDA:
          önce başkaları ne demiş okunuyor, sonra yazma teklifi geliyor. */}
      {!data?.mine && Math.round(Number(data?.eligible?.hours) || 0) > 0 ? (
        <Button title={t('rev.inviteShort')} variant="tertiary" icon="edit" onPress={yaz} style={styles.inlineInvite} />
      ) : null}

      <ReviewComposer
        visible={yazma}
        onClose={() => setYazma(false)}
        appid={appid}
        gameName={data?.eligible?.name || gameName}
        existing={data?.mine || null}
        onSaved={() => { setYazma(false); refetch(); }}
      />
      <ModerasyonKatmani mod={mod} />

    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space[8],
  },
  row: { paddingVertical: space[16], borderTopWidth: StyleSheet.hairlineWidth },
  text: { marginTop: space[8] },
  altSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[12] },
  threadBtn: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 32 },
  moreBtn: {
    height: 44, alignItems: 'center', justifyContent: 'center',
    marginTop: space[12], borderRadius: radius.button,
  },
  invite: { padding: space[16], borderRadius: 18, alignItems: 'flex-start' },
  inviteTitle: { marginTop: space[12] },
  inviteText: { marginTop: space[4] },
  inviteBtn: { alignSelf: 'stretch', marginTop: space[16] },
  inlineInvite: { alignSelf: 'center', marginTop: space[8] },
});
