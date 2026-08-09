import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { pusherPublicConfig } from '../../../../lib/pusher-server';

// ─────────────────────────────────────────────────────────────────────────────
// İstemci için Pusher ayarları.
//
// NEDEN UYGULAMAYA GÖMÜLMÜYOR: anahtar ve küme (cluster) gizli değil ama
// pakete gömülürse değiştirmek YENİ BİR BUILD gerektirir. Sunucudan okununca
// Pusher hesabı değişse bile OTA yeterli oluyor.
//
// `enabled: false` geçerli bir yanıt: Pusher yapılandırılmamışsa sohbet
// yine çalışıyor, sadece anlık teslim yok (ekran açılışında geçmiş çekiliyor).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const cfg = pusherPublicConfig();
  return NextResponse.json(
    cfg ? { enabled: true, ...cfg } : { enabled: false },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}
