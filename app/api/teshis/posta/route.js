import { NextResponse } from 'next/server';
import { canSignSessions } from '../../../lib/session-cookie';

// ─────────────────────────────────────────────────────────────────────────────
// POSTA ZİNCİRİ TEŞHİSİ — geçici
//
// NEDEN VAR. Markalı doğrulama postası gönderilemiyor ve sebebi ancak üretimde
// görülebiliyor: `firebase-admin` Vercel'de içe aktarılamıyor
// (ERR_REQUIRE_ESM). Teşhis şu ana kadar `auth/resend-verification` yanıtından
// okunuyordu ama o uç HESABIN PAROLASINI istiyor ve hız sınırına takılıyor —
// birkaç denemeden sonra 46 dakika kilitlendi. Teşhis aracı, teşhis edilecek
// şeyden daha çok engel çıkarmamalı.
//
// KAPALI BAŞARISIZ OLUR: `CRON_SECRET` yoksa 503. Kontrol `if (secret)` ile
// sarılmıyor — access-policy.js'in anlattığı dört açığın biri tam olarak
// böyle doğmuştu (güvenlik kapısı, varlığı opsiyonel bir değişkene bağlanamaz).
//
// SIR SIZDIRMIYOR. Yalnızca "var mı / yüklendi mi" sorularına evet-hayır
// dönüyor; anahtarların kendisi, uzunluğu ya da parçası yanıta girmiyor.
// Hata metni 300 karaktere kırpılıyor.
//
// GEÇİCİ. Zincir açılınca bu dosya silinmeli; access-policy.js'teki kaydı da
// birlikte gitmeli.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET tanımlı değil' }, { status: 503 });
  }
  const auth = request.headers.get('authorization');
  const qs = request.nextUrl.searchParams.get('secret');
  if (auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const rapor = {
    // Asıl soru: `require(esm)` destekli bir sürümde miyiz? O destek Node
    // 20.19 ve 22.12'de geldi; `jwks-rsa@4` de engines'inde bunu yazıyor.
    node: process.version,
    resendAnahtari: !!process.env.RESEND_API_KEY,
    servisHesabi: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    firebaseApiAnahtari: !!process.env.FIREBASE_API_KEY,

    // OTURUM İMZASI — posta zinciriyle ilgisi yok ama aynı birleştirmeyle
    // gelen İKİNCİ yeni zorunluluk ve aynı sınıfta arıza üretiyor.
    //
    // `SESSION_SECRET` üretimde yoksa `signValue` FIRLATIYOR ve bu yalnızca
    // BAŞARILI girişte oluyor — başarısız giriş temiz 400 dönüyor, başarılı
    // giriş 500. Yani dışarıdan bakınca "site ayakta" görünüyor ama kimse
    // giremiyor. `canSignSessions` tam da bunu yakalamak için yazılmış, ama
    // hiçbir uç onu çağırmıyor; burada ilk kez soruluyor.
    oturumImzalanabilir: canSignSessions(),
    adminYuklendi: false,
    adminAuthHazir: false,
    hata: null,
  };

  try {
    const mod = await import('../../../lib/firebase-admin');
    rapor.adminYuklendi = true;
    // Paket yüklendi ama servis hesabı bozuksa `adminAuth()` null döner —
    // iki ayrı arıza, ayrı ayrı görünmeli.
    rapor.adminAuthHazir = !!mod.adminAuth?.();
  } catch (e) {
    rapor.hata = `${e?.code || ''} ${e?.message || e}`.trim().slice(0, 300);
  }

  return NextResponse.json(rapor);
}
