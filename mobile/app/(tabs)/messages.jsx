// ─────────────────────────────────────────────────────────────────────────────
// Mesajlar — konuşma listesi.
//
// ARTIK BİR SEKME, yığın ekranı değil. Haberler'in yerini aldı: alt
// navigasyon uygulamanın kendini nasıl tanıttığı yer, orada bir mesaj
// simgesi olması "burası insanların konuştuğu bir yer" diyor.
//
// Mesajlaşma YALNIZCA arkadaşlar arasında. Bu, yabancıdan gelen spam'i kökten
// kapatan kural; sunucu da aynı kuralı uyguluyor (NOT_FRIENDS).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getChatList } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import { refreshUnread } from '../../src/services/unread';
import EmptyState from '../../src/components/EmptyState';
import { getAvatarPreset } from '../../src/utils/avatar';
import { spacing, type, PRESSED, TAB_SPACE } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

// ── iOS Messages listesi ölçüleri [ÖLÇÜLDÜ] ──
// iOS 26.5 Simulator, iPhone 17 Pro (402pt). Ayrıntı için
// .claude/skills/ios-messages/SKILL.md.

/** Avatarın solundaki oluk — okunmamış noktasının yeri. */
const OLUK = 26;
/** Liste avatarı. Bizde 46'ydı; ölçüm 45. */
const AVATAR = 45;

/** Kısa zaman: bugünse saat, bu haftaysa gün, değilse tarih. */
function shortTime(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US';
  if (sameDay) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000) return d.toLocaleDateString(loc, { weekday: 'short' });
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}

