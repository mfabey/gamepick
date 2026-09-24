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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, PRESSED, type, SHEET_LAYOUT } from '../theme';
import { component as K, radius as dsRadius, shadow } from '../theme/tokens';
import { useDesignTheme } from '../theme/useDesignTheme';
import { Button, Chip, IconButton, Txt } from './ui/Primitives';
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

// G-06b ölçüleri — bkz. tokens.component.filterSheet.
const F = K.filterSheet;

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

// ─────────────────────────────────────────────────────────────────────────────
// ETKİN FİLTRE ÇİPLERİ (Faz 4)
//
// Filtre durumu tek bir SAYI rozetiyle temsil ediliyordu ve koddaki yorum
// bunu kendisi kabul ediyordu: "2" ne olduğunu söylemiyor. Kullanıcı hangi
// boyutun daralttığını bulmak için sayfayı açıp tek tek denemek zorundaydı —
// beş boyut × çoklu etiket.
//
// Geri alma maliyeti sayfa açmaktan TEK DOKUNUŞA iniyor.
//
// NÖTR DİL, BÖLÜM ÇİPİNDEN AYRI: bölüm çipi bir SEÇİM (dolu: text zemin,
// bg metin), bu bir DURUM ÖZETİ (bgInput + text2 + ×). Aynı görünselerdi
// kullanıcı basınca seçim beklerdi, oysa kaldırma oluyor.
// ─────────────────────────────────────────────────────────────────────────────

/** Filtre nesnesini kaldırılabilir çip listesine çeviriyor. */
export function etkinFiltreler(filters, t) {
  const { genre, mode, store, mc, tags = [] } = filters || {};
  const liste = [];
  if (genre) liste.push({ anahtar: `genre:${genre}`, etiket: t('genre.' + genre), sifirla: { genre: null } });
  if (mode)  liste.push({ anahtar: `mode:${mode}`,   etiket: t('mode.' + mode),   sifirla: { mode: null } });
  if (store) liste.push({ anahtar: `store:${store}`, etiket: t('store.' + store), sifirla: { store: null } });
  if (mc)    liste.push({ anahtar: `mc:${mc}`,       etiket: `${mc}+`,            sifirla: { mc: null } });
  for (const tag of tags) {
    liste.push({
      anahtar: `tag:${tag}`,
      etiket: t('tag.' + tag),
      sifirla: { tags: tags.filter((x) => x !== tag) },
    });
  }
  return liste;
}

/**
 * @param {object} filters · @param {func} onKaldir(sifirlaParcasi)
 * @param {bool} [sar] "sonuç yok" hâlinde satır sarıyor (yatay kaydırma yok)
 */
