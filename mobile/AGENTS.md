# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Kapatılan kararlar — yeniden açma

Aşağıdakiler tartışıldı ve **bilerek yapılmadı**. Tasarım belgelerinde
istendikleri için "eksik" gibi görünürler; değiller.

## "Sıra sende" bölümü — YAPILMIYOR

Faz 1 anasayfada, Faz 3 oyun detayında istiyor. İki sebeple yok:

1. **Anasayfadan kullanıcı kaldırttı.** Eski adı "Bunları oynadın, ne
   düşünüyorsun". Tasarım belgesi bir kullanıcı talimatını ezmez.
2. **Detay ekranında verisi yok.** Oynama süresi (`g.hours`)
   `getEligibleGames()` → `/api/social` üzerinden geliyor; detay ekranı o
   çağrıyı yapmıyor. Kararlar.dc.html'in 4. kararı da "detaya yeni çağrı
   ekleme, iddiayı verinin olduğu yere taşı" diyor — taşındı: saat yalnızca
   Topluluk'taki davet şeridinde.

## Android sekme çubuğu — ŞİMDİLİK YAZILMIYOR

Faz 2 Android için ayrı bir çubuk tarif ediyor (r20, opak yüzey + elevation
18, 72×48 köşeli vurgu, ikon 22, basınca şekil morfu). Projede `android/`
dizini ve `google-services.json` yok; kod yazılsa **doğrulanamaz**.

Bu deponun kuralı: doğrulayamadığın işi tamamlanmış gibi raporlama.
Ölçüler Faz 2 belgesinde duruyor — Android hedefi derlenince tek oturumda
uygulanabilir.

## Ölçek dışı boşluk borcu (328) — TOPLU DÜZELTİLMİYOR

`npm run check:spacing` bunu taban olarak tutuyor: büyüyemez, sekiz fazda
395 → 328 indi. Kalanlar 40 dosyaya yayılmış 11/9/22 gibi değerler; hepsini
ölçeğe çekmek 328 yerleşim sayısını değiştirmek demek — görsel gerileme
riski kazancından büyük. Dokunulan dosyada fırsat varsa azaltılır, kampanya
yapılmaz.