export default function MessagesScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  // Sekmeye tekrar basınca listeyi başa sar (diğer sekmelerle aynı davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [rows, setRows]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await getChatList();
      setRows(r?.conversations || []);
      setError(null);
    } catch (e) {
      setError(e?.code || 'UNKNOWN');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sohbetten geri dönünce liste TAZELENMELİ: son mesaj ve okundu durumu
  // değişmiş olabilir. useEffect tek başına bunu yakalamıyor.
  //
  // Sekme rozeti de burada tazeleniyor: bir sohbet okunduğunda sekme
  // indeksi değişmiyor, dolayısıyla çubuğun kendi tetikleyicisi çalışmıyor.
  useFocusEffect(useCallback(() => {
    if (session) { load(); refreshUnread(); }
  }, [session, load]));

  let body = null;
  if (!session) {
    body = <EmptyState icon="person-circle-outline" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('sf.error')} text={t('sf.errorText')}
      actionLabel={t('sf.retry')} onAction={() => load()} />;
  } else if (!rows?.length) {
    body = <EmptyState icon="chatbubbles-outline" title={t('msg.empty')} text={t('msg.emptyText')}
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/social')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Geri düğmesi YOK: burası artık bir sekme kökü, geri dönülecek bir
          yer yok. Başlık da sola hizalandı — diğer sekmelerin başlıklarıyla
          aynı hizada dursun. */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('msg.title')}</Text>
      </View>

      {body || (
        <FlashList
          ref={listRef}
          onScroll={onTabScroll}
          scrollEventThrottle={16}
          data={rows}
          keyExtractor={(r) => r.cid}
          estimatedItemSize={78}
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          ItemSeparatorComponent={Ayirici}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item} t={t} lang={lang}
              onPress={() => router.push(`/chat/${item.other.uid}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * Satır ayracı.
 *
 * MODÜL DÜZEYİNDE bir bileşen, satır içi ok fonksiyonu değil: FlashList
 * `ItemSeparatorComponent`i kimlik karşılaştırmasıyla tutuyor ve her
 * render'da yeni bir fonksiyon vermek bütün ayraçları yeniden çizdiriyor.
 */
function Ayirici() {
  const styles = useStyles(makeStyles);
  return <View style={styles.ayirici} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konuşma satırı — iOS Messages listesinin düzeni.
//
// ── SOLDAKİ OLUK ──
// Avatarın solunda 26pt boşluk var ve keyfi değil: okunmamış noktasının yeri.
// iOS'ta nokta SOLDA, satırın en başında; bizde sağda, saatin altındaydı.
// Sol taraf gözün satıra girdiği yer, yani "bunu okumadın" bilgisinin
// okunacağı ilk nokta orası.
//
// Ölçüm (iOS 26.5 Simulator, iPhone 17 Pro): avatar Ø45, merkezi soldan
// 48.3pt (yani sol kenarı 25.8), metin sütunu 86pt'de başlıyor.
// ─────────────────────────────────────────────────────────────────────────────
function ConversationRow({ item, onPress, t, lang }) {
  const styles = useStyles(makeStyles);
  const preset = getAvatarPreset(item.other.avatar);
  const name = item.other.displayName || item.other.username || '?';

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={onPress}>
      {/* Okunmamış oluğu — nokta yoksa da yer kaplıyor, aksi hâlde okunmuş
          ve okunmamış satırlar farklı hizada duruyor. */}
      <View style={styles.oluk}>
        {item.unread ? <View style={styles.dot} /> : null}
      </View>

      <View>
        {preset ? (
          <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
            <Ionicons name={preset.icon} size={21} color={preset.iconColor} />
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        {/* Cevrimici noktasi avatarin uzerinde. presence null ise (kullanici
            paylasmiyorsa) hicbir sey cizilmiyor. */}
        {item.presence?.online ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.rowMid}>
        <View style={styles.ustSatir}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {/* Saat ADIN HİZASINDA, satırın sonunda değil: iOS'ta zaman satırın
              üst çizgisine ait ve önizleme onun altından tam genişlikte
              akıyor. Sağda ayrı bir sütun olarak dursaydı önizleme iki
              satıra çıkamazdı. */}
          <Text style={styles.time}>{shortTime(item.lastAt, lang)}</Text>
        </View>
        {/* Metinsiz medya mesajında sunucu `lastKind` gönderiyor; etiket burada
            çevriliyor çünkü kullanıcının dili sunucuda değil, istemcide belli.
            Metin varsa metin kazanır. */}
        <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={2}>
          {item.lastDeleted
            ? t('msg.wasUndone')
            : item.lastText
            ? item.lastText
            : item.lastKind === 'gif'   ? `🖼️ ${t('msg.gif')}`
            : item.lastKind === 'reel'  ? `🎬 ${t('msg.sharedReel')}`
            : item.lastKind === 'video' ? `🎬 ${t('msg.video')}`
            : item.lastKind === 'photo' ? `📷 ${t('msg.photo')}`
            : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Ust dolgu YOKTU: baslik durum cubuguna yapisiyordu. Kardes sekmeler
  // 8 tasiyor. Kenar da maketin 20'sine cekildi.
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    paddingHorizontal: spacing.s20, paddingTop: spacing.s8, paddingBottom: spacing.s16,
  },
  // Maket: ekran basligi 28 / 700 / -0.28. Burada 22 / 800 idi -- kardes
  // sekmelerden (Topluluk, Profil) hem kucuk hem daha agirdi.
  title:   { flex: 1, color: colors.text, fontSize: type.title1, fontWeight: '700', letterSpacing: -0.28 },


  // Sol dolgu YOK: oluğun kendisi (26pt) o boşluğu veriyor.
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.s12, paddingRight: spacing.s16,
  },
  // Okunmamış oluğu — nokta olsa da olmasa da yer kaplıyor.
  oluk: { width: OLUK, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.subhead, fontWeight: '800' },

  // Avatarin sag altina oturuyor; koyu cerceve arka planla ayirtiyor.
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.green, borderWidth: 2.5, borderColor: colors.bg,
  },
  // 16pt: oluk (26) + avatar (45) + bu = 87, ölçülen metin sütunu 86.
  rowMid:   { flex: 1, marginLeft: spacing.s16 },
  ustSatir: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s8 },
  // iOS listesi adı gövde ölçüsünde yazıyor (17); bizde 15'ti ve önizlemeyle
  // arasındaki fark yalnızca kalınlıktan çıkıyordu.
  name:    { flex: 1, color: colors.text, fontSize: type.body, fontWeight: '600' },
  preview: { color: colors.text3, fontSize: type.subhead, lineHeight: 20 },
  previewUnread: { color: colors.text2, fontWeight: '600' },

  time:   { color: colors.text3, fontSize: type.footnote },
  // accent-serbest: 10x10 okunmamis noktasi, uzerinde metin yok
  dot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },

  // Ayraç metin sütunundan başlıyor: avatarın altından geçen bir çizgi
  // satırları değil avatarları ayırıyormuş gibi duruyor.
  ayirici: {
    height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder,
    marginLeft: OLUK + AVATAR + spacing.s16,
  },
});
