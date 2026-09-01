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
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator,
  ScrollView, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import Avatar from '../src/components/Avatar';
import EmptyState from '../src/components/EmptyState';
import PersonMenu from '../src/components/PersonMenu';
import ReportSheet from '../src/components/ReportSheet';
import { radius, spacing, type, PRESSED, NUMERIC, SECTION_TITLE, TOUCH_MIN, avatar as avatarSize } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { getFriends, searchUsers, friendAction, blockUser } from '../src/api/social';
import { getSession } from '../src/services/session';

export default function FriendsScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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
          onPress: async () => { try { await blockUser(kisi.uid); await load(); } catch { /* sessiz */ } },
        },
      ]);
      return;
    }
    if (anahtar === 'report') setSikayet(kisi);
  }, [menu, router, act, load, t]);

  const bekleyen = data?.incoming?.length || 0;
  const arama = results !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}
                   style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t('soc.tabFriends')}
          {data ? <Text style={NUMERIC}>{` · ${data.friends.length}`}</Text> : null}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={colors.text3} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('soc.searchPlaceholder')}
          placeholderTextColor={colors.text3}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}
                     accessibilityRole="button" accessibilityLabel={t('a11y.clear')}>
            <Ionicons name="close-circle" size={17} color={colors.text3} />
          </Pressable>
        ) : null}
      </View>

      {data === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.s40 }]}
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
              Kaydırınca yukarı gidiyor, sabit değil: acil değil, bekleyebilir. */}
          {!arama && bekleyen > 0 ? (
            <Pressable
              onPress={() => router.push('/friend-requests')}
              style={({ pressed }) => [styles.band, pressed && PRESSED]}
            >
              {/* YIĞILMIŞ AVATARLAR — örtüşme NEGATİF BOŞLUKLA DEĞİL, mutlak
                  konumla kuruluyor. İkisi de aynı görüntüyü verir ama üst üste
                  binme bir KONUMLANDIRMA işi, boşluk ölçeğinin işi değil
                  (ölçekte negatif basamak yok ve olması da doğru olmaz). */}
              {(() => {
                const kisiler = data.incoming.slice(0, 3);
                const adim = avatarSize.md - 10;       // 10pt örtüşme
                return (
                  <View style={{ width: avatarSize.md + (kisiler.length - 1) * adim, height: avatarSize.md }}>
                    {kisiler.map((p, i) => (
                      <View key={p.uid} style={[styles.bandAvatar, { left: i * adim }]}>
                        <Avatar avatar={p.avatar} name={p.displayName || p.username} size={avatarSize.md} />
                      </View>
                    ))}
                  </View>
                );
              })()}
              <View style={styles.bandText}>
                <Text style={styles.bandTitle} numberOfLines={1}>{t('soc.incoming')}</Text>
                <Text style={styles.bandSub} numberOfLines={1}>
                  {data.incoming.slice(0, 2).map((p) => p.displayName || p.username).join(', ')}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, NUMERIC]}>{bekleyen > 9 ? '9+' : bekleyen}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text3} />
            </Pressable>
          ) : null}

          {arama ? (
            results.length === 0 ? (
              <Text style={styles.inlineEmpty}>{t('soc.noResults')}</Text>
            ) : (
              results.map((r) => (
                <PersonRow
                  key={r.uid}
                  person={r}
                  onPress={() => router.push(`/u/${r.username}`)}
                  onLongPress={() => setMenu({ person: r, arkadas: r.relation === 'friends' })}
                  right={
                    r.relation === 'friends' ? <Tag text={t('soc.friends')} />
                    : r.relation === 'requested' ? <Tag text={t('soc.requested')} />
                    : r.relation === 'incoming'
                      ? <SmallBtn label={t('soc.accept')} onPress={() => act(r.uid, 'accept')} />
                      : <SmallBtn label={t('soc.add')} onPress={() => act(r.uid, 'request')} />
                  }
                />
              ))
            )
          ) : data.friends.length === 0 ? (
            <EmptyState icon="people-outline" title={t('soc.noFriends')} text={t('soc.noFriendsText')} />
          ) : (
            <>
              <Text style={styles.sectionLabel}>
                {t('soc.all')}<Text style={NUMERIC}>{` · ${data.friends.length}`}</Text>
              </Text>
              {data.friends.map((f) => (
                <PersonRow
                  key={f.uid}
                  person={f}
                  onPress={() => router.push(`/u/${f.username}`)}
                  onLongPress={() => setMenu({ person: f, arkadas: true })}
                  right={
                    <Pressable onPress={() => router.push(`/chat/${f.uid}`)} hitSlop={8}
                               style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                               accessibilityRole="button" accessibilityLabel={t('soc.menu.message')}>
                      <Ionicons name="mail-outline" size={19} color={colors.text3} />
                    </Pressable>
                  }
                />
              ))}
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

/** Kişi satırı — h64, avatar 44. Dokunuş profile gider. */
export function PersonRow({ person, right, onPress, onLongPress, sub }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && PRESSED]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <Avatar avatar={person.avatar} name={person.displayName || person.username} size={avatarSize.list} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.rowName}>{person.displayName || person.username}</Text>
        <Text numberOfLines={1} style={styles.rowSub}>{sub || `@${person.username}`}</Text>
      </View>
      {right}
    </Pressable>
  );
}

export function SmallBtn({ label, onPress, ghost }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallBtn, ghost && styles.smallBtnGhost, pressed && PRESSED]}>
      <Text style={[styles.smallBtnText, ghost && styles.smallBtnTextGhost]}>{label}</Text>
    </Pressable>
  );
}

function Tag({ text }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>;
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.s20 },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4 },
  title: { flex: 1, textAlign: 'center', fontSize: type.body, fontWeight: '600', color: colors.text },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    height: TOUCH_MIN, marginHorizontal: spacing.s20, marginTop: spacing.s12,
    paddingHorizontal: spacing.s12, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, fontSize: type.subhead, color: colors.text, padding: 0 },

  band: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    marginTop: spacing.s16, padding: spacing.s16, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  bandAvatar: {
    position: 'absolute', top: 0,
    borderWidth: 2, borderColor: colors.bg, borderRadius: radius.pill,
  },
  bandText: { flex: 1, minWidth: 0 },
  bandTitle: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  bandSub: { fontSize: type.footnote, fontWeight: '500', color: colors.text2, marginTop: spacing.s4 },
  badge: {
    minWidth: 24, height: 24, paddingHorizontal: spacing.s8, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    // Metin taşıyan dolgu → accentFillStrong (bkz. check-accent.mjs).
    backgroundColor: colors.accentFillStrong,
  },
  badgeText: { fontSize: type.footnote, fontWeight: '600', color: colors.onAccent },

  sectionLabel: { ...SECTION_TITLE, color: colors.text3, marginTop: spacing.s20, marginBottom: spacing.s8 },
  inlineEmpty: { fontSize: type.footnote, color: colors.text3, textAlign: 'center', marginTop: spacing.s24 },

  // h64 ritmi ayırıcının işini yapıyor; çizgi eklemek listeyi ağırlaştırırdı.
  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.s12 },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: type.footnote, fontWeight: '500', color: colors.text3, marginTop: spacing.s4 },

  smallBtn: {
    height: 32, paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentFillStrong,
  },
  smallBtnGhost: { backgroundColor: colors.bgInput },
  smallBtnText: { fontSize: type.footnote, fontWeight: '600', color: colors.onAccent },
  smallBtnTextGhost: { color: colors.text },

  tag: {
    height: 28, paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tagText: { fontSize: type.footnote, fontWeight: '500', color: colors.text2 },
});
