# Gamerisen — Kurulum ve Deploy Rehberi

Bu rehberi adım adım takip ederek sitenizi internete açabilirsiniz.
Teknik bilgi gerekmez — her adım detaylı açıklanmıştır.

---

## Adım 1: Ücretsiz API Anahtarları Alın (10 dakika)

### 1a. RAWG API (Oyun veritabanı)
1. https://rawg.io/apidocs adresine gidin
2. "Get API Key" butonuna tıklayın
3. E-posta ile kayıt olun
4. API anahtarınızı kopyalayın

### 1b. IsThereAnyDeal API (Fiyat karşılaştırma)
1. https://isthereanydeal.com/dev/app/ adresine gidin
2. Ücretsiz hesap oluşturun
3. "Create Application" yapın, API anahtarınızı alın

### 1c. Anthropic API (Yapay zeka)
1. https://console.anthropic.com adresine gidin
2. Hesap oluşturun (kredi kartı gerekiyor, $5 başlangıç kredisi var)
3. "API Keys" bölümünden yeni anahtar oluşturun

---

## Adım 2: GitHub'a Yükleyin (5 dakika)

1. https://github.com adresinde ücretsiz hesap açın
2. Sağ üstteki "+" → "New repository" tıklayın
3. Repository adı: `gamerisen`, herkese açık (Public) seçin → "Create"
4. Bilgisayarınızdaki `gamerisen` klasörünü bu repoya yükleyin:
   - GitHub sayfasında "uploading an existing file" linkine tıklayın
   - Tüm dosyaları sürükleyip bırakın (klasörler dahil)
   - "Commit changes" tıklayın

---

## Adım 3: .env.local Dosyasını Oluşturun

`gamerisen` klasörünüzde `.env.local.example` dosyasını kopyalayıp `.env.local` olarak adlandırın.
İçindeki değerleri kendi API anahtarlarınızla doldurun:

```
RAWG_API_KEY=rawg_dan_aldığınız_anahtar
ITAD_API_KEY=itad_dan_aldığınız_anahtar
ANTHROPIC_API_KEY=anthropic_den_aldığınız_anahtar
```

NOT: `.env.local` dosyasını GitHub'a yüklemeyin! Bu dosya özel bilgiler içerir.

---

## Adım 4: Vercel ile Deploy Edin (5 dakika)

1. https://vercel.com adresine gidin
2. "Sign Up" → "Continue with GitHub" ile giriş yapın
3. "Add New Project" → GitHub reponuzu seçin → "Import"
4. "Environment Variables" bölümüne API anahtarlarınızı girin:
   - `RAWG_API_KEY` → rawg anahtarınız
   - `ITAD_API_KEY` → itad anahtarınız
   - `ANTHROPIC_API_KEY` → anthropic anahtarınız
5. "Deploy" butonuna tıklayın
6. 2-3 dakika bekleyin — siteniz yayında!

Vercel size `gamerisen.vercel.app` gibi ücretsiz bir alan adı verecek.
İstersen kendi alan adınızı (örn: gamerisen.com) bağlayabilirsiniz.

---

## Yerel Geliştirme (İsteğe Bağlı)

Siteyi bilgisayarınızda test etmek isterseniz:

1. Node.js'i yükleyin: https://nodejs.org (LTS versiyonu)
2. Terminal/Komut İstemi açın, `gamerisen` klasörüne gidin:
   ```
   cd gamerisen
   npm install
   npm run dev
   ```
3. Tarayıcıda http://localhost:3000 adresini açın

---

## Sıkça Sorulan Sorular

**Aylık maliyet ne kadar?**
- Vercel: Ücretsiz (aylık 100GB bant genişliği dahil)
- RAWG API: Ücretsiz (20.000 istek/ay)
- ITAD API: Ücretsiz
- Anthropic: Kullanıma göre (~$5-20/ay, başlangıçta minimal)

**Sitem yavaş açılıyor?**
Vercel otomatik olarak küresel CDN kullanır — genelde çok hızlıdır.

**Oyun kapak resimleri çıkmıyor?**
`next.config.mjs` dosyasındaki `images.domains` listesini kontrol edin.

---

Herhangi bir adımda takılırsanız, Claude'a sorabilirsiniz!
