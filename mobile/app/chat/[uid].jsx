// ─────────────────────────────────────────────────────────────────────────────
// Sohbet ekranı — birebir mesajlaşma.  [BETA]
//
// LİSTE TERS ÇEVRİLMİŞ (inverted) ve veri EN YENİ BAŞTA geliyor. Sunucu da
// aynı düzende saklıyor (LPUSH), yani hiçbir yerde ters çevirme yapılmıyor.
//
// TEKİLLEŞTİRME ŞART: Pusher, mesajı gönderenin kendi kanalına da düşürüyor.
// Gönderim yanıtındaki mesajı yerel olarak eklediğimiz için aynı mesaj iki kez
// gelir; kimliğe göre elenmezse ekranda çift görünür.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  getChat, sendChat, uploadChatMedia, deleteChatMessage, pingPresence,
} from '../../src/api/social';
import { subscribeDM } from '../../src/services/realtime';
import { getSession, subscribeSession } from '../../src/services/session';
import EmptyState from '../../src/components/EmptyState';
import ReportSheet from '../../src/components/ReportSheet';
import { getAvatarPreset } from '../../src/utils/avatar';
import { colors, radius, spacing, type, PRESSED } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

const MAX_TEXT = 1000;

/**
 * "Son görülme" etiketi.
 *
 * DAKİKA HASSASİYETİ YOK. "3 dakika önce" gibi bir ifade, kişinin ne zaman
 * telefonuna baktığını dakika dakika bildirmek demek — istenen bilgi bu değil,
 * "yakınlarda mıydı" bilgisi. Bugün / dün / tarih yeterli ve daha az açık ediyor.
 */
