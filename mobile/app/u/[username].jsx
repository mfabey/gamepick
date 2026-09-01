// ─────────────────────────────────────────────────────────────────────────────
// Başkasının profili.
//
// UYGULAMANIN EKSİK OLAN SOSYAL PRİMİTİFİ BUYDU. `PersonMenu` içindeki
// "profiline git" satırı bilerek boş bırakılmıştı: kişiye özel tek hedef
// `/chat/[uid]` idi, yani birini tanımanın tek yolu ona mesaj atmaktı.
//
// İSKELET KENDİ PROFİLİMLE AYNI (ProfileHeader + ProfileTabs + aynı liste);
// ayrışan üç şey var:
//   1. Eylem satırı — arkadaşlık durum makinesi (dört durum)
//   2. ⋯ menüsü — mesaj · arkadaşlıktan çıkar · engelle · şikayet et
//   3. Gizli görünüm — kimlik açık, içerik kilitli
//
// "Bu hafta" satırı YOK: o veri tamamen yerel (cihazdaki keşif geçmişi) ve
// zaten "yalnız sende görünür" diyor.
//
// SEKME VERİSİ SUNUCUDAN: kendi profilimde koleksiyon/istek listesi cihazdan
// okunuyordu, burada okunamaz — dört sekmenin dördü de ağdan geliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
  useWindowDimensions, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { spacing, type, PRESSED, TOUCH_MIN } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { getUserProfile, friendAction, blockUser } from '../../src/api/social';
import { getSession } from '../../src/services/session';

import ProfileHeader from '../../src/components/ProfileHeader';
import ProfileTabs from '../../src/components/ProfileTabs';
import CoverCell, { coverWidth, GRID_COLS, GRID_GAP } from '../../src/components/CoverGrid';
import ProfileReviewRow from '../../src/components/ProfileReviewRow';
import PostCard from '../../src/components/PostCard';
import EmptyState from '../../src/components/EmptyState';
import PersonMenu from '../../src/components/PersonMenu';
import ReportSheet from '../../src/components/ReportSheet';

const PAGE = 20;

