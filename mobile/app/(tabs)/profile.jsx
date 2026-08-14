// ─────────────────────────────────────────────────────────────────────────────
// Profil.
//
// BİLGİ MİMARİSİ — İKİ KEZ DEĞİŞTİ, ikincisi önemli.
//
// Sorun: profil aynı anda İKİ iş yapıyordu — kimlik sayfası VE gezinme menüsü.
// Ölçüm (yeniden yazımdan önce): 10 tam genişlik satır, 3 bölüm başlığı,
// 10 ayırıcı, 7 BETA rozeti. Yaklaşık 560 piksel dikey alan, üç ekran boyu.
// Hepsi aynı görsel ağırlıktaydı; kullanıcı neye sık ihtiyaç duyduğunu
// ekrandan çıkaramıyordu.
//
// Çözüm: satırlar KISAYOL IZGARASINA döndü (bkz. `Tile`). Aynı on hedef
// ~230 piksele indi. Liste okunur, ızgara GÖRÜLÜR — on eşit ağırlıklı ve
// simgeyle tanınan hedef için ızgara doğru biçim.
//
// Gruplar üçten ikiye indi ("Senin" ve "Sosyal"); bağlı hesaplar aşağıda
// kaldı çünkü kütüphane ve rapor onlara bağımlı.
//
// BETA rozeti 7'den 1'e, sonra 0'a: önce "her şey beta olunca hiçbiri
// beta okunmuyor" diye teke indi, v2.0'da tamamen kalktı.
//
// SOĞUKLUK: profilde kişiye ait tek bir sayı yoktu. Kimlik başlığındaki üç
// sayaç sayfayı "senin" yapan şey — arkadaş / takipte / oyun.
//
// Sayaçta KOLEKSİYON YOK: o sayı zaten hemen aşağıdaki "İçeriğim" satırında
// duruyordu ve sayaçta tekrar ediyordu. Yeri arkadaş sayısına verildi çünkü
// arkadaş sayısı hiçbir yerde görünmüyordu.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
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
import { getMyProfile, getFriends, setAvatar as apiSetAvatar, uploadAvatarPhoto } from '../../src/api/social';
import IconButton from '../../src/components/IconButton';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { AVATAR_PRESET_IDS, getAvatarPreset } from '../../src/utils/avatar';
import Avatar from '../../src/components/Avatar';
import { weeklyReport } from '../../src/services/stats';
import { SettingsGroup, SettingsRow } from '../../src/components/SettingsList';

// ── Kısayol ızgarası ölçüleri ───────────────────────────────────────────────
// Karo genişliği flex'e bırakılmıyor; ayrıntı ve ölçüm için styles.grid yorumu.
const GRID_COLS = 4;
const GRID_GAP = spacing.sm;

