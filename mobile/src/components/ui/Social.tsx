import type { ImageContentPosition } from 'expo-image';
import React, { useEffect, useRef, type ReactNode } from 'react';
import { Animated as NativeAnimated, Easing as NativeEasing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Avatar from '../Avatar';
import { Icon, type IconName } from '../Icon';
import { CoverImage, IconButton, PressableScale, Txt } from './Primitives';
import { StatusPill, PriceDrop } from './Commerce';
import { usePop } from './HeartButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, control, fontFor, motion, radius, shadow } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// TOPLULUK VE SOSYAL — COMPONENTS.md §5. Kaynak: kit k.py avatar/badge/fresh/
// count, c.py friend/trend_card/post_head/post/game_tag/actions/comment/
// user_row/comm_row/msg_row/notif/nlead.
//
// SUNUM BİLEŞENLERİ: beğeni/kaydet durumu, sayılar ve iyimser güncelleme
// (COMPONENTS: "anında güncellenir, hata olursa geri alınır") çağıranın veri
// katmanında. Bileşen yalnız verilen durumu çiziyor; böylece aynı gönderi
// akışta ve detayda iki ayrı sayaçla ayrışmıyor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avatar + süsler (kit avatar()): çevrimiçi noktası (boyun %28'i, en az 10; 2.5 pt zemin halkası),
 * oyun rozeti (boyun %46'sı, köşe 7), halkalı varyant (3 pt boşluk + 2 pt kırmızı çerçeve).
 * Çizim (fotoğraf / ön ayar / baş harf) tek yerde: `Avatar`.
 */
export function UserAvatar({ avatar, name, size = 40, online, gameImage, ring, outline }: {
  avatar?: string | null; name?: string | null; size?: number; online?: boolean; gameImage?: string | null; ring?: boolean;
  /** Nokta ve rozet halkasının rengi: arkadaki zemin (varsayılan `bg`). */
  outline?: string;
}) {
  const { colors } = useDesignTheme();
  const A = K.avatar;
  const edge = outline ?? colors.bg;
  const dot = Math.max(A.onlineMin, Math.floor(size * A.onlineRatio));
  const game = Math.floor(size * A.gameRatio);
  const body = (
    <View style={{ width: size, height: size }}>
      <Avatar avatar={avatar} name={name} size={size} style={undefined} />
      {online ? <View style={[styles.online, { width: dot, height: dot, borderRadius: dot / 2, borderWidth: A.onlineRing,
        backgroundColor: colors.green, borderColor: edge }]} /> : null}
      {gameImage ? <View style={[styles.game, { borderRadius: A.gameRadius + 1, boxShadow: shadow.ring(A.onlineRing, edge) }]}>
        <CoverImage source={gameImage} radius={A.gameRadius} style={{ width: game, height: game }} />
      </View> : null}
    </View>
  );
  if (!ring) return body;
  // Genişlik açık: sütunda gerilmesin, satırda ortalansın (alignSelf'e gerek yok).
  const outer = size + (A.ringGap + A.ringWidth) * 2;
  return <View style={[styles.ring, { width: outer, height: outer, padding: A.ringGap, borderWidth: A.ringWidth, borderColor: colors.red }]}>{body}</View>;
}

/** Arkadaş etkinliği: 96 geniş, ortalı; 56 avatar + oyun rozeti, ad 13/18, oyun 12/16, durum 11/14. */
export function FriendTile({ avatar, name, game, gameImage, status, playing, onPress }: {
  avatar?: string | null; name: string; game: string; gameImage?: string | null; status: string; playing?: boolean; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  const F = K.friendTile;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${name}, ${game}, ${status}`} onPress={onPress} style={styles.friend}>
      <UserAvatar avatar={avatar} name={name} size={F.avatar} gameImage={gameImage} />
      <Txt variant="footnoteStrong" numberOfLines={1} style={[styles.friendText, { marginTop: F.nameTop }]}>{name}</Txt>
      <Txt variant="caption" numberOfLines={1} style={[styles.friendText, { color: colors.text2 }]}>{game}</Txt>
      <View style={[styles.friendStatus, { marginTop: F.statusTop }]}>
        {playing ? <View style={[styles.friendDot, { backgroundColor: colors.green }]} /> : null}
        <Txt variant={playing ? 'caption2Strong' : 'caption2'} numberOfLines={1} style={{ color: playing ? colors.green : colors.text3 }}>{status}</Txt>
      </View>
    </PressableScale>
  );
}

export type TrendRow = { tag: string; count: string; meta: string; delta: string; hot?: boolean };

/** Gündem kartı: köşe 18, `surface1`; 60 pt satırlar, 28 pt `#` kutusu, sağda yükseliş göstergesi. */
export function TrendCard({ rows, onPress }: { rows: readonly TrendRow[]; onPress?: (row: TrendRow) => void }) {
  const { colors } = useDesignTheme();
  const T = K.trend;
  return (
    <View style={[styles.trend, { backgroundColor: colors.surface1 }]}>
      {rows.map((row, i) => (
        <PressableScale key={row.tag} accessibilityRole="button" accessibilityLabel={`${row.tag}, ${row.count}`}
          onPress={onPress ? () => onPress(row) : undefined} style={styles.trendRow}>
          {i > 0 ? <View pointerEvents="none" style={[styles.trendSeparator, { backgroundColor: colors.line }]} /> : null}
          <View style={[styles.trendBox, { backgroundColor: colors.surface2 }]}><Icon name="hash" size={T.icon} color={colors.text2} strokeWidth={control.iconStroke} /></View>
          <View style={styles.flex}>
            <Txt variant="cardTitleLarge" numberOfLines={1}>{row.tag}</Txt>
            <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{`${row.count} · ${row.meta}`}</Txt>
          </View>
          {row.hot
            ? <View style={[styles.trendPill, { backgroundColor: colors.orangeTint }]}>
                <Icon name="flame" size={T.pillIcon} color={colors.orange} strokeWidth={control.iconStroke} />
                <Txt variant="badge" style={{ color: colors.orange }}>{row.delta}</Txt>
              </View>
            : <PriceDrop text={row.delta} direction="up" color={colors.text2} />}
        </PressableScale>
      ))}
    </View>
  );
}

const BADGE_ICON: Record<'trophy' | 'q' | 'poll' | 'mod', IconName> = { trophy: 'trophy', q: 'help', poll: 'poll', mod: 'shield' };

/** Küçük rozet: 18 yükseklik, köşe 5, 11/700. `lv` nötr; `trophy` altın; `q`/`poll`/`mod` nötr + ikon. */
export function Badge({ label, kind = 'lv' }: { label: string; kind?: 'lv' | 'trophy' | 'q' | 'poll' | 'mod' }) {
  const { colors } = useDesignTheme();
  const gold = kind === 'trophy';
  const color = gold ? colors.gold : colors.text;
  return (
    <View style={[styles.badge, { backgroundColor: gold ? colors.goldTint : colors.pillNeutral }]}>
      {kind !== 'lv' ? <Icon name={BADGE_ICON[kind]} size={K.badgeSmall.icon} color={color} strokeWidth={control.iconStroke} /> : null}
      <Txt variant="badge" numberOfLines={1} style={{ color }}>{label}</Txt>
    </View>
  );
}

/** Gönderi başlığı: 40 yükseklik; 40 avatar, ad 15/600 + rozet + "· zaman", kullanıcı adı 13/18, sağda "daha fazla". */
export function PostHeader({ avatar, name, handle, time, badge, onProfile, onMore }: {
  avatar?: string | null; name: string; handle: string; time: string; badge?: ReactNode; onProfile?: () => void; onMore?: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const P = K.postHeader;
  return (
    <View style={styles.postHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onProfile} style={styles.postWho}>
        <UserAvatar avatar={avatar} name={name} size={P.avatar} />
        <View style={styles.flex}>
          <View style={styles.postNameRow}>
            <Txt variant="cardTitle" numberOfLines={1} style={styles.shrink}>{name}</Txt>
            {badge}
            <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text3 }}>{`· ${time}`}</Txt>
          </View>
          <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text3 }}>{handle}</Txt>
        </View>
      </Pressable>
      {onMore ? <IconButton icon="more" label={t('a11y.more')} onPress={onMore} size={P.more} iconSize={P.moreIcon}
        color={colors.text3} style={{ marginRight: P.moreEdge }} /> : null}
    </View>
  );
}

/** Oyun etiketi: 32 yükseklik, köşe 10, `surface1`; 24 küçük resim (köşe 7), 13/600, ok; yanında isteğe bağlı durum. */
export function GameTag({ title, image, status, onPress }: {
  title: string; image?: string | null; status?: 'playing' | 'done' | 'recommends'; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  const G = K.gameTag;
  return (
    <View style={styles.gameTagRow}>
      <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.gameTag, { backgroundColor: colors.surface1 }]}>
        <CoverImage source={image ?? undefined} radius={G.thumbRadius} style={{ width: G.thumb, height: G.thumb }} />
        <Txt variant="footnoteStrong" numberOfLines={1} style={styles.shrink}>{title}</Txt>
        <Icon name="chev" size={G.chevron} color={colors.text3} strokeWidth={2.4} />
      </PressableScale>
      {status ? <StatusPill kind={status} /> : null}
    </View>
  );
}

