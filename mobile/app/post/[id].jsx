import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, type, PRESSED, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { fetchPost } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';

// ─────────────────────────────────────────────────────────────────────────────
// Konuşma görünümü — bir gönderi ve yanıtları.
//
// YANITLAR ESKİDEN YENİYE. Akış en yeniyi öne alıyor ama konuşma öyle
// okunmuyor: bir tartışmayı sondan başa okumak anlamsız.
//
// DÜZ TARTIŞMA. Yanıta yanıt yok; sunucu bir yanıta gelen yanıtı kök gönderiye
// bağlıyor. İç içe thread küçük toplulukta boş görünür ve okuması zordur.
// ─────────────────────────────────────────────────────────────────────────────

export default function PostThread() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetchPost(String(id));
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const requireAccount = useCallback(() => {
    if (session) return false;
    router.push('/account');
    return true;
  }, [session, router]);

  const onReply = useCallback(() => {
    if (requireAccount()) return;
    setComposing(true);
  }, [requireAccount]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.back, pressed && PRESSED]} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('post.threadTitle')}</Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : !data?.post ? (
        <View style={styles.center}><Text style={styles.gone}>{t('post.gone')}</Text></View>
      ) : (
        <FlashList
          data={data.replies || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard post={item} onRequireAccount={requireAccount} onOpen={() => {}} />
          )}
          ListHeaderComponent={
            <View>
              <PostCard post={data.post} onRequireAccount={requireAccount} onOpen={() => {}} />
              <Pressable
                onPress={onReply}
                style={({ pressed }) => [styles.replyBar, pressed && PRESSED]}
              >
                <Ionicons name="chatbubble-outline" size={15} color={colors.text3} />
                <Text style={styles.replyText}>{t('post.replyHint')}</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{t('post.noReplies')}</Text>
          }
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <PostComposer
        visible={composing}
        replyTo={String(id)}
        onClose={() => setComposing(false)}
        onPosted={() => load(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingBottom: 6,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: type.headline, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gone: { color: colors.text2, fontSize: type.subhead },

  replyBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: colors.card, borderRadius: 999,
  },
  replyText: { color: colors.text3, fontSize: type.footnote },

  empty: { color: colors.text3, fontSize: type.footnote, textAlign: 'center', paddingVertical: 26 },
});
