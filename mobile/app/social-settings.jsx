// ─────────────────────────────────────────────────────────────────────────────
// Sosyal gizlilik + engellenenler.
//
// Guideline 1.2 (engelleme yönetimi) ve 5.1.2 (kullanıcı kendi verisinin
// paylaşımını denetleyebilmeli) burada karşılanıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { getPrivacy, setPrivacy, getBlocked, unblockUser } from '../src/api/social';
import { engelKaldir } from '../src/services/engel';
import { spacing } from '../src/theme';
import { component as K, control as C, layout, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useLanguage } from '../src/context/LanguageContext';
import { NavBar } from '../src/components/ui/Navigation';
import { Button, ListGroup, ListRow, Switch, Txt } from '../src/components/ui/Primitives';
import { UserRow } from '../src/components/ui/Social';

export default function SocialSettingsScreen() {
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  // Ayarlardaki "Engellenenler" satırı buraya `?odak=engel` ile geliyor.
  const { odak } = useLocalSearchParams();

  // Engellenenler bölümü sayfanın SONUNDA — dört gizlilik anahtarından sonra.
  // Oraya bakmaya gelen kullanıcıyı boş bir liste karşılamasın diye bölüme
  // kaydırıyoruz. Kaydırma ANİMASYONLU: yukarıda içerik olduğunu göstermek
  // gerekiyor, yoksa sayfanın başka bir sayfa olduğu sanılır.
  const kaydirma = useRef(null);
  const odaklandi = useRef(false);

  const [privacy, setPriv] = useState(null);
  // Ayarlar OKUNAMADI mı — 'kapalı'dan AYRI durum (Faz 8).
  const [bozuk, setBozuk] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([getPrivacy(), getBlocked()]);
      setPriv(p?.privacy || { shareActivity: false, discoverable: false, showPresence: false, privateProfile: false });
      setBozuk(false);
      setBlocked(b?.blocked || []);
    } catch {
      // FAZ 8, KIRILMA — GİZLİLİKTE AÇIĞA DEĞİL BİLİNMEZLİĞE DÜŞ.
      // Öncesi: `setPriv({ shareActivity: true, discoverable: true })`.
      // İstek başarısız olduğunda arayüz paylaşımın AÇIK olduğunu
      // söylüyordu. Yanlış tarafa düşmek burada asimetrik: açığı kapalı
      // göstermek endişe yaratır, KAPALIYI AÇIK GÖSTERMEK GERÇEK ZARAR
      // yaratır — kullanıcı kapattığını sanıp açık bırakır.
      //
      // Ayrıca `showPresence` bu yedekte HİÇ YOKTU: üçüncü anahtar tanımsız
      // gelip kapalı çiziliyordu, yani sessizce üçüncü bir yalan.
      //
      // Artık üçü de kapalı ÇİZİLİYOR ama anahtarlar DEVRE DIŞI ve bant
      // "sunucudaki ayarların değişmedi" diyor: gösterilen şey bir durum
      // değil, bir bilinmezlik.
      setPriv({ shareActivity: false, discoverable: false, showPresence: false, privateProfile: false });
      setBozuk(true);
      setBlocked([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (key, value) => {
    if (saving) return;
    Haptics.selectionAsync();
    // İyimser güncelleme — anahtar anında dönsün
    setPriv((p) => ({ ...p, [key]: value }));
    setSaving(true);
    try {
      const r = await setPrivacy({ [key]: value });
      if (r?.privacy) setPriv(r.privacy);
    } catch {
      // Başarısızsa geri al, kullanıcı yanlış durumu doğru sanmasın
      setPriv((p) => ({ ...p, [key]: !value }));
      Alert.alert(t('soc.err.generic'));
    } finally {
      setSaving(false);
    }
  }, [saving, t]);

  const unblock = useCallback((person) => {
    Alert.alert(person.displayName || person.username || '', t('soc.unblock'), [
      { text: t('soc.cancel'), style: 'cancel' },
      {
        text: t('soc.unblock'),
        onPress: async () => {
          try {
            await unblockUser(person.uid);

            // YEREL SÜZGEÇTEN DE DÜŞÜR — sunucudan silmek TEK BAŞINA yetmiyor.
            //
            // `engel.js` bir oturum ömürlü küme tutuyor; oradan engellenen bir
            // uid akışlarda `suz()` ile eleniyor. Bu satır yokken sunucu
            // kaydı siliniyor, satır bu listeden kalkıyor, ama küme uid'i
            // TUTMAYA devam ediyordu: kullanıcı engeli kaldırdığını görüyor,
            // akışa dönüyor ve o kişinin içeriği hâlâ görünmüyordu —
            // uygulama tamamen kapanıp açılana kadar.
            //
            // `engel.js` bu hatayı yorumunda öngörmüş ama "sosyal ayarlar
            // listeyi zaten yeniden çekiyor" diyerek kendini güvende saymıştı.
            // İkisi ayrı şey: burada tazelenen ENGELLENENLER LİSTESİ, akışı
            // süzen ise o küme.
            //
            // SIRA: önce sunucu, sonra yerel — `engelUygula`nın aynadaki hâli.
            // Ters olsaydı istek düştüğünde içerik görünür olur ama engel
            // kalkmamış olurdu.
            engelKaldir(person.uid);

            setBlocked((list) => list.filter((x) => x.uid !== person.uid));
          } catch { Alert.alert(t('soc.err.generic')); }
        },
      },
    ]);
  }, [t]);

  // Bölümün y'si YERLEŞİMDEN okunuyor, hesaplanmıyor: üstündeki yığın
  // (bozuk bandı var/yok, dört satırın metinleri dile göre 1-2 satır)
  // değişken. Bir kez çalışıyor — döndürmede yeniden kaydırmak, kullanıcı
  // o an başka yere bakıyorsa sayfayı elinden alırdı.
  const engelBolumuOlctu = useCallback((e) => {
    if (odak !== 'engel' || odaklandi.current) return;
    odaklandi.current = true;
    const y = e.nativeEvent.layout.y;
    // Bir kare bekleniyor: `onLayout` içerik yüksekliği kesinleşmeden
    // ateşlenebiliyor ve o anda `scrollTo` kırpılıp yarı yolda kalıyor.
    requestAnimationFrame(() => {
      kaydirma.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
    });
  }, [odak]);

  // Dört anahtar aynı biçimde; fark yalnız ayar adı ve erişilebilirlik
  // etiketi. Sıra ve gerekçesi aşağıda, satırların yanında.
  const anahtar = (key, label) => (
    <Switch
      accessibilityLabel={label}
      value={!bozuk && !!privacy[key]}
      onValueChange={(v) => toggle(key, v)}
      disabled={bozuk}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('soc.privacyTitle')} />

      {privacy === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.text2} /></View>
      ) : (
        // ListGroup kendi 20'lik yan boşluğunu taşıyor (kit group()); kolon
        // payı `yan` dışarıda — Ayarlar'la aynı düzen.
        <ScrollView ref={kaydirma} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan }]} showsVerticalScrollIndicator={false}>
          {/* Anahtarlar kapalı ama bu bir DURUM değil bir BİLİNMEZLİK —
              bant tam olarak bunu söylüyor. Kırmızı yok. */}
          {bozuk ? (
            <View style={[styles.bozukBant, { backgroundColor: colors.surface1 }]}>
              <Txt variant="cardTitle">{t('soc.privUnknown')}</Txt>
              <Txt variant="footnote" style={{ color: colors.text2 }}>{t('soc.privUnknownDesc')}</Txt>
              <Button title={t('common.retry')} variant="secondary" height={36} onPress={load} style={styles.bozukEylem} />
            </View>
          ) : null}

          <ListGroup>
            {/* EN ÜSTTE ve `discoverable`'ın ÖNÜNDE: ikisi farklı şeyi
                kapatıyor ve karıştırılmaları kolay. `privateProfile` içeriği
                (koleksiyon · inceleme · gönderi) arkadaşlarla sınırlıyor,
                profilin kendisi bulunabilir kalıyor; `discoverable` profili
                kullanıcı adıyla açılamaz hâle getiriyor. Sıra bu yüzden dar
                olandan geniş olana. */}
            <ListRow icon="lock" title={t('soc.privateProfile')} description={t('soc.privateProfileDesc')} trailing={anahtar('privateProfile', t('soc.privateProfile'))} />
            <ListRow icon="zap" title={t('soc.shareActivity')} description={t('soc.shareActivityDesc')} trailing={anahtar('shareActivity', t('soc.shareActivity'))} />
            <ListRow icon="search" title={t('soc.discoverable')} description={t('soc.discoverableDesc')} trailing={anahtar('discoverable', t('soc.discoverable'))} />
            {/* Sunucu tarafi bu ayari zaten okuyordu ama arayuzde anahtari
                yoktu — kullanici cevrimici gorunmeyi kapatamiyordu. */}
            <ListRow icon="eye" title={t('soc.showPresence')} description={t('soc.showPresenceDesc')} trailing={anahtar('showPresence', t('soc.showPresence'))} />
          </ListGroup>

          {/* Başlık ve liste TEK sarmalayıcıda: `onLayout` bölümün tepesini
              veriyor, başlığın kendisini değil — kaydırma başlığı da ekrana
              almalı, yoksa kullanıcı listeyi neyin başlattığını göremez. */}
          <View onLayout={engelBolumuOlctu}>
            {blocked === null ? null : (
              <ListGroup title={t('soc.blocked')}>
                {blocked.length === 0
                  // Boş liste de bir SATIR (iOS "engellenen kişi yok"
                  // kalıbı): başlığın altında boş bir kutu kalmıyor.
                  ? <ListRow title={t('soc.noBlocked')} />
                  : blocked.map((p) => (
                    // UserRow'un kendi yan boşluğu yok (düz listede sayfa
                    // kenarına yaslanıyor); kutunun içinde ListRow'un 16'sı
                    // veriliyor. Ayraç ikonsuz satır kuralıyla 16'dan.
                    <View key={p.uid} style={styles.kisi}>
                      {/* FAZ 8 — avatar ortak bileşenden: fotoğraflı kişi
                          harf olarak görünmüyor (UserAvatar → Avatar). */}
                      <UserRow
                        avatar={p.avatar}
                        name={p.displayName || p.username || p.uid}
                        handle={p.username ? `@${p.username}` : ''}
                        right={<Button title={t('soc.unblock')} variant="secondary" height={K.friends.action} onPress={() => unblock(p)} />}
                      />
                    </View>
                  ))}
              </ListGroup>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Gruplar arası 28 — Ayarlar'la aynı (settings.jsx `groups`).
  body: { paddingTop: space[16], gap: space[28] },

  // Bozuk bant — Faz 4/5'teki ikizleriyle aynı dil, 2.0 kart yüzeyinde.
  // Kırmızı yok. Yan boşluk ListGroup kutusuyla aynı hizada.
  bozukBant: { marginHorizontal: layout.gutter, padding: space[16], borderRadius: dsRadius.card, gap: space[4] },
  bozukEylem: { alignSelf: 'flex-start', marginTop: space[8] },

  kisi: { paddingHorizontal: C.listPadding },
});
