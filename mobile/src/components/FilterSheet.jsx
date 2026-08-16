// ─────────────────────────────────────────────────────────────────────────────
// Gelişmiş filtre sayfası.
//
// NEDEN SAYFA, ÇİP SATIRI DEĞİL. Oyunlar ekranının başlığında zaten iki çip
// satırı vardı (bölüm + mod). Dört boyut daha satır olarak eklenseydi altı
// satır olurdu; başlık ekranın yarısını kaplardı ve anasayfada uğraştığımız
// "karışık" sorununun aynısı burada çıkardı. Sayfa açılınca başlık tek çip
// satırına DÜŞÜYOR — mod da buraya taşındı.
//
// TASLAK DURUM + "UYGULA". Her dokunuşta filtre uygulansaydı her seçim bir
// RAWG isteği tetiklerdi; kullanıcı beş etiket seçerken beş liste yenilenirdi.
// Seçimler yerel taslakta birikiyor, tek istek "Uygula" ile gidiyor.
//
// FİYAT ARALIĞI YOK — bilerek. Sunucu `price` parametresinde yalnızca 'free'
// uyguluyor; web'deki 0–100₺ gibi bantlar istemci tarafında süzülüyor. Mobilde
// fiyat kart kart tembel geliyor (usePrice → /api/card-price), yani liste
// kurulurken game.price henüz null. Bant filtresi kartları göründükten SONRA
// silerdi. "Ücretsiz" zaten bölüm çipi olarak var ve sunucu destekliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { radius, spacing, PRESSED, type } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Tür slug'ları sunucudaki eşlemelerle BİREBİR: STEAM_GENRE_MAP (7) +
// STEAM_TAG_MAP (5). Uydurulmuş bir slug RAWG'dan boş liste döndürür ve
// kullanıcı "filtre bozuk" diye okur.
export const GENRES = [
  'action', 'role-playing-games-rpg', 'strategy', 'adventure',
  'shooter', 'puzzle', 'sports', 'racing',
  'horror', 'platformer', 'card', 'simulation',
];

const MODES  = ['singleplayer', 'multiplayer', 'coop'];
const STORES = ['steam', 'epic'];
const SCORES = [70, 80, 90];

// Etiketler UYDURULMADI: hepsi app/api/games/route.js içindeki TR_TAG
// haritasından alındı. O slug'lar akıllı arama yolunda zaten üretimde
// çalışıyor, yani RAWG'ın tanıdığı biliniyor. (.env.local olmadığı için
// canlı doğrulama yapılamıyor — bilinen listeden seçmek tek dürüst yol.)
const TAGS = [
  'open-world', 'story-rich', 'souls-like', 'roguelike',
  'survival', 'atmospheric', 'sandbox', 'stealth',
  'fantasy', 'sci-fi', 'cyberpunk', 'post-apocalyptic',
  'zombies', 'anime',
];

// Sunucu en fazla 5 etiket kabul ediyor (route.js: slice(0, 5)). Sınırı
// burada da uyguluyoruz: sessizce kırpılan bir seçim, kullanıcının seçtiği
// ama işlemeyen bir filtre demek.
export const MAX_TAGS = 5;

/** Etkin filtre sayısı — düğmedeki rozet ve "Temizle"nin görünürlüğü için. */
export function countFilters({ genre, mode, store, mc, tags }) {
  return (genre ? 1 : 0) + (mode ? 1 : 0) + (store ? 1 : 0)
       + (mc ? 1 : 0) + (tags?.length || 0);
}

