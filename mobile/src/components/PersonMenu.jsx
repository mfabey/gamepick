// ─────────────────────────────────────────────────────────────────────────────
// Kişi menüsü — arkadaş listesinde satıra uzun basınca, gönderi kartında ⋯.
// 2.0 / G-DS-4 (27 Eyl): ortak AltSayfa; başlık satırında avatar + ad +
// @kullanıcı. Eylemler iki grupta: gezinme (profil, mesaj) ve yıkıcı
// (çıkar, engelle, şikâyet) — eskiden ince bir çizgiyle ayrılıyordu, artık
// iki ayrı 2.0 liste kutusu.
// ─────────────────────────────────────────────────────────────────────────────
import { StyleSheet, View } from 'react-native';
import Avatar from './Avatar';
import { AltSayfa } from './ui/AltSayfa';
import { ListGroup, ListRow } from './ui/Primitives';
import { useLanguage } from '../context/LanguageContext';
import { space } from '../theme/tokens';

/**
 * @param {object}  person   { uid, username, displayName, avatar }
 * @param {bool}    arkadas  arkadaşsa "çıkar" ve "mesaj" görünür
 * @param {string}  raporEtiketi  şikayet satırının ETİKETİ — neyin şikayet
 *   edildiğini ÇAĞIRAN belirliyor. Kişi listesinde kişiyi, gönderi kartında
 *   gönderiyi şikayet ediyoruz ve menü aynı; ayrı bir satır eklemek yerine
 *   satırın adı değişiyor. Ayrı satır olsaydı gönderi kartında iki şikayet
 *   satırı yan yana durur ve kullanıcı hangisinin ne yaptığını bilemezdi.
 * @param {func}    onSec    (anahtar) → 'profile'|'message'|'remove'|'block'|'report'
 */
export default function PersonMenu({ visible, person, arkadas = false, raporEtiketi, onClose, onSec }) {
  const { t } = useLanguage();
  if (!person) return null;
  const ad = person.displayName || person.username;

  const git = [
    person.username && { anahtar: 'profile', etiket: t('soc.menu.profile'), ikon: 'user' },
    arkadas && { anahtar: 'message', etiket: t('soc.menu.message'), ikon: 'msg' },
  ].filter(Boolean);
  const yikici = [
    arkadas && { anahtar: 'remove', etiket: t('soc.menu.remove'), ikon: 'userminus' },
    { anahtar: 'block', etiket: t('soc.menu.block'), ikon: 'ban' },
    { anahtar: 'report', etiket: raporEtiketi || t('soc.menu.report'), ikon: 'flag' },
  ].filter(Boolean);

  const satir = (s, kirmizi) => (
    <ListRow key={s.anahtar} title={s.etiket} icon={s.ikon} destructive={kirmizi} trailing={false}
      onPress={() => { onClose(); onSec(s.anahtar); }} />
  );

  return (
    <AltSayfa visible={visible} onClose={onClose} title={ad} subtitle={person.username ? `@${person.username}` : undefined}
      leading={<Avatar avatar={person.avatar} name={ad} size={40} />}>
      <View style={styles.gruplar}>
        {git.length > 0 ? <ListGroup>{git.map((s) => satir(s, false))}</ListGroup> : null}
        <ListGroup>{yikici.map((s) => satir(s, true))}</ListGroup>
      </View>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  gruplar: { gap: space[16], paddingBottom: space[4] },
});
