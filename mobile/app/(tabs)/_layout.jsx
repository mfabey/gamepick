import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

export default function TabLayout() {
  const { t } = useLanguage();
  const icon = (name) => ({ color, size }) => <Ionicons name={name} size={size} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.cardBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: t('nav.home'),    tabBarIcon: icon('home') }} />
      <Tabs.Screen name="games"   options={{ title: t('nav.games'),   tabBarIcon: icon('game-controller') }} />
      <Tabs.Screen name="library" options={{ title: t('nav.library'), tabBarIcon: icon('library') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
