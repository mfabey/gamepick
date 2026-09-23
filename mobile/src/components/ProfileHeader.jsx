import { View, StyleSheet } from 'react-native';

import DevBadge from './DevBadge';
import { Icon } from './Icon';
import { Button, IconButton, PressableScale, Txt } from './ui/Primitives';
import { UserAvatar } from './ui/Social';
import { isDeveloperUser } from '../utils/developer';
import { NUMERIC, spacing } from '../theme';
import { useStyles } from '../context/ThemeContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K, layout, radius } from '../theme/tokens';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Profil kimlik bloğu — KENDİ PROFİLİM VE BAŞKASININ PROFİLİ AYNI BİLEŞEN.
//
// NEDEN ORTAK. İki ekran da aynı iskeleti çiziyor (avatar · ad · bio ·
// sayaçlar · eylem satırı); yalnız EYLEMLER ayrışıyor. İki ayrı kopya
// yazılsaydı, bu depoda daha önce olduğu gibi (Avatar bileşeninin
// gerekçesine bakın: aynı mantık sekiz dosyada kopyalanmıştı) biri değişip
// öteki unutulurdu.
//
// ── G-21 (kit s4.py profile()) ──
// Avatar 96, ad 24/30/700, "@kullanıcı" satırı, bio 15/22, sayaç satırı
// (16/700 sayı + 14 etiket, aralık 18), eylemler 40 pt.
//
// KİTTEN ALINMAYANLAR — hepsinin sebebi aynı: SUNUCU O VERİYİ VERMİYOR ve
// uydurmuyoruz (`/api/social/profile` → username, displayName, bio, avatar,
// counts{posts,friends,games,collection,wishlist,reviews}, connections,
// friendship, mutualFriends):
//   · KAPAK GÖRSELİ (390×190) — profilde kapak alanı yok.
//   · "Lv 37" rozeti — seviye/deneyim sistemi yok.
//   · TAKİPÇİ / TAKİP sayaçları — uygulamada takip değil ARKADAŞLIK var
//     (çift taraflı). Yerine elimizdeki üçlü: gönderi · arkadaş · oyun.
//   · "Şu an oynuyor" ilerleme kartı ve saat/başarım karoları — oynanma
//     süresi ve başarım yüzdesi bu uçta yok.
//   · "@kullanıcı" satırındaki Steam kullanıcı adı — sunucu BİLEREK
//     vermiyor (route: "hangi hesap dışarı verilmiyor"); yalnız bağlı olup
//     olmadığı çipte duruyor.
//
// SAYAÇLAR KİTTEKİ GİBİ SATIR HÂLİNDE, avatarın sağında sütunlar hâlinde
// değil: kit "1.284 takipçi · 312 takip · 48 arkadaş" diye yan yana yazıyor
// ve bu düzen dar ekranda da kırılmıyor.
// ─────────────────────────────────────────────────────────────────────────────

const P = K.profile;

/** Kimlik bloğundaki tek sayaç: 16/700 sayı + 14 etiket. Üçü de bir hedefe gidiyor. */
function Counter({ n, label, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={styles.counter}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
    >
      <Txt variant="cardTitleLarge" style={[styles.counterN, NUMERIC]}>{n}</Txt>
      <Txt variant="subheadRegular" numberOfLines={1} style={{ color: colors.text2 }}>{label}</Txt>
    </PressableScale>
  );
}

