// ─────────────────────────────────────────────────────────────────────────────
// Arkadaşlar.
//
// `/social`'IN ÜÇ SEKMELİ EKRANI DAĞITILDI. O ekran aynı anda üç iş yapıyordu:
// etkinlik akışı, arkadaş listesi, istekler. Üçü de birbirine benzemeyen
// işlerdi ve sekme çubuğu bunu "aynı şeyin üç görünümü" gibi gösteriyordu.
//
// Şimdi: bu ekran YALNIZ kişi listesi. İstekler kendi ekranında (üstteki bant
// oraya götürüyor), etkinlik akışı ise KALDIRILDI — aynı sinyal anasayfada
// "arkadaşların oynuyor" şeridinde zaten var ve orada oyun kapaklarıyla
// birlikte duruyor, olay cümlesi olarak değil.
//
// UYGULAMADAKİ TEK KULLANICI ARAMA KUTUSU BURADA. Topluluk akışına ikinci bir
// arama koymak, "kim" ile "ne" aramasını aynı kutuda birleştirirdi.
//
// SATIRA DOKUNMAK PROFİLE GİDİYOR. Öncesinde satır hiçbir şey yapmıyordu;
// kişiye ulaşmanın tek yolu sağdaki mesaj düğmesiydi — yani birini tanımadan
// önce ona yazmak gerekiyordu.
//
// 2.0 (tasarım dışı ekran, plan: "NavBar + UserRow listesi"): NavBar,
// SearchField, UserRow (60 pt, avatar 44), SectionHeader. Arkadaşlık eylemi
// arkadaşlık eylemi olarak kalıyor — FollowButton'a bağlanmıyor (plan).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Pressable, StyleSheet, ActivityIndicator,
  ScrollView, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import DevBadge from '../src/components/DevBadge';
import EmptyState from '../src/components/EmptyState';
import PersonMenu from '../src/components/PersonMenu';
import ReportSheet from '../src/components/ReportSheet';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { SearchField } from '../src/components/ui/SearchField';
import { Button, IconButton, SectionHeader, Txt } from '../src/components/ui/Primitives';
import { UserAvatar, UserRow } from '../src/components/ui/Social';
import { spacing } from '../src/theme';
import { component as K, radius as dsRadius } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { getFriends, searchUsers, friendAction } from '../src/api/social';
import { engelUygula } from '../src/services/engel';
import { getSession } from '../src/services/session';

// Gelen istek bandındaki yığın: UserRow'un avatarı (44), 12 pt örtüşme.
const BANT_AVATAR = K.userRow.avatar;
const BANT_ORTUSME = 12;

