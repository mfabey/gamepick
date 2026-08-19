// ─────────────────────────────────────────────────────────────────────────────
// Sosyal ekran — akış / arkadaşlar / istekler.
//
// Üç kapı var, sırayla:
//   1. Oturum yoksa   → giriş yapmaya yönlendir
//   2. Kullanıcı adı yoksa → kurulum ekranı (sosyal kimliğin ilk adımı)
//   3. Her ikisi varsa → sekmeli içerik
//
// Kullanıcı adı kurulumu ayrı bir ekran değil, bu akışın parçası: tek başına
// hiçbir işe yaramadığı için kullanıcıyı boş bir ekrana göndermenin anlamı yok.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator,
  Alert, ScrollView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  getMyProfile, checkUsername, setUsername,
  searchUsers, getFriends, friendAction, getActivity, blockUser,
} from '../src/api/social';
import { subscribeSession, getSession } from '../src/services/session';
import ReportSheet from '../src/components/ReportSheet';
import EmptyState from '../src/components/EmptyState';
import { radius, spacing, PRESSED, type, SECTION_TITLE, NUMERIC } from '../src/theme';
import Avatar from '../src/components/Avatar';
import PersonMenu from '../src/components/PersonMenu';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import IconButton from '../src/components/IconButton';

const TABS = ['feed', 'friends', 'requests'];

