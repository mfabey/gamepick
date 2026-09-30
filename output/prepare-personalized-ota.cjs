const fs = require('node:fs');
const path = require('node:path');
const root = 'C:/Users/User/.codex/worktrees/personalized-ota/gamepick';
const main = 'C:/Users/User/Desktop/Github game project/gamepick';
const target = path.join(root, 'mobile/app/(tabs)/index.jsx');
let s = fs.readFileSync(target, 'utf8').replace(/\r/g, '');
const m = fs.readFileSync(path.join(main, 'mobile/app/(tabs)/index.jsx'), 'utf8').replace(/\r/g, '');
function replace(a, b) { if (!s.includes(a)) throw Error('Missing: ' + a); s = s.replace(a, b); }
function between(a, b, text) { const start=s.indexOf(a), end=s.indexOf(b,start); if(start<0||end<0) throw Error('Missing range: '+a); s=s.slice(0,start)+text+s.slice(end); }
replace('import { fetchTrending, fetchGames }', 'import { fetchGames }');
replace('import { interleaveReviews, mergeSocial, orderHighlights, mergeHighlights, highlightIds }', 'import { interleaveReviews, mergeSocial }');
replace("import { useReducedMotion } from '../../src/hooks/useReducedMotion';", "import { useReducedMotion } from '../../src/hooks/useReducedMotion';\nimport { YenileIsareti, YenileKontrol } from '../../src/components/ui/Yenile';");
const session = '  const [session, setSession] = useState(() => getSession());\n  useEffect(() => subscribeSession(() => setSession(getSession())), []);';
replace(session, '');
replace('  const router = useRouter();', "  const router = useRouter();\n"+session+"\n  const owner = session?.user?.uid || 'guest';\n  const [day, setDay] = useState(() => Math.floor(Date.now() / 86400000));\n  useFocusEffect(useCallback(() => { setDay(Math.floor(Date.now() / 86400000)); }, []));");
replace("  const { data: trendData, ts: trendTs, refetch: trendTazele } = useQuery('home:trending', fetchTrending, { ttl: 3 * 60 * 1000 });\n", '');
between('  // ── BANDIN OKUDUĞU', '  // ── ŞERİT HAZIRLIĞI', '');
between('  const trend = useMemo(', '  const fresh = useMemo(', '');
between('  // ── HERO RAYI TRENDİN', '  // Haber ve video verisi', '');
between('  // ── TÜR İMZASI', '  // Sahip olunan oyunlar', m.slice(m.indexOf('  const [recommendationEpoch'), m.indexOf('  // Sahip olunan oyunlar')));
replace('[candData, ownedNames, dismissedIds]', '[candData, ownedNames, dismissedIds, owner, isCold, recommendationEpoch]');
replace('  // ── Sonsuz keşif akışı ──', '  const heroGames = useMemo(() => forYou.slice(0, 5), [forYou]);\n\n  // ── Sonsuz keşif akışı ──');
replace('new Set([...forYou, ...fresh, ...sale]', 'new Set([...heroGames, ...fresh, ...sale]');
replace('[forYou, fresh, sale]', '[heroGames, fresh, sale]');
replace('  const { items: feedItems, loadMore, loadingMore } = useForYouFeed({', '  const { items: feedItems, loadMore, loadingMore } = useForYouFeed({\n    ownerKey: `${owner}:${day}:${recommendationEpoch}`,');
replace("useTimeToData('Home', trend.length > 0);", "useTimeToData('Home', forYou.length > 0);");
between('  // ── Bölüm düzeni ──', '  // "Çünkü RPG oyunlarını seviyorsun"', '  const showFriends = hasFriendSignal(friendGames);\n\n');
replace('    const hlIds = highlightIds(highlights);\n', '');
replace('!dismissedIds.has(String(g.id)) && !hlIds.has(String(g.id))', '!dismissedIds.has(String(g.id))');
replace('return mergeHighlights(interleaveReviews(sortedGames, social), highlights);', 'return interleaveReviews(sortedGames, social);');
replace('[feedItems, dismissedIds, reviews, posts, highlights, engelSurumu]', '[feedItems, dismissedIds, reviews, posts, engelSurumu]');
replace('    <View style={styles.headerWrap}>', '    <View style={styles.headerWrap}>\n        <YenileIsareti yenileniyor={candRefreshing} />');
replace('        <HeroRail games={heroGames} onExpand={kartAc} />', `        <View style={sec.section}>
          <View style={sec.heading}>
            <SectionHeader title={t('home.forYou')}
              subtitle={heroGames.length ? (isCold ? t('home.forYouStart') : forYouReason || t('home.forYouPersonal')) : candLoading ? t('home.forYouStart') : t('home.forYouEmpty')}
              action={heroGames.length ? t('home.viewAll') : candLoading ? undefined : t('common.retry')}
              onAction={heroGames.length ? () => router.push('/swipe') : hepsiniTazele} />
          </View>
          {candLoading && !heroGames.length ? <ActivityIndicator color={colors.accent} /> : <HeroRail games={heroGames} onExpand={kartAc} />}
        </View>`);
between('        {showForYou && (', '        {drops.length > 0', '');
replace('        onEndReached={loadMore}', '        onEndReached={loadMore}\n        refreshControl={<YenileKontrol refreshing={candRefreshing} onRefresh={hepsiniTazele} />}');
fs.writeFileSync(target, s);
const hero = path.join(root, 'mobile/src/components/ui/HeroRail.jsx');
fs.writeFileSync(hero, fs.readFileSync(hero, 'utf8').replace("t('home.trend')", "t('home.forYou')"));
const wish = path.join(root, 'mobile/src/context/WishlistContext.jsx');
fs.writeFileSync(wish, fs.readFileSync(wish, 'utf8').replace(/^(<<<<<<< ours|=======|>>>>>>> theirs)\r?\n/gm, ''));
console.log('Personalized recommendations adapted to design-v2 hero.');
