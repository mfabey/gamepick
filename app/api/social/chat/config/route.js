import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { pusherPublicConfig } from '../../../../lib/pusher-server';
import { isModerationConfigured } from '../../../../lib/media-moderation';
import { isGifConfigured } from '../../../../lib/gif-provider';

// ─────────────────────────────────────────────────────────────────────────────
// İstemci için Pusher ayarları.
//
// NEDEN UYGULAMAYA GÖMÜLMÜYOR: anahtar ve küme (cluster) gizli değil ama
// pakete gömülürse değiştirmek YENİ BİR BUILD gerektirir. Sunucudan okununca
// Pusher hesabı değişse bile OTA yeterli oluyor.
//
// `enabled: false` geçerli bir yanıt: Pusher yapılandırılmamışsa sohbet
// yine çalışıyor, sadece anlık teslim yok (ekran açılışında geçmiş çekiliyor).
//
// ── YETENEKLER ──
// Kompozitördeki düğmeler bu bayraklara bakıyor. Sebebi: fotoğraf ve GIF
// gönderimi YALNIZCA ortam değişkenlerine bağlı ve istemcinin bunu bilmesinin
// başka yolu yok. Bayraksız hâlde basınca "şu an kapalı" diyen düğmeler
// kalıyordu — Guideline 2.2 açısından tamamlanmamış uygulama sinyali.
//
// Değişken eklendiği anda düğme geliyor: YENİ BUILD GEREKMİYOR. `chat/config`
// zaten bu amaçla vardı (Pusher anahtarı da aynı sebeple burada).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const cfg = pusherPublicConfig();

  // Fotoğraf İKİ kapıya birden bağlı: denetim sağlayıcısı VE depolama.
  // Biri eksikse yükleme ucu 503 dönüyor, o yüzden ikisi de sorulmalı.
  const photos = isModerationConfigured() && !!process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json(
    {
      ...(cfg ? { enabled: true, ...cfg } : { enabled: false }),
      photos,
      // VİDEO HER ZAMAN KAPALI: denetim sağlayıcısı görselle çalışıyor,
      // kare çıkarma altyapısı yok. Denetlenmemiş video geçirmektense
      // özelliği kapalı tutuyoruz (bkz. media-moderation.js).
      videos: false,
      gifs: isGifConfigured(),
      // ANAHTAR İSTEMCİYE VERİLİYOR. KLIPY'nin şartları isteklerin son
      // kullanıcı cihazından gelmesini istiyor; vekil sunucu yazılı onay
      // gerektiriyor. Anahtar yine de PAKETTE DEĞİL — burada duruyor ve
      // değişince yeni build gerekmiyor. Yanıt `private` önbellekli,
      // yalnızca kimliği doğrulanmış kullanıcıya gidiyor.
      gifKey: process.env.GIF_API_KEY || null,
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}