export default function SocialScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  const [session, setSession] = useState(() => getSession());
  const [profile, setProfile] = useState(undefined);   // undefined = yükleniyor
  // AÇILIŞ SEKMESİ 'friends', 'feed' DEĞİL. Bu ekrana profildeki arkadaş
  // sayacından geliniyor — kullanıcı arkadaşlarını görmeye geliyor, akışa
  // değil. Ayrıca akış yeni bir hesapta boş olur ve ilk izlenim boş ekran
  // olmamalı; arkadaş listesi en azından arama kutusunu sunuyor.
  const [tab, setTab] = useState('friends');

  // FAZ 7 — İSTEK ROZETİ. Rozet Topluluk başlığında vardı (Faz 5) ama
  // kullanıcı bu ekrana GİRDİĞİNDE kayboluyordu: hangi sekmede bekleyen
  // istek olduğunu söyleyen tek işaret oydu. Eyleme dönüşüyor (kabul et),
  // o yüzden kırmızı meşru — Faz 2'nin mesaj rozeti kararının aynısı.
  const [bekleyen, setBekleyen] = useState(0);
  useEffect(() => {
    if (!session) { setBekleyen(0); return; }
    let acik = true;
    getFriends()
      .then((r) => { if (acik) setBekleyen(Array.isArray(r?.incoming) ? r.incoming.length : 0); })
      .catch(() => {});
    return () => { acik = false; };
  }, [session, tab]);

  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const loadProfile = useCallback(async () => {
    if (!session) { setProfile(null); return; }
    try {
      const r = await getMyProfile();
      // `username` KONTROL EDİLİYOR, profilin varlığı değil.
      // Eski kayıt akışı `user_profile:{uid}` anahtarına { uid, name, email }
      // yazıyordu; nesne dolu ama kullanıcı adı yok. Yalnızca `profile`e
      // bakılsaydı kapı açık geçilir ve kullanıcı kalıcı olarak adsız kalırdı.
      setProfile(r?.profile?.username ? r.profile : null);
    } catch {
      setProfile(null);
    }
  }, [session]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Kapı 1: oturum ────────────────────────────────────────────────────────
  if (!session) {
    return (
      <Gate
        icon="person-circle-outline"
        text={t('soc.needSession')}
        ctaLabel={t('soc.signIn')}
        onPress={() => router.push('/account')}
        onBack={() => router.back()}
        title={t('soc.title')}
      />
    );
  }

  if (profile === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={t('soc.title')} onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  // ── Kapı 2: kullanıcı adı ─────────────────────────────────────────────────
  if (!profile) {
    return <UsernameSetup onDone={loadProfile} onBack={() => router.back()} />;
  }

  // ── Kapı 3: içerik ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('soc.title')} onBack={() => router.back()} />

      <View style={styles.tabs}>
        {TABS.map((k) => (
          <Pressable
            key={k}
            style={[styles.tab, tab === k && styles.tabOn]}
            onPress={() => { Haptics.selectionAsync(); setTab(k); }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
              {t(`soc.tab${k[0].toUpperCase()}${k.slice(1)}`)}
            </Text>
            {k === 'requests' && bekleyen > 0 ? (
              <View style={styles.tabRozet}>
                <Text style={[styles.tabRozetText, NUMERIC]}>{bekleyen > 9 ? '9+' : bekleyen}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {tab === 'feed'     && <FeedTab />}
      {tab === 'friends'  && <FriendsTab />}
      {tab === 'requests' && <RequestsTab />}
    </SafeAreaView>
  );
}

// ─── Ortak parçalar ─────────────────────────────────────────────────────────

function Header({ title, onBack }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.head}>
      <IconButton icon='chevron-back' size={24} color={colors.text} onPress={onBack} style={styles.iconBtn} />
      <View style={styles.headTitleWrap}>
        <Text style={styles.headTitle}>{title}</Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

function Gate({ icon, text, ctaLabel, onPress, onBack, title }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={title} onBack={onBack} />
      <View style={styles.center}>
        <Ionicons name={icon} size={54} color={colors.text3} />
        <Text style={styles.gateText}>{text}</Text>
        <Pressable style={({ pressed }) => [styles.cta, pressed && PRESSED]} onPress={onPress}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// YEREL AVATAR KOPYASI SİLİNDİ (Faz 7). Bu dosya kendi Avatar'ını
// tanımlıyordu: yalnız ön ayar + baş harf. `components/Avatar.jsx`'in ÜÇÜNCÜ
// hâli — YÜKLENMİŞ FOTOĞRAF — burada hiç çizilmiyordu, yani profil fotoğrafı
// olan kullanıcı arkadaş listesinde HARF olarak görünüyordu. Ortak bileşenin
// var olma sebebi tam olarak buydu.
//
// Zemin de değişti: accentBg + accentText her insanı marka rengine
// boyuyordu. Kırmızı eylem rengi, kimlik rengi değil. Ortak bileşen
// bgInput + text2 kullanıyor.

// ─── Kullanıcı adı kurulumu ─────────────────────────────────────────────────

function UsernameSetup({ onDone, onBack }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [state, setState] = useState({ status: 'idle' });   // idle|checking|ok|error
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);

  // Yazarken canlı uygunluk kontrolü (400ms sönümleme)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const v = name.trim();
    if (v.length < 3) { setState({ status: 'idle' }); return; }

    setState({ status: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const r = await checkUsername(v);
        setState(r?.available
          ? { status: 'ok' }
          : { status: 'error', code: r?.error || 'TAKEN' });
      } catch (e) {
        setState({ status: 'error', code: e?.code || 'generic' });
      }
    }, 400);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [name]);

  const submit = useCallback(async () => {
    if (state.status !== 'ok' || saving) return;
    setSaving(true);
    try {
      await setUsername(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onDone();
    } catch (e) {
      setState({ status: 'error', code: e?.code || 'generic' });
      setSaving(false);
    }
  }, [name, state, saving, onDone]);

  const errText = state.status === 'error'
    ? (t(`soc.err.${state.code}`) !== `soc.err.${state.code}` ? t(`soc.err.${state.code}`) : t('soc.err.generic'))
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={t('soc.title')} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.setupBody} keyboardShouldPersistTaps="handled">
          <Ionicons name="people-circle-outline" size={58} color={colors.accent} />
          <Text style={styles.setupTitle}>{t('soc.setupTitle')}</Text>
          <Text style={styles.setupText}>{t('soc.setupText')}</Text>

          <Text style={styles.label}>{t('soc.usernameLabel')}</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.at}>@</Text>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder={t('soc.usernamePlaceholder')}
              placeholderTextColor={colors.text3}
              style={styles.input}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            {state.status === 'checking' && <ActivityIndicator size="small" color={colors.text3} />}
            {state.status === 'ok' && <Ionicons name="checkmark-circle" size={21} color={colors.green} />}
            {state.status === 'error' && <Ionicons name="close-circle" size={21} color={colors.danger} />}
          </View>

          <Text style={[styles.hint, errText && { color: colors.danger }]}>
            {errText || (state.status === 'ok' ? t('soc.available') : t('soc.usernameHint'))}
          </Text>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.text2} />
            <Text style={styles.privacyNoteText}>{t('soc.privacyNote')}</Text>
          </View>

          <Pressable
            style={[styles.cta, (state.status !== 'ok' || saving) && styles.ctaOff]}
            onPress={submit}
            disabled={state.status !== 'ok' || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={[styles.ctaText, (state.status !== 'ok' || saving) && styles.ctaTextOff]}>{t('soc.create')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Akış ───────────────────────────────────────────────────────────────────

const ACT_LABEL = {
  wishlist: 'soc.actWishlist',
  collection: 'soc.actCollection',
  like: 'soc.actLike',
  finished: 'soc.actFinished',
};

function FeedTab() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await getActivity(40); setItems(r?.items || []); }
    catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (items === null) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  if (items.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text3} />}
      >
        <EmptyState icon="pulse-outline" title={t('soc.emptyFeed')} text={t('soc.emptyFeedText')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text3} />}
      showsVerticalScrollIndicator={false}
    >
      {items.map((it, i) => (
        <Pressable
          key={`${it.uid}_${it.ts}_${i}`}
          style={({ pressed }) => [styles.actRow, pressed && PRESSED]}
          onPress={() => it.gameId && router.push({
            pathname: '/game/[id]',
            params: { id: it.gameId, name: it.gameName || '', image: it.gameImage || '' },
          })}
        >
          <Avatar avatar={it.avatar} name={it.displayName || it.username} size={38} />
          <View style={styles.actBody}>
            <Text style={styles.actText}>
              <Text style={styles.actName}>{it.displayName || it.username}</Text>
              {' '}{t(ACT_LABEL[it.type] || 'soc.actLike')}{' '}
              <Text style={styles.actGame}>{it.gameName}</Text>
            </Text>
            <Text style={styles.actTime}>{timeAgo(it.ts, t)}</Text>

          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Dile bağlı kısa süre etiketi — sabit Türkçe metin bırakılmamalı,
// akış İngilizce arayüzde de görünüyor.
function timeAgo(ts, t) {
  const m = Math.floor((Date.now() - (ts || 0)) / 60000);
  if (m < 1) return t('soc.timeNow');
  if (m < 60) return `${m}${t('soc.timeMin')}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t('soc.timeHour')}`;
  return `${Math.floor(h / 24)}${t('soc.timeDay')}`;
}

// ─── Arkadaşlar ─────────────────────────────────────────────────────────────

function FriendsTab() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try { setData(await getFriends()); } catch { setData({ friends: [], incoming: [], outgoing: [] }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Arama — 400ms sönümleme
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
    Haptics.selectionAsync();
    try {
      await friendAction(uid, action);
      await load();
      if (results) setResults((rs) => rs.map((r) => (
        r.uid === uid
          ? { ...r, relation: action === 'request' ? 'requested' : action === 'accept' ? 'friends' : 'none' }
          : r
      )));
    } catch (e) {
      Alert.alert(t(`soc.err.${e?.code}`) !== `soc.err.${e?.code}` ? t(`soc.err.${e.code}`) : t('soc.err.generic'));
    }
  }, [load, results, t]);

  // FAZ 7 — "⋯" ARTIK GERÇEK BİR MENÜ. `arkadas` bayrağı hangi seçeneklerin
  // görüneceğini belirliyor: arkadaş olmayan birini "arkadaşlıktan
  // çıkaramazsın" ve ona mesaj kutusu açmıyoruz.
  const [menu, setMenu] = useState(null);   // { person, arkadas }

  const confirmRemove = useCallback((f) => {
    Alert.alert(f.displayName || f.username, t('soc.removeConfirm'), [
      { text: t('soc.cancel'), style: 'cancel' },
      { text: t('soc.remove'), style: 'destructive', onPress: () => act(f.uid, 'remove') },
    ]);
  }, [act, t]);

  const confirmBlock = useCallback((f) => {
    Alert.alert(f.displayName || f.username, t('soc.blockConfirm'), [
      { text: t('soc.cancel'), style: 'cancel' },
      {
        text: t('soc.block'),
        style: 'destructive',
        onPress: async () => {
          try { await blockUser(f.uid); await load(); } catch { /* sessiz */ }
        },
      },
    ]);
  }, [load, t]);

  // confirmRemove/confirmBlock'un ALTINDA ve ikisini de bağımlılık alıyor:
  // yukarıda tanımlansaydı ilk render'ın kopyalarını yakalardı.
  //
  // "PROFİLİNE GİT" YOK — uygulamada başka bir kullanıcının profil ekranı
  // bulunmuyor (tek kişiye özel hedef /chat/[uid]). Maket onu ilk seçenek
  // olarak çiziyor ama gidecek yeri olmayan bir söz vermiyoruz.
  const menuSec = useCallback((anahtar) => {
    const kisi = menu?.person;
    if (!kisi) return;
    if (anahtar === 'message') { router.push(`/chat/${kisi.uid}`); return; }
    if (anahtar === 'remove')  { confirmRemove(kisi); return; }
    if (anahtar === 'block')   { confirmBlock(kisi); return; }
    if (anahtar === 'report')  { setReportTarget(kisi); return; }
  }, [menu, router, confirmRemove, confirmBlock]);

  if (data === null) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  const showing = results !== null;

  return (
    <>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color={colors.text3} />
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
          <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11y.clear')}>
            <Ionicons name="close-circle" size={17} color={colors.text3} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {showing ? (
          results.length === 0
            ? <Text style={styles.inlineEmpty}>{q.trim().length < 2 ? t('soc.searchHint') : t('soc.noResults')}</Text>
            : results.map((r) => (
                <PersonRow
                  key={r.uid}
                  person={r}
                  right={
                    r.relation === 'friends' ? <Tag text={t('soc.friends')} />
                    : r.relation === 'requested' ? <Tag text={t('soc.requested')} />
                    : r.relation === 'incoming'
                      ? <SmallBtn label={t('soc.accept')} onPress={() => act(r.uid, 'accept')} />
                      : <SmallBtn label={t('soc.add')} onPress={() => act(r.uid, 'request')} />
                  }
                  onLongPress={() => setMenu({ person: r, arkadas: r.relation === 'friends' })}
                />
              ))
        ) : data.friends.length === 0 ? (
          <EmptyState icon="people-outline" title={t('soc.noFriends')} text={t('soc.noFriendsText')} />
        ) : (
          data.friends.map((f) => (
            <PersonRow
              key={f.uid}
              person={f}
              right={
                <View style={styles.rowBtns}>
                  {/* Sohbete GIRIS NOKTASI. Mesajlar ekrani yalnizca var olan
                      konusmalari listeliyor; ilk mesaj buradan basliyor. Bu
                      dugme olmadan sohbet hic baslatilamiyordu. */}
                  <Pressable onPress={() => router.push(`/chat/${f.uid}`)} hitSlop={8} style={styles.moreBtn}>
                    <Ionicons name="chatbubble-outline" size={19} color={colors.text2} />
                  </Pressable>
                  <Pressable onPress={() => setMenu({ person: f, arkadas: true })} hitSlop={8} style={styles.moreBtn} accessibilityRole="button" accessibilityLabel={t('a11y.more')}>
                    <Ionicons name="ellipsis-horizontal" size={19} color={colors.text3} />
                  </Pressable>
                </View>
              }
              // Uzun basma KISAYOL olarak kalıyor ama artık iki listede de
              // AYNI menüyü açıyor — öncesinde arkadaşta "engelle", aramada
              // "şikayet et" veriyordu: aynı jest, iki sonuç, öğrenilemez.
              onLongPress={() => setMenu({ person: f, arkadas: true })}
            />
          ))
        )}
      </ScrollView>

      <PersonMenu
        visible={!!menu}
        person={menu?.person}
        arkadas={!!menu?.arkadas}
        onClose={() => setMenu(null)}
        onSec={menuSec}
      />

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="user"
        targetId={reportTarget?.uid}
        targetLabel={reportTarget ? `@${reportTarget.username}` : ''}
      />
    </>
  );
}

// ─── İstekler ───────────────────────────────────────────────────────────────

function RequestsTab() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try { setData(await getFriends()); } catch { setData({ friends: [], incoming: [], outgoing: [] }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (uid, action) => {
    Haptics.selectionAsync();
    try { await friendAction(uid, action); await load(); } catch { /* sessiz */ }
  }, [load]);

  if (data === null) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  const none = data.incoming.length === 0 && data.outgoing.length === 0;
  if (none) return <EmptyState icon="mail-outline" title={t('soc.noRequests')} />;

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {data.incoming.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('soc.incoming')}</Text>
          {data.incoming.map((p) => (
            <PersonRow
              key={p.uid}
              person={p}
              right={
                <View style={styles.rowBtns}>
                  <SmallBtn label={t('soc.accept')} onPress={() => act(p.uid, 'accept')} />
                  {/* FAZ 7 — KOPYA: "Reddet" KİŞİYİ hedef alıyor ve gönderene
                      bildirim gidiyormuş gibi okunuyor. "Yoksay" EYLEMİ
                      tarif ediyor, kişiyi yargılamıyor. Sunucu çağrısı aynı. */}
                  <SmallBtn label={t('soc.ignore')} ghost onPress={() => act(p.uid, 'reject')} />
                </View>
              }
            />
          ))}
        </>
      )}

      {data.outgoing.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>{t('soc.outgoing')}</Text>
          {data.outgoing.map((p) => (
            <PersonRow
              key={p.uid}
              person={p}
              right={<SmallBtn label={t('soc.cancel')} ghost onPress={() => act(p.uid, 'cancel')} />}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Küçük parçalar ─────────────────────────────────────────────────────────

function PersonRow({ person, right, onLongPress }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable style={styles.personRow} onLongPress={onLongPress} delayLongPress={400}>
      <Avatar avatar={person.avatar} name={person.displayName || person.username} size={42} />
      <View style={styles.personBody}>
        <Text numberOfLines={1} style={styles.personName}>{person.displayName || person.username}</Text>
        <Text numberOfLines={1} style={styles.personHandle}>@{person.username}</Text>
      </View>
      {right}
    </Pressable>
  );
}

function SmallBtn({ label, onPress, ghost }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable style={[styles.smallBtn, ghost && styles.smallBtnGhost]} onPress={onPress}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  headTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headTitle: { fontSize: type.body, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  tabs: {
    flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: 10,
  },
  tab: {
    flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  // games/news çipleriyle aynı seçim dili: dolu nötr yüzey, koyu metin.
  // Öncesinde accentBg + accentBorder + accentText ile ÜÇ kanaldan birden
  // marka rengi taşıyordu.
  tabOn: { backgroundColor: colors.text, borderColor: colors.text },
  tabText: { color: colors.text2, fontSize: type.footnote, fontWeight: '700' },
  tabTextOn: { color: colors.bg },

  list: { paddingHorizontal: spacing.md, paddingBottom: 30 },
  sectionLabel: {
    ...SECTION_TITLE, color: colors.text2,
    marginBottom: spacing.s8, marginTop: spacing.xs,
  },
  inlineEmpty: { color: colors.text2, fontSize: type.footnote, textAlign: 'center', marginTop: spacing.s24, lineHeight: 20 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  personBody: { flex: 1 },
  personName: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  personHandle: { color: colors.text3, fontSize: type.footnote, marginTop: 1 },
  rowBtns: { flexDirection: 'row', gap: 6 },
  moreBtn: { padding: 6 },


  // FAZ 7 — Faz 6'nın gönder diline giriyor: accentFillStrong · subhead
  // 15/600. accent + beyaz küçük metin bu deponun DÖRDÜNCÜ 4.45:1 örneğiydi.
  // Hayalet ikincil buton zaten doğru: kabul ve yoksay EŞİT büyüklükte,
  // reddetmek zorlaştırılmıyor.
  smallBtn: {
    paddingHorizontal: 14, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accentFillStrong, alignItems: 'center', justifyContent: 'center',
  },
  smallBtnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  // tema-bagimsiz: dolu marka dugmesinin uzerinde
  smallBtnText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },
  smallBtnTextGhost: { color: colors.text2 },

  // Sekme rozeti — Faz 2'nin mesaj rozetiyle aynı ölçü.
  tabRozet: {
    position: 'absolute', top: 4, right: 8,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: spacing.xs,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  // tema-bagimsiz: dolu kirmizi rozetin uzerinde
  tabRozetText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },

  tag: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tagText: { color: colors.text2, fontSize: type.caption, fontWeight: '700' },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  actBody: { flex: 1 },
  actText: { color: colors.text2, fontSize: type.subhead, lineHeight: 19 },
  actName: { color: colors.text, fontWeight: '800' },
  actGame: { color: colors.accentText, fontWeight: '700' },
  actTime: { color: colors.text3, fontSize: type.caption, marginTop: 3 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginBottom: 10,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, height: 44,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: type.subhead },

  setupBody: { padding: spacing.xl, alignItems: 'center' },
  setupTitle: { color: colors.text, fontSize: type.title3, fontWeight: '900', marginTop: 14, textAlign: 'center', letterSpacing: -0.4 },
  setupText: { color: colors.text2, fontSize: type.subhead, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  label: {
    alignSelf: 'flex-start', color: colors.text2, fontSize: type.footnote, fontWeight: '600',
    marginTop: spacing.s24, marginBottom: spacing.s8,
  },
  inputWrap: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 13, height: 52,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  at: { color: colors.text3, fontSize: type.body, fontWeight: '700' },
  input: { flex: 1, color: colors.text, fontSize: type.body },
  hint: { alignSelf: 'flex-start', color: colors.text3, fontSize: type.footnote, marginTop: 7 },

  privacyNote: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: radius.md, padding: 13,
    borderWidth: 1, borderColor: colors.cardBorder, marginTop: 22,
  },
  privacyNoteText: { flex: 1, color: colors.text2, fontSize: type.footnote, lineHeight: 18 },

  gateText: { color: colors.text2, fontSize: type.subhead, textAlign: 'center', marginTop: 14, lineHeight: 21 },
  // 52 → 44, radius.lg → md, accent → accentFillStrong (BEŞİNCİ 4.45 örneği).
  cta: {
    alignSelf: 'stretch', height: 44, borderRadius: radius.md, backgroundColor: colors.accentFillStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: spacing.xl,
  },
  // Devre dışı OPAKLIK DEĞİL nötr yüzey (Faz 6 ölçümü: opacity 0.4'te beyaz
  // etiket 1.9:1'e iniyor).
  ctaOff: { backgroundColor: colors.bgInput },
  // tema-bagimsiz: dolu marka dugmesinin uzerinde
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },
  ctaTextOff: { color: colors.text3 },
});
