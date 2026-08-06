// ─────────────────────────────────────────────────────────────────────────────
// Profil.
//
// BİLGİ MİMARİSİ: eskiden yedi karo TEK bir "İçeriğim" başlığı altında, bağlı
// hesaplar da sayfanın en altında ayrı bir bölümdeydi. Sonuç: kendi ürettiğin
// şey (koleksiyon), sosyal olan (arkadaş) ve bağlantıya bağlı olan (kütüphane)
// aynı düzlemde duruyordu — hiçbiri diğerinden ayrışmıyordu.
//
// Artık üç anlamlı grup var ve bağlı hesaplar "Oyunlarım" grubunun İÇİNDE:
// kütüphane ve haftalık rapor zaten o bağlantıya bağımlı, ayrı yerde durmaları
// ilişkiyi gizliyordu.
//
// SOĞUKLUK: profilde kişiye ait tek bir sayı yoktu. Kimlik başlığındaki üç
// sayaç sayfayı "senin" yapan şey — arkadaş / takipte / oyun.
//
// Sayaçta KOLEKSİYON YOK: o sayı zaten hemen aşağıdaki "İçeriğim" satırında
// duruyordu ve sayaçta tekrar ediyordu. Yeri arkadaş sayısına verildi çünkü
// arkadaş sayısı hiçbir yerde görünmüyordu.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopFade, BottomFade } from '../../src/components/EdgeFade';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, type, TAB_SPACE, PRESSED, PRESSED_CARD, NUMERIC } from '../../src/theme';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections } from '../../src/hooks/useCollections';
import { useConnectedLibrary } from '../../src/hooks/useConnectedLibrary';
import { getMyProfile, getFriends, setAvatar as apiSetAvatar } from '../../src/api/social';
import IconButton from '../../src/components/IconButton';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { AVATAR_PRESET_IDS, getAvatarPreset } from '../../src/utils/avatar';

