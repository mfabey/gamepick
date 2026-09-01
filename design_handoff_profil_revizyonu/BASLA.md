# Claude Code'a verilecek başlangıç komutu

Bu klasörü projenin köküne kopyala, sonra Claude Code'da şunu yapıştır:

---

`design_handoff_profil_revizyonu/README.md` dosyasını baştan sona oku. Bu, Gamerisen profil & topluluk revizyonunun tam tasarım dökümü: 22 ekran, kesin renk/punto/boşluk/yükseklik değerleri, sekiz kesinleşmiş karar, durum makineleri ve bir denetim listesi.

Kurallar:
- `Profil Revizyonu.dc.html` bir **tasarım referansıdır**, üretim kodu değil. HTML/CSS'i kopyalama; ekranları bu kod tabanının mevcut React Native (Expo SDK 57 + expo-router) yapısında, mevcut bileşen ve stil kalıplarıyla yeniden kur.
- README'deki jetonları (renk, tipografi, boşluk ölçeği, yarıçap) projedeki mevcut tema dosyasına eşle; eşi yoksa README'deki değeri birebir ekle. Yeni jetonlar: `success`, `avatar.xl`, `privateProfile`.
- Boşluk ölçeği dışına çıkma (4·8·12·16·20·24·32·40·48), 44pt altı dokunma hedefi üretme, ekran başına 3'ten fazla marka-kırmızı öğe koyma. README sonundaki denetim listesi kabul kriteridir.
- İkonlar `@expo/vector-icons/Ionicons`; adlar README'nin Assets bölümünde.

Önce uygulama planını çıkar (hangi ekran hangi dosya, sırayla), bana onaylat, sonra kodlamaya başla. İlk turda: kendi profilim, başkasının profili + arkadaşlık durum makinesi, arkadaş listesi.

---

## Klasör içeriği
- `README.md` — tam tasarım dökümü (tek başına yeterli)
- `Profil Revizyonu.dc.html` — 22 ekranlık görsel maket (tarayıcıda aç; `support.js` yanında olmalı)
- `support.js` — maketin çalışma zamanı, üretime taşınmaz
- `PROFILREVIZYONTASARIMPROMPT.md` — orijinal tasarım brifi