export default function FilterSheet({ visible, onClose, value, onApply, unavailable = [] }) {
  const styles = useStyles(makeStyles);
  const { t } = useLanguage();
  const [draft, setDraft] = useState(value);

  // Sayfa her açılışta DIŞARIDAKİ durumla eşitleniyor. Eşitlenmeseydi
  // kullanıcı "Uygula"madan kapattığında taslak kalır, bir sonraki açılışta
  // listeyle uyuşmayan seçimler görünürdü.
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  const set = useCallback((patch) => {
    Haptics.selectionAsync().catch(() => {});
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  // Tek seçimliler AÇIP KAPANIYOR: aynı çipe ikinci kez basmak seçimi
  // kaldırıyor. Ayrı bir "Tümü" çipi koymak her gruba bir çip daha eklerdi.
  const toggle = useCallback((key, v) => {
    setDraft((d) => {
      Haptics.selectionAsync().catch(() => {});
      return { ...d, [key]: d[key] === v ? null : v };
    });
  }, []);

  const toggleTag = useCallback((tag) => {
    setDraft((d) => {
      const on = d.tags.includes(tag);
      if (!on && d.tags.length >= MAX_TAGS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return d;   // sınıra dayandı — sessizce yutma, dokunsal uyarı ver
      }
      Haptics.selectionAsync().catch(() => {});
      return { ...d, tags: on ? d.tags.filter((x) => x !== tag) : [...d.tags, tag] };
    });
  }, []);

  const clear = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setDraft({ genre: null, mode: null, store: null, mc: null, tags: [] });
  }, []);

  const apply = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  const kapali = (ad) => unavailable.includes(ad);

  const n = countFilters(draft);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* İç yüzeyde onPress var ama HİÇBİR ŞEY YAPMIYOR: sayfanın boş bir
            yerine dokunmak arkadaki Pressable'a ulaşıp sayfayı kapatıyordu. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />

          <View style={styles.head}>
            <Text style={styles.title}>{t('filter.title')}</Text>
            {n > 0 ? (
              <Pressable onPress={clear} hitSlop={10}>
                <Text style={styles.clear}>{t('filter.clear')}</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Group label={t('filter.genre')}>
              {GENRES.map((g) => (
                <Chip key={g} on={draft.genre === g} label={t('genre.' + g)}
                  onPress={() => toggle('genre', g)} />
              ))}
            </Group>

            <Group label={t('filter.mode')}>
              {MODES.map((m) => (
                <Chip key={m} on={draft.mode === m} label={t('mode.' + m)}
                  onPress={() => toggle('mode', m)} />
              ))}
            </Group>

            {/* DEVRE DIŞI GÖRÜNÜYOR, GİZLENMİYOR (kontrol listesi). Gizlemek
                "böyle bir özellik yok" der; soluk göstermek "var ama şu an
                çalışmıyor" der. Veri kaynağı düşünce sunucu hangi filtrelerin
                uygulanmadığını bildiriyor. */}
            <Group label={t('filter.store')} kapali={kapali('store')}>
              {STORES.map((s) => (
                <Chip key={s} on={draft.store === s} label={t('store.' + s)}
                  kapali={kapali('store')}
                  onPress={() => toggle('store', s)} />
              ))}
            </Group>

            <Group label={t('filter.score')} kapali={kapali('metacritic')}>
              {SCORES.map((s) => (
                <Chip key={s} on={draft.mc === s} label={`${s}+`}
                  kapali={kapali('metacritic')}
                  onPress={() => toggle('mc', s)} />
              ))}
            </Group>

            {/* Sınır BAŞLIKTA yazıyor, hata mesajında değil: kullanıcı altıncı
                etikete basıp reddedilmeden önce sınırı görüyor. */}
            <Group label={`${t('filter.tags')}  ${draft.tags.length}/${MAX_TAGS}`} kapali={kapali('tags')}>
              {TAGS.map((tag) => (
                <Chip key={tag} on={draft.tags.includes(tag)} label={t('tag.' + tag)}
                  kapali={kapali('tags')}
                  onPress={() => toggleTag(tag)} />
              ))}
            </Group>
          </ScrollView>

          <Pressable style={({ pressed }) => [styles.cta, pressed && PRESSED]} onPress={apply}>
            <Text style={styles.ctaText}>
              {n > 0 ? `${t('filter.apply')} (${n})` : t('filter.applyNone')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Group({ label, children, kapali }) {
  const styles = useStyles(makeStyles);
  const { t } = useLanguage();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, kapali && styles.groupLabelKapali]}>
        {label}{kapali ? `  ·  ${t('limited.off')}` : ''}
      </Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

// Seçim dili games.jsx ile AYNI: dolu nötr yüzey + koyu metin. Marka rengi
// kullanılmıyor; ekranın tek gerçek CTA'sı "Uygula" ve vurguyu o taşımalı.
function Chip({ on, label, onPress, kapali }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={kapali ? undefined : onPress}
      disabled={kapali}
      accessibilityState={kapali ? { disabled: true } : undefined}
      style={[styles.chip, on && styles.chipOn, kapali && styles.chipKapali]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Başlıktaki filtre düğmesi — etkin sayıyı rozet olarak taşıyor. */
export function FilterButton({ count, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('filter.title')}
      style={({ pressed }) => [styles.fbtn, count > 0 && styles.fbtnOn, pressed && PRESSED]}
      hitSlop={6}
    >
      <Ionicons name="options-outline" size={19} color={count > 0 ? colors.bg : colors.text2} />
      {count > 0 ? <Text style={styles.fbtnCount}>{count}</Text> : null}
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 28,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.5, marginBottom: 14,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: type.body, fontWeight: '900' },
  clear: { color: colors.accentText, fontSize: type.footnote, fontWeight: '700' },

  body: { flexGrow: 0, marginTop: 6 },
  group: { marginTop: spacing.lg },
  groupLabel: {
    // Maket: filtre grup etiketi "Tur" = 13 / 600 / text2.
    color: colors.text2, fontSize: type.footnote, fontWeight: '600', marginBottom: spacing.s8,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  chip: {
    paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  chipText: { fontSize: type.footnote, color: colors.text2, fontWeight: '500' },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipTextOn: { color: colors.bg, fontWeight: '700' },
  // Soluk ama GÖRÜNÜR — kullanıcı özelliğin var olduğunu bilsin.
  chipKapali: { opacity: 0.4 },
  groupLabelKapali: { color: colors.accentText },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },

  // Arama kutusunun yanındaki düğme — kutuyla aynı yükseklikte dursun diye
  // sabit 44pt (aynı zamanda HIG'in asgari dokunma hedefi).
  fbtn: {
    width: 44, height: 44, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.cardBorder,
  },
  fbtnOn: { backgroundColor: colors.text, borderColor: colors.text },
  fbtnCount: { color: colors.bg, fontSize: type.caption, fontWeight: '900' },
});
