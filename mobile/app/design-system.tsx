import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { space, layout } from '../src/theme/tokens';
import { Lockup } from '../src/components/brand/Logo';
import { ICON_NAMES, Icon } from '../src/components/Icon';
import { Button, Chip, IconButton, ListGroup, ListRow, Segmented, Switch, TextField, Txt } from '../src/components/ui/Primitives';

// Development-only fixture: no mock content is exposed in the production app.
export default function DesignSystem() {
  const router = useRouter();
  const { colors } = useDesignTheme();
  const { pref, setPref } = useTheme();
  const [selected, setSelected] = useState('games');
  const [enabled, setEnabled] = useState(true);
  const [name, setName] = useState('');
  if (!__DEV__) return <Redirect href="/" />;
  return <SafeAreaView style={[s.screen, { backgroundColor: colors.bg }]}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.row}><IconButton icon="back" label="Geri" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Lockup /></View>
      <Txt variant="largeTitle">Gamerisen 2.0</Txt>
      <Txt style={{ color: colors.text2 }}>Bileşen galerisi · geliştirme sürümü</Txt>
      <Segmented value={pref} onChange={setPref} items={[{ value: 'light', label: 'Açık' }, { value: 'dark', label: 'Koyu' }, { value: 'system', label: 'Sistem' }]} />
      <Button title="Birincil buton" icon="chev" onPress={() => setEnabled(!enabled)} />
      <Button title="İkincil buton" variant="secondary" onPress={() => setEnabled(!enabled)} />
      <View style={s.row}><Button title="Bağlantı" variant="tertiary" /><Button title="Renkli" variant="tinted" /><Button title="Sil" variant="destructive" /></View>
      <Button title="Yükleniyor" loading /><Button title="Devre dışı" disabled />
      <View style={s.row}><Chip title="Oyunlar" selected={selected === 'games'} onPress={() => setSelected('games')} /><Chip title="Haberler" selected={selected === 'news'} onPress={() => setSelected('news')} /></View>
      <TextField label="Görünen ad" value={name} onChangeText={setName} placeholder="Adını yaz" helper="Türkçe: ğ, ş, ı, İ, ö, ü, ç" />
      <TextField label="Hata durumu" value="oyuncu" error="Bu kullanıcı adı kullanılıyor." />
      <ListGroup title="KONTROLLER"><ListRow title="Bildirimler" icon="bell" trailing={<Switch accessibilityLabel="Bildirimler" value={enabled} onValueChange={setEnabled} />} /><ListRow title="Görünüm" value={pref} icon="moon" onPress={() => setPref(pref === 'dark' ? 'light' : 'dark')} /></ListGroup>
      <Txt variant="title2">İkon seti</Txt>
      <View style={s.icons}>{ICON_NAMES.map((icon) => <View key={icon} style={s.icon}><Icon name={icon} /><Txt variant="caption2" numberOfLines={1}>{icon}</Txt></View>)}</View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: layout.gutter, gap: space[16], paddingBottom: space[32] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexWrap: 'wrap' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12] },
  icon: { width: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: space[6] },
});
