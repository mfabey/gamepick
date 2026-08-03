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
// sayaç (koleksiyon / takipte / oyun) sayfayı "senin" yapan şey.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type, TAB_SPACE, PRESSED, PRESSED_CARD, NUMERIC } from '../../src/theme';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections } from '../../src/hooks/useCollections';
import { useConnectedLibrary } from '../../src/hooks/useConnectedLibrary';
import { getMyProfile } from '../../src/api/social';
import IconButton from '../../src/components/IconButton';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

export default function ProfileScreen() {
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const scrollRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(scrollRef), []));
  const onTabScroll = useTabBarScroll();
  const { t } = useLanguage();
  const router = useRouter();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox, logoutSteam, logoutXbox, account } = useAuth();

  const { items } = useWishlist();
  const collections = useCollections();
  const { steamGames, xboxGames } = useConnectedLibrary();
  const gameCount = steamGames.length + xboxGames.length;

  // Kullanıcı adı — arkadaş eklemenin temeli, o yüzden profilde GÖRÜNÜR olmalı.
  // Eskiden hiçbir yerde yazmıyordu; kullanıcı kendi etiketini bilmiyordu.
  const [username, setUsername] = useState(null);
  useEffect(() => {
    if (!account) { setUsername(null); return; }
    let alive = true;
    getMyProfile()
      .then((r) => { if (alive) setUsername(r?.profile?.username || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [account]);

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) Alert.alert(t('auth.loginFailed'), r.error);
  };

  // Profil olmadan kilitli olan bölümler. Kilitli bir karoya dokunmak HİÇBİR
  // ŞEY yapmamalı değil — kullanıcıyı kayıt ekranına götürüyoruz, yoksa
  // dokunup tepki alamamak bozukluk gibi görünür.
  const locked = !account;
  const go = (dest) => () => router.push(locked ? '/account' : dest);
  const hint = t('prof.lockedHint');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <View style={styles.avatarLg}>
              <Text style={styles.avatarInitialLg}>
                {(account.name || account.email || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.idName} numberOfLines={1}>{account.name}</Text>
            <Pressable onPress={() => router.push('/social')} hitSlop={6}>
              <Text style={styles.idHandle} numberOfLines={1}>
                {username ? `@${username}` : t('prof.noUsername')}
              </Text>
            </Pressable>

            <View style={styles.stats}>
              <Stat n={collections.length} label={t('prof.statCollections')} />
              <View style={styles.statDiv} />
              <Stat n={items.length} label={t('prof.statWishlist')} />
              <View style={styles.statDiv} />
              <Stat n={gameCount} label={t('prof.statGames')} />
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
    </SafeAreaView>
  );
}

/** Kimlik başlığındaki tek sayaç. */
function Stat({ n, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const Div = () => <View style={styles.div} />;

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
    borderWidth: 1, borderColor: colors.cardBorder,
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
});
