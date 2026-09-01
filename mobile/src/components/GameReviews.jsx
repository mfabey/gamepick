import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import ReviewComposer from './ReviewComposer';
import { radius, spacing, type, PRESSED, NUMERIC, TOUCH_MIN, avatar as avatarSize } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '../hooks/useQuery';
import { getGameReviews } from '../api/social';
import { getSession } from '../services/session';

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
function Row({ review, onOpenThread, onAuthor }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, lang } = useLanguage();

  const ad = review.author?.displayName || review.author?.username || '';
  const saat = Math.round(Number(review.hours) || 0);

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowHead} onPress={onAuthor}>
        <Avatar avatar={review.author?.avatar} name={ad} size={avatarSize.md} />
        <Text style={styles.name} numberOfLines={1}>{ad}</Text>
        <View style={styles.verified}>
          <Ionicons name="shield-checkmark" size={11} color={colors.green} />
          <Text style={[styles.verifiedText, NUMERIC]}>
            {saat}{lang === 'tr' ? ' SA' : ' H'}
          </Text>
        </View>
        <Ionicons
          name={review.recommended ? 'thumbs-up-outline' : 'thumbs-down-outline'}
          size={15}
          color={review.recommended ? colors.green : colors.text3}
        />
      </Pressable>

      <Text style={styles.text} numberOfLines={3}>{review.text}</Text>

      {/* ── YANIT KAPISI HER ZAMAN AÇIK ──
          Bu satır bir sürüm boyunca YALNIZ `replyCount > 0` iken çizildi ve
          sonuç kısır döngüydü: ilk yanıtı yazmanın yolu yoktu, kapı ancak
          birileri ondan geçtikten sonra beliriyordu.
          Kural "0 yanıt yazma"ydı ve SAYIYA aitti — eylemi de birlikte
          silmek yanlıştı. Sayı yoksa satır bir sayı değil, bir DAVET:
          "Yanıtla". */}
      <Pressable onPress={onOpenThread} hitSlop={8}
                 style={({ pressed }) => [styles.threadBtn, pressed && PRESSED]}>
        <Ionicons name="arrow-undo-outline" size={13} color={colors.text3} />
        <Text style={styles.threadText}>
          {Number(review.replyCount) > 0 ? (
            <><Text style={NUMERIC}>{review.replyCount}</Text> {t('post.repliesCount')} · {t('rev.openThread')}</>
          ) : t('post.replyTitle')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * @param appid    Steam uygulama kimliği
 * @param gameName kapak/başlıktan gelen ad — kompozitöre veriliyor
 */
export default function GameReviews({ appid, gameName }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [yazma, setYazma] = useState(false);

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
    return benim ? [benim, ...digerleri] : digerleri;
  }, [data]);

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
      <View style={styles.invite}>
        <View style={styles.verified}>
          <Ionicons name="shield-checkmark" size={11} color={colors.green} />
          <Text style={[styles.verifiedText, NUMERIC]}>{saat} {t('rev.hoursShort')}</Text>
        </View>
        <Text style={styles.inviteTitle}>{t('rev.inviteTitle')}</Text>
        <Text style={styles.inviteText}>{t('rev.inviteDesc')}</Text>
        <Pressable onPress={yaz} style={({ pressed }) => [styles.inviteBtn, pressed && PRESSED]}>
          <Ionicons name="create-outline" size={17} color={colors.onAccent} />
          <Text style={styles.inviteBtnText}>{t('rev.write')}</Text>
        </Pressable>

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
        <Text style={styles.title}>{t('detail.userReviews')}</Text>
        {/* Düzenleme çağrısı yalnız kendi incelemesi olanda; olmayan ve
            oynamış olan kullanıcı aşağıdaki davet bloğunu görüyor. */}
        {data?.mine ? (
          <Pressable onPress={yaz} hitSlop={8} style={({ pressed }) => [styles.editBtn, pressed && PRESSED]}>
            <Ionicons name="create-outline" size={13} color={colors.text} />
            <Text style={styles.editText}>{t('rev.edit')}</Text>
          </Pressable>
        ) : null}
      </View>

      {gorunen.map((r) => (
        <Row
          key={`${r.appid}:${r.uid}`}
          review={r}
          onOpenThread={() => konuAc(r)}
          onAuthor={() => r.author?.username && router.push(`/u/${r.author.username}`)}
        />
      ))}

      {!hepsiAcik && liste.length > GOSTERILEN ? (
        <Pressable onPress={() => setHepsiAcik(true)}
                   style={({ pressed }) => [styles.moreBtn, pressed && PRESSED]}>
          <Text style={styles.moreText}>
            {/* AYRI EKRAN AÇILMIYOR: sunucu zaten en çok 20 kayıt döndürüyor
                ve hepsi elde. Bir liste ekranı için ikinci bir uç, ikinci bir
                sayfalama ve geri gelince kaybolan kaydırma konumu demekti. */}
            <Text style={NUMERIC}>{liste.length}</Text> {t('rev.seeAll')}
          </Text>
        </Pressable>
      ) : null}

      {/* Oynadığı hâlde yazmamış kullanıcıya davet, listenin ALTINDA:
          önce başkaları ne demiş okunuyor, sonra yazma teklifi geliyor. */}
      {!data?.mine && Math.round(Number(data?.eligible?.hours) || 0) > 0 ? (
        <Pressable onPress={yaz} style={({ pressed }) => [styles.inlineInvite, pressed && PRESSED]}>
          <Ionicons name="create-outline" size={15} color={colors.accentText} />
          <Text style={styles.inlineInviteText}>{t('rev.inviteShort')}</Text>
        </Pressable>
      ) : null}

      <ReviewComposer
        visible={yazma}
        onClose={() => setYazma(false)}
        appid={appid}
        gameName={data?.eligible?.name || gameName}
        existing={data?.mine || null}
        onSaved={() => { setYazma(false); refetch(); }}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.s8,
  },
  title: { fontSize: type.body, fontWeight: '600', color: colors.text },
  editBtn: {
    height: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.s4,
    paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    backgroundColor: colors.bgInput,
  },
  editText: { fontSize: type.footnote, fontWeight: '600', color: colors.text },

  row: {
    paddingVertical: spacing.s16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  name: { flex: 1, minWidth: 0, fontSize: type.subhead, fontWeight: '600', color: colors.text },
  verified: {
    alignSelf: 'flex-start', height: 24, flexDirection: 'row', alignItems: 'center',
    gap: spacing.s4, paddingHorizontal: spacing.s8, borderRadius: radius.pill,
    backgroundColor: colors.greenWash, borderWidth: 1, borderColor: colors.greenWashBorder,
  },
  verifiedText: { fontSize: type.caption2, fontWeight: '600', color: colors.green },
  text: { fontSize: type.subhead, color: colors.text2, lineHeight: 22, marginTop: spacing.s8 },
  threadBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.s4, marginTop: spacing.s12 },
  threadText: { fontSize: type.footnote, fontWeight: '500', color: colors.text3 },

  moreBtn: {
    height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.s12, borderRadius: radius.md, backgroundColor: colors.bgInput,
  },
  moreText: { fontSize: type.subhead, fontWeight: '600', color: colors.text },

  invite: {
    padding: spacing.s16, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'flex-start',
  },
  inviteTitle: { fontSize: type.body, fontWeight: '600', color: colors.text, marginTop: spacing.s12 },
  inviteText: { fontSize: type.footnote, color: colors.text2, lineHeight: 19, marginTop: spacing.s4 },
  inviteBtn: {
    alignSelf: 'stretch', height: TOUCH_MIN, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.s8,
    marginTop: spacing.s16, borderRadius: radius.md,
    backgroundColor: colors.accentFillStrong,
  },
  inviteBtnText: { fontSize: type.subhead, fontWeight: '600', color: colors.onAccent },

  inlineInvite: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s8,
    minHeight: TOUCH_MIN, marginTop: spacing.s8,
  },
  inlineInviteText: { fontSize: type.subhead, fontWeight: '600', color: colors.accentText },
});