/** Durum çipi — bağlı mağaza, ortak arkadaş, gizli profil. Bilgi öğesi. */
function Chip({ icon, dot, text, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const inner = (
    <>
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      {icon ? <Icon name={icon} size={P.chipDot * 2} color={colors.text3} /> : null}
      <Txt variant="footnoteMedium" numberOfLines={1} style={{ color: colors.text2 }}>{text}</Txt>
    </>
  );
  const stil = [styles.chip, { backgroundColor: colors.surface2 }];
  if (!onPress) return <View style={stil}>{inner}</View>;
  return (
    <PressableScale onPress={onPress} style={stil} accessibilityRole="button">{inner}</PressableScale>
  );
}

/**
 * @param profile     `/api/social/profile` yanıtındaki profile nesnesi
 * @param friendship  'self' | 'none' | 'requested' | 'incoming' | 'friends'
 * @param mutual      ortak arkadaş sayısı (başkasının profilinde)
 * @param week        `{ hasActivity, byDay, topDay, discovered }` — yalnız kendi profilinde
 * @param busy        arkadaşlık isteği uçuşta
 * @param onCounter   ('posts'|'friends'|'games')
 * @param onFriend    ('request'|'cancel'|'accept'|'reject')
 */
export default function ProfileHeader({
  profile, friendship = 'none', mutual = 0, week = null, busy = false,
  onCounter, onEdit, onShare, onMessage, onFriend, onConnect, onWeek,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  if (!profile) return null;

  const c = profile.counts || {};
  const isSelf = friendship === 'self';
  const name = profile.displayName || profile.username;

  return (
    <View style={styles.wrap}>
      {/* ── Avatar satırı (kit avrow) ──
          KENDİ PROFİLİMDE düğme avatarın sağında, kitteki gibi. BAŞKASININ
          profilinde iki düğme var ("Arkadaş Ekle" + "Mesaj") ve ikisi 375 pt
          kanvasta avatarın yanına sığmıyor — orada eylemler kendi satırında
          duruyor (aşağıda). Kit yalnız kendi profilini çiziyor. */}
      <View style={styles.avatarRow}>
        <UserAvatar avatar={profile.avatar} name={name} size={P.avatar} />
        {isSelf ? (
          <View style={styles.avatarActions}>
            <Button title={t('prof.editProfile')} variant="secondary" height={P.actionHeight} onPress={onEdit} />
            {/* PAYLAŞ DÜĞMESİ, İŞLEYİCİ VERİLİNCE ÇİZİLİYOR — ve artık hedefi
                var: profilin web karşılığı (`/u/<kullanıcı>`) yayında.
                Bir süre çizilmedi çünkü paylaşılacak adres yoktu; yalnız
                `gamerisen://` şeması paylaşılsaydı bağlantıyı alan çoğu kişi
                hiçbir şey görmezdi — oysa paylaşmanın anlamı tam olarak
                uygulaması OLMAYAN birine göstermek. */}
            {onShare ? <IconButton icon="share" label={t('stats.share')} variant="filled" onPress={onShare} /> : null}
          </View>
        ) : null}
      </View>

      {/* ── Ad ve kullanıcı adı (kit name) ── */}
      <View style={styles.nameRow}>
        <Txt variant="profileName" numberOfLines={1} style={styles.flex}>{name}</Txt>
        <DevBadge user={profile} username={profile.username} isDeveloper={profile.isDeveloper} size={15} showLabel />
      </View>
      {profile.username ? (
        <View style={styles.handleRow}>
          <Txt variant="subheadRegular" numberOfLines={1} style={{ color: colors.text2 }}>
            {`@${profile.username}`}
          </Txt>
        </View>
      ) : null}

      {/* Bio İKİ SATIR: sunucu 150 karakterde kesiyor (MAX_BIO) ve bu sayı
          tam olarak 390pt genişlikte iki satır demek. Üçüncü satıra izin
          vermek kimlik bloğunu içeriğin üstüne taşırdı. */}
      {profile.bio ? (
        <Txt variant="body" numberOfLines={2} style={[styles.bio, { color: colors.text2 }]}>{profile.bio}</Txt>
      ) : null}

      {/* ── Sayaçlar (kit stats) ── */}
      <View style={styles.stats}>
        <Counter n={c.posts || 0}   label={t('prof.statPosts')}   onPress={() => onCounter?.('posts')} />
        <Counter n={c.friends || 0} label={t('prof.statFriends')} onPress={() => onCounter?.('friends')} />
        <Counter n={c.games || 0}   label={t('prof.statGames')}   onPress={() => onCounter?.('games')} />
      </View>

      {/* ── Çipler ── */}
      <View style={styles.chips}>
        {isDeveloperUser(profile) || profile.isDeveloper ? (
          <Chip icon="shield" dot={colors.orange} text={t('prof.devBadge')} />
        ) : null}
        {profile.privateProfile && !isSelf ? (
          <Chip icon="lock" text={t('prof.privateChip')} />
        ) : null}
        {profile.connections?.steam ? (
          <Chip dot={colors.green} text={t('prof.steamConnected')} />
        ) : isSelf ? (
          <Chip dot={colors.text3} text={t('auth.connectSteam')} onPress={onConnect} />
        ) : null}
        {profile.connections?.xbox ? (
          <Chip dot={colors.green} text={t('prof.xboxConnected')} />
        ) : null}
        {!isSelf && mutual > 0 ? (
          <Chip text={`${mutual} ${t('prof.mutualFriends')}`} />
        ) : null}
      </View>

      {/* ── Eylem satırı — BAŞKASININ PROFİLİ ──
          BİRİNCİL EYLEM ORADA: sayfanın var oluş sebebi "Arkadaş Ekle".
          Kendi profilimde eylemler avatarın yanında (yukarıda). */}
      {isSelf ? null : (
        <View style={styles.actions}>
          {friendship === 'incoming' ? (
            <>
              <Button title={t('soc.accept')} variant="primary" height={P.actionHeight} style={styles.flex}
                      loading={busy} onPress={() => onFriend?.('accept')} />
              <Button title={t('soc.reject')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      loading={busy} onPress={() => onFriend?.('reject')} />
            </>
          ) : friendship === 'requested' ? (
            <>
              <Button title={t('soc.requested')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      loading={busy} onPress={() => onFriend?.('cancel')} />
              <Button title={t('soc.messageShort')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      onPress={onMessage} />
            </>
          ) : friendship === 'friends' ? (
            <>
              {/* DURUM, EYLEM DEĞİL: "Arkadaşsınız" bir bilgi. `disabled`
                  VERİLMİYOR — solgunlaşınca düğme bozuk gibi okunuyordu
                  (emülatörde görüldü); işleyicisi yok, görünümü normal. */}
              <Button title={t('soc.friends')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      icon="check" onPress={undefined} />
              <Button title={t('soc.messageShort')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      onPress={onMessage} />
            </>
          ) : (
            <>
              <Button title={t('soc.addFriend')} variant="primary" height={P.actionHeight} style={styles.flex}
                      loading={busy} onPress={() => onFriend?.('request')} />
              <Button title={t('soc.messageShort')} variant="secondary" height={P.actionHeight} style={styles.flex}
                      onPress={onMessage} />
            </>
          )}
        </View>
      )}

      {/* ── Bu hafta ──
          Sayaçlar "kaç" diyor, bu satır "NE YAPTIN" diyor. Yalnız kendi
          profilimde ve yalnız hareket varsa: boş bir özet sayfayı canlı
          değil ÖLÜ gösterir.

          KİTTE YOK. Kit bu yerde "Şu an oynuyor" kartını çiziyor; oynama
          süresi ve başarım yüzdesi uygulamada yok (haftalık rapor keşif
          sayıyor, saat değil). Olmayan bir kartı çizmek yerine var olan
          özet duruyor. */}
      {isSelf && week?.hasActivity ? (
        <PressableScale onPress={onWeek} style={[styles.week, { backgroundColor: colors.surface1 }]}>
          <View style={styles.weekChart}>
            {week.byDay.map((n, i) => {
              const enCok = Math.max(...week.byDay, 1);
              // Yükseklikler ORANLI: sakin bir haftada mutlak ölçek grafiği
              // tamamen yassı gösterirdi. Boş gün 4pt TABAN alıyor — sıfır
              // çizilseydi yedi günlük ritim kopardı.
              const y = n > 0 ? Math.max(8, Math.round((n / enCok) * 32)) : 4;
              return (
                <View key={i} style={[styles.weekBar, { backgroundColor: colors.surface3 },
                  { height: y }, n > 0 && i === week.topDay && { backgroundColor: colors.brand }]} />
              );
            })}
          </View>
          <View style={styles.weekText}>
            <Txt variant="subhead" numberOfLines={1}>
              <Txt variant="subhead" style={NUMERIC}>{week.discovered}</Txt> {t('prof.weekDiscovered')}
            </Txt>
            <Txt variant="footnoteMedium" numberOfLines={1} style={{ color: colors.text3 }}>{t('prof.weekOnlyYou')}</Txt>
          </View>
          <Icon name="chev" size={K.sectionHeader.linkIcon} color={colors.text3} strokeWidth={K.sectionHeader.linkStroke} />
        </PressableScale>
      ) : null}
    </View>
  );
}

// REAKTİF STİL: tema değişince yeniden üretiliyor (bkz. ThemeContext).
const makeStyles = (colors) => StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingTop: spacing.s8 },
  flex: { flex: 1, minWidth: 0 },

  avatarRow: { minHeight: P.avatar, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatarActions: { flexDirection: 'row', alignItems: 'center', gap: P.chipGap },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: P.handleGap, marginTop: P.nameTop },
  handleRow: { height: P.handleRow, flexDirection: 'row', alignItems: 'center', gap: P.handleGap },
  bio: { marginTop: P.bioTop },

  stats: { height: P.statsHeight, marginTop: P.statsTop, flexDirection: 'row', alignItems: 'center', gap: P.statsGap },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: P.statGap },
  counterN: { color: colors.text },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: P.chipGap, marginTop: P.chipsTop },
  chip: {
    height: P.chipHeight, flexDirection: 'row', alignItems: 'center', gap: P.chipGap,
    paddingHorizontal: P.chipPaddingH, borderRadius: radius.pill,
  },
  chipDot: { width: P.chipDot, height: P.chipDot, borderRadius: P.chipDot / 2 },

  actions: { flexDirection: 'row', gap: P.chipGap, marginTop: P.actionsTop },

  week: {
    height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.s16,
    marginTop: P.actionsTop, paddingHorizontal: spacing.s16, borderRadius: radius.lg,
  },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s4, height: 32 },
  weekBar: { width: 8, borderRadius: radius.xs },
  weekText: { flex: 1, minWidth: 0 },
});