function lastSeenLabel(ts, t, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US';

  if (d.toDateString() === now.toDateString()) {
    return `${t('msg.lastSeen')} ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
  }
  const dun = new Date(now);
  dun.setDate(now.getDate() - 1);
  if (d.toDateString() === dun.toDateString()) return `${t('msg.lastSeen')} ${t('msg.yesterday')}`;

  return `${t('msg.lastSeen')} ${d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { uid } = useLocalSearchParams();
  const other = String(uid || '');

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [msgs, setMsgs]     = useState([]);
  const [peer, setPeer]     = useState(null);
  const [cid, setCid]       = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText]     = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Karşı tarafın en son okuma zamanı. Kendi mesajlarımdan `at`'i bundan
  // küçük veya eşit olanlar görülmüş sayılıyor.
  const [otherReadAt, setOtherReadAt] = useState(0);
  const [presence, setPresence] = useState(null);   // null = paylaşmıyor

  // uid `session.user.uid` içinde. `session.uid` yazılırsa daima null olur ve
  // KENDİ mesajların da karşı tarafınmış gibi sola hizalı çizilir.
  const myUid = session?.user?.uid || null;

  /** Kimliğe göre tekilleştirerek ekler; en yeni başta düzeni korunur. */
  const addMessage = useCallback((m) => {
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [m, ...cur]));
  }, []);

  /**
   * Mesajı geri alınmış olarak işaretler — LİSTEDEN ÇIKARMAZ.
   * Sunucu da aynısını yapıyor: çıkarmak sayfalamayı kaydırır ve arayüzde
   * mesaj atlanmasına yol açar.
   */
  const markDeleted = useCallback((id) => {
    setMsgs((cur) => cur.map((m) => (
      m.id === id ? { id: m.id, from: m.from, at: m.at, deleted: true } : m
    )));
  }, []);

  const confirmDelete = useCallback((msg) => {
    // Yalnızca KENDİ mesajın; sunucu da ayrıca doğruluyor ama kullanıcıya
    // yapamayacağı bir seçenek göstermenin anlamı yok.
    if (msg.from !== myUid || msg.deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t('msg.undoTitle'), t('msg.undoText'), [
      { text: t('msg.cancel'), style: 'cancel' },
      {
        text: t('msg.undo'),
        style: 'destructive',
        onPress: async () => {
          // İYİMSER GÜNCELLEME YOK: sunucu reddederse mesaj geri gelmeli ve
          // "silindi sandım ama silinmemiş" durumu mesajlaşmada en kötü hata.
          try {
            await deleteChatMessage(other, msg.id);
            markDeleted(msg.id);
          } catch {
            Alert.alert(t('msg.undoFailed'));
          }
        },
      },
    ]);
  }, [myUid, other, markDeleted, t]);

  useEffect(() => {
    if (!session || !other) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const r = await getChat(other);
        if (!alive) return;
        setMsgs(r?.messages || []);
        setPeer(r?.other || null);
        setCid(r?.cid || null);
        setOtherReadAt(r?.otherReadAt || 0);
        setPresence(r?.presence ?? null);
        setError(null);
      } catch (e) {
        if (alive) setError(e?.code || 'UNKNOWN');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [session, other]);

  // Anlık teslim. Abonelik cid ÇÖZÜLDÜKTEN sonra kuruluyor; temizlik şart,
  // aksi hâlde ekran kapandıktan sonra kanal açık kalır.
  useEffect(() => {
    if (!cid) return;
    let off = null;
    let alive = true;
    // Karşı taraf mesajını geri alırsa açık ekran da anında güncellensin.
    subscribeDM(
      cid,
      addMessage,
      (p) => markDeleted(p?.id),
      // KENDİ okuma olayımı ELEMEK ŞART: olay iki tarafa da düşüyor ve
      // filtrelenmezse kendi mesajlarıma "görüldü" koyarım.
      (p) => { if (p?.by && p.by !== myUid) setOtherReadAt((cur) => Math.max(cur, p.at || 0)); },
    ).then((fn) => {
      if (alive) off = fn; else fn();
    });
    return () => { alive = false; off?.(); };
  }, [cid, addMessage, markDeleted, myUid]);

  // ── Çevrimiçi nabzı ──
  // Ekran açıkken 45 saniyede bir. Sunucudaki eşik 90 saniye, yani bir nabız
  // kaçsa bile durum titremiyor. Ekran kapanınca aralık temizleniyor —
  // aksi hâlde uygulama arka plandayken de "çevrimiçi" görünürdük.
  useEffect(() => {
    if (!session || !other) return;
    let alive = true;
    const beat = async () => {
      try {
        const r = await pingPresence(other);
        if (alive && r?.presence !== undefined) setPresence(r.presence);
      } catch { /* çevrimdışı — sonraki nabızda düzelir */ }
    };
    const id = setInterval(beat, 45000);
    return () => { alive = false; clearInterval(id); };
  }, [session, other]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await sendChat(other, body);
      setText('');
      if (r?.message) addMessage(r.message);
      Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      // Sunucu kodlarını kullanıcı diline çeviriyoruz — ham kod göstermek
      // kullanıcıya hiçbir şey anlatmaz.
      const code = e?.code;
      Alert.alert(
        code === 'TEXT_INAPPROPRIATE' ? t('msg.inappropriate')
          : code === 'TEXT_TOO_LONG'  ? t('msg.tooLong')
          : code === 'NOT_FRIENDS'    ? t('msg.notFriends')
          : code === 'BLOCKED'        ? t('msg.blocked')
          : t('msg.sendFailed')
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, other, addMessage, t]);

  /**
   * Galeriden görsel seç, KÜÇÜLT, yükle, mesaj olarak gönder.
   *
   * Küçültme şart, kozmetik değil: sunucusuz işlevlerde istek gövdesi 4,5 MB
   * ile sınırlı ve modern telefonların ham fotoğrafı bunu rahatça aşıyor.
   * 1600 piksel genişlik + 0,7 kalite tipik olarak 300-600 KB veriyor.
   */
  const pickAndSend = useCallback(async () => {
    if (sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('msg.needPhotoPerm')); return; }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,          // fotoğraf sıkıştırmasını biz yapıyoruz
      allowsMultipleSelection: false,
      // Video 4,5 MB sunucu sınırının ALTINDA kalmak zorunda. 15 saniye + orta
      // kalite tipik olarak 2-4 MB veriyor; sınır aşılırsa sunucu reddediyor ve
      // kullanıcıya daha kısa bir klip seçmesi söyleniyor.
      videoMaxDuration: 15,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    const asset = picked.assets[0];
    const isVideo = asset.type === 'video';

    setSending(true);
    try {
      let uri = asset.uri;
      let mime = 'image/jpeg';

      if (isVideo) {
        // Video seçicide zaten yeniden kodlandı; burada dokunulmuyor.
        // `mimeType` bazı cihazlarda boş geliyor, uzantıdan tamamlıyoruz.
        mime = asset.mimeType
          || (uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
      } else {
        const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
        const small = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
        uri = small.uri;
      }

      const up = await uploadChatMedia(other, uri, mime);
      const r = await sendChat(other, '', { url: up.url, type: up.contentType });
      if (r?.message) addMessage(r.message);
      Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      const code = e?.code;
      Alert.alert(
        code === 'MEDIA_DISABLED' || code === 'STORAGE_DISABLED' ? t('msg.mediaOff')
          : code === 'MEDIA_REJECTED'  ? t('msg.mediaRejected')
          // Video sınırı aştığında genel "çok büyük" mesajı yardımcı olmuyor —
          // kullanıcı ne yapacağını bilmeli: daha kısa klip.
          : code === 'FILE_TOO_LARGE'  ? (isVideo ? t('msg.videoTooLong') : t('msg.mediaTooBig'))
          : t('msg.sendFailed')
      );
    } finally {
      setSending(false);
    }
  }, [sending, other, addMessage, t]);

  // Goruldu isareti YALNIZCA EN YENI okunmus kendi mesajimda. Her okunmus
  // mesaja koymak sohbeti isaret cop luguna cevirir; kullanicinin bilmek
  // istedigi tek sey nereye kadar okundugu.
  const seenId = (() => {
    if (!otherReadAt || !myUid) return null;
    // Liste EN YENI BASTA; ilk eslesme en yenisi.
    const m = msgs.find((x) => x.from === myUid && !x.deleted && x.at <= otherReadAt);
    return m ? m.id : null;
  })();
  const preset = getAvatarPreset(peer?.avatar);
  const name = peer?.displayName || peer?.username || '…';

  let body = null;
  if (!session) {
    body = <EmptyState icon="person-circle-outline" title={t('sf.needAccount')}
      text={t('sf.needAccountText')} actionLabel={t('sf.goAccount')}
      onAction={() => router.push('/account')} />;
  } else if (loading) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  } else if (error === 'NOT_FRIENDS') {
    body = <EmptyState icon="people-outline" title={t('msg.notFriends')} text={t('msg.notFriendsText')}
      actionLabel={t('msg.goFriends')} onAction={() => router.push('/social')} />;
  } else if (error === 'BLOCKED') {
    body = <EmptyState icon="ban-outline" title={t('msg.blocked')} text={t('msg.blockedText')} />;
  } else if (error) {
    body = <EmptyState icon="cloud-offline-outline" title={t('sf.error')} text={t('sf.errorText')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {preset ? (
          <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
            <Ionicons name={preset.icon} size={16} color={preset.iconColor} />
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          {/* Durum satırı yalnızca paylaşan kullanıcılarda çiziliyor; kapalıysa
              boş satır bile bırakmıyoruz. */}
          {presence ? (
            <Text style={styles.status} numberOfLines={1}>
              {presence.online ? t('msg.online') : lastSeenLabel(presence.lastSeen, t, lang)}
            </Text>
          ) : null}
        </View>

        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   onPress={() => setReportOpen(true)} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text2} />
        </Pressable>
      </View>

      {body || (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            data={msgs}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listPad}
            keyboardDismissMode="interactive"
            renderItem={({ item }) => (
              <Bubble
                msg={item}
                mine={item.from === myUid}
                seen={item.id === seenId}
                onLongPress={() => confirmDelete(item)}
                onOpenShare={() => item.share?.appid && router.push({
                  pathname: '/game/[id]',
                  params: { id: `rawg_${item.share.appid}`, appid: item.share.appid, name: item.share.name, image: item.share.image },
                })}
                t={t}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('msg.startText')}</Text>
              </View>
            }
          />

          <View style={styles.composer}>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && PRESSED]}
              onPress={pickAndSend}
              disabled={sending}
              hitSlop={6}
            >
              <Ionicons name="image-outline" size={22} color={colors.text2} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('msg.placeholder')}
              placeholderTextColor={colors.text3}
              maxLength={MAX_TEXT}
              multiline
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnOff,
                pressed && PRESSED,
              ]}
              onPress={send}
              disabled={!text.trim() || sending}
              hitSlop={6}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={19} color="#fff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Mesaj raporlama — Apple Guideline 1.2 kullanıcı içeriğinin
          raporlanabilir olmasını istiyor, özel mesajlar dahil. */}
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="message"
        targetId={cid || other}
      />
    </SafeAreaView>
  );
}

