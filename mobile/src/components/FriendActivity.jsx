import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';

import GameCard from './GameCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type, motion } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// "Arkadaşların bu hafta ne oynadı" şeridi.
//
// KATALOG DEĞİL ÇEVRE. Anasayfadaki diğer şeritler ("Trend", "Yeni") herkese
// aynı şeyi gösteriyor; bu şerit yalnızca bu kullanıcıya ait. Kartın ana
// bilgisi de oyun değil İNSAN: üstte kaç arkadaş, altında adları.
//
// AVATAR YIĞINI Steam'in kendi avatarları — Gamerisen hesabı olmayan
// arkadaşlar da görünüyor. Şeridin ilk günden dolu olmasının sebebi bu:
// kullanıcının mevcut Steam çevresini ödünç alıyor.
//
// SAAT GÖSTERİLMİYOR. Veri 24 saate kadar bayat olabiliyor (sunucudaki
// kütüphane önbelleği); "6,2 saat" yazmak olduğundan kesin bir izlenim
// verirdi. "Bu hafta oynadı" ifadesi o belirsizliği taşıyabiliyor.
//
// BOŞKEN DAVET YOK. Şerit ya anlamlı veriyle çıkar ya hiç çıkmaz; "arkadaşını
// davet et" gibi bir yer tutucu, ana sayfanın en değerli yerini kalıcı olarak
// boş göstermek olurdu.
// ─────────────────────────────────────────────────────────────────────────────

// ── Görünme eşiği ───────────────────────────────────────────────────────────
// Sunucu zaten SON İKİ HAFTA süzmesi yapıyor (hours2w yoksa oyun hiç gelmiyor),
// ama miktar eşiği yoktu: tek arkadaşın 10 dakikası şeridi açıyordu. Şerit
// "çevren şunu oynuyor" iddiasında; tek kişinin yarım saati o iddiayı
// taşımıyor ve özelliği değersizleştiriyor.
//
// İki yoldan biri yeterli:
//   • aynı oyunu 2+ arkadaş oynamış  → şeridin asıl anlattığı şey bu
//   • toplam 2 haftalık saat eşiği aşmış → tek ama gerçekten aktif arkadaş
const MIN_FRIENDS_ON_A_GAME = 2;
const MIN_TOTAL_HOURS_2W = 5;

/** Şerit gösterilmeye değer mi? Saf fonksiyon — sınır durumları test edilebilir. */
export function hasFriendSignal(games) {
  if (!Array.isArray(games) || games.length === 0) return false;
  if (games.some((g) => (Number(g?.count) || 0) >= MIN_FRIENDS_ON_A_GAME)) return true;
  const total = games.reduce((s, g) => s + (Number(g?.hours) || 0), 0);
  return total >= MIN_TOTAL_HOURS_2W;
}

export default function FriendActivity({ games }) {
  const { t } = useLanguage();
  const router = useRouter();

  if (!hasFriendSignal(games)) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="people" size={15} color={colors.text2} />
        <Text style={styles.title}>{t('home.friendsPlaying')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {games.map((g) => (
          // Bu kart da TEK KART AİLESİNDEN. HTML: "sosyal · 16:9 + arkadaş
          // cam etiketi". Avatar yığını `overlay`, oynayan arkadaşlar ise
          // varyantın "tek satır bağlam"ı olarak geçiyor — handoff'un
          // saydığı dört bağlamdan biri: "tarih, fiyat, mağaza ya da
          // ARKADAŞ".
          <GameCard
            key={g.appid}
            game={{ ...g, id: g.appid }}
            variant="social"
            style={styles.card}
            context={names(g, t)}
            onPress={() => router.push({
              pathname: '/game/[id]',
              params: { id: `rawg_${g.appid}`, appid: g.appid, name: g.name || '', image: g.image },
            })}
            overlay={(
              /* Avatar yığını görselin ÜSTÜNDE: kartın ilk okunan şeyi
                 oyun değil, oynayan kişiler olsun. */
              <View style={styles.stack}>
                {g.friends.map((f, i) => (
                  <Image
                    key={i}
                    source={f.avatar}
                    style={[styles.face, i > 0 && styles.faceOverlap]}
                    contentFit="cover"
                    transition={motion.image}
                  />
                ))}
              </View>
            )}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * "Ahmet oynadı" / "Ahmet ve Mehmet" / "Ahmet +3"
 *
 * TEK ARKADAŞTA AD YAZILIYOR, sayı değil: "1 arkadaşın oynadı" hem tuhaf hem
 * de asıl bilgiyi (kim) saklıyor. Çok kişide ise adları saymak yerine ilk ad
 * + kalan sayı gösteriliyor; kart genişliği üç adı taşımıyor.
 */
function names(g, t) {
  const f = g.friends || [];
  if (!f.length) return '';
  if (g.count === 1) return f[0].name;
  if (g.count === 2) return `${f[0].name} · ${f[1].name}`;
  return `${f[0].name} +${g.count - 1}`;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  title: {
    color: colors.text2, fontSize: type.caption, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.1,
  },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card:  { width: 150 },
  stack: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row' },
  face: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.bgInput,
    // Koyu halka yüzleri hem birbirinden hem de arkadaki kapaktan ayırıyor;
    // halkasız hâlde açık renkli kapaklarda avatarlar kayboluyor.
    borderWidth: 1.5, borderColor: colors.bg,
  },
  faceOverlap: { marginLeft: -8 },
});