export default function FriendsScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [tazeleniyor, setTazeleniyor] = useState(false);
  const [menu, setMenu] = useState(null);          // { person, arkadas }
  const [sikayet, setSikayet] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try { setData(await getFriends()); }
    catch { setData({ friends: [], incoming: [], outgoing: [] }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Arama — 400ms sönümleme. Sunucu YALNIZCA ÖN EK arıyor (kullanıcı listesi
  // gezilemiyor), o yüzden iki karakterden kısa sorgu hiç gönderilmiyor.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const v = q.trim();
    if (v.length < 2) { setResults(null); return; }
    timer.current = setTimeout(async () => {
      try { const r = await searchUsers(v); setResults(r?.results || []); }
      catch { setResults([]); }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const act = useCallback(async (uid, action) => {
    if (!getSession()) { router.push('/account'); return; }
    Haptics.selectionAsync().catch(() => {});
    try {
      await friendAction(uid, action);
      await load();
      if (results) {
        setResults((rs) => rs.map((r) => (r.uid === uid
          ? { ...r, relation: action === 'request' ? 'requested' : action === 'accept' ? 'friends' : 'none' }
          : r)));
      }
    } catch (e) {
      const k = `soc.err.${e?.code}`;
      Alert.alert(t(k) !== k ? t(k) : t('soc.err.generic'));
    }
  }, [load, results, router, t]);

  const menuSec = useCallback((anahtar) => {
    const kisi = menu?.person;
    if (!kisi) return;
    // ARTIK "PROFİLİNE GİT" VAR. Bu satır menüde bilerek yoktu çünkü gidecek
    // bir ekran yoktu; `/u/[username]` ile o boşluk kapandı.
    if (anahtar === 'profile') { router.push(`/u/${kisi.username}`); return; }
    if (anahtar === 'message') { router.push(`/chat/${kisi.uid}`); return; }
    if (anahtar === 'remove') {
      Alert.alert(kisi.displayName || kisi.username, t('soc.removeConfirm'), [
        { text: t('soc.cancel'), style: 'cancel' },
        { text: t('soc.remove'), style: 'destructive', onPress: () => act(kisi.uid, 'remove') },
      ]);
      return;
    }
    if (anahtar === 'block') {
      Alert.alert(kisi.displayName || kisi.username, t('soc.blockConfirm'), [
        { text: t('soc.cancel'), style: 'cancel' },
        {
          text: t('soc.block'),
          style: 'destructive',
          // `engelle` çağrılıyor, ham `blockUser` DEĞİL. Engelin üç işi
          // (sunucu kaydı · moderasyon bildirimi · akıştan anında kaldırma)
          // tek kapıdan geçmek zorunda — bkz. src/services/engel.js.
          // Ham API buradayken bu ekrandan yapılan engelleme sunucuya
          // yazılıyor ama moderasyon kuyruğuna hiç düşmüyordu; aynı jest
          // sohbette ve gönderi kartında bildirim üretiyordu. Apple 1.2 bunu
          // parantez içinde açıkça istiyor.
          //
          // `load()` YİNE GEREKLİ ve `engelle`nin yerel gizlemesinin yerini
          // TUTMAZ: o küme gönderi kartlarını hedefliyor, bu ekrandaki satır
          // ise arkadaşlık ilişkisi — düşüp düşmediğine sunucu karar veriyor.
          onPress: async () => { try { await engelUygula(kisi.uid); await load(); } catch { /* sessiz */ } },
        },
      ]);
      return;
    }
    if (anahtar === 'report') setSikayet(kisi);
  }, [menu, router, act, load, t]);

  const bekleyen = data?.incoming?.length || 0;
  const arama = results !== null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={data ? `${t('soc.tabFriends')} · ${data.friends.length}` : t('soc.tabFriends')} />

      <View style={[styles.searchWrap, { marginHorizontal: yan + spacing.s20 }]}>
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder={t('soc.searchPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {data === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.text2} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40, paddingHorizontal: yan + spacing.s20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={tazeleniyor}
              onRefresh={async () => { setTazeleniyor(true); await load(); setTazeleniyor(false); }}
              tintColor={colors.text2}
            />
          )}
        >
          {/* ── Gelen istek bandı ──
              SAYILI KIRMIZI ROZET YALNIZ BURADA. Kural: sayılı kırmızı ancak
              EYLEME DÖNÜŞEN bilgi için (kabul et / yoksay). Profil
              sayaçlarında rozet yok — iki rakam yan yana yarışırdı.
              Kaydırınca yukarı gidiyor, sabit değil: acil değil, bekleyebilir.
              2.0: surface1 kart (köşe 16); vurguyu artık kırmızı zemin değil
              yalnız sayı rozeti taşıyor. */}
          {!arama && bekleyen > 0 ? (
            <Pressable
              onPress={() => router.push('/friend-requests')}
              accessibilityRole="button"
              accessibilityLabel={`${t('soc.incoming')}, ${bekleyen}`}
              style={({ pressed }) => [styles.band, { backgroundColor: colors.surface1 }, pressed && styles.pressed]}
            >
              {/* YIĞILMIŞ AVATARLAR — örtüşme NEGATİF BOŞLUKLA DEĞİL, mutlak
                  konumla kuruluyor. İkisi de aynı görüntüyü verir ama üst üste
                  binme bir KONUMLANDIRMA işi, boşluk ölçeğinin işi değil
                  (ölçekte negatif basamak yok ve olması da doğru olmaz). */}
              {(() => {
                const kisiler = data.incoming.slice(0, 3);
                const adim = BANT_AVATAR - BANT_ORTUSME;
                return (
                  <View style={{ width: BANT_AVATAR + (kisiler.length - 1) * adim, height: BANT_AVATAR }}>
                    {kisiler.map((p, i) => (
                      /* Halka kartın zemini: üst üste binen yüzler birbirinden ayrılsın. */
                      <View key={p.uid} style={[styles.bandAvatar, { left: i * adim, borderColor: colors.surface1 }]}>
                        <UserAvatar avatar={p.avatar} name={p.displayName || p.username} size={BANT_AVATAR} />
                      </View>
                    ))}
                  </View>
                );
              })()}
              <View style={styles.bandText}>
                <Txt variant="cardTitle" numberOfLines={1}>{t('soc.incoming')}</Txt>
                <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>
                  {data.incoming.slice(0, 2).map((p) => p.displayName || p.username).join(', ')}
                </Txt>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.brand }]}>
                <Txt variant="badge" style={[styles.num, { color: colors.white }]}>{bekleyen > 9 ? '9+' : bekleyen}</Txt>
              </View>
              <Icon name="chev" size={K.sectionHeader.linkIcon} color={colors.text3} strokeWidth={K.sectionHeader.linkStroke} />
            </Pressable>
          ) : null}

          {arama ? (
            results.length === 0 ? (
              <Txt variant="footnote" style={[styles.inlineEmpty, { color: colors.text3 }]}>{t('soc.noResults')}</Txt>
            ) : (
              <View style={styles.list}>
                {results.map((r) => (
                  <KisiSatiri
                    key={r.uid}
                    person={r}
                    onPress={() => router.push(`/u/${r.username}`)}
                    onLongPress={() => setMenu({ person: r, arkadas: r.relation === 'friends' })}
                    right={
                      r.relation === 'friends' ? <Durum text={t('soc.friends')} />
                      : r.relation === 'requested' ? <Durum text={t('soc.requested')} />
                      : r.relation === 'incoming'
                        ? <Button title={t('soc.accept')} height={K.friends.action} onPress={() => act(r.uid, 'accept')} style={styles.action} />
                        : <Button title={t('soc.add')} variant="tinted" height={K.friends.action} onPress={() => act(r.uid, 'request')} style={styles.action} />
                    }
                  />
                ))}
              </View>
            )
          ) : data.friends.length === 0 ? (
            <EmptyState icon="people-outline" title={t('soc.noFriends')} text={t('soc.noFriendsText')} />
          ) : (
            <>
              <View style={styles.sectionTop}>
                <SectionHeader title={`${t('soc.all')} · ${data.friends.length}`} />
              </View>
              <View style={styles.list}>
                {data.friends.map((f) => (
                  <KisiSatiri
                    key={f.uid}
                    person={f}
                    onPress={() => router.push(`/u/${f.username}`)}
                    onLongPress={() => setMenu({ person: f, arkadas: true })}
                    right={
                      <IconButton icon="msg" label={t('soc.menu.message')} iconSize={K.friends.messageIcon}
                        color={colors.text2} onPress={() => router.push(`/chat/${f.uid}`)} />
                    }
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <PersonMenu
        visible={!!menu}
        person={menu?.person}
        arkadas={!!menu?.arkadas}
        onClose={() => setMenu(null)}
        onSec={menuSec}
      />

      <ReportSheet
        visible={!!sikayet}
        onClose={() => setSikayet(null)}
        targetType="user"
        targetId={sikayet?.uid}
        targetLabel={sikayet ? `@${sikayet.username}` : ''}
      />
    </SafeAreaView>
  );
}

/** Kişi satırı — 2.0 UserRow (60 pt, avatar 44); ad yanında geliştirici rozeti. */
function KisiSatiri({ person, right, onPress, onLongPress }) {
  const ad = person.displayName || person.username;
  return (
    <UserRow
      avatar={person.avatar}
      name={ad}
      handle={`@${person.username}`}
      onPress={onPress}
      onLongPress={onLongPress}
      nameAccessory={<DevBadge user={person} username={person.username} isDeveloper={person.isDeveloper} size={12} />}
      right={right}
    />
  );
}

/** Eylem olmayan ilişki durumu ("Arkadaşsınız", "İstek gönderildi"): düz metin, düğme gibi görünmüyor. */
function Durum({ text }) {
  const { colors } = useDesignTheme();
  return <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{text}</Txt>;
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.s20 },

  searchWrap: { marginTop: spacing.s8 },

  band: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    marginTop: spacing.s16, padding: spacing.s16, borderRadius: dsRadius.card,
  },
  pressed: { opacity: 0.85 },
  bandAvatar: { position: 'absolute', top: 0, borderWidth: K.friends.stackRing, borderRadius: dsRadius.pill },
  bandText: { flex: 1, minWidth: 0 },
  badge: {
    minWidth: K.iconButton.badgeSize, height: K.iconButton.badgeSize, borderRadius: K.iconButton.badgeSize / 2,
    paddingHorizontal: K.iconButton.badgePadding, alignItems: 'center', justifyContent: 'center',
  },
  num: { fontVariant: ['tabular-nums'] },

  sectionTop: { marginTop: spacing.s20, marginBottom: spacing.s4 },
  list: { marginTop: spacing.s4 },
  inlineEmpty: { textAlign: 'center', marginTop: spacing.s24 },
  action: { paddingHorizontal: spacing.s12 },
});
