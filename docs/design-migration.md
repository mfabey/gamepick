# Gamerisen 2.0 — tasarım geçiş planı

Tarih: 21 Eylül 2026 (ilk sürüm) · 22 Eylül 2026 (revizyon). Durum: keşif planı. Bu revizyonda bu dosya dışında hiçbir şey değiştirilmedi: kod, paket, yapılandırma ve çalışma ağacındaki commit'lenmemiş iş olduğu gibi duruyor.

## 0. Bu revizyon

**Neden:** İlk sürüm başka bir oturumda yazılmıştı. O sırada teslim paketi henüz repoya açılmamıştı ve zip içinden okundu. Metindeki "design-handoff/ henüz yok" ve "uygulama değişikliği yapılmadı" cümleleri artık doğru değil. Bu revizyon paketi repodaki yerinden yeniden okudu ve ilk sürümün iddialarını kaynakta denetledi. Doğru bulunanlar korundu, eksikler eklendi, bayatlayan cümleler düzeltildi.

**Taban:** Eşleme commit'lenmiş koda göre yapıldı: `main` @ `f76de35` (`git show HEAD:…`). Çalışma ağacındaki commit'lenmemiş değişiklikler taban sayılmadı (bkz. §0.1).

**Okunanlar:**
- `design-handoff/` içinden: README, CLAUDE, PROMPTS, SCREENS, COMPONENTS; `code/` altında tokens.ts, index.ts, Icon.tsx, Logo.tsx ve TabBar.tsx; `config/app.json.snippet.jsonc`; 25 ekranın ve DS 4 / DS 7'nin `.dc.html` metinleri; `kit/c.py`.
- Repodan: `mobile/AGENTS.md` (kapatılmış kararlar); `app/**` route'ları ve `src/components/**`; tema dosyaları (`theme.js`, `ThemeContext.jsx`, `design/tokens.js`); sekme çubuğu (`FloatingTabBar.jsx`, `TabBarContext.jsx`, `useAltBosluk.js`); `src/api/**`; başlıca `check:*` betiklerinin kuralları; sunucuda `app/api/prices`, `app/api/video-feed` ve `app/lib/news-list.js`.

**Kaynakta doğrulanan ilk sürüm iddiaları (✓):**
- `/api/prices` yalnız `{ stores }` döndürüyor (`app/api/prices/route.js`).
- Bio sınırı 150. İstemci ve sunucudaki `MAX_BIO` değeri aynı (`profile-edit.jsx`).
- Haber satırı `WebBrowser.openBrowserAsync(url)` ile açılıyor (`news.jsx`).
- `@react-navigation/bottom-tabs` kilit dosyasında 7.18.13.
- Ana sayfa arama kutusu `/games`'e gidiyor (`(tabs)/index.jsx`).
- `fetchPosts(offset, scope)` oyun filtresi almıyor (`src/api/social.js`).

**Eklenenler:**
- Ölçülmüş kontrast tablosu (§3.2) ve `npm run check` zinciriyle çakışmalar (§3.3).
- Sekme geometrisine bağlı olup ilk sürümde geçmeyen tüketiciler (§4.1).
- Teslim kodunda bulunan hatalar (§5.2) ile OTA, EAS ve yapılandırma notları (§5.3).
- Riskler: cam kaynaklı performans (§6.1), 375 pt sığma hesabı (§6.2), beş dil (§6.3), kapatılmış kararlarla çakışan tasarım öğeleri (§6.4), dal güvenliği (§6.6).
- Kullanıcı kararları ve yeni sorular (§7).

İlk sürümün birebir kopyası bu oturumun geçici klasöründe duruyor: `scratchpad/design-migration.v1-orijinal.md`.

### 0.1 Çalışma ağacının durumu (taban değil)

`docs/design-migration-progress.md`, "temel bileşen grubu"nun 22 Eylül 00:10'da bu planın ilk sürümüne göre uygulandığını kaydediyor. Bu iş commit'lenmemiş ve `main` dalında duruyor:

- **Değişen dosyalar:** `mobile/app.json`, `app/_layout.jsx`, `app/(tabs)/_layout.jsx`, `app/(tabs)/videos.jsx`, `src/theme.js`, `src/context/ThemeContext.jsx`, `src/hooks/useAltBosluk.js`, `scripts/check-theme-colors.mjs`, `scripts/check-theme-reactive.mjs`, `package-lock.json`, `.gitignore` ve `package.json`. `package.json`'a `@expo-google-fonts/inter` ^0.4.2 ile `expo-blur` ~15.0.8 eklenmiş, SDK 54 yama sürümleri alınmış, zincire `check:design-v2` ve `check:types` bağlanmış.
- **Yeni dosyalar:** `src/theme/{tokens.ts, palettes.ts, useDesignTheme.ts, tabGeometry.js}`, `src/components/{Icon.tsx, brand/Logo.tsx, navigation/TabBar.tsx, navigation/AppTabBar.jsx, ui/Primitives.tsx}`, `app/design-system.tsx`, `assets/brand/` (7 dosya), `scripts/check-design-v2.mjs`.

Bu revizyonda o iş **incelenmedi ve doğrulanmadı**. Günlükteki "denetimler geçti" ve "export alındı" beyanları yeniden çalıştırılmadı. Nasıl ele alınacağı soru 10'da.

## Kapsam ve kaynaklar

Bu plan **mobil uygulama** içindir: Expo route kökü `mobile/app/`, bileşen kökü `mobile/src/components/`. Kök `app/`, Next.js web arayüzünü ve mobilin de kullandığı sunucu API'lerini içerir; mobil tasarım dosyaları buraya kopyalanmayacak. Web'in 2.0'a geçip geçmeyeceği ayrı bir karar (soru 11).

Teslim paketi repo kökünde `design-handoff/` olarak duruyor. Boyutu 29 MB; git onu izlemiyor, `.easignore`'da da kuralı yok (§5.3). Teslim belgesinin sonraki fazlar için verdiği komutlar bu plan için talimat sayılmadı. Kök CLAUDE.md değiştirilmedi, dal açılmadı.

Görsel uygulamada doğruluk sırası: `.dc.html` → referans PNG → kit kaynakları → ekran/bileşen envanteri. Bu keşif görsel eşdeğerlik testi değildir. Uygulama sırasında ölçüler HTML'den doğrulanacak: tasarımdaki px = RN pt, 390 pt tuval ölçeklenmeyecek, güvenli alanlar cihazdan okunacak.

**Envanter kaynakla çelişirse kaynak kazanır.** Bulunan örnek: alt sayfa köşesi SCREENS'te "20", `tokens.ts`'te de `cardLarge: 20 // … alt sayfa` olarak geçiyor. G-06b ve DS 4 kaynaklarında ise `border-radius: 24px 24px 0 0` yazıyor. Doğru değer 24. `tokens.ts`'te karşılığı olmadığı için önce oraya eklenmeli.

### Mevcut durum analizi

- **Mobil sürüm:** 2.7.2. Expo `~54.0.0`, React Native `0.81.5`, React `19.1.0`, Expo Router `~6.0.24`; New Architecture açık. `runtimeVersion.policy: appVersion` ve expo-updates (OTA) açık. Kod JSX ağırlıklı; TypeScript ve React tipleri zaten kurulu.
- **UI:** React Native temel kontrolleri, `StyleSheet`, Ionicons (`@expo/vector-icons`), FlashList, Reanimated 4.1 + worklets, Gesture Handler, expo-image, expo-video, expo-linear-gradient, expo-glass-effect, expo-haptics, react-native-svg. Paper, Tamagui ya da NativeBase gibi tam kapsamlı bir UI kiti yok.
- **Tema zinciri:** `src/design/tokens.json` + `motion.json` → `src/design/tokens.js` (erişilebilirlik düzeltmeleri burada) → `src/theme.js`. Canlı palet `src/context/ThemeContext.jsx` üzerinden `useTheme/useStyles` ile tüketiliyor. Açık/koyu/sistem tercihi kalıcı (`theme_pref`).
- **Kök Stack (`mobile/app/_layout.jsx`):** auth, dil, tema ve wishlist sağlayıcıları; oturum ve önbellek yükleme, splash tutma, bildirim yönlendirme, paylaşım bağlantısı ve dikey kilit.
- **Sekmeler:** `index`, `reviews` (Topluluk), `videos` (Reels), `messages`, `profile`. Sekme düzeninde ayrıca `IpucuSeridi` ve ilk açılışta gösterilen `AcilisPerdesi` var.
- **Dil ve denetim:** Beş dil var (tr/en/de/es/pt), `check:i18n` pariteyi denetliyor. `npm run check` 16 betiklik bir zincir: tema sızıntısı, reaktif tema, boşluk ölçeği, kontrast, accent, edge-to-edge, layout ve diğerleri. Birçoğu ratchet olarak çalışıyor, yani borç yalnızca azalabiliyor.
- **iPad:** `supportsTablet: false`. Buna rağmen uygulama iPad uyumluluk modunda 375×667 pt pencerede çalışmak zorunda (AGENTS.md).
- **Web:** Next.js 14.2.35 / React 18; `app/globals.css`, `app/context/ThemeContext.jsx`, inline stiller ve `app/components/`. Route'lar: `/`, `/games`, `/discover`, `/game/[id]`, `/game/rawg/[slug]`, `/game/epic/[slug]`, `/reviews`, `/videos`, `/news`, `/library`, `/profile`, `/u/[username]`, giriş/kayıt/şifre ve destek/yasal sayfaları. Bunlar mobil route karşılığı olarak kullanılmayacak.

### Sorunlar

Yeni tasarım yalnız renk değişimi değil. Yeni kart aileleri, yeni ekranlar ve mevcut sunucunun sağlamadığı etkileşimler içeriyor. Fiyat geçmişi, üyelikli oyun toplulukları, tek yönlü takip, birleşik bildirim geçmişi ve içerik üreticisi video modeli mevcut arayüzün veri sözleşmeleriyle aynı değil. Koyu token'ların doğrudan import edilmesi canlı temayı bozar. Yeni sekme çubuğunun geometrisi ve davranışları da mevcut bileşenle aynı değil.

Bunlara ek olarak:
- Yeni değerler, mevcut denetim zincirinin varsayımlarıyla çakışıyor: boşluk ölçeği, kontrast çiftleri ve accent kuralı (§3.3).
- Tasarım liste öğelerinde bulanık cam kullanıyor. Bu, öncelik sırasında 1 numaradaki performansı doğrudan etkiliyor (§6.1).
- AGENTS.md'de bilerek kapatılmış birkaç özellik tasarımda duruyor (§6.4).