/** Pencere genişliğinden tek karo genişliği. body yatay dolgusu spacing.lg×2. */
function tileWidth(windowWidth) {
  const inner = windowWidth - spacing.lg * 2;
  return (inner - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
}

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

  // HAFTALIK ÖNE ÇIKAN. Tamamen yerel depolardan hesaplanıyor (görülen,
  // beğenilen, elenen, koleksiyon, zevk profili) — profil açılırken ağ isteği
  // eklemiyor. Amaç: sayfayı açan kişi ilk olarak KENDİ verisini görsün.
  // Sayaçlar "kaç" diyor, bu satır "ne yaptın" diyor.
  const week = useMemo(
    () => weeklyReport({ wishlistCount: items.length }),
    [items.length]
  );

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

  // ── Fotoğraf yükleme ──
  // ÖNCE KÜÇÜLT, SONRA YÜKLE. Avatar ekranda en fazla 56pt çiziliyor; 4 MB'lık
  // bir fotoğrafı olduğu gibi yüklemek hem kullanıcının verisini hem sunucu
  // kotasını boşa harcar. 256px kenar, 3x ekranda bile yeterli ve dosya
  // ~30–60 KB'a iniyor.
  const [uploading, setUploading] = useState(false);
  const pickPhoto = useCallback(async () => {
    if (uploading) return;
    const ImagePicker = await import('expo-image-picker');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('prof.photoPerm')); return; }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],        // avatar daire; kare dışı kırpma zaten kesiliyor
      quality: 1,            // kalite kaybı boyutlandırmadan SONRA veriliyor
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;

    setUploading(true);
    setPickerOpen(false);
    const prev = avatar;
    try {
      const Manipulator = await import('expo-image-manipulator');
      const out = await Manipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { compress: 0.85, format: Manipulator.SaveFormat.JPEG }
      );
      const r = await uploadAvatarPhoto(out.uri, 'image/jpeg');
      setAvatarState(r?.avatar || prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setAvatarState(prev);
      const code = e?.code || '';
      Alert.alert(
        code === 'MEDIA_DISABLED' ? t('prof.photoDisabled')
        : code === 'REJECTED' ? t('prof.photoRejected')
        : code === 'TOO_LARGE' ? t('prof.photoTooLarge')
        : t('soc.err.generic')
      );
    } finally {
      setUploading(false);
    }
  }, [uploading, avatar, t]);

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
           {/* KİMLİK YATAY. Eskiden dikey ve ortalıydı: avatar 68pt + ad +
               kullanıcı adı + sayaçlar, "SENİN" başlığına kadar 386pt yani
               ekranın %44'ü, taşıdığı bilgi 5 parça. Yatıya alınınca aynı
               bilgi ~150pt'ye iniyor ve kazanılan yer içeriğe gidiyor. */}
           <View style={styles.idRow}>
            {/* Avatar — dokunulabilir, seçici açar. Ön ayar varsa renk+simge,
                yoksa baş harf fallback. Küçük kalem rozeti değişebileceğini
                ima ediyor. */}
            <Pressable
              onPress={() => username && setPickerOpen(true)}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
              accessibilityLabel={t('prof.chooseAvatar')}
              accessibilityRole="button"
            >
              <Avatar
                avatar={avatar}
                name={account.name || account.email}
                size={56}
                style={styles.avatarLg}
              />
              {username ? (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="pencil" size={10} color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <View style={styles.idText}>
              <Text style={styles.idName} numberOfLines={1}>{account.name}</Text>
              <Pressable onPress={() => router.push('/social')} hitSlop={6}>
                <Text style={styles.idHandle} numberOfLines={1}>
                  {username ? `@${username}` : t('prof.noUsername')}
                </Text>
              </Pressable>
              {/* Bağlı mağaza kimliğin bir parçası — en altta değil, adının
                  yanında. "Bu hesap bana ait" hissini en çok bu veriyor. */}
              {steamAccounts[0]?.name ? (
                <View style={styles.idStore}>
                  <Ionicons name="logo-steam" size={12} color={colors.text3} />
                  <Text style={styles.idStoreName} numberOfLines={1}>
                    {steamAccounts[0].name}
                  </Text>
                </View>
              ) : null}
            </View>

           </View>

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

            {/* ── Bu hafta ──
                Sayaçlar "kaç" diyor; bu satır "NE YAPTIN" diyor. Profilin
                kişiselleşmesi buradan geçiyor — veri tamamen yerel, ağ isteği
                yok. Haftası boş olan kullanıcıda gizleniyor: boş bir "wrapped"
                sayfayı canlı değil ölü gösterir. */}
            {week.hasActivity ? (
              <Pressable
                onPress={() => router.push('/stats')}
                style={({ pressed }) => [styles.week, pressed && PRESSED_CARD]}
              >
                <View style={styles.weekMain}>
                  <Text style={styles.weekTitle} numberOfLines={1}>
                    {t('prof.weekTitle')}
                  </Text>
                  <Text style={styles.weekLine} numberOfLines={2}>
                    <Text style={[styles.weekNum, NUMERIC]}>{week.discovered}</Text>
                    {' ' + t('prof.weekDiscovered')}
                    {week.topGenre ? ` · ${t('prof.weekGenre')} ` : ''}
                    {week.topGenre ? <Text style={styles.weekStrong}>{week.topGenre}</Text> : null}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text3} />
              </Pressable>
            ) : null}
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

        {/* ── Kısayollar ──
            ÖNCE 10 TAM GENİŞLİK SATIRDI, üç bölüm başlığı ve on ayırıcıyla.
            Ölçüm: ~560 piksel dikey alan, üç ekran boyu kaydırma. Hepsi aynı
            görsel ağırlıktaydı, yani kullanıcı neye sık ihtiyaç duyduğunu
            ekrandan çıkaramıyordu.
            Izgara aynı hedefleri ~230 piksele indiriyor ve tek bakışta
            taranabilir kılıyor — liste okunur, ızgara görülür. */}
        <Text style={styles.sectionLabel}>{t('prof.yours')}</Text>
        <View style={styles.grid}>
          <Tile icon="albums-outline"      label={t('prof.gCollections')} n={collections.length}
                locked={locked} onPress={go('/collections')} />
          <Tile icon="bookmark-outline"    label={t('prof.gWishlist')}    n={items.length}
                locked={locked} onPress={go('/wishlist')} />
          <Tile icon="library-outline"     label={t('prof.gLibrary')}     n={gameCount || undefined}
                onPress={() => router.push('/library')} />
          <Tile icon="stats-chart-outline" label={t('prof.gStats')}
                locked={locked} onPress={go('/stats')} />
          <Tile icon="trophy-outline"      label={t('prof.gCards')}
                locked={locked} onPress={go('/game-cards')} />
          {/* İncelemeler — uygulamadaki tek kullanıcı üretimi içerik türü.
              Oyun sayfalarında DEĞİL burada (bkz. app/reviews.jsx).
              KİLİTSİZ: okumak hesap istemiyor, yazmak istiyor. Topluluk
              listeleriyle (aşağıdaki "Liste") aynı kural. */}
          <Tile icon="chatbox-ellipses-outline" label={t('prof.gReviews')}
                onPress={() => router.push('/reviews')} />
          <Tile icon="sparkles-outline"    label={t('prof.gDiscover')}
                onPress={() => router.push('/discover')} />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>{t('prof.social')}</Text>
        </View>
        {/* ARKADAŞ KAROSU YOK. Kimlik başlığındaki arkadaş sayacı zaten aynı
            yere götürüyor ve bekleyen istek rozetini de o taşıyor — karo,
            aynı hedefe ikinci bir kapıydı. */}
        <View style={styles.grid}>
          <Tile icon="chatbubble-ellipses-outline" label={t('prof.gMessages')}
                locked={locked} onPress={go('/messages')} />
          <Tile icon="logo-steam"                  label={t('prof.gSteam')}
                locked={locked} onPress={go('/steam-friends')} />
          <Tile icon="list-outline"                label={t('prof.gLists')}
                onPress={() => router.push('/lists')} />
        </View>

        {/* Bağlı hesaplar — ayarlar listesiyle AYNI görsel dil.
            Kontur simge, içeriden ayırıcı, bölüm başlığı yok
            (bkz. components/SettingsList.jsx). */}
        {/* KENDİ anahtarı var, prof.lockCta DEĞİL: o anahtar ProfileGate ve
            kütüphane ekranında "hesap oluştur" anlamında kullanılıyor. Bu satır
            mağaza bağlamayı anlatıyor; aynı metni paylaşmak, tepedeki hesap
            kartıyla birebir aynı başlığın iki kez çıkmasına yol açıyordu. */}
        {locked ? (
          <SettingsGroup>
            <SettingsRow
              icon="lock-closed-outline"
              label={t('prof.connectTitle')}
              desc={t('prof.connectHint')}
              onPress={() => router.push('/account')}
            />
          </SettingsGroup>
        ) : (
          <SettingsGroup>
            {steamAccounts.map((acc) => (
              <SettingsRow
                key={acc.steamId}
                icon="logo-steam"
                label={acc.name}
                desc={`Steam · ${t('auth.connected')}`}
                right={(
                  <IconButton icon="close" size={18} color={colors.text3}
                              onPress={() => logoutSteam(acc.steamId)} />
                )}
              />
            ))}

            <SettingsRow
              icon="add-circle-outline"
              label={steamAccounts.length > 0 ? t('auth.addSteam') : t('auth.connectSteam')}
              onPress={busy ? undefined : () => doLogin(loginSteam)}
              disabled={busy}
              right={busy ? <ActivityIndicator size="small" color={colors.steam} /> : undefined}
            />

            {xbox ? (
              <SettingsRow
                icon="logo-xbox"
                label={xbox.gamertag}
                desc={`Xbox · ${t('auth.connected')}`}
                right={<IconButton icon="close" size={18} color={colors.text3} onPress={logoutXbox} />}
              />
            ) : (
              <SettingsRow
                icon="logo-xbox"
                label={t('auth.connectXbox')}
                onPress={busy ? undefined : () => doLogin(loginXbox)}
                disabled={busy}
                right={busy ? <ActivityIndicator size="small" color={colors.xbox} /> : undefined}
              />
            )}
          </SettingsGroup>
        )}
      </ScrollView>

      {/* ── Avatar seçici ── */}
      <AvatarPicker
        visible={pickerOpen}
        current={avatar}
        onSelect={pickAvatar}
        onClose={() => setPickerOpen(false)}
        onPickPhoto={pickPhoto}
        uploading={uploading}
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

function AvatarPicker({ visible, current, onSelect, onClose, onPickPhoto, uploading }) {
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

          {/* FOTOĞRAF EN ÜSTTE. Ön ayarlar bir yedek; kişinin kendi fotoğrafı
              "bu hesap benim" hissini veren asıl şey, o yüzden birincil eylem. */}
          <Pressable
            onPress={onPickPhoto}
            disabled={uploading}
            style={({ pressed }) => [styles.pickerPhoto, pressed && PRESSED, uploading && { opacity: 0.6 }]}
          >
            {uploading
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Ionicons name="image-outline" size={19} color={colors.text} />}
            <Text style={styles.pickerPhotoText}>
              {uploading ? t('prof.photoUploading') : t('prof.photoPick')}
            </Text>
          </Pressable>

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
/**
 * Kısayol karosu — eski tam genişlik `Row`'un yerini aldı.
 *
 * SAYI VE ROZET SİMGENİN ÜSTÜNDE, etiketin yanında değil: dört sütunda etiket
 * zaten dar ve yanına sayı koymak etiketi kırpıyordu.
 *
 * KİLİT durumunda karo soluyor ama TIKLANABİLİR kalıyor — `go()` kullanıcıyı
 * kayıt ekranına götürüyor. Tıklanamaz yapmak, dokunup tepki alamamak
 * anlamına gelir ve bozukluk gibi görünür.
 */
function Tile({ icon, label, n, badge, locked, onPress }) {
  // Genişlik pencereden türetiliyor: flex'e bırakılırsa eksik son satır
  // kendini şişiriyor (bkz. styles.grid yorumu).
  const { width } = useWindowDimensions();
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width: tileWidth(width) }, pressed && PRESSED_CARD]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.tileIconWrap}>
        <Ionicons name={icon} size={22} color={locked ? colors.text3 : colors.text} />
        {/* Bekleyen istek gibi ilgi isteyen şeyler nokta ile; sayılar sessiz. */}
        {badge > 0 ? <View style={styles.tileDot} /> : null}
      </View>
      <Text style={[styles.tileLabel, locked && { color: colors.text3 }]} numberOfLines={1}>
        {label}
      </Text>
      {/* Sayı yoksa da yükseklik ayrılıyor — aksi hâlde sayısı olan ve olmayan
          karolar farklı boyda çıkıp ızgara satırı dalgalanıyor. Boş bir metin
          düğümü yerine sabit yükseklikli bir kutu: boşluk karakteri yazmak
          kırılgan (bir kez kodlama sırasında bozuldu). */}
      {n > 0 && !locked
        ? <Text style={[styles.tileN, NUMERIC]}>{n}</Text>
        : <View style={styles.tileNSpacer} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: TAB_SPACE + 16 },

  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  h1: { flex: 1, fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },

  // ── Kimlik ──
  identity: { paddingTop: 8, paddingBottom: 16 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  idText: { flex: 1, minWidth: 0 },
  idStore: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  idStoreName: { fontSize: type.caption, color: colors.text3, flexShrink: 1 },

  // Bu hafta satırı — kart değil satır: kimliğin devamı, ayrı bir bölüm değil.
  week: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  weekMain: { flex: 1, minWidth: 0 },
  weekTitle: {
    fontSize: type.caption2, fontWeight: '800', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  weekLine: { fontSize: type.footnote, color: colors.text2, marginTop: 3, lineHeight: 18 },
  weekNum: { color: colors.text, fontWeight: '800' },
  weekStrong: { color: colors.text, fontWeight: '700' },
  // Boyut Avatar bileşeninden geliyor; burada yalnız kenarlık.
  avatarLg: { borderWidth: 1.5, borderColor: colors.cardBorder },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitialLg: { fontSize: type.title2, fontWeight: '800', color: colors.text2 },
  idName: { fontSize: type.headline, fontWeight: '700', color: colors.text },
  idHandle: { fontSize: type.footnote, color: colors.text3, marginTop: 1 },

  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLabel: {
    fontSize: type.caption, fontWeight: '700', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 1.1,
    marginTop: 28, marginBottom: 9,
  },
  // ── Kısayol ızgarası ──
  // Dört sütun. Üç sütun daha ferah olurdu ama on hedef dört satıra yayılır ve
  // "tek bakışta gör" kazancı kaybolurdu; dört sütunda yedi hedef iki satıra
  // sığıyor.
  //
  // Genişlik `tileWidth()` ile ARİTMETİKTEN geliyor, flex'ten değil. Önce
  // `flexGrow: 1` + `flexBasis: '22%'` vardı; eksik son satırda artan boşluk o
  // satırın karolarına dağılıyordu. Ölçüm (402pt ekran): SENİN satır 1 dört
  // karo 86,5pt, satır 2 üç karo 118pt, SOSYAL üç karo 118pt — tek ekranda üç
  // ayrı genişlik. Yüzdeye de dönülmedi: `gap` ile birlikte satır başına üçe
  // düşürüyor.
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: GRID_GAP, marginBottom: spacing.md,
  },
  tile: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, paddingHorizontal: 4,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    // 44pt HIG dokunma hedefinin üstünde
    minHeight: 78,
  },
  tileIconWrap: { position: 'relative' },
  tileDot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },
  tileLabel: {
    marginTop: 6, color: colors.text2,
    fontSize: type.caption2, fontWeight: '600', textAlign: 'center',
  },
  tileN: { marginTop: 1, color: colors.text3, fontSize: type.caption2 },
  tileNSpacer: { height: 14 },

  div: { height: 1, backgroundColor: colors.cardBorder, marginLeft: 56 },



  // ── Avatar seçici ──
  pickerOverlay: {
    // colors.overlay zaten var ve açık temada daha hafif (0.45).
    flex: 1, backgroundColor: colors.overlay,
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
  pickerPhoto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    marginTop: 16, paddingVertical: 13,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  pickerPhotoText: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },

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
