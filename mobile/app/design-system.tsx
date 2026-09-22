import { useState, type ComponentType, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/context/ThemeContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { space, layout, gradients, avatarPalette, radius, component as K } from '../src/theme/tokens';
import { ICON_NAMES, Icon } from '../src/components/Icon';
import { Skeleton } from '../src/components/Skeleton';
import { Button, Chip, IconButton, ListGroup, ListRow, SectionHeader, Segmented, Switch, TextField, Txt } from '../src/components/ui/Primitives';
import { HeartButton } from '../src/components/ui/HeartButton';
import { FollowButton } from '../src/components/ui/FollowButton';
import { SearchField } from '../src/components/ui/SearchField';
import { GlassView } from '../src/components/ui/GlassView';
import { useToast } from '../src/components/ui/Toast';
import { HomeHeader, NavBar, PageDots, PageHeader, StickyBottomBar } from '../src/components/ui/Navigation';
import { BestPriceCard, DiscountTag, OldPrice, Price, PriceChart, PriceDrop, StatTile, StatusPill, StoreBadge, StoreRow } from '../src/components/ui/Commerce';
import { DealCard, GameCardSmall, PriceDropCard, Rail } from '../src/components/ui/GameCards';
import JsGameCard from '../src/components/ui/GameCard';
import { Badge, Comment, CommunityRow, CountBadge, FriendTile, GameTag, LiveTime, MessageRow, NotificationLead, NotificationRow,
  Post, PostActions, PostHeader, TrendCard, UserAvatar, UserRow } from '../src/components/ui/Social';
import { MediaImage, NewsFeature, NewsRow, PlayButton, ShortCard, VideoCard } from '../src/components/ui/Media';
import { useLanguage } from '../src/context/LanguageContext';
import { useVideoCatalog } from '../src/hooks/useVideoCatalog';

// GameCard JS (memo): tip çıkarımı props'u göremiyor.
const GameCard = JsGameCard as unknown as ComponentType<{ game: Record<string, unknown> }>;

// ─────────────────────────────────────────────────────────────────────────────
// GELİŞTİRME GALERİSİ — DS 2 (Kontroller), DS 3 (Kartlar), DS 4 (Durumlar) ve gezinme
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
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const { lang } = useLanguage();
  const art: { id: string; name: string; image: string; appid: string; genres?: string[] }[] = useVideoCatalog(lang).items;
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

      {/* DS 3 — kart ve fiyat bileşenleri. Görseller canlı video kataloğundan (Steam), örnek fiyatlar tasarımın kendi örnekleri. */}
      <Group title="Oyun ve fiyat">
        <Row>
          <DiscountTag percent={50} size="xs" /><DiscountTag percent={50} /><DiscountTag percent={50} size="md" /><DiscountTag percent={50} size="lg" />
          <Price value="₺599" size={18} /><OldPrice value="₺1.199" /><PriceDrop text="₺200 düştü" /><PriceDrop text="₺50 arttı" direction="up" />
        </Row>
        <Row>{['Steam', 'Epic Games', 'GOG', 'Humble Bundle', 'Xbox'].map((st) => <StoreBadge key={st} store={st} withName />)}</Row>
        <Row><StatusPill kind="playing" /><StatusPill kind="done" /><StatusPill kind="recommends" /></Row>
        <View style={s.stats}>
          <View style={s.flex}><StatTile value="142 sa" label="Oynama süresi" icon="clock" /></View>
          <View style={s.flex}><StatTile value="%68" label="Başarım" icon="trophy" /></View>
          <View style={s.flex}><StatTile value="4,8" label="Puan" /></View>
        </View>
      </Group>
      <Group title="Kartlar" bleed>
        <Rail kind="game" data={art.slice(0, 5)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GameCard game={{ id: item.id, name: item.name, image: item.image, genres: item.genres, rating: 4.6, hasSteam: true, appid: item.appid, slug: '' }} />} />
        <Rail kind="short" data={art.slice(0, 6)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GameCardSmall title={item.name} image={item.image} price="₺499" discount={30} />} />
        <Rail kind="drop" data={art.slice(0, 3)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <PriceDropCard title={item.name} image={item.image} oldPrice="₺1.199" price="₺599" discount={50} store="Steam" note="Son 24 saatte ₺200 düştü" />} />
        <Rail kind="deal" data={art.slice(0, 3)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <DealCard title={item.name} image={item.image} store="Epic Games" discount={40} lowPrice="₺599" normalPrice="₺999" actionLabel="Mağazaları Karşılaştır" onAction={() => {}} />} />
        <View style={s.pad}><View style={[s.group, { backgroundColor: colors.surface1, borderRadius: radius.group }]}>
          <StoreRow store="Steam" name="Steam" subtitle="Anında teslim · Resmî" price="₺599" right={<DiscountTag percent={50} size="xs" />} />
          <StoreRow store="Epic Games" name="Epic Games" subtitle="Anında teslim" price="₺649" separator />
        </View></View>
        <BestPriceCard store="Steam" storeSubtitle="Resmî mağaza · anında teslim" price="₺599" oldPrice="₺1.199" discount={50}
          updated="2 dk önce güncellendi" note="Son 24 saatte ₺200 düştü" actionLabel="Steam'e Git" onAction={() => {}} footnote="Fiyatlar KDV dahil, bölgesel fiyattır." />
        <View style={s.pad}><PriceChart values={[1199, 1199, 899, 899, 1199, 599, 799, 599]} lowLabel="₺599" /></View>
      </Group>

      <Group title="Topluluk" bleed>
        <View style={s.pad}><Row>
          <UserAvatar name="Deniz" size={56} online />
          <UserAvatar name="Ege" size={56} gameImage={art[0]?.image} />
          <UserAvatar name="Selin" size={56} ring />
          <UserAvatar name="Mert" size={40} /><UserAvatar name="Ada" size={30} /><UserAvatar name="Can" size={24} />
        </Row></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.friends}>
          <FriendTile name="Ege" game={art[0]?.name ?? 'Oyun'} gameImage={art[0]?.image} status="Oynuyor" playing />
          <FriendTile name="Selin" game={art[1]?.name ?? 'Oyun'} gameImage={art[1]?.image} status="2 sa önce" />
        </ScrollView>
        <View style={s.pad}><TrendCard rows={[
          { tag: 'SilksongHype', count: '12,4 B gönderi', meta: 'Oyunlar', delta: '%240', hot: true },
          { tag: 'EldenRing', count: '8,1 B gönderi', meta: 'RPG', delta: '%18' },
        ]} /></View>
        <View style={s.pad}><Row><Badge label="Lv 24" /><Badge label="Platin" kind="trophy" /><Badge label="Soru" kind="q" /><Badge label="Anket" kind="poll" /><Badge label="Mod" kind="mod" /><CountBadge count={3} /><LiveTime text="12 dk önce" live /><LiveTime text="3 sa önce" /></Row></View>
        <View style={s.pad}><Post
          header={<PostHeader name="Deniz" handle="@denizplays" time="2 sa" badge={<Badge label="Lv 24" />} onMore={() => {}} />}
          text="Hafta sonu co-op için önerisi olan? Elden Ring bitti, yeni bir şey arıyoruz." lines={3}
          media={<MediaImage image={art[2]?.image} width="100%" height={180} tag="Ekran görüntüsü" tagIcon="image" />}
          game={<GameTag title={art[2]?.name ?? 'Oyun'} image={art[2]?.image} status="playing" />}
          actions={<PostActions liked={liked} likes={liked ? 129 : 128} comments={24} saved={saved} onLike={() => setLiked(!liked)} onSave={() => setSaved(!saved)} onShare={() => {}} />} /></View>
        <View style={s.pad}><Comment name="Selin" time="1 sa" text="It Takes Two'yu denediniz mi? İki kişi için tam aradığınız şey." likes={12} liked={liked} onLike={() => setLiked(!liked)} onReply={() => {}} author /></View>
        <View style={s.pad}><Comment name="Ege" time="30 dk" text="Katılıyorum." likes={2} reply onReply={() => {}} /></View>
        <View style={s.pad}><UserRow name="Ege Yılmaz" handle="@egey" meta="3 ortak arkadaş" online right={<FollowButton following={following} onPress={() => setFollowing(!following)} />} /></View>
        <View style={s.pad}><CommunityRow image={art[3]?.image} name={art[3]?.name ?? 'Topluluk'} meta="48 B üye · 320 çevrimiçi" /></View>
        <MessageRow name="Selin" preview="Akşam 9'da giriyor musun?" time="21:04" unread={2} online />
        {/* `unread` boolean: okunmamış var ama adedi bilinmiyor (konuşma
            listesi ucunun verdiği tek bilgi) — sayaç yerine nokta. */}
        <MessageRow name="Burak" preview="Yeni sürüm çıkmış, bakalım mı?" time="14:22" unread online />
        <MessageRow name="Mert" preview="Tamamdır, görüşürüz" time="Dün" read={2} />
        <NotificationRow unread lead={<NotificationLead kind="price" image={art[4]?.image} />} text="İstek listendeki oyun ₺599'a düştü" time="5 dk önce" thumb={art[4]?.image} />
        <NotificationRow lead={<NotificationLead kind="like" />} text="Selin ve 12 kişi gönderini beğendi" time="1 sa önce" />
        <NotificationRow lead={<NotificationLead kind="cal" />} text="Takvimindeki oyun yarın çıkıyor" time="Dün" />
      </Group>

      <Group title="Medya ve haber" bleed>
        <Rail kind="video" data={art.slice(0, 4)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <VideoCard title={`${item.name} — Oynanış`} image={item.image} type="Oynanış" duration="31:05" creator="Level Up TR" meta="96 B görüntülenme" game={{ title: item.name, image: item.image }} />} />
        <Rail kind="short" data={art.slice(0, 4)} keyExtractor={(g) => g.id}
          renderItem={({ item }) => <ShortCard title={item.name} image={item.image} views="84 B" />} />
        <View style={s.pad}><NewsFeature title={art[1]?.name ?? 'Haber başlığı'} image={art[1]?.image} category="Duyuru" time="12 dk önce" live source="IGN" description="Tasarımın örnek açıklaması: iki satırla sınırlı, text2 renginde." /></View>
        <View style={s.pad}><NewsRow title={art[2]?.name ?? 'Haber başlığı'} image={art[2]?.image} category="İnceleme" time="3 sa önce" source="GameSpot" /></View>
        <Art><PlayButton /><PlayButton size={48} /></Art>
      </Group>

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
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: space[8] },
  friends: { paddingHorizontal: layout.gutter, gap: K.rail.friend[0] },
  icon: { width: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: space[6] },
});