function Bubble({ msg, mine, seen, onLongPress, onOpenShare, t }) {
  // Geri alınan mesaj listeden ÇIKMIYOR, yerinde bir iz bırakıyor — sıra ve
  // sayfalama bozulmasın, karşı taraf da bir şeyin geri alındığını görsün.
  if (msg.deleted) {
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, styles.bubbleGone]}>
          <Text style={styles.goneText}>{t('msg.wasUndone')}</Text>
        </View>
      </View>
    );
  }

  // ── Paylasilan Reels ──
  // Kendi baloncugu var: medya degil, bir OYUNA REFERANS. Dokununca oyun
  // sayfasi aciliyor — paylasimin amaci zaten karsi tarafin oyunu gormesi.
  if (msg.share?.appid) {
    return (
      <Pressable
        style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
        onLongPress={mine ? onLongPress : undefined}
        delayLongPress={400}
        onPress={onOpenShare}
      >
        <View style={styles.shareCard}>
          <Image source={msg.share.image} style={styles.shareImg} contentFit="cover" transition={140} />
          <View style={styles.shareBody}>
            <Text style={styles.shareName} numberOfLines={2}>{msg.share.name}</Text>
            <Text style={styles.shareHint}>{t('msg.sharedReel')}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const hasMedia = !!msg.media?.url;
  const hasText = !!msg.text;
  const isVideo = !!msg.media?.type?.startsWith('video/');

  return (
    <Pressable
      style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
      onLongPress={mine ? onLongPress : undefined}
      delayLongPress={400}
    >
      <View style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        // Salt görsel mesajda dolgu YOK: görselin baloncuğu tamamen doldurması
        // gerekiyor, aksi hâlde kenarlarda renkli bir çerçeve kalıyor.
        hasMedia && !hasText && styles.bubbleMediaOnly,
      ]}>
        {hasMedia && (isVideo
          ? <VideoBubble url={msg.media.url} />
          : <Image source={msg.media.url} style={styles.media} contentFit="cover" transition={140} />
        )}
        {hasText && (
          <Text style={[
            styles.bubbleText,
            mine && styles.bubbleTextMine,
            hasMedia && styles.bubbleTextUnderMedia,
          ]}>
            {msg.text}
          </Text>
        )}
      </View>
      {/* Goruldu YALNIZCA en yeni okunmus kendi mesajimda (bkz. seenId) —
          her okunmus mesaja koymak sohbeti isaret coplugune cevirir. */}
      {seen ? <Text style={styles.seen}>{t('msg.seen')}</Text> : null}
    </Pressable>
  );
}