### Yapılacak geliştirmeler

Sıra şöyle:
1. Tema uyumluluk katmanı ve temel bileşenler.
2. Sekme çubuğu entegrasyonu.
3. Ekranlar: Ana Sayfa → Oyun Detayı → Fiyat Karşılaştırma → Topluluk → diğerleri.

Her ekranın veri denetleyicisi korunur, yalnız sunum katmanı değişir. Eksik servisler ayrı ürün/veri işi olarak işaretlenir.

### Beklenen kazanımlar

- Tek tasarım kaynağı.
- Platforma uygun, yalnızca ikonlu sekmeler.
- Ortak etkileşimler.
- Ekran ekran doğrulanabilir bir geçiş.

Mevcut oturum, öneri, fiyat, sosyal ve mesajlaşma davranışları korunacak.

## 1. Ekran eşlemesi — 25 ekran

Dosya yolları repo köküne göredir. "Öneri", henüz olmayan dosya demektir. Mevcut route'lar yalnızca tasarımdaki isimlere uysun diye yeniden adlandırılmaz. Bir tasarım ekranı mevcut bir modal ya da durumla eşleşiyorsa yeni route açmak zorunlu değildir.

| No | Tasarım | Mevcut karşılık / route kararı | Veri kaynağı ve açık fark |
|---|---|---|---|
| 01 | Açılış | `mobile/app/_layout.jsx` içindeki native splash yaşam döngüsü; ayrı index route açılmayacak. Gerekirse mevcut kabuğa JS splash görünümü. | `loadSession`, `loadProfile`, `initQueryCache`, `loadPerde` ve diğer mevcut başlangıç yüklemeleri. Sahte zamanlayıcı eklenmez; font hazırlığı bu akışla koordine edilir (tercihen fontlar derlemeye gömülür, §5.1). |
| 02 | Tanıtım | `(tabs)/_layout.jsx` üstündeki `AcilisPerdesi.jsx` mevcut karşılık; aynı katman yeniden tasarlanır. | `services/perde.js`: `loadPerde`, `perdeGorulduMu`, `perdeyiGorulduYaz`. Ayrı onboarding route'u eskiden kaldırılmış; otomatik geri getirilmez. |
| 02b | İlgi Alanları | Doğrudan karşılık yok. **Öneri:** `mobile/app/interests.tsx`, tanıtımdan isteğe bağlı erişim. | `useTasteProfile`, `services/tasteProfile.js` ve `services/recommend.js` kısmi aday. Platform/tür/mağaza tercihi için aynı anlamda kayıt sözleşmesi doğrulanmalı; beğeni sinyali yerine sessizce yazılmaz. Akışa eklenmesi ürün kararı. |
| 03 | Giriş | Asıl giriş/kayıt formu `mobile/app/account.jsx` (`/account`); korunur. `auth.jsx` OAuth dönüş/bağlama ekranıdır, giriş formuyla değiştirilmez. | `services/session.js`: `signIn`, `signInWithApple`; `api/account.js`: kayıt, kullanıcı adı kontrolü, şifre sıfırlama. Steam/Xbox bağlantıları AuthContext'te. Tasarımdaki Google ve "Steam ile giriş" mevcut hesap bağlama modeliyle eşdeğer değil; Google, yeni native SDK + sunucu doğrulaması ister (soru 4). |
| 04 | Ana Sayfa | `mobile/app/(tabs)/index.jsx` korunur. | `useQuery`, `fetchTrending`, `fetchGames`, `useForYouFeed`, `fetchForYouCandidates`, `useTasteProfile/useOwnedGames/useLibraryTaste`, `services/homeFeed.js`; `getReviewFeed/getFriendActivity/fetchPosts`. Yeni haber/video rayları için mevcut `fetchNews/fetchVideoFeed` aday; bugün bu ekranın bütün rayları bu veriyi yüklemiyor. Fiyat rayları `usePrice/priceService`; gerçek geçmiş olmadan "fiyatı düştü" iddiası kurulmaz. ✓ Arama kutusu bugün `/games`'e, sağ üstteki haber düğmesi `/news`'e gidiyor. |
| 05 | Arama | `mobile/app/games.jsx` içindeki arama girişinin karşılığı var; `/games` boş sorgu görünümü yeniden tasarlanır. | `fetchGames`, `queryCache`; kişi araması için `api/social.js: searchUsers` mevcut. Son aramalar deposu, trend sorgular ve topluluk/haber birleşik arama hizmeti bulunmadı. Yeni `/search` zorunlu değil. Kişiler/Topluluklar/Haberler kapsamları eklendiğinde `/games` kataloğu "Oyunlar" kapsamına dönüşür, rotası değişmez. `/discover` (`smartSearch`) ayrı kalır. |
| 06 | Arama Sonuçları | Aynı `/games` ekranının sorgulu hali; URL parametreleri ve geri davranışı korunur. | `fetchGames({q,page,genres,mode,store,metacritic,tags})`, sayfalama/önbellek. Kişiler `searchUsers` ile ayrı kaynak; haber/video sonuçları için mevcut liste API'leri tam metin arama hizmeti sayılmaz. Tüm kategorilerde sonuç garantisi yok. |
| 06b | Keşif Filtreleri | `mobile/src/components/FilterSheet.jsx`, `/games` üstünde modal; ayrı route gerekmiyor. | `value/onApply`, `countFilters`, genre/mode/store/mc/tags modeli. Fiyat aralığı, indirim eşiği, çıkış tarihi ve platform filtresi mevcut `fetchGames` imzasında yok; sunucu desteği olmadan çalışır kontrol olarak sunulmaz. "128 oyunu göster" sayısı için sayım ucu da yok. Sayfa köşesi kaynakta 24. |
| 07 | Oyun Detayı | `mobile/app/game/[id].jsx` (`/game/:id`) korunur. | `fetchGameDetail/fetchGameByAppid`, `fetchPrices`, `fetchSteamReviews`, `useQuery`, `priceService`, WishlistContext, collectionsStore, `GameReviews → getGameReviews`; kimlik çözümü ve `buyume` geçiş parametresi korunur. İlgili haber/video ve topluluk bölümlerinin her biri için oyunla gerçek eşleme gerekir. Tasarımda yeri olmayan `OwnershipBand` ("zaten bende mi?") ürün özelliği olarak korunur. |
| 08 | Fiyat Karşılaştırma | Ayrı ekran yok; detayda mağaza fiyatları var. **Öneri:** `mobile/app/game/[id]/prices.tsx`, mevcut `/game/:id` dosyasını taşımadan `/game/:id/prices`. URL'ler farklı olduğu için dosya + aynı adlı klasör birlikte çalışmalı; ilk adımda route listesinde doğrulanır, çalışmazsa `[id].jsx → [id]/index.jsx` taşınır ve `_layout.jsx`'teki `Stack.Screen name="game/[id]"` animasyon ayarı yeni ada güncellenir. | ✓ `fetchPrices({appid,title}) → /api/prices` yalnız `{ stores }` döndürüyor. Oyun başlığı mevcut detay önbelleğinden. Grafik zaman serisi, rekor düşük, 12 aylık ortalama, sürüm/platform ayrımı ve hedef fiyat alarmı sözleşmesi yok; wishlist bildirim anahtarı bunların yerine geçmez. |
| 09 | İstek Listesi | `mobile/app/wishlist.jsx` korunur. | `WishlistContext`, `usePrice/priceService`, bildirim kayıt akışı ve kullanıcı veri senkronizasyonu. Haftalık düşüş özeti ve oyun başına eşikli alarm, mevcut genel bildirim tercihinden türetilemez. |
| 10 | Topluluk | `mobile/app/(tabs)/reviews.jsx` korunur; görünen adı Topluluk. | `fetchPosts`, `getReviewFeed`, `getEligibleGames`, `getFriends`; oturum, engelleme ve moderasyon. Keşfet/Arkadaşlar bugün çalışıyor. "Takip", anket, medya yükleme ve topluluk üyeliği için ayrı veri modeli gerekir. |
| 11 | Oyun Topluluğu | Tam karşılık yok; `GameReviews` yalnız oyun incelemeleri. **Öneri:** sekme içi Topluluk Stack'i altında `mobile/app/(tabs)/reviews/community/[gameId].tsx`. | `getGameReviews(appid)` kısmi içerik sağlar. ✓ `fetchPosts` oyun filtresi almıyor; üye/çevrimiçi sayıları, katılma, sabitleme, kurallar ve topluluk gönderi uçları yok. `gameId` → mevcut oyun kimliği eşlemesi gerekli. Sekme görünürlüğü için önerilen Stack aşağıda açıklanıyor. |
| 12 | Gönderi Oluştur | `PostComposer.jsx` mevcut modal; `/reviews` ve `/post/:id` çağrılarını koruyarak tam ekran modal görünümü verilir. Ayrı route şart değil; gerekirse **öneri:** `mobile/app/post/new.tsx` (statik segment `[id]`'den önce eşleşir). | `createPost({text,game,replyTo})`, oyun araması ve oturum. Mevcut metin/oyun/yanıt modeli korunur. Tasarımdaki anket, spoiler ve topluluk seçimi bu API'de yok; görsel/video eki kapatılmış karara takılıyor (§6.4). |
| 13 | Gönderi Detayı | `mobile/app/post/[id].jsx` korunur. | `fetchPost`, `PostCard`, `PostComposer`, `ReviewRoot`, engelleme/moderasyon. Mevcut yanıtlar düz ve eskiden yeniye; "En iyi" sıralama veya çok katmanlı thread görünümü yeni veri davranışıdır. |
| 14 | Videolar | `mobile/app/(tabs)/videos.jsx` sekmesi korunur. **Kullanıcı kararı (22 Eylül):** sekme katalog görünümüne geçer, ayrı oynatıcı eklenir, mevcut tam ekran Reels akışı "Kısa Klipler" rayından açılarak korunur. Reels gövdesi için **öneri:** `mobile/app/reels.jsx` (sekme dışı Stack; `IpucuSeridi`'nin sessiz rota listesi de güncellenir). Tasarımda ShortCard G-15'e gidiyor; Reels'e yönlenmesi bilinçli bir sapma. | ✓ `fetchVideoFeed(page,lang,seed) → /api/video-feed` öğesi `{ id: 'rawg_<appid>', appid, name, hls, thumbnail }`: Steam HLS fragmanları. Yaratıcı, süre, izlenme ve kategori alanı YOK; "Takip Ettiğin Yaratıcılar" ve izlenme sayılarının kaynağı yok. `expo-video`, üç oynatıcı havuzu, görünürlük/odak ve wishlist bağlantıları var. |
| 15 | Video Oynatıcı | Bağımsız route yok; sekmedeki oynatıcı ve oyun detayındaki video mevcut. **Öneri:** `mobile/app/video/[id].tsx`. | Aynı `fetchVideoFeed` öğesi ve `expo-video`. ✓ Öğe kimliği `rawg_<appid>` kararlı, ama soğuk açılışta id ile tek öğeyi çözen uç yok. Yorum, yaratıcı, altyazı ve izlenme verisi yok. "Küçült" PiP olarak uygulanmaz (§6.4). |
| 16 | Oyun Haberleri | `mobile/app/news.jsx` (`/news`) korunur. | `useQuery → fetchNews(lang) → /api/news → app/lib/news-list.js`, RSS derlemesi. ✓ Sunucu kategorileri konu bazlı (TR: Güncellemeler, Çıkışlar, İncelemeler, İndirimler; eşleşmeyen "Endüstri"). Tasarımınkiler platform bazlı (Gündem/PC/PlayStation/Xbox/Nintendo/Mobil/Espor/Indie). "Son dakika" ve "Canlı akış" için ayrı alan yok; yalnız zaman damgası (`ts`) var. Şu an kök Stack'te, sekme görünmez; tasarımda sekme var (karar aşağıda). |
| 17 | Haber Detayı | Mevcut davranış `WebBrowser.openBrowserAsync(url)`; uygulama içi makale route'u yok. **Öneri:** `mobile/app/news/[id].tsx` (`news.jsx` ile URL çakışmaz; 08'deki doğrulama burada da yapılır). | ✓ `id: 'news_' + i`, yani liste sırası: liste yenilenince aynı id başka habere işaret eder. Öğede yalnız `excerpt` var, gövde yok. Kalıcı haber id'si, soğuk açılış ve tam içerik kaynağı netleşmeden RSS özetini tam haber gibi sunma. Kaynak tarayıcısı geçici mevcut davranış olarak korunur. |
| 18 | Mesajlar | `mobile/app/(tabs)/messages.jsx` korunur. | `useQuery`, `getChatList`, `services/unread.js: refreshUnread`, oturum. Birebir arkadaş mesajlaşması var; grup ve mesaj isteği filtreleri için servis bulunmadı. "Çevrimiçi" satırı için yalnız konuşma başına `pingPresence(withUid)` var, toplu çevrimiçi listesi ucu yok. |
| 19 | Sohbet | `mobile/app/chat/[uid].jsx` korunur; `[uid]` karşı tarafın kullanıcı kimliği, sohbet id'sine çevrilmez. | `getChat/sendChat`, `subscribeDM/chatCapabilities`, presence/typing, mesaj tepkileri, silme/sabitleme; bildirim temizliği, geçici mesaj eşleme. GIF ve eski medya gösterimi korunur; tasarımdaki "Görsel gönder" uygulanmaz, fotoğraf gönderimi yeniden açılmaz. |
| 20 | Bildirimler | Birleşik ekran yok. **Öneri:** `mobile/app/notifications.tsx`. | `src/notifications.js`, `services/dmPush.js`, `unread.js`, wishlist push kayıtları mevcut; bunlar kalıcı birleşik bildirim listesi değil. Liste, kategoriler ve "tümünü okundu yap" için store/API sözleşmesi eksik. |
| 21 | Profil | `mobile/app/(tabs)/profile.jsx`; başkasının profili `mobile/app/u/[username].jsx` korunur. | `useAuth`, `useWishlist`, `useCollections`, `useConnectedLibrary`, `getUserProfile`, `weeklyReport`, queryCache. Takipçi, Lv, başarım, tamamlananlar ve oyun ilerleme yüzdesi mevcut alanlarla birebir örtüşmüyor. Koleksiyonlar silinmez. Metin etiketli Segmented, ikon-only `ProfileTabs` kararıyla çelişiyor (soru 12). |
| 22 | Profili Düzenle | `mobile/app/profile-edit.jsx` korunur. | `getMyProfile`, `setUsername` (mevcut kullanıcı adı korunarak ad/bio kaydı), `setAvatar`, `updateSessionUser`; bağlantılar AuthContext, gizlilik `getPrivacy/setPrivacy` aday. ✓ Bio sınırı **150**, tasarımda 160; kullanıcı adı değişimi bu formda bilerek yok. Kapak ve avatar kamerası kapatılmış fotoğraf yükleme kararına takılıyor (§6.4); konum ve favori tür kayıtları yeni destek gerektiriyor. PSN ve Epic bağlama yok (yalnız Steam + Xbox). |
| 23 | Ayarlar | `mobile/app/settings.jsx`; mevcut `social-settings.jsx`, `account.jsx`, `delete-account.jsx` alt akışları korunur. | ThemeContext, LanguageContext, AuthContext, WishlistContext; `signOut`, bağlı hesaplar, gizlilik API'si. Tasarımdaki beş bildirim anahtarı, sıklık, para birimi/bölge ve autoplay seçenekleri mevcut tek ayarın kopyası değildir; kalıcı anlamı olmayan anahtar eklenmez. "Tema" satırının karşılığı var (`theme_pref`). Uygulama içi "Hareketi azalt" yok: `useReducedMotion` yalnız OS ayarını okuyor. "Yazı boyutu" ve "Video önizleme" tercihleri yok (NetInfo kurulu). Sürüm metni tasarımda örnek (`1.0 (2026.09)`), gerçek sürüm Constants'tan okunur. |

### Tasarım dışında kalan ekranlar

Şu route'lar yaşamaya devam ediyor: `/discover`, `/swipe`, `/library`, `/collections`, `/collection/[id]`, `/stats`, `/friends`, `/friend-requests`, `/steam-friends`, `/game-cards`, `/lists`, `/list/[id]`, `/username-setup`, `/social-settings`, `/delete-account` ve OAuth dönüşü. Yeni ortak token ve bileşenlerin bunlara etkisi de gerileme kapsamında. Tasarımda karşılıkları olmadığı için hangi kalıbı kullanacakları şimdiden belirlenmeli; belirlenmezse her ekran kendi yorumunu üretir.

| Ekran | Kullanılacak tasarım kalıbı |
|---|---|
| `u/[username]` | G-21 Profil. `ProfileHeader` zaten iki ekranda ortak. |
| `friends`, `friend-requests`, `steam-friends` | NavBar + UserRow listesi. Eylem arkadaşlık eylemidir; FollowButton'a bağlanmaz. |
| `games`, `discover` | G-06 Sonuçlar'ın "Oyunlar" kapsamı + G-06b FilterSheet. |
| `library`, `collections`, `collection/[id]`, `lists`, `list/[id]` | NavBar + GameCardSmall ızgarası (`CoverGrid`) ya da GameRow. |
| `stats` | StatTile + ListGroup. |
| `account` | G-03 Giriş. Kayıt ve şifre sıfırlama da aynı bileşenlerle. |
| `auth` (Steam/Xbox bağlama) | G-22'deki "Oyun hesapları" ListGroup satırları. |
| `social-settings`, `delete-account`, `username-setup` | G-23 ListGroup/ListRow + TextField. |
| `swipe`, `game-cards` | Karşılık yok. Yalnız token ve ortak bileşenlerle yeni stil verilir. |

Dört sekme dışı ekran liste alt dolgusu olarak `TAB_SPACE` (104) kullanıyor: `discover`, `game-cards`, `library` ve `steam-friends`. Oysa bu ekranlarda sekme çubuğu görünmüyor. `TAB_SPACE` değişir ya da kalkarsa bu dört ekran sessizce değişir (§4.1).

## 2. Bileşen eşlemesi

Kısaltmalar: **C** = `mobile/src/components/`, **A** = `mobile/app/`.

Karar türleri:
- **Yeniden yaz:** sunum ağacı yeniden kurulur. Hook, ağ çağrısı ya da iş kuralı yeniden yazılmaz.
- **Yeni stil ver:** mevcut davranış ve prop sözleşmesi korunur.
- **Yeni:** ortak bir karşılığı yok.

| Tasarım bileşeni | Repodaki karşılık | Karar / uygulama |
|---|---|---|
| Icon | Ionicons çağrıları | **yeniden yaz** — hazır SVG seti; eski ikon adları için kontrollü eşleme. |
| TabIcon | C/FloatingTabBar içindeki Ionicons | **yeniden yaz** — teslimdeki çizgi/dolgu çiftleri. |
| Mark | Mevcut marka görselleri; ortak vektör Mark yok | **yeni** — hazır vektör; C/Monogram oyun kapağı yedeğidir, logo karşılığı değildir. |
| Wordmark | Açılış/başlık içindeki marka yazıları | **yeni** — hazır bileşen. "risen" `brand` renginde metin: 3.01:1, yalnız büyük boyda (22 pt/700 ve üstü) kullanılır. |
| Lockup | Başlık içindeki marka birleşimleri | **yeni** — hazır bileşen. |
| Txt | Dağınık RN Text + theme.type | **yeni** — semantik tipografi, satır sınırı ve font ölçeği. |
| PressableScale | PRESSED/PRESSED_CARD, Pressable, usePop | **yeni** — ortak sunum sarmalayıcısı; var olan onPress korunur. `PRESSED_CARD` (0.9 + 0.97) zaten aynı reçete. |
| CoverImage | C/GameCover, PosterImage, NewsImage | **yeni stil ver** — ortak görünüm adaptörü; görsel çözümleme/cache/fallback korunur. |
| GlassView | C/GlassSurface | **yeniden yaz** — tasarım camı ve platform yedeği; native GlassView ile ad çakışmasını alias ile ayır. Kaydırılan listelerde bulanıklıksız dolgu önerisi: §6.1. |
| Button | Ekran içi Pressable butonlar | **yeni** — primary/secondary/tertiary/destructive/tinted/onArt. |
| IconButton | C/IconButton | **yeni stil ver** — 44 pt, rozet/nokta/onArt varyantları; zorunlu `accessibilityLabel` kuralı korunur. |
| HeartButton | C/GameCard ve A/game/[id] kalpleri | **yeni** — useWishlist ve usePop davranışına sunum adaptörü. Kit'teki `heart()` bulanık cam kullanıyor (§6.1). |
| Chip | C/FilterSheet yerel Chip, CHIP sabitleri | **yeniden yaz** — nötr seçili görünüm; filtre state'i korunur. Eski "filtre çipi marka dolgusu" dili kalkar. |
| Segmented | C/ProfileTabs ve ekran içi segmentler | **yeni** — seçili index/callback alır; sekmelerin veri anlamını değiştirmez. Beş dilde etiket genişliği riski: §6.3. |
| Switch | RN Switch (ayarlar vb.) | **yeni stil ver** — native davranış/erişilebilirlik korunur. |
| TextField | A/account, profile-edit ve composer TextInput'ları | **yeni** — doğrulama ve kayıt mevcut denetleyicide kalır. |
| SearchField | A/games arama kutusu | **yeni stil ver** — görünüm ortaklaştırılır; mikrofon ikonu çizilmez (§6.4). |
| FollowButton | Birebir karşılık yok; arkadaşlık butonları başka anlamda | **yeni** — takip API'si bekler; friendAction'a bağlanmaz. |
| Toast | Alert ve yerel geri bildirimler; ortak Toast yok | **yeni** — onay isteyen Alert'lerin yerine kullanılmaz. Genişlik `min(350, pencere − 40)` (§6.2). |
| Skeleton | C/Skeleton, FeedSkeleton, GamesGridSkeleton vb. | **yeni stil ver** — yeni gerçek kart ölçüleri, 1300 ms, reduce-motion. |
| GamerisenTabBar | C/FloatingTabBar | **yeniden yaz** — hazır bileşen + mevcut davranış adaptörü (§4, §5.2). |
| useTabBarInset | hooks/useAltBosluk.js: useTabBosluk | **yeniden yaz** — platform ve bar yerleşimine göre tek hesap. |
| HomeHeader | A/(tabs)/index başlık/greeting alanı | **yeniden yaz** — Lockup + arama/bildirim/avatar. |
| PageHeader | A/(tabs) ekran içi başlıkları | **yeni** — ortak başlık; ekranın sağ eylemlerini prop olarak alır. |
| NavBar | Kök Stack headerShown:false; ekran içi geri başlıkları | **yeni** — router geri davranışı korunur. |
| SectionHeader | SECTION_TITLE ve ekran içi başlıklar | **yeniden yaz** — eski 12 pt uppercase yerine 20/26 başlık. `theme.js`'teki not bu değerin bir kez "üstyazı daha doğru" diye geri alındığını söylüyor (soru 14). |
| StickyBottomBar | Detay ekranındaki fiyat/mağaza eylemleri; ortak bileşen yok | **yeni** — safe-area + mevcut mağaza açma callback'i. |
| PageDots | Ortak karusel noktası yok | **yeni** — HeroCard görünür index'i. |
| HeroCard | C/GameCard aileleri, ana sayfa öne çıkanları | **yeni** — 334×420 görünüm; CardExpand sözleşmesi korunur. |
| GameCard | C/GameCard/index.jsx + variants.js | **yeniden yaz** — 148×198 kapak; fiyat/sahiplik/kalp denetleyicileri korunur. |
| GameCardSmall | C/GameCard küçük varyantları, CoverGrid | **yeniden yaz** — 106×142; CoverGrid'in mevcut veri kullanımını silme. |
| PriceDropCard | Ortak karşılık yok | **yeni** — gerçek fiyat değişimi girdisi gerektirir. |
| DealCard | Oyun kartlarında indirim sunumu var, bilet kartı yok | **yeni** — mevcut fiyat sağlayıcılarını tüketir. |
| DiscountTag | GameCard içindeki indirim rozeti | **yeni stil ver** — ortak yeşil rozet. |
| Price / OldPrice | GameCard, GameRow, detay fiyat metinleri | **yeni stil ver** — sunumu ayır; para birimi/free/unknown mantığını koru. |
| PriceDrop | Ortak fiyat değişim bileşeni yok | **yeni** — iki doğrulanmış fiyat olmadan hesaplama yok. |
| StoreBadge | C/StoreLogo | **yeniden yaz** — tasarım monogramı (SimpleIcons logoları yerine harf; tasarım kararı); mağaza kimlikleri ve bağlantıları korunur. |
| StoreRow | A/game/[id] mağaza satırları | **yeni stil ver** — ortaklaştır; fiyat sırası/URL verisi korunur. |
| PriceChart | Birebir fiyat zaman serisi grafiği yok | **yeni** — SVG; çizim için ayrıca grafik paketi gerekmez. |
| StatTile | Profil/stats içi istatistik sunumları | **yeni stil ver** — yalnız var olan doğrulanmış ölçümler. |
| StatusPill | OwnershipBand, ReviewCard durumları (kısmi) | **yeni** — sahiplik ile oynuyor/tamamladı durumunu eşitleme. |
| Avatar | C/Avatar, utils/avatar.js, bazı inline avatarlar | **yeni stil ver** — preset ve eski yüklenmiş URI desteğini koru. Sekme çubuğundaki profil de bu bileşeni kullanır (§4.1). |
| FriendActivity | C/FriendActivity | **yeni stil ver** — mevcut arkadaş etkinliği/sinyal kontrolünü koru. |
| TrendCard | Ortak sosyal trend sıralaması yok | **yeni** — fetchTrending oyun trendi, sosyal etiket trendi değildir. |
| PostHeader | C/PostCard içindeki yazar/zaman satırı | **yeni stil ver** — ayrı görsel bileşene çıkar. |
| Post | C/PostCard, GamePostCard, ReviewCard | **yeniden yaz** — gönderi/inceleme tip ayrımı ve moderasyon korunur. |
| PostActions | C/PostCard içindeki eylem satırı | **yeni stil ver** — beğeni rollback korunur; kaydet için ayrı veri desteği gerekir. |
| Badge | C/DevBadge ve yerel rozetler | **yeni** — Lv/mod/trophy verisi olmadan gerçek rozet atanmaz. |
| Comment | A/post/[id] içinde PostCard/ReviewRoot; GameReviews.Row | **yeniden yaz** — mevcut düz yanıt modeli korunur. |
| UserRow | A/friends, friend-requests ve kullanıcı arama satırları | **yeni stil ver** — arkadaşlık eylemlerini takip olarak adlandırma. |
| CommunityRow | Doğrudan karşılık yok | **yeni** — topluluk verisi bekler. |
| MessageRow | A/(tabs)/messages yerel satırı | **yeni stil ver** — cid anahtarı, unread ve tarih mantığı korunur. |
| NotificationRow | Birleşik bildirim satırı yok | **yeni** — tipli bildirim modeli bekler. |
| CountBadge | FloatingTabBar ve mesaj satırı sayaçları | **yeni stil ver** — barın platforma özel boyları ayrıca korunur. |
| LiveTime | Haber zamanı metinleri, ortak canlı durum yok | **yeni** — RSS zamanını "canlı" sayma. |
| VideoCard | Videos ekranı ve oyun detayındaki video/poster sunumu | **yeni** — katalog kartı; oyuncu havuzundan bağımsız sunum. Oynat düğmesi kit'te bulanık cam (§6.1). |
| ShortCard | Reels ekranı var, küçük dikey katalog kartı yok | **yeni** — kısa klip sınıflandırması doğrulanmalı; dokununca Reels'e gider (ekran 14). |
| NewsFeature | A/news öne çıkan haber sunumu | **yeniden yaz** — C/NewsImage çözümleyicisini koru. Genişlik `min(350, pencere − 40)` (§6.2). |
| NewsRow | A/news haber kart/satır sunumları | **yeni stil ver** — kaynak URL/tarih/kategori korunur. |
| MediaImage | C/NewsImage, PosterImage ve inline expo-image | **yeni stil ver** — ortak etiketli sunum; eski sohbet medyasını destekle. |
| PlayButton | Detay/videos içindeki play kontrolleri | **yeni stil ver** — mevcut oynatma callback'leri. |
| ListGroup | C/SettingsList: SettingsGroup | **yeni stil ver** — yeni boşluk/yüzey/başlık. |
| ListRow | C/SettingsList: SettingsRow | **yeni stil ver** — 52 pt temel ölçü ve ayraç başlangıcı. |
| OverlayTag | Envanterin VideoCard açıklamasında, SCREENS'te ayrıca geçiyor; yerel görsel etiketleri | **yeni** — süre/kategori için ortak 22 pt etiket. |

Yatay raylar ortak sunum yardımcılarıyla düzenlenecek. Aralık/adım değerleri: Hero 10/344, GameCard 12/160, PriceDrop 12/276, Deal 12/312, Video 14/294. FriendActivity'de aralık 8, yapışma yok. GameCardSmall üç sütunda 16 boşlukla dizilir. FlashList sanallaştırma, görünürlük ve görsel ön yükleme kaybolmayacak. 375 pt gibi dar pencerelerde sabit kartlar ölçeklenmez; sığma hesabı için bkz. §6.2.

### 2.1 Tasarımda karşılığı olmayan mevcut bileşenler

Bu bileşenlerin hepsinde kural aynı: **yeni stil ver**. Yalnız token'lar ve ortak bileşenler değişir, davranış aynen kalır. DS 4 "Durumlar ve Katmanlar" panosu bunların çoğuna görsel dil veriyor.

| Bileşen | Yönlendiren tasarım |
|---|---|
| EmptyState, LimitedMode, CevrimdisiBant | DS 4: "Boş durum", "Hata · Çevrimdışı", "Hata · Satır içi" (son bilinen veriyi göster). |
| ChoiceSheet, CollectionPicker, PublishSheet, ReportSheet, ShareToFriendSheet, FilterSheet | DS 4 "Bottom Sheet": tutamaç ve 24 köşe. |
| AcilisPerdesi | G-02 Tanıtım. |
| Greeting | G-04 selamlama satırı. |
| ProfileHeader | G-21 kimlik bloğu. |
| TypingBubble, BubbleTail, MessageMenu, GifPicker | G-19 baloncuk dili. |
| GamePostCard, ReviewCard, ReviewRoot, ProfileReviewRow, GameReviews | Post/Comment ailesi. |
| DevBadge | Badge ailesi. |
| Monogram, PosterImage, NewsImage, GameCover | CoverImage yedek zinciri. |
| CoverGrid, GameRow | GameCardSmall / liste satırı. |
| OwnershipBand | G-07'de başlık altı; tasarımda yok ama korunur. |
| IpucuSeridi | Sekme geometrisine bağlı (§4.1). |
| PersonMenu, ModerasyonKatmani | Menü/sayfa dili; App Store 1.2 akışı aynen kalır. |

Tasarımda yeri olmayan dört bileşene dokunulmaz: CardExpand (geçiş), EdgeFade, FadeIn ve Reels'e özgü RotateGlowButton/SwipeGlowButton.

## 3. Tema ve token geçişi

Hedef kanonik dosya `mobile/src/theme/tokens.ts`; hazır bileşenlerin göreli import yolları bu yerleşimle korunabilir. Mevcut `mobile/src/theme.js` geçici uyumluluk giriş noktası olarak kalır. Aynı adlı klasör ve dosya bulunduğundan yeni importlar açıkça `theme/tokens` kullanır. Toplu import yeniden yazımı yapılmaz.

1. Teslimdeki token değerlerini yeni dosyaya taşı. Eksik ekran ölçülerini önce HTML'den doğrula ve aynı kaynakta adlandır. Teslim kodundaki satır içi rgba değerleri ve ölçüler de kuralın istisnası sayılmaz; bileşen fazında token'a çıkarılır. Bilinen tek zorunlu sapma `Easing` kaynağıdır (§5.2).
2. Eski `paletten()` eşlemesi bugün iki yerde duruyor: theme.js ve ThemeContext. Bunu tek bir saf uyumluluk üreticisine indir; başlangıç paleti ile canlı provider aynı çıktıyı kullansın.
3. Yeni bileşenler semantik token'ları, eski ekranlar alias adlarını tüketir. `useStyles` önbelleği, `theme_pref` ve Appearance aboneliği korunur. Statik koyu `colors` importuyla canlı tema devreden çıkarılmaz.
4. Geçiş önce koyu temada doğrulanır. Paket açık palet içermiyor. Açık/sistem tercihi silinmez, mevcut açık palet geçici olarak korunur. Yeni bileşenlerin açık palet eşlemesi tasarım kararı bekler; bu varyant için "birebir" iddia edilmez.

| Eski ad | Yeni koyu karşılık / geçiş kararı |
|---|---|
| bg | colors.bg |
| bgElevated | colors.bg2 |
| card | colors.surface1 |
| bgInput | colors.surface1; arama/segmentte ayrı colors.fill |
| bgHover | colors.surface2 |
| surfaceTile | colors.surface3; gerçek kullanımda yüzey seviyesi doğrulanır |
| cardBorder / borderHover | colors.line / lineStrong |
| text / text2 / text3 | aynı adlı yeni değerler |
| accent | Geçici colors.brand; ikon/metin kullanan yerler accentText/red'e ayrılır |
| accentText | colors.red |
| accentBg / accentSoft / accentPill | colors.redTint; tinted buton ayrıca accentTint |
| accentBorder | colors.accentLine |
| onAccent | colors.white; birincil butonda onPrimary kullanılacak |
| accentFillStrong | Geçici colors.brand; tüm CTA'ları alias ile beyaza çevirme |
| green / danger | colors.green / colors.red |
| tabVurgu | Android indicator.fill veya iOS lens.fill; tek platform bağımsız renk olmaz |
| barSolid / glassFill / glassBorder | bg2 / platforma uygun tabBar veya darkGlass / lineStrong; kullanım bazında ayır |
| overlay / overlayStrong | Doğrudan eşdeğer yok; mevcut anlamı geçici koru, yeni gradient/overlay token'ı olarak belgeleyerek taşı |
| steam / xbox / greenWash / greenWashBorder / accentGlow | Tek tek semantik ek token; mağaza monogram renkleri bağlantı durumu renklerinin otomatik karşılığı değil |

**Salt alias yetmez.** Birkaç örnek:
- Eski kırmızı CTA'larda `accent → primary` yapılırsa seçili kalp ve bağlantılar da beyaza döner.
- `onAccent` değiştirilirse kırmızı rozet metni bozulur.
- Birincil butonlar bileşen fazında `primary/onPrimary` çiftine geçer.
- Fiyatlar anlamına göre yeşildir. Yeni `priceStyle()` varsayılan olarak `text` rengini kullandığı için doğru semantik renk çağrı yerinde verilmelidir.

**Eski ve yeni API'ler aynı biçimde değil:**
- `type.*` eski API'de sayısal font boyu; yeni `typography.*` ise bir stil nesnesi. Eski `fontSize: type.body` çağrısına nesne verilmez. Alias `.fontSize` üzerinden kurulur, yeni Txt tam stili uygular.
- Eski `motion.pop` bir yay nesnesi, yeni `motion.pop` bir keyframe tanımı. Eski kullanım ayrı bir uyumluluk adıyla korunur.
- Eski `shadows.*` nesne, yeni `shadow.*` CSS dizesi. Yeni kullanım `{ boxShadow: shadow.toast }` biçiminde olmalı.

**Aynı ad, farklı anlam:**
- Yarıçaplar: eski `radius.sm` 8 ve `md` 12; yeni `sm` 6 ve `md` 8. Yeni kodda `button/cover/card/...` gibi anlamlı adlar kullanılır, eski ölçüler geçiş boyunca korunur. Tasarımdaki 24 alt sayfa köşesi için yeni bir ad eklenir (bkz. Kapsam).
- Boşluk: `spacing.xl=24` korunur; yeni `space` ölçeğindeki 6/10/14/18/28 gibi basamaklar eklenir.
- `scale()` yeni tasarımda kullanılmaz, ama eski ekranları kırmamak için hemen silinmez.
- `SECTION_TITLE`, `CHIP` ve `TAB_BAR` değerleri, tüketicileriyle birlikte değiştirilir.

Denetimler eski dosya ve semantik varsayımlarını taşıyor: `check-theme-colors`, `check-contrast`, `check-spacing`, `check-theme-reactive`, `check-accent` ve diğerleri. Bunlar kapatılmayacak; ayrıntı §3.3'te. Kullanımlar bittikten sonra eski tokens.js/json ve alias'lar kaldırılabilir.

### 3.1 Kullanıcı kararı ve sonucu

22 Eylül kararı: açık/koyu/sistem tercihi korunacak (ilerleme günlüğü). Bunun üç sonucu var:
- **Paletin kaynağı:** Yeni bileşenler `tokens.ts → colors`'ı stil nesnesine statik olarak gömemez. `check:reactive`'in önlediği "donuk stil" hatası tam budur: açık temada koyu kalan yüzey. Palet bir hook üzerinden gelir. `tokens.ts → colors` koyu paletin kendisidir; açık palet türetilmiş bir uyarlamadır.
- **`userInterfaceStyle`:** Snippet `"dark"` diyor. Tercih korunacağı için `"automatic"` kalmalı; yoksa uygulama açık temadayken klavye ve sistem uyarıları koyu açılır.
- **Tema bağımsız renkler:** Görsel üstündeki beyaz, sekme ikonlarının kapalı renkleri ve Android ipucu balonu iki temada da aynıdır. `check:theme`'in istediği `// tema-bagimsiz: <sebep>` notuyla işaretlenir.

### 3.2 Ölçülmüş kontrast (WCAG, yeni koyu değerler)

Değerler bu revizyonda hesaplandı (tahmin değil).

| Ön plan \ zemin | bg #0A0A0B | bg2 #131315 | surface1 #1C1C1E | surface2 #2C2C2E | surface3 #3A3A3C |
|---|---|---|---|---|---|
| text #F5F5F7 | 18.18 | 17.04 | 15.63 | 12.80 | 10.42 |
| text2 #A1A1A6 | 7.69 | 7.21 | 6.61 | 5.42 | **4.41** |
| text3 #8E8E93 | 6.07 | 5.69 | 5.22 | **4.27** | **3.48** |
| red #F34545 | 5.42 | 5.08 | 4.66 | **3.81** | **3.11** |
| brand #BC0C0C (metin olarak) | **3.01** | **2.82** | **2.59** | **2.12** | **1.73** |
| green #30D158 | 9.79 | 9.18 | 8.42 | 6.89 | 5.61 |

Birlikte kullanılan çiftler: `onPrimary/primary` 18.18 · beyaz/`brand` 6.57 · `onGreen/green` 8.50.

Kalın değerler, küçük metin eşiği olan 4.5'in altında kalıyor. Bu şu sonuçları doğuruyor:
- `text3` ve `red` surface2/surface3 üstünde metin olarak kullanılmaz.
- `brand` metin olarak yalnız büyük boyda kullanılabilir. Wordmark'ın 22 pt/700 boyutu büyük metin sayılır ve 3:1 eşiğini sınırda geçer.
- Toast (surface3) içinde `text2` 4.41 veriyor; ikincil metin orada `text` olmalı.

### 3.3 `npm run check` zinciriyle çakışmalar

| Denetim | Bugünkü kural | Yeni tasarımla çakışma | Öneri |
|---|---|---|---|
| `check:spacing` | Ölçek `{0,4,8,12,16,20,24,32,40,48}`; dosya başına ratchet. | Tasarımın kendi ölçeği `space` = 2/4/6/8/10/12/14/16/18/20/24/28/32. Yeniden yazılan her ekran 2/6/10/14/18/28 kullanacak ve ratchet'i kıracak. | `OLCEK` tasarım ölçeğiyle aynı commit'te güncellensin, ardından `--guncelle` çalıştırılsın. Bu adım tabanı düşürür, çünkü mevcut 6/10/14 borcunun bir kısmı ölçeğe girer. AGENTS.md'deki "toplu düzeltme kampanyası yok" kuralı geçerli: dosyalar yalnız ekran geçişinde temizlenir. |
| `check:contrast` | tokens.js'te 4 metin yüzeyi × 4 metin tonu, hepsi ≥ 4.5. | Aynı çiftlerle yeni değerlerde text3/red × surface2/surface3 eşiğin altında kalıyor (§3.2). | Çiftler tasarımda gerçekten kullanılan birleşimlerden yeniden tanımlansın. Token değiştirilirse "birebir" bozulur. |
| `check:accent` | `colors.accent` metin ya da dolgu olamaz (#E8242B AA'yı geçmiyordu). | Yeni `brand` dolgu olarak geçiyor (beyaz 6.57); metin olarak geçmiyor. | Kuralın gerekçesi yeni değerlerle güncellensin. Dolgu serbest, metin yasak. |
| `check:theme` / `check:reactive` | Sabit zemin/kenar rengi ve donuk `StyleSheet` yasak (JS/JSX). | Teslim kodunda modül düzeyinde `StyleSheet` içinde renk ve sabit hex var (TabBar.tsx). | TS/TSX kapsama alınsın. Tema bağımsız değerler gerekçeyle işaretlensin. |
| `check:i18n` | Beş dil pariteli; ölü anahtar yasak. | Tasarım metinleri Türkçe örnek veri. | Her yeni metin beş dilde anahtar olur; örnek metin üretime girmez. |
| `check:layout` | Kapaklar pencereye sığmalı. | 350 pt sabit kartlar 375'te taşar (§6.2). | Genişlik `min(sabit, pencere − kenar)`. |

## 4. Sekme çubuğu entegrasyonu

`mobile/app/(tabs)/_layout.jsx` içindeki `Tabs` ve beş sekme korunur. `tabBar` render noktası GamerisenTabBar adaptörünü çağırır; `reviews` adı `community` yapılmaz.

| Route adı | Yeni TabSpec | Başlık / veri |
|---|---|---|
| index | icon: home | mevcut t('tab.home') |
| reviews | icon: users | mevcut t('tab.community') |
| videos | icon: play | mevcut t('tab.videos') |
| messages | icon: msg | t('tab.messages'); useUnread → tabBarBadge |
| profile | avatar | mevcut oturum/avatar çözümleyicisi; preset (renk + simge) ya da eski fotoğraf URI'si → `Avatar` bileşeni |

Etiketler ekranda görünmez. Erişilebilirlik etiketi ve uzun basma balonu yerelleştirilmiş başlığı kullanır. Şunlar korunur:
- `tabPress` ve `tabLongPress` olayları ve preventDefault.
- `useTabPressAction` ile aynı sekmeye yeniden basınca listenin başa dönmesi.
- Mevcut çubukta sekme geçişinde çalışan `refreshUnread` adaptöre taşınır. Teslim bileşeni unread verisini kendisi çekmez.

**iOS:**
- Geometri: yanlardan 20, yükseklik 62, köşe 31, alt konum `max(insets.bottom − 13, 12)`. Genişlik 390 pt'de 350, 393 pt'de 353.
- Mercek 60×52, ikon 26, profil 28.
- iOS 26'da gerçek cam; daha eski sürümlerde BlurView + fallbackFill.
- Mevcut çift kullanılabilirlik kontrolü korunur: `isLiquidGlassAvailable` ve `isGlassEffectAPIAvailable`, try/catch içinde. Teslim yalnızca ilkini çağırıyor.

**Android:**
- Tam genişlik, `64 + insets.bottom`, bg2 yüzey.
- 56×32 gösterge, 24 pt ikon/avatar, ripple; dokunma hedefi 64.
- Eski yüzen çubuk (r20, elevation 18, 72×48 vurgu) yerini DS7'ye bırakır.
- "Material 3 görünümü" için Paper eklemek gerekmez.

**Alt boşluk:**
- Teslim `useTabBarInset(12)` iOS'ta 62 + 21 + 12 = 95 veriyor (safe = 34). Eski `useTabBosluk` aynı cihazda 114 veriyor.
- Eski TAB_SPACE = 104 bırakılarak yeni çubuk bağlanamaz.
- Tüm tüketiciler ve videos alt eylem rayı birlikte taşınır. `ek` parametresinin eski ve yeni anlamı ayrıca eşlenir.

**Android'de çift pay riski:**
- Teslim çubuğu normal layout akışında duruyor. Navigator zaten çubuk yüksekliğini içerik alanından düşebilir.
- Aynı yüksekliği bir de liste dolgusuna eklemek çift boşluk üretir.
- `useTabBarInset` geometrinin tek kaynağı olur. Normal akışta navigator'ın ayırdığı pay düşülür, overlay seçilirse tam değer kullanılır.
- Emülatörde içerik viewport'u ölçülmeden iki yöntem karıştırılmaz.

**Gizlenme ve daralma:**
- TabBarContext'teki `hidden`, Reels'te basılı tutma davranışına bağlı; teslimde karşılığı yok, adaptörde korunur.
- `compact` eski tasarıma ait. DS7 sabit geometriyle çeliştiği için kaldırılması ya da sabitlenmesi ayrıca karara bağlanır.
- Provider ve tüketiciler bir anda silinmez.

**Azaltılmış hareket:**
- Ekranlardaki mevcut hook ile teslimdeki Reanimated hook aynı tercihi izlemeli.
- Gerçek cam yüzeyin üst atalarına opacity animasyonu uygulanmaz; basma efekti içerik katmanında kalır.

### 4.1 İlk sürümde geçmeyen bağımlılar ve davranışlar

- **IpucuSeridi:** Konumunu doğrudan eski geometriden hesaplıyor: `bottom = useAltBosluk(TAB_BAR.bottom) + TAB_BAR.height + NEFES`, yanlardan `TAB_BAR.side`. Yeni çubukla birlikte aynı kaynağa (`useTabBarInset` ya da ortak geometri modülü) bağlanmazsa şerit çubuğun üstüne ya da altına kayar. Sessiz rota listesi `['/videos', '/messages']`, Reels taşınınca güncellenir.
- **Dört sekme dışı ekran** (`discover`, `game-cards`, `library`, `steam-friends`): liste alt dolgusu `TAB_SPACE`. Bu ekranlarda çubuk yok, yani doğru değer `useAltBosluk` + ekran payı. `TAB_SPACE` kaldırılmadan önce taşınırlar. Aynı iş yapılana kadar eski sabit bu ekranlar için değişmeden kalır.
- **`games.jsx`:** `useScrollCollapse` ile kendi başlığını katlıyor, sekme çubuğundan bağımsız. `compact` kararından etkilenmez, korunur.
- **Profil avatarı:** Teslimdeki `Glyph` yalnızca `avatarUri` ile `expo-image` çiziyor. Uygulamanın avatarları çoğunlukla preset (renk + simge), yani teslim bileşeni bunları boş daire olarak çizer. Mevcut `Avatar` bileşeni kullanılır; 2 pt halka rengi seçime göre değişir.
- **Haptik:** Teslim her basışta titreşiyor (odaktaki sekmede de) ve hatayı yakalamıyor. Mevcut çubuk yalnız sekme değişince titreşiyor ve `.catch` kullanıyor. Mevcut anlam korunur.
- **Yatay yön:** Video ekranı yatayı açıyor. Mevcut çubuğun yatayda genişlik sınırı var, teslimde yok: iOS kapsülü yatayda 800 pt'yi aşar. Sınır korunur ya da çubuk yatayda gizlenir.
- **Reels kabuğu:** Mevcut çubuk Videolar sekmesinde yüzeyini soldurup ikonları beyaza çeviriyor. Sekme katalog olunca (ekran 14 kararı) bu mantık gereksizleşir. Reels `reels.jsx`'e taşındığında `hidden` değeri de çubuk için gereksiz kalır. Taşıma bitmeden silinmez.
- **Seçili sekmede tekrar basma:** Teslim `navigate`'i yalnızca odakta olmayan sekmede çağırıyor. `tabPress` yayını ise korunuyor, yani `useTabPressAction` çalışmaya devam eder. İç içe Stack'e geçilirse (G-11) tekrar basmada kökte olmayan ekranda `popToTop` davranışı ayrıca tanımlanır.

### Sekme dışı ekranlardaki tasarım çelişkisi

SCREENS, 11 ve 16 numaralı ekranlarda sekme çubuğu istiyor, ama bu ekranlar için önerdiği dosya yolları `(tabs)` dışında. 19'un tablosunda "Mesajlar" yazsa da 19 görünür çubuk listesinde yok. Bu yüzden Sohbet kök Stack'te, çubuksuz kalır.

**G-11:** Topluluk sekmesini Stack yapmak önerilir. `reviews.jsx` → `reviews/index.jsx` ve `reviews/_layout.tsx`; dış `/reviews` adresi ve sekme anahtarı korunur. Topluluk detayı bu Stack altında kalır. Handoff'un `/community/:gameId` örneği yeni olduğu için korunması gereken bir deep link yok; gerekirse alias ayrıca tanımlanır.

**G-16:** Varsayılan güvenli geçiş, mevcut kök Stack'i korumaktır. Bu durumda tasarımdaki çubuk henüz eşleşmez. Birebir çubuk istenirse iki şart var:
- `/news`, adresi koruyan bir grup düzeniyle ana sayfa sekmesinin içindeki nested Stack'e taşınır.
- Root kaydı kaldırılır; URL ve geri geçmişi doğrulanır.

Sırf görünüm için yapılmayacaklar:
- İkinci bir sahte Tabs kurulmaz.
- Altıncı, görünmez bir sekme eklenmez. Teslim bileşeni `state.routes` listesinin tamamını çizdiği için gizli route eklemek görünen sekme sayısını da bozar.

## 5. Paketler ve Expo SDK 54 uyumu

Esas alınan `mobile/package.json`. Bu revizyonda kurulum yapılmadı; çalışma ağacındaki kurulumlar için bkz. §0.1. `mobile/AGENTS.md` başındaki SDK 57 belge notu, kurulu sürümün 57 olduğunu göstermiyor. Bu geçişte SDK yükseltmesi yok. Uygulamadan önce yerel kuralların istediği belge kontrolü ayrıca yapılmalı; paket seçimi gerçek SDK 54'e göre yapılır.

| Paket | Mevcut / plan |
|---|---|
| expo-blur | Doğrudan bağımlılıklarda yok; **eklenecek**. SDK54 belgesi ~15.0.8 öneriyor; `mobile/` içinde `npx expo install expo-blur`. (Çalışma ağacında eklenmiş, commit'lenmemiş.) |
| @expo-google-fonts/inter | Yok; **eklenecek**. Android'de 400/500/600/700 ağırlıkları; iOS'ta System. expo-font zaten ~14.0.12 ve `app.json`'da `"expo-font"` eklentisi var. Kilit dosyasında seçilen font paketi sürümü kaydedilir. (Çalışma ağacında ^0.4.2.) |
| @react-navigation/bottom-tabs | Handoff `BottomTabBarProps` tipini import ediyor. package.json'da doğrudan yok, ama ✓ `mobile/package-lock.json` içinde Router üzerinden **7.18.13** çözülmüş. Gerekirse aynı uyumlu sürüm doğrudan tanımlanır; rastgele `latest` kurulmaz. |
| expo-glass-effect | ~0.1.10 mevcut; korunur. |
| expo-image / expo-linear-gradient / expo-haptics | ~3.0.11 / ~15.0.8 / ~15.0.8 mevcut; korunur. |
| react-native-svg | 15.12.1 mevcut; ikon, logo ve grafik için yeterli. |
| react-native-reanimated / react-native-worklets | ~4.1.1 / 0.5.1 mevcut; birlikte korunur. |
| react-native-safe-area-context / gesture-handler / screens | ~5.6.0 / ~2.28.0 / ~4.16.0 mevcut. |
| @react-native-community/slider | Şimdilik eklenmez. Fiyat filtresi veri sözleşmesi kabul edilirse, erişilebilir bir slider için SDK54 uyumlu sürüm `expo install` ile seçilebilir. |
| @expo/vector-icons | İlk fazda kaldırılmaz, çünkü geçiş yapılmamış ekranlar kullanıyor. Tüm kullanım bittiğinde kaldırılabilir. |

Resmî sürümlü kaynaklar (21 Eylül 2026 kontrolü):

- [Expo SDK54 BlurView](https://docs.expo.dev/versions/v54.0.0/sdk/blur-view/):
  - Android'de blur deneysel; DS7 Android çubuğunda gerekmiyor.
  - Diğer cam yüzeylerde performans ve yedek dolgu doğrulanmalı.
  - Dinamik listeden önce çizilen blur güncellenmeyebilir; katman sırası kontrol edilir.
- [Expo SDK54 GlassEffect](https://docs.expo.dev/versions/v54.0.0/sdk/glass-effect/): iOS camı ve kullanılabilirlik kontrolleri. Eski iOS ve Android için yedek gerekli. Cam desteği native build ortamında da doğrulanır.
- [Expo SDK54 Font](https://docs.expo.dev/versions/v54.0.0/sdk/font/): Inter yüklemesi mevcut font/splash akışına eklenir. Font hatası sonsuz splash üretmemeli.
- [React Native 0.81 boxShadow](https://reactnative.dev/docs/0.81/view-style-props#boxshadow): New Architecture gerektirir (repoda açık). Android'de dış gölge 9+, iç gölge 10+ sürümlerde çalışır; daha eski cihazlar için yedek gerekir.

Uygulama fazında `mobile/` içinde şu kontroller çalıştırılır:
- `npx expo install --check`
- `npx expo-doctor`
- mevcut `npm run check`
- `npx expo export --platform ios`
- Android export ya da build

Teslim "tip kontrolünden geçmiş" olsa da doğrulama proje içinde yeniden yapılır. Bilinen hatalar §5.2'de. Yeni native bağımlılıklar ve ikon/splash ayarları için yeni bir development/release build gerekir; yalnızca OTA yeterli kabul edilmez.

### 5.1 Font yükleme: çalışma anı yerine derlemeye gömme

Teslim PROMPTS, fontları kök layout'ta `useFonts` ile yükleyip splash'i o sürede açık tutmayı öneriyor. Mevcut splash zinciri ise zaten hassas: `loadPerde` ve iki kare bekleme, ardından `hideAsync`. Yeni bir build nasılsa gerekeceği için Inter'i `expo-font` config eklentisiyle derlemeye gömmek daha iyi:
- Çalışma anında yükleme ve splash beklemesi olmaz.
- Font hatası yüzünden takılı kalan bir splash riski doğmaz.

Tercih bu. Çalışma anı yüklemesi yalnız gömme doğrulanamazsa yedek olarak kullanılır. Performans önceliği 1 olduğu için karar splash'ten ilk kareye kadar geçen süre ölçülerek verilir.

### 5.2 Teslim kodunda bulunanlar: düzeltilmeden kopyalanmamalı

- **tokens.ts:** `Easing` react-native'den geliyor. Reanimated'in `withTiming`'i ise UI thread'de çalışabilen (worklet) bir easing bekler. `TabBar.tsx`'teki mercek ve gösterge animasyonları bu değerleri `withTiming`'e veriyor. `Easing`, Reanimated'in kendi `Easing`'iyle değiştirilmeli. "tokens.ts'i değiştirme" kuralına tek ve gerekçeli istisna bu; değerler aynı kalır.
- **TabBar.tsx:**
  - `isLiquidGlassAvailable()` tek başına çağrılıyor. Mevcut kodun notuna göre bazı iOS 26 betalarında bu çöküyordu; §4'teki çift kontrol kullanılır.
  - `Haptics.selectionAsync()` yakalanmıyor ve odaktaki sekmede de çalışıyor (§4.1).
  - Profil yalnızca URI kabul ediyor, preset avatarları çizemiyor (§4.1).
  - Android'de `useTabBarInset` akış içindeki bir çubuk için tam yükseklik döndürüyor; çift pay riski var (§4).
  - Yatay yön için genişlik sınırı yok (§4.1).
  - Sabit renkler (`#E6E1E5`, `#1C1B1F`, `rgba(255,255,255,0.28)`) ya token'a çıkar ya da `tema-bagimsiz` gerekçesi alır.
- **Logo.tsx:** Wordmark'taki "risen" `brand` renginde metin (3.01:1). 22 pt'nin altında kullanılmaz.
- **tokens.ts `radius`:** Alt sayfanın 24 köşesi eksik. `cardLarge` yorumu "alt sayfa" diyor ama kaynak 24 gösteriyor.

### 5.3 Yapılandırma, OTA ve EAS

- **OTA güvenliği:** `runtimeVersion.policy: appVersion`. Uygulama sürümü 2.7.2'de kalırken expo-blur'u import eden JS `eas update` ile yayınlanırsa, bu güncelleme 2.7.2 binary'lerine de gider. O binary'lerde native modül olmadığı için uygulama açılışta çöker. Native değişiklik içeren ilk commit'le birlikte sürüm yükseltilmeli (öneri: 2.8.0; soru 16).
- **Simge ve splash (snippet):** `ios.icon` açık/koyu/tonlu, Android uyarlanabilir + tek renk simge, splash `#0A0A0B` + 104 genişlik. Hepsi native yapılandırma; yeni build ister, OTA ile gitmez.
- **Bildirim rengi:** `expo-notifications.color` hâlâ `#e0a72e` (eski altın vurgu). Marka kırmızısı `#BC0C0C` olmalı. Bu da native, yeni build ister.
- **EAS arşivi:** `.easignore` tüm `.gitignore` dosyalarının yerini alıyor. `design-handoff/` (29 MB) için kural yok, eski `design_handoff_profil_revizyonu/` için de yok. Bu hâliyle her EAS build arşivine girerler; `.easignore`'a eklenmeliler.
- **Native uzantılar:** Widget ve paylaşım uzantısının kendi arayüzü (Swift) tasarımda yok. Marka rengi uyumu ayrı bir iş.

## 6. Riskler ve korunacak sınırlar

### Veri ve iş mantığı

- `session.js`, `owner.js`, `sync.js`, SecureStore ve anonim hesaptan hesaba veri aktarımı korunur. Google düğmesi eklemek ya da Steam hesabını ana kimlik saymak görsel bir değişiklik değildir.
- `oyunKimlik.js`, RAWG slug/id ile Steam appid ayrımı, priceKey, önbellek dedup'ı ve eşzamanlılık limiti değişmez. Bir karta yeni görünüm verildi diye ekstra fiyat isteği eklenmez.
- `useForYouFeed`, `recommend.js`, `homeFeed.js`, taste/seen/dismiss/owned sinyalleri ve sıralama korunur. Tasarımdaki raylara bölmek, öneri algoritmasını yeniden sıralama yetkisi vermez. Ray üyeliği gerekiyorsa ayrıca tanımlanır.
- `/api/prices` sonucundaki mağaza fiyatı; geçmişin, ortalamanın ya da fiyat düşüşünün kanıtı değildir. TRY, ücretsiz ve "fiyat bulunamadı" durumları ile mağaza URL'leri korunur. Mock grafik gerçek fiyatmış gibi yayınlanmaz.
- Arkadaşlık iki taraflı, takip tek taraflı. Arkadaşlık isteği API'sini FollowButton'a bağlamak yasak. Topluluk üyeliği ve grup sohbeti yeni özelliklerdir.
- Korunacak `PostCard` davranışları:
  - İyimser beğeni güncellemesi ve rollback.
  - Gönderi ile inceleme kimliklerinin ayrımı.
  - Düz yanıt düzeni.
  - Rate limit ve moderasyon kapıları.

  Bio sınırı 150 kalır; tasarımdaki 160'a yükseltilmez.
- Korunacak sohbet davranışları:
  - Arkadaş zorunluluğu.
  - Pusher aboneliğinin temizlenmesi.
  - Yazıyor/çevrimiçi göstergeleri ve polling yedeği.
  - `gonderimEsleme` ile geçici ve sunucu mesajlarının eşlenmesi.
  - Okunmamış sayısı ve push bastırma.
- Fotoğraf yükleme bilerek kaldırıldı. Kamera, mikrofon, PiP ve iPad desteği yeniden açılmaz. Eski fotoğraf avatarları ve sohbet medyası gösterilmeye devam eder. Tasarımdaki kamera ve mikrofon simgeleri, izin ya da özellik açma talimatı değildir (tablo §6.4).
- "Sıra sende" ana sayfaya geri eklenmez; AGENTS.md'deki kapatılmış karar geçerli. Detayda oynama süresi göstermek için yeni bir sosyal istek eklenmez.
- Bu görsel geçişin dışında kalanlar:
  - Backend `app/api/**`.
  - Erişim manifesti ve CORS politikası.
  - OAuth.
  - Redis veri şeması.
  - Push cron'u ve içerik güvenliği.

  Eksik veri için gereken sunucu işi ayrı kapsamdır. Yeni her uç `app/lib/access-policy.js` manifestine girer; girmezse build düşer.

### Navigasyon ve sunum

- Kırılmayacak yollar: `/game/:id`, `/post/:id`, `/chat/:uid`, `/u/:username`, auth callback, widget/paylaşım uzantısı ve bildirim hedefleri. `buyume`/CardExpand geçişi ve geri küçülme akışı da korunur.
- Yeni route'lar soğuk açılışta yalnızca önceki ekrandan geçen nesneye bağımlı olmamalı. Video ve haber için kalıcı kimlik çözümü henüz yok.
- Yeni sekme geometrisi, Android viewport'u, safe-area, klavye ve yatay video birlikte kontrol edilir. iPad desteği kapalı olsa da 375×667 uyumluluk penceresi kırılmamalı.
- Tasarımın uzun PNG'si, dev bir ScrollView kurmak için gerekçe değil. FlashList ve üç oynatıcılı video havuzu korunur. Liste kataloğa dönüşürse video yaşam döngüsü geçişi ayrıca doğrulanır.
- Açık tema, büyük font erişilebilirliği, reduce-motion, ekran okuyucu adları ve beş dil korunur. Sabit Türkçe örnek metinler doğrudan üretime taşınmaz.

### 6.1 Performans: cam ve bulanıklık (öncelik 1)

Kit'te `heart()`, `playc()`, HeroCard etiketi ve `media_img` etiketi `DARKGLASS` kullanıyor: `rgba(0,0,0,.42)` + `blur(16px)`. Pratikte şu demek:
- Her GameCard kalbi (34 pt) ve her VideoCard oynat düğmesi (44 pt) bulanık bir cam.
- Ana Sayfa kaynağında 13 cam öğesi var. Tasarımda rayların yalnızca ilk kartları çizili; uygulamada ise rayda çizilen her kart için ayrı bir canlı BlurView demek.
- Android'de BlurView SDK 54'te deneysel.

Öneri:
- Kaydırılan liste öğelerinde bulanıklıksız `darkGlass` dolgu kullanılır. Renk tasarımınki, yalnız bulanıklık yok. Koyu görsel üstünde fark küçük.
- Gerçek bulanıklık sabit yüzeylerde kalır: sekme çubuğu, StickyBottomBar ve görsel başlıklı ekranlardaki geri/paylaş düğmeleri.

Karar ölçümle verilir: mevcut `src/dev/FpsMeter.jsx` ile Ana Sayfa'daki GameCard rayında, iki platformda, önce ve sonra ölçülür (soru 13). Aynı ölçüm, uzun ekranlarda (Ana Sayfa 3824 pt, Oyun Detayı 3869 pt) FlashList bölümlemesi için de yapılır.

### 6.2 375 pt genişlik (iPad uyumluluk modu, iPhone SE/mini)

Tasarım 390 pt'ye göre çizildi, kenar boşluğu 20.

| Öğe | 390'da | 375'te | Karar |
|---|---|---|---|
| NewsFeature 350 | 350 + 40 = 390 | 15 pt taşar | `min(350, pencere − 40)` |
| Toast 350 | 20 pay | 12.5 pay | `min(350, pencere − 40)`, pay 20'de kalır |
| HeroCard 334 (+10 aralık, 344 adım) | sağda sonraki karttan 26 pt görünür | 11 pt görünür | sabit kalır; kaydırma ipucu zayıflar, kabul |
| DealCard 300 / PriceDropCard 264 | sığar | sığar | sabit |
| iOS sekme kapsülü | 350 | 335 | zaten esnek (sol/sağ 20) |

### 6.3 Beş dil

- Segmented'da 4 etiket 350 pt'ye yaklaşık 86 pt/segment olarak düşüyor (13/600). `ProfileTabs` bugün yalnızca ikon, çünkü Almanca etiketler sığmıyordu. Tasarımın metin etiketli profil segmenti bu kararla çelişiyor (soru 12).
- Chip ve buton metinleri DE/ES/PT'de uzar. `numberOfLines={1}` + esnek genişlik kullanılır. Sabit genişlikli bir metin kutusu tasarlanmaz.
- Sayı ve tarih biçimi dile göre `services/locale.js → bcp47()` ile yapılır; argümansız `toLocaleString` kullanılmaz. Tasarımdaki ₺ ve Türkçe tarihler yalnızca örnek.

### 6.4 Kapatılmış kararlarla çakışan tasarım öğeleri (AGENTS.md)

| Tasarım öğesi | Ekran | Kapatılmış karar | Uygulama |
|---|---|---|---|
| SearchField mikrofonu | 05, 06, 18 | Mikrofon ve kamera izin metinleri bilerek yok (AGENTS.md → İzin metinleri) | İkon çizilmez; sesli arama yok. |
| Görsel eki, "Alt metin ekle", Görsel/Video tür çipleri | 12 | Fotoğraf yükleme 2.7.0'da kaldırıldı; paket de yok | Çipler ve ek alanı gizli. Metin ve oyun etiketi kalır. |
| "Görsel gönder" | 19 | Aynı | Yok; GIF kalır. |
| Kapak değiştirme, kamera rozetli avatar | 22 | Aynı + kamera izni kapalı | Yalnızca preset avatar seçici; kapak tasarımın varsayılan görseli. |
| "Küçült" | 15 | PiP kapalı (manifest ve arka plan ses yetkisi) | PiP olarak uygulanmaz. Uygulama içi mini oynatıcı ayrı bir özellik işi. |
| "Sıra sende" | — | Yapılmıyor | — |
| iPad'e özel yerleşim | — | `supportsTablet: false` tek yönlü karar | 375 pt uyumluluk penceresi korunur (§6.2). |

### 6.5 Android'de karışık yazı tipi dönemi

Yeni bileşenler Android'de Inter, geçiş yapılmamış ekranlar ise Roboto kullanacak. Ekran ekran ilerleyen geçiş boyunca Android'de iki yazı tipi yan yana görünür. Inter'i bütün `Text`'e birden vermek eski ekranların satır kırılımlarını topluca değiştirir; bu, AGENTS.md'nin toplu görsel değişikliğe karşı tutumuyla çelişir. Kabul edilen yol ekran ekran geçiş. Bu dönemin bir sürüme çıkıp çıkmayacağı, sürüm planında ayrıca kararlaştırılır.

### 6.6 Dal ve teslim güvenliği

- Çalışma ağacındaki geçiş işi `main` dalında ve commit'lenmemiş durumda. `main`'e yapılan push Vercel'de otomatik deploy tetikliyor. Bu klasörde GitHub Desktop'ın dal değiştirip `main`'i gönderdiği daha önce görüldü (11–12 Eylül).
- Öneri: README'nin dediği gibi, commit'ten önce `design-v2` dalı açılır. Her ekran bu dalda ayrı commit olarak ilerler.
- `design-handoff/` 29 MB. Commit'lenirse git geçmişine kalıcı olarak girer (soru 15).

### Mock ve doğrulama politikası

Verisi olmayan tasarım bölümleri yalnız geliştirme galerisinde ya da fixture içinde, açıkça örnek veriyle gösterilebilir. Üretimde çalışan bir özellik gibi görünmezler; veri desteği tamamlanana kadar eksik/bekleyen olarak takip edilirler. Böylece 25 ekranın tasarım çalışması ile 25 ekranın ürün olarak hazır olması ayrı ölçülür.

Sonraki fazlarda her bileşen grubu ve ekran için kontrol edilecekler:
- Durumlar: yükleniyor, boş, hata, çevrimdışı, uzun içerik.
- İlgili mevcut denetimler.
- iPhone 16'da görüntü karşılaştırması; uzun ekranlar parça parça.
- Android'de DS7, hem jest hem üç düğmeli gezinmeyle.

Windows'ta iOS simülatör görüntüsü doğrulanamaz; Mac ve simülatör ya da gerçek cihaz çıktısı gerekir. Renk ve ölçü farkları kapanmadan "birebir tamamlandı" denmez. Bu revizyon yalnızca Markdown ürettiği için uygulama build'i çalıştırılmadı.

## 7. Karar bekleyen sorular

Soru numaraları ilk sürümdekilerle aynı; yeni sorular 10'dan başlıyor.

### Yanıtlananlar

İlerleme günlüğüne (22 Eylül) göre; teyit edildiğinde kesinleşir.

1. **Tema:** Açık/koyu/sistem korunur. Açık palet türetilmiş bir uyarlamadır; "birebir" iddiası yalnız koyu tema için geçerli (§3.1).
2. **Eksik ürün bölümleri** uygulama kapsamına alındı. Bunların çoğu sunucu işi: yeni uçlar, erişim manifesti kaydı, Redis şeması. Bu yüzden ekran işinden ayrı planlanmalı (soru 17).
5. **Videolar:** Katalog + ayrı oynatıcı. Reels, "Kısa Klipler" rayından açılan tam ekran akış olarak korunur (ekran 14).

### Açık

3. G-02b ilgi seçimi, kaldırılmış onboarding'in yerine isteğe bağlı yeni bir adım olarak geri gelecek mi? Seçimler öneri algoritmasını nasıl etkileyecek?
4. Girişteki Google ve Steam düğmeleri korunacaksa bunlar yeni giriş yöntemleri mi olacak? Mevcut Apple/e-posta girişi ile Steam/Xbox bağlama ayrımı sürecek mi?
6. G-11 ve G-16'da sekme çubuğu, önerilen nested Stack düzeniyle mi görünecek? DS7'nin sabit boyu için eski kaydırmada daralma kaldırılsın mı? (Çalışma ağacında kaldırılmış, henüz onaylanmadı.)
7. Haber detayı için tam makale kaynağı ve kalıcı id sağlanacak mı, yoksa mevcut kaynak tarayıcısı davranışı mı korunacak? (Bugünkü id liste sırası.)
8. Bio 150 sınırı, kullanıcı adı düzenleme kısıtı, yalnız preset avatar ve kapalı fotoğraf yükleme kararları tasarım tarafında da revize edilecek mi? Plan bunları koruyor.
9. Piksel karşılaştırması için iPhone 16 simülatörlü bir Mac mi, yoksa cihaz görüntüleri mi kullanılacak?
10. Çalışma ağacındaki commit'lenmemiş Faz 1 işi ne olacak? Öneri: önce `design-v2` dalına alınsın, sonra ayrı bir oturumda bu revizyona göre denetlensin. Özellikle bakılacak yerler: §5.2 hataları, §4.1 bağımlıları ve §3.3 denetimleri.
11. Web (Next.js) de 2.0'a geçecek mi? Teslim paketi yalnız mobil için.
12. Profil segmentleri: tasarımdaki metin etiketli Segmented mi, yoksa beş dil yüzünden alınmış ikon-only karar mı?
13. Kaydırılan liste öğelerinde bulanık cam yerine bulanıklıksız `darkGlass` dolgu kabul mü? FPS ölçümüyle doğrulanacak (§6.1).
14. Bölüm başlığı: 2.0'daki 20/26 başlık, daha önce "üstyazı daha doğru" diye geri alınmış bir kararı yeniden çeviriyor. Onay?
15. `design-handoff/` commit'lensin mi, yoksa referans PNG'ler (~27 MB) `.gitignore`'a mı alınsın? Her iki durumda da `.easignore`'a eklenmeli.
16. Native değişiklikler için sürüm 2.8.0 mı olacak? OTA güvenliği buna bağlı (§5.3).
17. Sunucu işleri için önerilen sıra: fiyat geçmişi + hedef alarm (G-08'den önce gerekli) → bildirim merkezi → takip modeli → oyun toplulukları. Uygun mu?

Bu sorular keşif planını engellemez, ama ilgili uygulama adımlarından önce çözülmelidir.
