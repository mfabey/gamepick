import { useRef, useCallback } from 'react';
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

  // Not: oturum kapatma, dil seçimi ve bildirim anahtarı /settings ekranına
  // taşındı — bu ekran artık yalnızca kullanıcının içeriğini gösteriyor.

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) Alert.alert(t('auth.loginFailed'), r.error);
  };

  // Profil olmadan kilitli olan bölümler. Kilitli bir karoya dokunmak HİÇBİR
  // ŞEY yapmamalı değil — kullanıcıyı kayıt ekranına götürüyoruz, yoksa
  // dokunup tepki alamamak bozukluk gibi görünür.
  const locked = !account;
  const go = (dest) => () => router.push(locked ? '/account' : dest);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_SPACE + 16 }} showsVerticalScrollIndicator={false} onScroll={onTabScroll} scrollEventThrottle={16}>
        {/* Başlık + ayarlar — ayarlar artık içerikle aynı listede değil */}
        <View style={styles.headRow}>
          <Text style={styles.h1}>{t('nav.profile')}</Text>
          <Pressable style={({ pressed }) => [styles.gearBtn, pressed && PRESSED]} onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* ── Gamerisen hesabı ── */}
        {account ? (
          <View style={styles.accCard}>
            <View style={styles.accAvatar}>
              <Ionicons name="person" size={18} color={colors.text2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{account.name}</Text>
              <Text style={styles.accStatus} numberOfLines={1}>{account.email}</Text>
            </View>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [styles.settingRow, pressed && PRESSED]} onPress={() => router.push('/account')}>
            <Ionicons name="person-circle-outline" size={20} color={colors.text2} />
            <Text style={styles.settingText}>{t('acc.signIn')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        )}

        {/* ── İçeriğim ──
            Liste satırı yerine ızgara: beş giriş art arda satır olarak
            dizildiğinde ayarlardan ayırt edilemiyordu. */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('prof.myContent')}</Text>

        {/* Kilidin NEDEN orada olduğunu söyleyen tek açıklama. Her karoya ayrı
            metin koymak ızgarayı okunmaz hâle getirirdi. */}
        {locked ? (
          <Pressable
            style={({ pressed }) => [styles.lockCard, pressed && PRESSED]}
            onPress={() => router.push('/account')}
          >
            <View style={styles.lockIcon}>
              <Ionicons name="lock-closed" size={18} color={colors.text2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.lockTitle}>{t('prof.lockTitle')}</Text>
              <Text style={styles.lockDesc}>{t('prof.lockDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text3} />
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          <ContentTile
            icon="albums" label={t('col.entry')} count={collections.length}
            locked={locked} lockedHint={t('prof.lockedHint')}
            onPress={go('/collections')}
          />
          <ContentTile
            icon="bookmark" label={t('wishlist.title')} count={items.length}
            locked={locked} lockedHint={t('prof.lockedHint')}
            onPress={go('/wishlist')}
          />
          <ContentTile
            icon="people" label={t('soc.entry')} beta
            onPress={() => router.push('/social')}
          />
          <ContentTile
            icon="list" label={t('pl.entry')} beta
            onPress={() => router.push('/lists')}
          />
          {/* Kütüphane sekmeden çıkarıldı (yerine Videolar geldi) — erişilemez
              kalmasın diye içerik ızgarasına alındı. Steam/Xbox bağlantıları
              zaten bu ekranda, doğal yeri burası. */}
          <ContentTile
            icon="library" label={t('nav.library')}
            onPress={() => router.push('/library')}
          />
          <ContentTile
            icon="stats-chart" label={t('stats.entry')}
            locked={locked} lockedHint={t('prof.lockedHint')}
            onPress={go('/stats')}
          />
          {/* Doğal dil ile keşif — anasayfadan buraya taşındı.
              Kilitli DEĞİL: hesap gerektirmiyor, tamamen istemci tarafı. */}
          <ContentTile
            icon="sparkles" label={t('discover.entry')}
            onPress={() => router.push('/discover')}
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{t('auth.accounts')}</Text>

        {/* Profil yoksa bağlama HİÇ sunulmuyor.
            Bağlantı hesaba kaydedildiği için profilsiz bağlanan kullanıcı
            kütüphanesini ilk oturum kapanışında kaybederdi. */}
        {locked ? (
          <Pressable
            style={({ pressed }) => [styles.lockCta, pressed && PRESSED]}
            onPress={() => router.push('/account')}
          >
            <Ionicons name="lock-closed" size={16} color={colors.accent} />
            <Text style={styles.lockCtaText}>{t('prof.lockCta')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </Pressable>
        ) : (
        <>
        {/* Steam hesapları */}
        {steamAccounts.map(acc => (
          <View key={acc.steamId} style={styles.accountCard}>
            {acc.avatar ? (
              <Image source={acc.avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.steam }]}>
                <Text style={styles.avatarInitial}>{acc.name?.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{acc.name}</Text>
              <View style={styles.badgeRow}>
                <SteamMark />
                <Text style={styles.accStatus}>Steam · {t('auth.connected')}</Text>
              </View>
            </View>
            <Pressable onPress={() => logoutSteam(acc.steamId)} hitSlop={8} style={styles.discBtn}>
              <Ionicons name="close" size={18} color={colors.text3} />
            </Pressable>
          </View>
        ))}

        {/* Steam bağla / ekle */}
        <Pressable
          disabled={busy}
          onPress={() => doLogin(loginSteam)}
          style={[styles.connectBtn, { borderColor: colors.steam }]}
        >
          {busy ? <ActivityIndicator color={colors.steam} /> : (
            <>
              <SteamMark size={17} />
              <Text style={[styles.connectText, { color: colors.steam }]}>
                {steamAccounts.length > 0 ? t('auth.addSteam') : t('auth.connectSteam')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Xbox */}
        {xbox ? (
          <View style={[styles.accountCard, { marginTop: 12 }]}>
            {xbox.avatar ? (
              <Image source={xbox.avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: 'rgba(16,124,16,0.3)' }]}>
                <Ionicons name="logo-xbox" size={22} color={colors.xbox} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.accName} numberOfLines={1}>{xbox.gamertag}</Text>
              <View style={styles.badgeRow}>
                <Ionicons name="logo-xbox" size={13} color={colors.xbox} />
                <Text style={styles.accStatus}>Xbox · {t('auth.connected')}</Text>
              </View>
            </View>
            <IconButton icon='close' size={18} color={colors.text3} onPress={logoutXbox} style={styles.discBtn} />
          </View>
        ) : (
          <Pressable
            disabled={busy}
            onPress={() => doLogin(loginXbox)}
            style={[styles.connectBtn, { borderColor: colors.xbox, marginTop: 12 }]}
          >
            {busy ? <ActivityIndicator color={colors.xbox} /> : (
              <>
                <Ionicons name="logo-xbox" size={18} color={colors.xbox} />
                <Text style={[styles.connectText, { color: colors.xbox }]}>{t('auth.connectXbox')}</Text>
              </>
            )}
          </Pressable>
        )}
        </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function SteamMark({ size = 14 }) {
  return <Ionicons name="logo-steam" size={size} color={colors.steam} />;
}

// İçerik karosu — sayacı ve BETA rozetini taşır.
//
// Kilitliyken karo SOLDURULUYOR ama devre dışı bırakılmıyor: dokunulduğunda
// kayıt ekranına gidiyor. Tamamen pasif bir karo, kullanıcıya ne yapması
// gerektiğini söylemez.
function ContentTile({ icon, label, count, beta, wide, locked, lockedHint, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, pressed && PRESSED_CARD]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={locked ? lockedHint : undefined}
    >
      <View style={[styles.tileTop, locked && styles.tileDim]}>
        <View style={styles.tileIcon}>
          <Ionicons name={icon} size={19} color={locked ? colors.text3 : colors.text2} />
        </View>
        {locked ? (
          <Ionicons name="lock-closed" size={14} color={colors.text3} />
        ) : beta ? <View style={styles.betaChip}><Text style={styles.betaChipText}>BETA</Text></View> : null}
        {count > 0 && !beta && !locked ? (
          <View style={styles.wishBadge}><Text style={styles.wishBadgeText}>{count}</Text></View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.tileLabel, locked && styles.tileLabelDim]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  h1: { flex: 1, fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  gearBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1, flexBasis: '46%',
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, padding: 14, minHeight: 92, justifyContent: 'space-between',
  },
  tileWide: { flexBasis: '100%', minHeight: 76 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Nötr zemin: ızgarada yedi kırmızı simge, bakışı hiçbir yere
  // yönlendirmiyordu — hepsi eşit sesle bağırıyordu.
  tileIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontSize: type.subhead, fontWeight: '700', color: colors.text, marginTop: 10 },
  // Kilitli karo: soluk ama okunabilir. Metnin kendisi text2'de kalıyor —
  // opacity ile solduran bir yaklaşım kontrastı 4.5:1'in altına düşürürdü.
  tileDim: { opacity: 0.55 },
  tileLabelDim: { color: colors.text2 },

  // Izgaranın üstündeki açıklama kartı
  lockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, padding: 14, marginBottom: 12,
  },
  lockIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  lockTitle: { fontSize: type.subhead, fontWeight: '700', color: colors.text },
  lockDesc: { fontSize: type.footnote, color: colors.text2, marginTop: 3, lineHeight: 18 },

  // Bağlı Hesaplar bölümündeki tek çağrı düğmesi
  lockCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 52, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft,
  },
  lockCtaText: { fontSize: type.subhead, fontWeight: '700', color: colors.accentText },
  sectionLabel: { fontSize: type.caption, fontWeight: '800', color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 12, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 10 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: type.body },
  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 13,
  },
  accAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgInput,
    borderColor: colors.cardBorder, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  accName: { fontSize: type.subhead, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  accStatus: { fontSize: type.caption, color: colors.text3 },
  discBtn: { padding: 4 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 13,
  },
  connectText: { fontSize: type.subhead, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, padding: 14,
  },
  settingText: { flex: 1, fontSize: type.subhead, color: colors.text, fontWeight: '500' },
  wishBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  wishBadgeText: { color: colors.text2, fontSize: type.caption, fontWeight: '800', ...NUMERIC },
  betaChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.cardBorder,
    marginRight: 4,
  },
  betaChipText: { color: colors.text3, fontSize: type.caption2, fontWeight: '900', letterSpacing: 0.5 },
});