export function EtkinFiltreler({ filters, onKaldir, sar = false }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const liste = etkinFiltreler(filters, t);
  if (liste.length === 0) return null;

  const cipler = liste.map((f) => (
    <Pressable
      key={f.anahtar}
      onPress={() => onKaldir(f.sifirla)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${f.etiket} — ${t('filter.remove')}`}
      style={({ pressed }) => [styles.etkinCip, pressed && PRESSED]}
    >
      <Text style={styles.etkinCipText}>{f.etiket}</Text>
      <Ionicons name="close" size={13} color={colors.text3} />
    </Pressable>
  ));

  if (sar) return <View style={styles.etkinSar}>{cipler}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.etkinSatir}>
      {cipler}
    </ScrollView>
  );
}

/** Etkin filtre sayısı — düğmedeki rozet ve "Temizle"nin görünürlüğü için. */
export function countFilters({ genre, mode, store, mc, tags }) {
  return (genre ? 1 : 0) + (mode ? 1 : 0) + (store ? 1 : 0)
       + (mc ? 1 : 0) + (tags?.length || 0);
}

// ── G-06b SAYFASI (kit s2.py filters()) ──────────────────────────────────────
// Kitten alınan: 24 köşe + bg2 + üst gölge, 36×5 tutamaç, üç parçalı başlık
// satırı (Sıfırla · Filtreler · ×), 15/20 bölüm başlıkları, 2.0 çipler ve
// sabit alt çubukta 52 pt 2.0 birincil düğme (üstünde saç teli).
//
// KİTTEN BİLEREK SAPMALAR (hepsinin verisi yok):
//   • Platform (PC/PS/Xbox/Switch/Mobil) — sunucuda platform süzgeci yok.
//   • Fiyat aralığı — dosya başındaki gerekçe (kart kart tembel fiyat).
//   • İndirim eşikleri (%25+/%50+/%75+) — sunucu indirim eşiği uygulamıyor.
//   • "Diğer filtreler" satır listesi — kitte her satır ayrı bir seçim
//     sayfası açıyor; bizde mod, mağaza ve puan az seçenekli, çip olarak
//     sayfanın kendisinde (iç içe Modal cihazda denenmeden yazılmayacak).
//   • Düğme metni "128 oyunu göster" değil "Uygula (n)": sonuç sayısı
//     uygulanmadan bilinmiyor, sayı uydurulmaz.
// Etiketler kitte yok ama uygulamada var (en fazla 5) — kaldırılmadı.
export default function FilterSheet({ visible, onClose, value, onApply, unavailable = [] }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [draft, setDraft] = useState(value);

  // Sayfa her açılışta DIŞARIDAKİ durumla eşitleniyor. Eşitlenmeseydi
  // kullanıcı "Uygula"madan kapattığında taslak kalır, bir sonraki açılışta
  // listeyle uyuşmayan seçimler görünürdü.
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

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
        <Pressable style={[styles.sheet, { backgroundColor: colors.bg2 }]} onPress={() => {}}>
          <View style={[styles.grabber, { backgroundColor: colors.text3 }]} />

          {/* Başlık ORTADA SABİT, yanlar serbest: kit iki yana 90 pt veriyor
              ama "Zurücksetzen" 90 pt'ye sığmıyor. Başlık mutlak ortalı,
              "Sıfırla" solda kendi genişliğinde. */}
          <View style={styles.head}>
            <Txt variant="headline" accessibilityRole="header" numberOfLines={1} style={styles.headTitle}>{t('filter.title')}</Txt>
            {/* Seçim yokken SOLUK, gizli değil: kitte hep orada duruyor ve
                yeri değişmeyen bir düğme aranmıyor. */}
            <Button title={t('filter.reset')} variant="tertiary" height={F.reset}
              disabled={n === 0} onPress={clear} style={styles.reset} />
            <IconButton icon="x" label={t('a11y.close')} onPress={onClose} variant="filled"
              size={F.close} iconSize={F.closeGlyph} color={colors.text2} />
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <Section title={t('filter.genre')}>
              {GENRES.map((g) => (
                <Chip key={g} title={t('genre.' + g)} selected={draft.genre === g}
                  onPress={() => toggle('genre', g)} />
              ))}
            </Section>

            <Section title={t('filter.mode')}>
              {MODES.map((m) => (
                <Chip key={m} title={t('mode.' + m)} selected={draft.mode === m}
                  onPress={() => toggle('mode', m)} />
              ))}
            </Section>

            {/* DEVRE DIŞI GÖRÜNÜYOR, GİZLENMİYOR (kontrol listesi). Gizlemek
                "böyle bir özellik yok" der; soluk göstermek "var ama şu an
                çalışmıyor" der. Veri kaynağı düşünce sunucu hangi filtrelerin
                uygulanmadığını bildiriyor. */}
            <Section title={t('filter.store')} kapali={kapali('store')}>
              {STORES.map((s) => (
                <Chip key={s} title={t('store.' + s)} selected={draft.store === s}
                  onPress={() => toggle('store', s)} />
              ))}
            </Section>

            <Section title={t('filter.score')} kapali={kapali('metacritic')}>
              {SCORES.map((s) => (
                <Chip key={s} title={`${s}+`} selected={draft.mc === s}
                  onPress={() => toggle('mc', s)} />
              ))}
            </Section>

            {/* Sınır BAŞLIĞIN SAĞINDA (kitin bölüm başlığı sağ yuvası):
                kullanıcı altıncı etikete basıp reddedilmeden önce görüyor. */}
            <Section title={t('filter.tags')} sag={`${draft.tags.length}/${MAX_TAGS}`} kapali={kapali('tags')}>
              {TAGS.map((tag) => (
                <Chip key={tag} title={t('tag.' + tag)} selected={draft.tags.includes(tag)}
                  onPress={() => toggleTag(tag)} />
              ))}
            </Section>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, F.footerTop) }]}>
            <Button title={n > 0 ? `${t('filter.apply')} (${n})` : t('filter.applyNone')} height={F.cta} onPress={apply} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Bölüm: 15/20 başlık (sağında isteğe bağlı sayaç), 12 aşağıda sarılan çipler.
// Kapalı bölüm soluk ve dokunulmaz ama GÖRÜNÜR; başlıkta "çalışmıyor" notu.
function Section({ title, sag, kapali, children }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Txt variant="cardTitle" numberOfLines={1} style={styles.flex}>
          {title}
          {kapali ? <Txt variant="cardTitle" style={{ color: colors.red }}>{`  ·  ${t('limited.off')}`}</Txt> : null}
        </Txt>
        {sag ? <Txt variant="footnote" style={{ color: colors.text2 }}>{sag}</Txt> : null}
      </View>
      <View style={[styles.wrap, kapali && styles.kapali]} pointerEvents={kapali ? 'none' : 'auto'}
        accessibilityElementsHidden={kapali} importantForAccessibility={kapali ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
    </View>
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
  // Zemin (bg2) JSX'te, 2.0 temasından. Köşe ve gölge kitin (DS 4 Bottom Sheet).
  sheet: {
    ...SHEET_LAYOUT,
    borderTopLeftRadius: dsRadius.sheet, borderTopRightRadius: dsRadius.sheet,
    boxShadow: shadow.sheet,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center', width: F.grabberWidth, height: F.grabberHeight,
    borderRadius: F.grabberRadius, marginTop: F.grabberTop,
  },
  head: {
    height: F.header, paddingHorizontal: F.headerPadding,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  // Başlık düğmelerin ALTINDA çiziliyor (JSX'te önce): dokunuşu onlar alıyor.
  headTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  // Kit: tertiary düğme, yatay dolgu 8.
  reset: { paddingHorizontal: spacing.s8 },

  body: { flexGrow: 0 },
  bodyContent: { paddingTop: F.bodyTop, paddingHorizontal: spacing.s20, paddingBottom: spacing.s20, gap: F.sectionGap },
  section: { gap: F.sectionTitleGap },
  sectionHead: { height: F.sectionTitle, flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: F.chipGap },
  // Soluk ama GÖRÜNÜR — kullanıcı özelliğin var olduğunu bilsin.
  kapali: { opacity: 0.4 },

  // Sabit alt çubuk: kaydırılan içerikten saç teliyle ayrılıyor (kit).
  footer: { paddingTop: F.footerTop, paddingHorizontal: spacing.s20, borderTopWidth: StyleSheet.hairlineWidth },

  // ── ETKİN FİLTRE ÇİPLERİ ve BAŞLIK DÜĞMESİ (games.jsx) — G-06 işi, değişmedi.
  // Maket: 32pt, pill, bgInput, footnote 13, hitSlop 8.
  etkinSatir: { flexDirection: 'row', gap: spacing.s8, paddingHorizontal: spacing.s20 },
  etkinSar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s8, justifyContent: 'center' },
  etkinCip: {
    height: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.s4,
    paddingHorizontal: spacing.s12, borderRadius: radius.pill,
    backgroundColor: colors.bgInput,
  },
  etkinCipText: { color: colors.text2, fontSize: type.footnote, fontWeight: '600' },

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