function bol(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

export default function UserProfileScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { username } = useLocalSearchParams();

  const listRef = useRef(null);
  const [sunucu, setSunucu] = useState(null);
  const [tab, setTab] = useState('collection');
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);
  const [tazeleniyor, setTazeleniyor] = useState(false);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [islemde, setIslemde] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const [sikayet, setSikayet] = useState(false);

  const yukle = useCallback(async (hedefTab, { tazele = false } = {}) => {
    if (tazele) setTazeleniyor(true); else setYukleniyor(true);
    try {
      const r = await getUserProfile({ username, tab: hedefTab, offset: 0 });
      setSunucu(r);
      setBulunamadi(false);
      const list = r?.items || [];
      setItems(list);
      setHasMore(!!r.hasMore);
      setOffset(list.length);
    } catch (e) {
      // 404 tek bir şey demiyor ve DEMEMESİ GEREKİYOR: kullanıcı yok da
      // olabilir, seni engellemiş de olabilir, bulunabilirliği kapatmış da.
      // Ayırt edilebilseydi engelleme kararı ifşa olurdu (bkz. sunucudaki
      // "Kapı 1" gerekçesi).
      if (e?.status === 404) setBulunamadi(true);
    } finally {
      setYukleniyor(false);
      setTazeleniyor(false);
    }
  }, [username]);

  useEffect(() => { if (username) yukle(tab); }, [username, tab, yukle]);

  const dahaYukle = useCallback(async () => {
    if (dahaYukleniyor || !hasMore) return;
    setDahaYukleniyor(true);
    try {
      const r = await getUserProfile({ username, tab, offset });
      const list = r?.items || [];
      setItems((s) => [...s, ...list]);
      setHasMore(list.length === PAGE);
      setOffset((o) => o + list.length);
    } catch { /* sessiz: bayat liste duruyor */ }
    finally { setDahaYukleniyor(false); }
  }, [username, tab, offset, hasMore, dahaYukleniyor]);

  // ── Arkadaşlık ──
  // İYİMSER: dokunuşun 100ms içinde karşılığı olmalı. Sunucu reddederse
  // düğme eski durumuna dönüyor ve sebep gösteriliyor — sessizce geri almak
  // kullanıcıya "dokunuşum işe yaramadı mı?" dedirtirdi.
  const arkadaslik = useCallback(async (eylem) => {
    const uid = sunucu?.profile?.uid;
    if (!uid || islemde) return;
    if (!getSession()) { router.push('/account'); return; }

    const onceki = sunucu.friendship;
    const sonraki = eylem === 'request' ? 'requested'
      : eylem === 'accept' ? 'friends'
      : 'none';
    Haptics.selectionAsync().catch(() => {});
    setSunucu((s) => ({ ...s, friendship: sonraki }));
    setIslemde(true);
    try {
      await friendAction(uid, eylem);
      // İçerik gizliyse arkadaş olunca AÇILIYOR: yeniden çekmek şart.
      if (eylem === 'accept' || (eylem === 'request' && onceki === 'incoming')) yukle(tab, { tazele: true });
    } catch (e) {
      setSunucu((s) => ({ ...s, friendship: onceki }));
      const k = `soc.err.${e?.code}`;
      Alert.alert(t(k) !== k ? t(k) : t('soc.err.generic'));
    } finally {
      setIslemde(false);
    }
  }, [sunucu, islemde, router, yukle, tab, t]);

  const menuSec = useCallback((anahtar) => {
    const p = sunucu?.profile;
    if (!p) return;
    if (anahtar === 'message') { router.push(`/chat/${p.uid}`); return; }
    if (anahtar === 'remove') {
      Alert.alert(p.displayName || p.username, t('soc.removeConfirm'), [
        { text: t('soc.cancel'), style: 'cancel' },
        { text: t('soc.remove'), style: 'destructive', onPress: () => arkadaslik('remove') },
      ]);
      return;
    }
    if (anahtar === 'block') {
      Alert.alert(p.displayName || p.username, t('soc.blockConfirm'), [
        { text: t('soc.cancel'), style: 'cancel' },
        {
          text: t('soc.block'),
          style: 'destructive',
          onPress: async () => {
            try { await blockUser(p.uid); router.back(); } catch { Alert.alert(t('soc.err.generic')); }
          },
        },
      ]);
      return;
    }
    if (anahtar === 'report') setSikayet(true);
  }, [sunucu, router, arkadaslik, t]);

  const profil = sunucu?.profile || null;
  const canView = sunucu?.canView !== false;
  const izgara = tab === 'collection' || tab === 'wishlist';
  const kapakEn = coverWidth(width);
  // ŞERİT LİSTENİN İLK ÖĞESİ — kendi profilimle aynı yapı ve aynı gerekçe
  // (bkz. (tabs)/profile.jsx: sabitleme denendi, emülatörde şerit iki kez
  // çizilip kimlik bloğunu örttüğü için geri alındı).
  const satirlar = useMemo(() => {
    if (!canView) return [{ __serit: true }, { __kilit: true }];
    const govde = izgara ? bol(items, GRID_COLS) : items;
    if (govde.length === 0) return [{ __serit: true }, { __bos: true }];
    return [{ __serit: true }, ...govde];
  }, [izgara, items, canView]);

  // ── Bulunamadı ──
  if (bulunamadi) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Ust onBack={() => router.back()} title={`@${username}`} colors={colors} styles={styles} t={t} />
        <EmptyState icon="person-outline" title={t('prof.notFound')} text={t('prof.notFoundDesc')} />
      </SafeAreaView>
    );
  }

  const satirCiz = ({ item }) => {
    // Sabitlenen şerit: zemini OPAK, altından içerik geçiyor.
    if (item.__serit) {
      return (
        <View style={styles.seritSarmal}>
          <ProfileTabs active={tab} counts={profil?.counts} onChange={setTab} disabled={!canView} />
        </View>
      );
    }
    // ── Gizli profil ──
    // Şerit YUKARIDA soluk ama duruyor: sayfanın yapısını öğretiyor,
    // içeriği vaat etmiyor.
    if (item.__kilit) {
      return (
        <EmptyState
          icon="lock-closed-outline"
          title={t('prof.privateTitle')}
          text={t('prof.privateDesc')}
        />
      );
    }
    if (item.__bos) {
      if (yukleniyor) return null;
      return (
        <EmptyState
          compact
          icon={tab === 'reviews' ? 'shield-checkmark-outline' : tab === 'posts' ? 'chatbubble-outline' : 'albums-outline'}
          title={t('prof.otherEmpty')}
          text={t('prof.otherEmptyDesc')}
        />
      );
    }
    if (izgara) {
      return (
        <View style={styles.gridRow}>
          {item.map((g) => (
            <CoverCell
              key={g.id}
              item={g}
              width={kapakEn}
              onPress={() => router.push({
                pathname: '/game/[id]',
                params: { id: g.id, appid: g.appid || '', name: g.name, image: g.image || '' },
              })}
            />
          ))}
        </View>
      );
    }
    if (tab === 'reviews') {
      return (
        <ProfileReviewRow
          review={item}
          onPress={() => router.push({
            pathname: '/game/[id]',
            params: { id: `rawg_${item.appid}`, appid: item.appid, name: item.gameName || '', image: item.image || '' },
          })}
        />
      );
    }
    return <PostCard post={item} compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Ust
        onBack={() => router.back()}
        title={profil?.username ? `@${profil.username}` : `@${username}`}
        onMore={profil ? () => setMenuAcik(true) : undefined}
        colors={colors} styles={styles} t={t}
      />

      {yukleniyor && !profil ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlashList
          ref={listRef}
          key={izgara ? 'izgara' : 'liste'}
          data={satirlar}
          keyExtractor={(item, i) => (item.__serit ? 'serit' : item.__kilit ? 'kilit' : item.__bos ? 'bos' : izgara ? `r${i}` : String(item.id ?? `${item.appid}:${item.uid}`))}
          renderItem={satirCiz}
          extraData={tab}
          estimatedItemSize={izgara ? Math.round((kapakEn * 4) / 3) + GRID_GAP : 140}
          ListHeaderComponent={(
            <View>
              <ProfileHeader
                profile={profil}
                friendship={sunucu?.friendship || 'none'}
                mutual={sunucu?.mutualFriends || 0}
                busy={islemde}
                onCounter={(k) => {
                  if (k === 'posts') setTab('posts');
                  // Arkadaş ve oyun sayaçları BAŞKASININ profilinde hedefsiz:
                  // onun arkadaş listesi ve kütüphanesi bize kapalı. Sayı
                  // bilgi olarak duruyor, yalancı bir kapı açmıyor.
                }}
                onMessage={() => router.push(`/chat/${profil.uid}`)}
                onFriend={arkadaslik}
              />
            </View>
          )}
          ListFooterComponent={(
            <View style={{ height: insets.bottom + spacing.s40, alignItems: 'center', paddingTop: spacing.s12 }}>
              {dahaYukleniyor ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
          )}
          onEndReached={dahaYukle}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl refreshing={tazeleniyor} onRefresh={() => yukle(tab, { tazele: true })}
                            tintColor={colors.text2} />
          )}
        />
      )}

      <PersonMenu
        visible={menuAcik}
        person={profil ? {
          uid: profil.uid, username: profil.username,
          displayName: profil.displayName, avatar: profil.avatar,
        } : null}
        arkadas={sunucu?.friendship === 'friends'}
        onClose={() => setMenuAcik(false)}
        onSec={menuSec}
      />

      <ReportSheet
        visible={sikayet}
        onClose={() => setSikayet(false)}
        targetType="user"
        targetId={profil?.uid}
        targetLabel={profil ? `@${profil.username}` : ''}
      />
    </SafeAreaView>
  );
}

/** Üst çubuk — geri · kullanıcı adı · ⋯ */
function Ust({ onBack, title, onMore, colors, styles, t }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={8} style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                 accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.handle} numberOfLines={1}>{title}</Text>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={8} style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('a11y.more')}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      ) : <View style={styles.iconBtn} />}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    height: TOUCH_MIN, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.s4,
  },
  handle: { flex: 1, fontSize: type.body, fontWeight: '600', color: colors.text, textAlign: 'center' },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },

  // Sabitlenen şerit: altından içerik geçtiği için zemin OPAK olmak zorunda.
  seritSarmal: { backgroundColor: colors.bg },

  gridRow: {
    flexDirection: 'row', gap: GRID_GAP,
    paddingHorizontal: spacing.s20, marginBottom: GRID_GAP,
  },
});