export default function ProfileScreen() {
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const scrollRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(scrollRef), []));
  const onTabScroll = useTabBarScroll();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox, logoutSteam, logoutXbox, account } = useAuth();

  const { items } = useWishlist();
  const collections = useCollections();
  const { steamGames, xboxGames } = useConnectedLibrary();
  const gameCount = steamGames.length + xboxGames.length;

  // Kullanıcı adı — arkadaş eklemenin temeli, o yüzden profilde GÖRÜNÜR olmalı.
  // Eskiden hiçbir yerde yazmıyordu; kullanıcı kendi etiketini bilmiyordu.
  const [username, setUsername] = useState(null);
  // Avatar — profil kaydındaki ön ayar kimliği (p1–p12 veya null).
  const [avatar, setAvatarState] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!account) { setUsername(null); setAvatarState(null); return; }
    let alive = true;
    getMyProfile()
      .then((r) => {
        if (!alive) return;
        setUsername(r?.profile?.username || null);
        setAvatarState(r?.profile?.avatar || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [account]);

  // Avatar seçme — iyimser güncelleme + sunucu yazımı.
  const pickAvatar = useCallback(async (presetId) => {
    Haptics.selectionAsync();
    const prev = avatar;
    setAvatarState(presetId);
    setPickerOpen(false);
    try {
      await apiSetAvatar(presetId);
    } catch {
      // Başarısızsa geri al
      setAvatarState(prev);
      Alert.alert(t('soc.err.generic'));
    }
  }, [avatar, t]);

  // Arkadaş sayısı — sayaçta koleksiyonun yerini aldı.
  //
  // Koleksiyon ve takip listesi sayıları zaten hemen aşağıdaki "İçeriğim"
  // satırlarında duruyordu; sayaçta tekrar ediyorlardı. Arkadaş sayısı ise
  // hiçbir yerde görünmüyordu — sayaç yeni bilgi taşısın.
  //
  // `incoming` de tutuluyor: bekleyen istek varsa rozetle gösteriliyor,
  // yoksa kullanıcı isteği hiç fark etmiyor.
  const [friends, setFriends] = useState({ count: 0, incoming: 0 });
  useEffect(() => {
    if (!account) { setFriends({ count: 0, incoming: 0 }); return; }
    let alive = true;
    getFriends()
      .then((r) => {
        if (!alive) return;
        setFriends({
          count: Array.isArray(r?.friends) ? r.friends.length : 0,
          incoming: Array.isArray(r?.incoming) ? r.incoming.length : 0,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [account]);

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) {
      // Bağlam kod döndürüyor (ACCOUNT_REQUIRED / STEAM_LIMIT / SYNC_FAILED);
      // çevirisi varsa onu göster, yoksa ham metne düş.
      const k = `auth.err.${r.error}`;
      Alert.alert(t('auth.loginFailed'), t(k) !== k ? t(k) : r.error);
    }
  };

  // Profil olmadan kilitli olan bölümler. Kilitli bir karoya dokunmak HİÇBİR
  // ŞEY yapmamalı değil — kullanıcıyı kayıt ekranına götürüyoruz, yoksa
  // dokunup tepki alamamak bozukluk gibi görünür.
  const locked = !account;
  const go = (dest) => () => router.push(locked ? '/account' : dest);
  const hint = t('prof.lockedHint');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Kenar sönümlemesi — "Profil" başlığı ScrollView'ün İÇİNDE, yani
          kayıp gidiyor ve içerik tepeye kadar çıkıyor. Bant güvenli alanın
          bittiği yere, tam da kesme çizgisine oturuyor.
          (Mutlak konum SafeAreaView'ün paddingTop'unu yok saydığı için
          top burada açıkça veriliyor.) */}
      <TopFade top={insets.top} />
      <BottomFade />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
      >
        {/* ── Kimlik ──
            Avatar, ad, kullanıcı adı ve üç sayaç. Sayaçlar dekoratif değil:
            profilin kime ait olduğunu tek bakışta söyleyen tek şey onlar. */}
        <View style={styles.headRow}>
          <Text style={styles.h1}>{t('nav.profile')}</Text>
          <IconButton icon="settings-outline" size={22} color={colors.text} onPress={() => router.push('/settings')} />
        </View>

        {account ? (
          <View style={styles.identity}>
            {/* Avatar — dokunulabilir, seçici açar. Ön ayar varsa renk+simge,
                yoksa baş harf fallback. Küçük kalem rozeti değişebileceğini
                ima ediyor. */}
            <Pressable
              onPress={() => username && setPickerOpen(true)}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
              accessibilityLabel={t('prof.chooseAvatar')}
              accessibilityRole="button"
            >
              {(() => {
                const preset = getAvatarPreset(avatar);
                if (preset) {
                  return (
                    <View style={[styles.avatarLg, { backgroundColor: preset.bg, borderColor: preset.bg }]}>
                      <Ionicons name={preset.icon} size={30} color={preset.iconColor} />
                    </View>
                  );
                }
                return (
                  <View style={styles.avatarLg}>
                    <Text style={styles.avatarInitialLg}>
                      {(account.name || account.email || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                );
              })()}
              {username ? (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="pencil" size={10} color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Text style={styles.idName} numberOfLines={1}>{account.name}</Text>
            <Pressable onPress={() => router.push('/social')} hitSlop={6}>
              <Text style={styles.idHandle} numberOfLines={1}>
                {username ? `@${username}` : t('prof.noUsername')}
              </Text>
            </Pressable>

            {/* Sayaçlar dokunulabilir: profilin en üstünde duran bu üç sayı
                zaten kısayol gibi okunuyordu, tepki vermemeleri yanıltıcıydı. */}
            <View style={styles.stats}>
              <Stat n={friends.count} label={t('prof.statFriends')}
                    badge={friends.incoming} onPress={() => router.push('/social')} />
              <View style={styles.statDiv} />
              <Stat n={items.length} label={t('prof.statWishlist')}
                    onPress={() => router.push('/wishlist')} />
              <View style={styles.statDiv} />
              <Stat n={gameCount} label={t('prof.statGames')}
                    onPress={() => router.push('/library')} />
            </View>
          </View>
        ) : (
          /* Giriş yapılmamışsa kimlik yerine tek bir davet — sayfanın
             başındaki en güçlü eylem bu olmalı. */
          <Pressable style={({ pressed }) => [styles.signInCard, pressed && PRESSED]} onPress={() => router.push('/account')}>
            <View style={styles.lockIcon}>
              <Ionicons name="person-add-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.signInTitle}>{t('prof.lockTitle')}</Text>
              <Text style={styles.signInDesc}>{t('prof.lockDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        )}

        {/* ── İçeriğim ── kullanıcının kendi ürettiği şeyler */}
        <Text style={styles.sectionLabel}>{t('prof.myContent')}</Text>
        <View style={styles.card}>
          <Row icon="albums-outline" label={t('col.entry')} count={collections.length}
               locked={locked} hint={hint} onPress={go('/collections')} />
          <Div />
          <Row icon="bookmark-outline" label={t('wishlist.title')} count={items.length}
               locked={locked} hint={hint} onPress={go('/wishlist')} />
        </View>

        {/* ── Sosyal ── başkalarıyla kesişen her şey tek yerde */}
        <Text style={styles.sectionLabel}>{t('prof.social')}</Text>
        <View style={styles.card}>
          <Row icon="people-outline" label={t('soc.entry')} beta onPress={() => router.push('/social')} />
          <Div />
          <Row icon="list-outline" label={t('pl.entry')} beta onPress={() => router.push('/lists')} />
        </View>

        {/* ── Oyunlarım ──
            Kütüphane ve rapor bağlı hesaplara DAYANIYOR, o yüzden bağlantılar
            da bu grubun içinde. Ayrı bir bölümde dururken bu bağ görünmüyordu
            ve kullanıcı boş bir kütüphaneyle karşılaşıp nedenini anlamıyordu. */}
        <Text style={styles.sectionLabel}>{t('prof.myGames')}</Text>
        <View style={styles.card}>
          <Row icon="library-outline" label={t('nav.library')} count={gameCount || undefined}
               onPress={() => router.push('/library')} />
          <Div />
          <Row icon="stats-chart-outline" label={t('stats.entry')}
               locked={locked} hint={hint} onPress={go('/stats')} />
          <Div />
          <Row icon="sparkles-outline" label={t('discover.entry')} onPress={() => router.push('/discover')} />
        </View>

        {/* Bağlı mağazalar — aynı grubun devamı, ayrı görsel dil YOK.
            Eskiden kesikli çerçeveli düğmelerdi ve sayfadaki hiçbir şeye
            benzemiyorlardı. */}
        <View style={[styles.card, { marginTop: 10 }]}>
          {locked ? (
            <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={() => router.push('/account')}>
              <View style={styles.rowIcon}><Ionicons name="lock-closed-outline" size={19} color={colors.text2} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel}>{t('prof.lockCta')}</Text>
                <Text style={styles.rowSub} numberOfLines={2}>{t('prof.connectHint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text3} />
            </Pressable>
          ) : (
            <>
              {steamAccounts.map((acc, i) => (
                <View key={acc.steamId}>
                  {i > 0 && <Div />}
                  <View style={styles.row}>
                    {acc.avatar ? (
                      <Image source={acc.avatar} style={styles.storeAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.storeAvatar, styles.avatarFallback, { backgroundColor: colors.steam }]}>
                        <Text style={styles.avatarInitial}>{acc.name?.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{acc.name}</Text>
                      <Text style={styles.rowSub}>Steam · {t('auth.connected')}</Text>
                    </View>
                    <IconButton icon="close" size={18} color={colors.text3} onPress={() => logoutSteam(acc.steamId)} />
                  </View>
                </View>
              ))}
              {steamAccounts.length > 0 && <Div />}

              <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} disabled={busy} onPress={() => doLogin(loginSteam)}>
                <View style={styles.rowIcon}>
                  {busy ? <ActivityIndicator size="small" color={colors.steam} />
                        : <Ionicons name="logo-steam" size={19} color={colors.steam} />}
                </View>
                <Text style={styles.rowLabel}>
                  {steamAccounts.length > 0 ? t('auth.addSteam') : t('auth.connectSteam')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text3} />
              </Pressable>

              <Div />

              {xbox ? (
                <View style={styles.row}>
                  {xbox.avatar ? (
                    <Image source={xbox.avatar} style={styles.storeAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.storeAvatar, styles.avatarFallback, { backgroundColor: 'rgba(16,124,16,0.3)' }]}>
                      <Ionicons name="logo-xbox" size={19} color={colors.xbox} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{xbox.gamertag}</Text>
                    <Text style={styles.rowSub}>Xbox · {t('auth.connected')}</Text>
                  </View>
                  <IconButton icon="close" size={18} color={colors.text3} onPress={logoutXbox} />
                </View>
              ) : (
                <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} disabled={busy} onPress={() => doLogin(loginXbox)}>
                  <View style={styles.rowIcon}>
                    {busy ? <ActivityIndicator size="small" color={colors.xbox} />
                          : <Ionicons name="logo-xbox" size={19} color={colors.xbox} />}
                  </View>
                  <Text style={styles.rowLabel}>{t('auth.connectXbox')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.text3} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Avatar seçici ── */}
      <AvatarPicker
        visible={pickerOpen}
        current={avatar}
        onSelect={pickAvatar}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

/** Kimlik başlığındaki tek sayaç. */
/**
 * Kimlik başlığındaki tek sayaç.
 *
 * `badge` bekleyen arkadaşlık isteği sayısı: rakamın köşesinde duruyor.
 * Olmadan kullanıcı kendisine gelen isteği hiç fark etmiyordu — sosyal
 * ekrana girmek için bir sebebi olmuyordu.
 */
function Stat({ n, label, badge, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.stat, pressed && PRESSED]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
    >
      <View>
        <Text style={styles.statN}>{n}</Text>
        {badge > 0 ? (
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const Div = () => <View style={styles.div} />;

// ─── Avatar seçici ──────────────────────────────────────────────────────────
// RN Modal kullanılıyor — native kütüphane EKLENMEZ, OTA güvenli.
// BottomSheet tarzı görünüm: arka plan karartılır, alt yarıda ızgara.

function AvatarPicker({ visible, current, onSelect, onClose }) {
  const { t } = useLanguage();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
          {/* Tutamak */}
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>{t('prof.chooseAvatar')}</Text>

          {/* Izgara — 4 sütun */}
          <View style={styles.pickerGrid}>
            {AVATAR_PRESET_IDS.map((id) => {
              const p = getAvatarPreset(id);
              const active = current === id;
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    active && styles.pickerItemActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => onSelect(id)}
                >
                  <View style={[styles.pickerCircle, { backgroundColor: p.bg }]}>
                    <Ionicons name={p.icon} size={26} color={p.iconColor} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Kaldır — null'a döner, baş harf fallback */}
          {current ? (
            <Pressable
              style={({ pressed }) => [styles.pickerRemove, pressed && { opacity: 0.7 }]}
              onPress={() => onSelect(null)}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.text3} />
              <Text style={styles.pickerRemoveText}>{t('prof.removeAvatar')}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Kart içi satır. Izgara karosu yerine satır kullanılıyor: yedi karo eşit
 * ağırlıkta bir duvar oluşturuyordu, satırlar ise okunacak bir liste.
 *
 * Kilitliyken kilit simgesi çıkıyor ve dokunuş kayıt ekranına gidiyor —
 * tepkisiz bir satır bozukluk gibi görünür.
 */
function Row({ icon, label, count, beta, locked, hint, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && PRESSED]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={locked ? hint : undefined}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={locked ? colors.text3 : colors.text2} />
      </View>
      <Text style={[styles.rowLabel, locked && { color: colors.text2 }]} numberOfLines={1}>{label}</Text>

      {beta ? <View style={styles.betaChip}><Text style={styles.betaChipText}>BETA</Text></View> : null}
      {count > 0 && !locked ? <Text style={styles.rowCount}>{count}</Text> : null}
      {locked ? <Ionicons name="lock-closed" size={14} color={colors.text3} /> : null}

      <Ionicons name="chevron-forward" size={18} color={colors.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: TAB_SPACE + 16 },

  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  h1: { flex: 1, fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },

  // ── Kimlik ──
  identity: { alignItems: 'center', paddingVertical: 20 },
  avatarLg: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.bgInput,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialLg: { fontSize: type.title2, fontWeight: '800', color: colors.text2 },
  idName: { fontSize: type.headline, fontWeight: '700', color: colors.text, marginTop: 12 },
  idHandle: { fontSize: type.footnote, color: colors.text3, marginTop: 2 },

  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  stat: { alignItems: 'center', paddingHorizontal: 22 },
  // Tablo rakamları: sayı değiştikçe sütun genişliği oynamasın
  statN: { fontSize: type.headline, fontWeight: '700', color: colors.text, ...NUMERIC },
  statLabel: { fontSize: type.caption, color: colors.text3, marginTop: 2 },
  // Bekleyen istek rozeti — rakamın sağ üst köşesi. Sayıya bitişik olmalı,
  // etikete değil: bilgi "kaç arkadaş" değil, "kaç bekleyen istek".
  statBadge: {
    position: 'absolute', top: -3, right: -14,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  statBadgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },
  statDiv: { width: 1, height: 26, backgroundColor: colors.cardBorder },

  signInCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, padding: 14, marginTop: 12,
  },
  signInTitle: { fontSize: type.subhead, fontWeight: '700', color: colors.text },
  signInDesc: { fontSize: type.footnote, color: colors.text2, marginTop: 3, lineHeight: 18 },
  lockIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Gruplar ──
  sectionLabel: {
    fontSize: type.caption, fontWeight: '700', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 1.1,
    marginTop: 28, marginBottom: 9,
  },
  card: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  div: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 56 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 56, paddingHorizontal: 14, paddingVertical: 10,
  },
  rowIcon: { width: 30, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: type.subhead, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: type.caption, color: colors.text3, marginTop: 2 },
  rowCount: { fontSize: type.footnote, fontWeight: '700', color: colors.text3, ...NUMERIC },

  storeAvatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: type.footnote },

  betaChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.cardBorder,
  },
  betaChipText: { color: colors.text3, fontSize: type.caption2, fontWeight: '900', letterSpacing: 0.5 },

  // ── Avatar seçici ──
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10,
    borderWidth: 1, borderColor: colors.cardBorder, borderBottomWidth: 0,
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.4,
    alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle: {
    fontSize: type.headline, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: 20,
  },
  pickerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 14,
  },
  pickerItem: {
    padding: 4, borderRadius: 32,
    borderWidth: 2.5, borderColor: 'transparent',
  },
  pickerItemActive: {
    borderColor: colors.accent,
  },
  pickerCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerRemove: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 18, paddingVertical: 10,
  },
  pickerRemoveText: {
    color: colors.text3, fontSize: type.footnote, fontWeight: '600',
  },
});