/**
 * Sohbet içi video.
 *
 * OTOMATİK OYNATMA YOK ve SES KAPALI BAŞLAMIYOR — kullanıcı dokunup oynatıyor.
 * Sohbet listesi kaydırılırken birden çok videonun kendiliğinden başlaması hem
 * veri hem dikkat israfı; Reels ekranından farklı olarak burada video akışın
 * kendisi değil, mesajın bir parçası.
 */
function VideoBubble({ url }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={styles.media}
      nativeControls
      contentFit="cover"
      allowsFullscreen
    />
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: type.footnote, fontWeight: '800' },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  // Durum satiri kucuk ve sessiz: bilgi tasiyor ama ada rakip olmamali.
  status: { color: colors.text3, fontSize: type.caption2, marginTop: 1 },
  // Goruldu isareti baloncugun ALTINDA ve saga dayali; icerigin parcasi degil.
  seen: { color: colors.text3, fontSize: type.caption2, marginTop: 3, marginRight: 4 },

  listPad: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },

  emptyWrap: { paddingVertical: spacing.xl, alignItems: 'center', transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.text3, fontSize: type.footnote, textAlign: 'center' },

  bubbleRow:  { flexDirection: 'row', marginBottom: 6 },
  rowMine:    { justifyContent: 'flex-end' },
  rowTheirs:  { justifyContent: 'flex-start' },

  bubble: { maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.lg },
  bubbleMine:   { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  bubbleMediaOnly: { padding: 0, overflow: 'hidden' },
  // Paylasim karti baloncuk degil kart: icerik bizim degil, bir oyuna isaret.
  shareCard: {
    width: 240, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  shareImg:  { width: 240, height: 112, backgroundColor: colors.bgInput },
  shareBody: { padding: spacing.sm, gap: 2 },
  shareName: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  shareHint: { color: colors.text3, fontSize: type.caption2 },
  // Geri alınan mesaj: dolgusuz, kesikli çerçeve — baloncuk olduğu belli olsun
  // ama içerik taşımadığı da anlaşılsın.
  bubbleGone: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.cardBorder, borderStyle: 'dashed',
  },
  goneText: { color: colors.text3, fontSize: type.footnote, fontStyle: 'italic' },
  bubbleText:     { color: colors.text, fontSize: type.subhead, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextUnderMedia: { marginTop: 7 },

  // 4:3 — telefon fotoğraflarının çoğunda üstten/alttan kırpma az oluyor
  media: { width: 220, height: 165, borderRadius: radius.md, backgroundColor: colors.bgInput },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  input: {
    flex: 1, maxHeight: 120, color: colors.text, fontSize: type.subhead,
    backgroundColor: colors.bgInput, borderRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // 40×40 + hitSlop 6 → etkin dokunma alanı 52×52, HIG alt sınırının üstünde
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.bgHover },
});
