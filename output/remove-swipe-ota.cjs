const fs = require('fs');
const path = require('path');
const root = 'C:/Users/User/.codex/worktrees/personalized-ota/gamepick/mobile';
function edit(file, fn) {
  const p = path.join(root, file);
  const s = fs.readFileSync(p, 'utf8');
  const next = fn(s.replace(/\r\n/g, '\n'));
  if (next === s.replace(/\r\n/g, '\n')) throw new Error('No change: ' + file);
  fs.writeFileSync(p, next);
}
function replace(s, a, b) {
  if (!s.includes(a)) throw new Error('Missing anchor: ' + a);
  return s.replace(a, b);
}
edit('app/(tabs)/index.jsx', s => {
  s = replace(s, "  const owner = session?.user?.uid || 'guest';", "  const owner = session?.user?.uid || 'guest';\n  const [showAllForYou, setShowAllForYou] = useState(false);\n  useEffect(() => setShowAllForYou(false), [owner]);");
  s = replace(s, 'const baglamaGit = useCallback((hedef, oyun) => {', 'const baglamaGit = useCallback(({ hedef, oyun }) => {');
  s = replace(s, '    // "Senin için" motorunun kendi ekranı deste — aynı useForYouFeed\'i\n    // kullanıyor, dolayısıyla cümledeki sayı orada birebir karşılanıyor.\n    if (hedef === \'foryou\')  { router.push(\'/swipe\'); return; }', "    if (hedef === 'foryou') {\n      setShowAllForYou(true);\n      scrollRefToTop(listRef);\n      return;\n    }");
  s = replace(s, "              action={heroGames.length ? t('home.viewAll') : candLoading ? undefined : t('common.retry')}\n              onAction={heroGames.length ? () => router.push('/swipe') : hepsiniTazele}", "              action={heroGames.length ? (showAllForYou ? undefined : t('home.viewAll')) : candLoading ? undefined : t('common.retry')}\n              onAction={heroGames.length ? () => setShowAllForYou(true) : hepsiniTazele}");
  s = replace(s, '          {candLoading && !heroGames.length ? <ActivityIndicator color={colors.accent} /> : <HeroRail games={heroGames} onExpand={kartAc} />}', `          {candLoading && !heroGames.length ? <ActivityIndicator color={colors.accent} /> : showAllForYou ? (
            <View style={styles.forYouGrid}>
              {forYou.map(game => <GameCard key={String(game.id)} game={game} onExpand={kartAc} />)}
            </View>
          ) : <HeroRail games={heroGames} onExpand={kartAc} />}`);
  return replace(s, '  headerWrap: { paddingBottom: spacing.s32 },', '  headerWrap: { paddingBottom: spacing.s32 },\n  forYouGrid: { flexDirection: \'row\', flexWrap: \'wrap\', justifyContent: \'center\', gap: spacing.s16, paddingHorizontal: layout.gutter },');
});
edit('app/_layout.jsx', s => replace(replace(s, '                <Stack.Screen name="swipe" />\n', ''), '    // Jest sistemi kökten sarmalanmalı — swipe (Faz 1) ve diğer jest tabanlı\n', '    // Jest sistemi kökten sarmalanmalı — jest tabanlı\n'));
edit('src/components/IpucuSeridi.jsx', s => {
  s = replace(s, '  // Kaydırarak keşif TÜM uygulamada tek bağlantıya sahipti (anasayfadaki\n  // selamlama cümlesi). Beş oyuna bakmış biri katalogda geziniyor demektir.\n  { id: \'kaydir\',   hedef: \'/swipe\',    uygun: ({ gorulen }) => gorulen >= 5 },\n', '');
  s = replace(s, "    kaydir:   t('ipucu.kaydir'),\n", '');
  return s.replace('Buradaki dört ipucu', 'Buradaki üç ipucu');
});
edit('src/theme/tokens.ts', s => replace(s, '  // Swipe (tasarımda karşılığı yok): kart en fazla 420 × 560 (eski ekranla\n  // aynı), karar daireleri 62 (ikon 28, x çizgisi 2.6), karar damgası çerçevesi 3.\n  swipe: { cardMaxWidth: 420, cardMaxHeight: 560, action: 62, actionIcon: 28, actionStroke: 2.6, stampBorder: 3 },\n', ''));
const copy = {
  tr: 'Biraz oyun keşfet ve listeler oluştur — haftalık raporun burada oluşacak.',
  en: 'Discover some games and build lists — your weekly report will appear here.',
  de: 'Entdecke Spiele und leg Listen an — dein Wochenbericht erscheint dann hier.',
  es: 'Descubre juegos y crea listas: tu informe semanal aparecerá aquí.',
  pt: 'Descubra jogos e monte listas — seu relatório semanal aparecerá aqui.',
};
for (const [lang, text] of Object.entries(copy)) edit(`src/i18n/${lang}.js`, s => s
  .replace(/^  '(?:swipe\.[^']+|ipucu\.kaydir|a11y\.undo)':.*\n/gm, '')
  .replace(/^  'stats.emptyText':.*$/m, `  'stats.emptyText': '${text}',`));
edit('scripts/i18n-unused-baseline.json', s => JSON.stringify(JSON.parse(s).filter(k => !k.startsWith('swipe.')), null, 2) + '\n');
fs.unlinkSync(path.join(root, 'app/swipe.jsx'));
console.log('Removed swipe screen and entry points; For You expands to the existing game-card grid.');
