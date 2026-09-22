import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/context/ThemeContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { space, layout, gradients, avatarPalette, component as K } from '../src/theme/tokens';
import { ICON_NAMES, Icon } from '../src/components/Icon';
import { Skeleton } from '../src/components/Skeleton';
import { Button, Chip, IconButton, ListGroup, ListRow, SectionHeader, Segmented, Switch, TextField, Txt } from '../src/components/ui/Primitives';
import { HeartButton } from '../src/components/ui/HeartButton';
import { FollowButton } from '../src/components/ui/FollowButton';
import { SearchField } from '../src/components/ui/SearchField';
import { GlassView } from '../src/components/ui/GlassView';
import { useToast } from '../src/components/ui/Toast';
import { HomeHeader, NavBar, PageDots, PageHeader, StickyBottomBar } from '../src/components/ui/Navigation';

// ─────────────────────────────────────────────────────────────────────────────
// GELİŞTİRME GALERİSİ — DS 2 (Kontroller), DS 4 (Durumlar) ve gezinme
// bileşenleri tasarımdaki sırayla ve örnek metinlerle. Üretimde ana sayfaya
// yönleniyor: örnek içerik kullanıcıya hiç görünmüyor. Metinler bu yüzden
// çeviri anahtarı değil, düz Türkçe (tasarımın kendi örnekleri).
// ─────────────────────────────────────────────────────────────────────────────
export default function DesignSystem() {
  const router = useRouter();
  const { colors } = useDesignTheme();
  const { pref, setPref } = useTheme();
  const toast = useToast();
  const [chip, setChip] = useState('games');
  const [segment, setSegment] = useState('min');
  const [enabled, setEnabled] = useState(true);
  const [heart, setHeart] = useState(false);
  const [following, setFollowing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('Soulslike bağımlısı, co-op sever.');
  const [query, setQuery] = useState('elden');
  const [loading, setLoading] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;

  return <SafeAreaView edges={['top']} style={[s.screen, { backgroundColor: colors.bg }]}>
    <NavBar title="Tasarım sistemi" subtitle="Gamerisen 2.0 · geliştirme" border
      right={<IconButton icon="moon" label="Temayı değiştir" onPress={() => setPref(pref === 'dark' ? 'light' : 'dark')} />} />
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Segmented value={pref} onChange={setPref} accessibilityLabel="Tema"
        items={[{ value: 'dark', label: 'Koyu' }, { value: 'light', label: 'Açık' }, { value: 'system', label: 'Sistem' }]} />

      <Group title="Butonlar">
        <Button title="Birincil" icon="plus" onPress={() => setLoading(true)} />
        <Button title="İkincil" variant="secondary" iconRight="ext" onPress={() => setLoading(false)} />
        <Row><Button title="Metin" variant="tertiary" height={40} /><Button title="Renkli" variant="tinted" height={40} /><Button title="Sil" variant="destructive" height={40} /></Row>
        <Row><Button title="Büyük · 52" height={52} /><Button title="Orta · 44" height={44} /><Button title="Küçük · 36" height={36} /><Button title="Mini · 30" height={30} variant="secondary" /></Row>
        <Row><Button title="40 pt" height={40} variant="secondary" /><Button title="36 pt" height={36} variant="secondary" /></Row>
        <Row><Button title="Yükleniyor" loading={loading} onPress={() => setLoading(!loading)} /><Button title="Devre dışı" disabled /></Row>
        <Art><Button title="Görsel üstü" variant="onArt" height={44} icon="playf" /><IconButton icon="share" label="Paylaş" variant="onArt" /><HeartButton selected={heart} onPress={() => setHeart(!heart)} /></Art>
      </Group>

      <Group title="İkon butonları">
        <Row>
          <IconButton icon="search" label="Ara" />
          <IconButton icon="bell" label="Bildirimler, 4 yeni" dot />
          <IconButton icon="msg" label="Mesajlar" badge={3} />
          <IconButton icon="sliders" label="Filtrele" variant="filled" badge={2} />
          <IconButton icon="heart" label="Beğen" selected fill={colors.red} />
        </Row>
      </Group>

      <Group title="Takip ve kalp">
        <Row><FollowButton following={following} onPress={() => setFollowing(!following)} /><FollowButton following onPress={() => setFollowing(!following)} /></Row>
      </Group>

      <Group title="Çipler ve seçim">
        <Row>
          <Chip title="Oyunlar" selected={chip === 'games'} onPress={() => setChip('games')} />
          <Chip title="Kişiler" selected={chip === 'people'} onPress={() => setChip('people')} />
          <Chip title="PC" icon="monitor" selected={chip === 'pc'} onPress={() => setChip('pc')} />
          <Chip title="En düşük fiyat" icon="sort" selected={chip === 'sort'} onPress={() => setChip('sort')} />
          <Chip title="Platform" chevron onPress={() => setChip('platform')} selected={chip === 'platform'} />
          <Chip title="RPG" removable selected onPress={() => setChip('games')} />
        </Row>
        <View style={s.compactSegment}>
          <Segmented compact value="1y" onChange={() => {}} items={[{ value: '3a', label: '3A' }, { value: '6a', label: '6A' }, { value: '1y', label: '1Y' }, { value: 'all', label: 'Tümü' }]} />
        </View>
        <Segmented value={segment} onChange={setSegment} items={[{ value: 'min', label: 'Minimum' }, { value: 'rec', label: 'Önerilen' }]} />
        <Segmented value="all" onChange={() => {}} items={[{ value: 'all', label: 'Tümü' }, { value: 'games', label: 'Oyunlar' }, { value: 'people', label: 'Kişiler' }, { value: 'news', label: 'Haberler' }, { value: 'videos', label: 'Videolar' }]} />
        <Row><Switch accessibilityLabel="Açık anahtar" value={enabled} onValueChange={setEnabled} /><Switch accessibilityLabel="Kapalı anahtar" value={!enabled} onValueChange={(v) => setEnabled(!v)} /><Switch accessibilityLabel="Devre dışı" value disabled /></Row>
      </Group>

      <Group title="Giriş alanları">
        <SearchField value={query} onChangeText={setQuery} placeholder="Oyun, oyuncu, topluluk, haber ara" />
        <SearchField placeholder="Oyun, oyuncu, topluluk, haber ara" onPress={() => toast({ message: 'Arama ekranı açılır', tone: 'neutral' })} />
        <SearchField value="" onChangeText={() => {}} placeholder="Oyun, oyuncu, topluluk, haber ara" onCancel={() => setQuery('')} />
        <TextField label="E-posta" icon="mail" value={name} onChangeText={setName} placeholder="ornek@eposta.com" keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Şifre" icon="lock" secure placeholder="En az 8 karakter" />
        <TextField label="Kullanıcı adı" value="denizplays" success="Kullanılabilir" />
        <TextField label="E-posta" value="deniz@" error="Geçerli bir e-posta adresi gir" />
        <TextField label="Biyografi" value={bio} onChangeText={setBio} maxLength={150} counter multiline />
      </Group>

      <Group title="Durumlar">
        <Row>
          <Button title="Toast" variant="secondary" height={40} onPress={() => toast({ message: 'İstek listesine eklendi', tone: 'success', action: { label: 'Geri al', onPress: () => {} } })} />
          <Button title="Hata" variant="secondary" height={40} onPress={() => toast({ message: 'Bağlantı yok, tekrar deniyoruz…', tone: 'error', action: { label: 'Tekrar dene', onPress: () => {} } })} />
        </Row>
        <View style={s.skeletonCard}>
          <Skeleton style={s.skeletonCover} />
          <Skeleton style={s.skeletonTitle} />
          <Skeleton style={s.skeletonMeta} />
          <Skeleton style={s.skeletonPrice} />
        </View>
      </Group>

      <Group title="Gezinme" bleed>
        <HomeHeader onSearch={() => {}} onNotifications={() => {}} hasUnread name="Deniz" onProfile={() => {}} />
        <PageHeader title="Topluluk"><IconButton icon="search" label="Toplulukta ara" /><IconButton icon="edit" label="Gönderi oluştur" /></PageHeader>
        <NavBar title="Fiyat Karşılaştırma" subtitle="27 oyun" right={<IconButton icon="bell" label="Fiyat alarmı" />} border onBack={() => {}} />
        <View style={s.pad}><SectionHeader title="Senin İçin" subtitle="Çünkü RPG oyunlarını seviyorsun" action="Tümü" onAction={() => {}} /></View>
        <PageDots count={5} active={1} />
        <View style={s.stickyBox}><StickyBottomBar price="₺599" subtitle="Steam'de en ucuz · -%50" actionLabel="Mağazaya Git" onAction={() => {}} /></View>
      </Group>

      {/* ListGroup kendi 20'lik kenar payını taşıyor (kit group()): galerinin iç boşluğunu iptal et. */}
      <View style={s.bleed}><ListGroup title="Bildirimler" note="Sessiz saatlerde bildirimler sabah özet olarak gelir.">
        <ListRow title="Fiyat düşüşleri" icon="tag" trailing={<Switch accessibilityLabel="Fiyat düşüşleri" value={enabled} onValueChange={setEnabled} />} />
        <ListRow title="Bildirim sıklığı" value="Anlık" icon="bell" onPress={() => {}} />
        <ListRow title="Para birimi" value="₺ TRY" onPress={() => {}} />
        <ListRow title="Çıkış yap" destructive icon="logout" trailing={false} onPress={() => router.back()} />
      </ListGroup></View>

      <Group title="İkon seti">
        <View style={s.icons}>{ICON_NAMES.map((icon) => <View key={icon} style={s.icon}><Icon name={icon} /><Txt variant="caption2" numberOfLines={1}>{icon}</Txt></View>)}</View>
      </Group>
    </ScrollView>
  </SafeAreaView>;
}

function Group({ title, children, bleed }: { title: string; children: ReactNode; bleed?: boolean }) {
  return <View style={[s.group, bleed && s.bleed]}>
    <View style={bleed ? s.pad : undefined}><Txt variant="title2">{title}</Txt></View>
    {children}
  </View>;
}
function Row({ children }: { children: ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
// Görsel üstü bileşenleri denemek için koyu, görsel benzeri bir zemin (tasarımın hero degradesi).
function Art({ children }: { children: ReactNode }) {
  return <View style={s.art}>
    <LinearGradient colors={[avatarPalette[3], avatarPalette[6]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <LinearGradient {...gradients.heroCard} style={StyleSheet.absoluteFill} />
    <GlassView style={s.artTag}><Txt variant="captionStrong">Cam etiket</Txt></GlassView>
    <View style={s.row}>{children}</View>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: layout.gutter, gap: space[32], paddingBottom: space[32] },
  group: { gap: space[12] },
  bleed: { marginHorizontal: -layout.gutter },
  pad: { paddingHorizontal: layout.gutter },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexWrap: 'wrap' },
  // tema-bagimsiz: galeri örneği, görsel yerine koyu degrade zemin
  art: { borderRadius: 22, overflow: 'hidden', padding: space[16], gap: space[12] },
  artTag: { alignSelf: 'flex-start', height: 28, paddingHorizontal: space[10], borderRadius: 8, justifyContent: 'center' },
  skeletonCard: { width: 148, gap: K.skeleton.card.gap },
  skeletonCover: { width: 148, height: 198, borderRadius: 14 },
  skeletonTitle: { width: K.skeleton.card.titleWidth, height: K.skeleton.card.titleHeight, borderRadius: K.skeleton.card.radius },
  skeletonMeta: { width: K.skeleton.card.metaWidth, height: K.skeleton.card.metaHeight, borderRadius: K.skeleton.card.radius },
  skeletonPrice: { width: K.skeleton.card.priceWidth, height: K.skeleton.card.priceHeight, borderRadius: K.skeleton.card.radius },
  stickyBox: { height: 92, position: 'relative' },
  compactSegment: { width: 196 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12] },
  icon: { width: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: space[6] },
});