/** Gönderi eylemleri: 40 yükseklik, sol -10; beğen (pop), yorum, paylaş, boşluk, kaydet. */
export function PostActions({ liked, likes, comments, saved, onLike, onComment, onShare, onSave }: {
  liked: boolean; likes: string | number; comments: string | number; saved: boolean;
  onLike: () => void; onComment?: () => void; onShare?: () => void; onSave: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const A = K.actions;
  const likePop = usePop(liked);
  const savePop = usePop(saved);
  return (
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.like')} accessibilityState={{ selected: liked }} onPress={onLike} style={styles.action}>
        <Animated.View style={likePop}>
          <Icon name="heart" size={A.icon} color={liked ? colors.red : colors.text2} fill={liked ? colors.red : 'none'} />
        </Animated.View>
        <Txt variant="footnoteMedium" style={[styles.num, { color: liked ? colors.red : colors.text2 }]}>{likes}</Txt>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('v2.comments')} onPress={onComment} style={styles.action}>
        <Icon name="comment" size={A.icon} color={colors.text2} />
        <Txt variant="footnoteMedium" style={[styles.num, { color: colors.text2 }]}>{comments}</Txt>
      </Pressable>
      {onShare ? <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.share')} onPress={onShare} style={styles.action}>
        <Icon name="share" size={A.icon} color={colors.text2} />
      </Pressable> : null}
      <View style={styles.flex} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('vid.save')} accessibilityState={{ selected: saved }} onPress={onSave} style={styles.save}>
        <Animated.View style={savePop}>
          <Icon name="bookmark" size={A.icon} color={saved ? colors.red : colors.text2} fill={saved ? colors.red : 'none'} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Gönderi: başlık + soldan 52 içeride gövde (metin 15/22, medya 12, oyun etiketi 10, eylemler 6). */
export function Post({ header, text, lines, media, game, actions }: {
  header: ReactNode; text?: string; lines?: number; media?: ReactNode; game?: ReactNode; actions: ReactNode;
}) {
  const P = K.post;
  return (
    <View>
      {header}
      <View style={{ paddingLeft: P.indent, marginTop: P.bodyTop }}>
        {text ? <Txt variant="body" numberOfLines={lines}>{text}</Txt> : null}
        {media ? <View style={{ marginTop: P.mediaTop }}>{media}</View> : null}
        {game ? <View style={{ marginTop: P.gameTop }}>{game}</View> : null}
        <View style={{ marginTop: P.actionsTop }}>{actions}</View>
      </View>
    </View>
  );
}

/** Yorum: avatarla arası 10; ad 14/600 + rozet + "Yazar" + zaman, metin 15/21, eylemler 28 (kalp 15 + sayı, "Yanıtla"). */
export function Comment({ avatar, name, time, text, lines, likes, liked = false, onLike, onReply, reply, badge, author, onProfile }: {
  avatar?: string | null; name: string; time: string; text: string; lines?: number; likes: string | number; liked?: boolean;
  onLike?: () => void; onReply?: () => void; reply?: boolean; badge?: ReactNode; author?: boolean; onProfile?: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const C = K.comment;
  const pop = usePop(liked);
  return (
    <View style={[styles.comment, reply && { paddingLeft: C.replyIndent }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onProfile} disabled={!onProfile}>
        <UserAvatar avatar={avatar} name={name} size={reply ? C.replyAvatar : C.avatar} />
      </Pressable>
      <View style={styles.flex}>
        <View style={styles.commentHead}>
          <Txt variant="subhead" numberOfLines={1} style={styles.shrink}>{name}</Txt>
          {badge}
          {author ? <Badge label={t('v2.author')} /> : null}
          <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>{`· ${time}`}</Txt>
        </View>
        <Txt variant="bodyTight" numberOfLines={lines} style={{ marginTop: C.textTop }}>{text}</Txt>
        <View style={styles.commentActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.like')} accessibilityState={{ selected: liked }}
            onPress={onLike} disabled={!onLike} hitSlop={control.buttonGap} style={styles.commentLike}>
            <Animated.View style={pop}>
              <Icon name="heart" size={C.heart} color={liked ? colors.red : colors.text2} fill={liked ? colors.red : 'none'} />
            </Animated.View>
            <Txt variant="footnoteStrong" style={[styles.num, { color: liked ? colors.red : colors.text2 }]}>{likes}</Txt>
          </Pressable>
          {onReply ? <Pressable accessibilityRole="button" onPress={onReply} hitSlop={control.buttonGap}>
            <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{t('msg.reply')}</Txt>
          </Pressable> : null}
        </View>
      </View>
    </View>
  );
}

/** Kullanıcı satırı: 60 yükseklik; 44 avatar, ad 15/20 600, "kullanıcı adı · bilgi" 13/18; sağda takip butonu. */
export function UserRow({ avatar, name, handle, meta, online, right, onPress }: {
  avatar?: string | null; name: string; handle: string; meta?: string; online?: boolean; right?: ReactNode; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  return (
    <View style={styles.row60}>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.rowMain}>
        <UserAvatar avatar={avatar} name={name} size={K.userRow.avatar} online={online} />
        <View style={styles.flex}>
          <Txt variant="cardTitle" numberOfLines={1}>{name}</Txt>
          <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{meta ? `${handle} · ${meta}` : handle}</Txt>
        </View>
      </Pressable>
      {right}
    </View>
  );
}

/** Topluluk satırı: 60 yükseklik; 44 küçük resim (köşe 12), ad 15/20 600, bilgi 13/18. */
export function CommunityRow({ image, name, meta, right, onPress, imagePosition }: {
  image?: string | null; name: string; meta: string; right?: ReactNode; onPress?: () => void; imagePosition?: ImageContentPosition;
}) {
  const { colors } = useDesignTheme();
  const U = K.userRow;
  return (
    <View style={styles.row60}>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.rowMain}>
        <CoverImage source={image ?? undefined} radius={U.thumbRadius} contentPosition={imagePosition} style={{ width: U.thumb, height: U.thumb }} />
        <View style={styles.flex}>
          <Txt variant="cardTitle" numberOfLines={1}>{name}</Txt>
          <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{meta}</Txt>
        </View>
      </Pressable>
      {right}
    </View>
  );
}

/** Sayaç: en az 20 × 20 hap, `brand` zemin, 11/700 beyaz. 99 üstü "99+". */
export function CountBadge({ count }: { count: number }) {
  const { colors } = useDesignTheme();
  if (!count) return null;
  return (
    <View style={[styles.count, { backgroundColor: colors.brand }]}>
      <Txt variant="badge" style={[styles.num, { color: colors.white }]}>{count > 99 ? '99+' : count}</Txt>
    </View>
  );
}

/** Mesaj satırı: 72 yükseklik; 52 avatar; okunmamışta ad 700, saat kırmızı, önizleme `text`, sayaç; okunmuşta tik. */
export function MessageRow({ avatar, name, preview, time, unread = 0, read, online, onPress }: {
  avatar?: string | null; name: string; preview: ReactNode; time: string; unread?: number;
  /** Son mesaj benimse: 1 iletildi (`text3`), 2 okundu (`text2`). */
  read?: 0 | 1 | 2; online?: boolean; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const M = K.messageRow;
  const fresh = unread > 0;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.message}>
      <UserAvatar avatar={avatar} name={name} size={M.avatar} online={online} />
      <View style={styles.flex}>
        <View style={styles.messageLine}>
          <Txt variant="cardTitleLarge" numberOfLines={1} style={[styles.flex, fresh && fontFor('700')]}>{name}</Txt>
          <Txt variant={fresh ? 'captionStrong' : 'caption'} style={[styles.num, { color: fresh ? colors.red : colors.text3 }]}>{time}</Txt>
        </View>
        <View style={[styles.messageLine, { marginTop: M.lineGap }]}>
          <Txt variant="subheadRegular" numberOfLines={1} style={[styles.flex, { color: fresh ? colors.text : colors.text2 }]}>{preview}</Txt>
          {fresh ? <CountBadge count={unread} />
            : read ? <View accessible accessibilityLabel={t('v2.read')}>
                <Icon name="check" size={M.check} color={read === 2 ? colors.text2 : colors.text3} strokeWidth={2.4} />
              </View> : null}
        </View>
      </View>
    </PressableScale>
  );
}

type LeadKind = 'price' | 'like' | 'news' | 'comm' | 'friend' | 'follow' | 'cal';
const LEAD_ICON: Record<LeadKind, IconName> = { price: 'down', like: 'heart', news: 'news', comm: 'comment', friend: 'pad', follow: 'userplus', cal: 'calendar' };

/** Bildirimin sol öğesi: 44 renkli daire + 20 ikon, ya da 44 görsel (köşe 12) + köşesinde 22 ikon rozeti. */
export function NotificationLead({ kind, image, avatar, name }: { kind: LeadKind; image?: string | null; avatar?: string | null; name?: string }) {
  const { colors } = useDesignTheme();
  const N = K.notification;
  if (avatar !== undefined) return <UserAvatar avatar={avatar} name={name} size={N.lead} />;
  const tone = kind === 'price' ? { fg: colors.green, bg: colors.greenTint } : kind === 'like' ? { fg: colors.red, bg: colors.redTint }
    : kind === 'cal' ? { fg: colors.orange, bg: colors.orangeTint } : { fg: colors.text, bg: colors.surface2 };
  if (image) {
    return (
      <View style={{ width: N.lead, height: N.lead }}>
        <CoverImage source={image} radius={N.leadRadius} style={{ width: N.lead, height: N.lead }} />
        <View style={[styles.leadCorner, { backgroundColor: kind === 'price' ? colors.green : colors.surface2, boxShadow: shadow.ring(N.cornerRing, colors.bg) }]}>
          <Icon name={LEAD_ICON[kind]} size={N.cornerIcon} color={kind === 'price' ? colors.onGreen : tone.fg} strokeWidth={2.6} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.leadCircle, { backgroundColor: tone.bg }]}>
      <Icon name={LEAD_ICON[kind]} size={N.leadIcon} color={tone.fg} />
    </View>
  );
}

/** Bildirim satırı: en az 76; okunmamışta hafif zemin + 8 pt kırmızı nokta; metin 14/20 iki satır, zaman 12/16; sağda 44 küçük resim. */
export function NotificationRow({ lead, text, time, unread, action, thumb, onPress }: {
  lead: ReactNode; text: ReactNode; time: string; unread?: boolean; action?: ReactNode; thumb?: string | null; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const N = K.notification;
  return (
    <View style={[styles.notification, unread && { backgroundColor: colors.unreadRow }]}>
      {/* Satır yalnız minHeight taşıyor: yüzde `top` çözülmüyor (emülatörde 26 dp'de ölçüldü, beklenen 38).
          Tam boy mutlak kutu içinde ortalamak her yükseklikte doğru. */}
      {unread ? <View accessible accessibilityLabel={t('v2.unread')} style={styles.unreadDotBox}>
        <View style={[styles.unreadDot, { backgroundColor: colors.red }]} />
      </View> : null}
      {lead}
      <View style={styles.flex}>
        <Pressable accessibilityRole="button" onPress={onPress} style={{ gap: N.textGap }}>
          <Txt variant="subheadRegular" numberOfLines={2}>{text}</Txt>
          <Txt variant="caption" style={{ color: colors.text3 }}>{time}</Txt>
        </Pressable>
        {action}
      </View>
      {thumb ? <Pressable accessible={false} importantForAccessibility="no-hide-descendants" onPress={onPress}>
        <CoverImage source={thumb} radius={N.thumbRadius} style={{ width: N.thumb, height: N.thumb }} />
      </Pressable> : null}
    </View>
  );
}

/**
 * Tazelik (kit fresh()): canlıysa 7 pt kırmızı nokta, 1,8 sn nabız (0 → 6 pt halka) ve 600 kırmızı metin;
 * değilse `text3`. "Hareketi azalt" açıkken nabız durur, nokta kalır.
 *
 * NABIZ RN Animated + yerel sürücüde, Reanimated'da DEĞİL. Ölçüldü (Android 16 emülatör,
 * galeri, JS FPS): Reanimated withRepeat ile iki nabız açıkken boşta 49–50, kapalıyken
 * 54–60. Yeni mimaride Reanimated her karede gölge ağacına işliyor; sonsuz döngü bunu
 * hiç bitirmiyor. Yerel sürücü opaklık/ölçeği doğrudan görünüme yazıyor.
 */
export function LiveTime({ text, live, style }: { text: string; live?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useDesignTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new NativeAnimated.Value(0)).current;
  const L = K.liveTime;
  useEffect(() => {
    if (!live || reduced) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = NativeAnimated.loop(NativeAnimated.timing(pulse, {
      toValue: 1, duration: motion.duration.livePulse, easing: NativeEasing.out(NativeEasing.ease), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [live, reduced, pulse]);
  // kit gr-pulse: 0 → 6 pt halka, %50 → %0 opaklık
  const ring = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + (L.pulse * 2) / L.dot] }) }],
  };
  if (!live) return <Txt variant="caption" numberOfLines={1} style={[{ color: colors.text3 }, style as never]}>{text}</Txt>;
  return (
    <View style={[styles.live, style]}>
      <View style={styles.liveDotBox}>
        <NativeAnimated.View style={[styles.liveDot, { backgroundColor: colors.red }, ring]} />
        <View style={[styles.liveDot, { backgroundColor: colors.red }]} />
      </View>
      <Txt variant="captionStrong" numberOfLines={1} style={{ color: colors.red }}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  num: { fontVariant: ['tabular-nums'] },
  online: { position: 'absolute', right: -1, bottom: -1 },
  game: { position: 'absolute', right: K.avatar.gameOffset, bottom: K.avatar.gameOffset },
  ring: { borderRadius: radius.pill },
  friend: { width: K.friendTile.width, alignItems: 'center' },
  friendText: { width: K.friendTile.width, textAlign: 'center' },
  friendStatus: { flexDirection: 'row', alignItems: 'center', gap: K.friendTile.gap },
  friendDot: { width: K.friendTile.dot, height: K.friendTile.dot, borderRadius: K.friendTile.dot / 2 },
  trend: { paddingVertical: K.trend.paddingV, borderRadius: K.trend.radius },
  trendRow: { height: K.trend.row, paddingLeft: K.trend.paddingLeft, paddingRight: K.trend.paddingRight, flexDirection: 'row', alignItems: 'center', gap: K.trend.gap },
  trendSeparator: { position: 'absolute', top: 0, left: K.trend.separator, right: 0, height: StyleSheet.hairlineWidth },
  trendBox: { width: K.trend.box, height: K.trend.box, borderRadius: K.trend.boxRadius, alignItems: 'center', justifyContent: 'center' },
  trendPill: { height: K.trend.pillHeight, paddingHorizontal: K.trend.pillPadding, borderRadius: K.trend.pillRadius, flexDirection: 'row', alignItems: 'center', gap: K.badgeSmall.gap },
  badge: { height: K.badgeSmall.height, paddingHorizontal: K.badgeSmall.paddingH, borderRadius: K.badgeSmall.radius, flexDirection: 'row', alignItems: 'center', gap: K.badgeSmall.gap },
  postHeader: { height: K.postHeader.height, flexDirection: 'row', alignItems: 'center' },
  postWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: K.postHeader.gap },
  postNameRow: { height: K.postHeader.nameRow, flexDirection: 'row', alignItems: 'center', gap: K.postHeader.nameGap },
  gameTagRow: { height: K.gameTag.height, flexDirection: 'row', alignItems: 'center', gap: K.gameTag.rowGap },
  gameTag: { height: K.gameTag.height, paddingLeft: K.gameTag.paddingLeft, paddingRight: K.gameTag.paddingRight, borderRadius: K.gameTag.radius, flexDirection: 'row', alignItems: 'center', gap: K.gameTag.gap, flexShrink: 1 },
  actions: { height: K.actions.height, marginLeft: K.actions.edge, flexDirection: 'row', alignItems: 'center' },
  action: { height: K.actions.height, minWidth: K.actions.minWidth, paddingHorizontal: K.actions.paddingH, flexDirection: 'row', alignItems: 'center', gap: K.actions.gap },
  save: { width: K.actions.minWidth, height: K.actions.height, alignItems: 'flex-end', justifyContent: 'center' },
  comment: { flexDirection: 'row', gap: K.comment.gap },
  commentHead: { height: K.comment.headHeight, flexDirection: 'row', alignItems: 'center', gap: K.comment.nameGap },
  commentActions: { height: K.comment.actionsHeight, marginTop: K.comment.actionsTop, flexDirection: 'row', alignItems: 'center', gap: K.comment.actionsGap },
  commentLike: { flexDirection: 'row', alignItems: 'center', gap: K.comment.heartGap },
  row60: { height: K.userRow.height, flexDirection: 'row', alignItems: 'center', gap: K.userRow.gap },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: K.userRow.gap },
  count: { minWidth: K.countBadge.size, height: K.countBadge.size, paddingHorizontal: K.countBadge.paddingH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  message: { height: K.messageRow.height, paddingHorizontal: K.messageRow.paddingH, flexDirection: 'row', alignItems: 'center', gap: K.messageRow.gap },
  messageLine: { height: K.messageRow.lineHeight, flexDirection: 'row', alignItems: 'center', gap: control.buttonGap },
  leadCorner: { position: 'absolute', right: K.notification.cornerOffset, bottom: K.notification.cornerOffset, width: K.notification.corner, height: K.notification.corner,
    borderRadius: K.notification.corner / 2, alignItems: 'center', justifyContent: 'center' },
  leadCircle: { width: K.notification.lead, height: K.notification.lead, borderRadius: K.notification.lead / 2, alignItems: 'center', justifyContent: 'center' },
  notification: { minHeight: K.notification.minHeight, paddingTop: K.notification.paddingTop, paddingRight: K.notification.paddingRight,
    paddingBottom: K.notification.paddingBottom, paddingLeft: K.notification.paddingLeft, flexDirection: 'row', alignItems: 'center', gap: K.notification.gap },
  unreadDotBox: { position: 'absolute', left: K.notification.dotLeft, top: 0, bottom: 0, justifyContent: 'center' },
  unreadDot: { width: K.notification.dot, height: K.notification.dot, borderRadius: K.notification.dot / 2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: K.liveTime.gap },
  liveDotBox: { width: K.liveTime.dot, height: K.liveTime.dot },
  liveDot: { position: 'absolute', width: K.liveTime.dot, height: K.liveTime.dot, borderRadius: K.liveTime.dot / 2 },
});
