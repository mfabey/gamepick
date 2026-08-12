import { AppState } from 'react-native';
import { useState, useEffect } from 'react';

import { getChatList } from '../api/social';
import { getSession, subscribeSession } from './session';

// ─────────────────────────────────────────────────────────────────────────────
// Okunmamış mesaj sayacı — paylaşılan depo.
//
// NEDEN EKRAN İÇİNDE DEĞİL: rozet artık alt navigasyondaki Mesajlar
// sekmesinde. Sekme çubuğu ekranların DIŞINDA, navigator seviyesinde
// render ediliyor; hiçbir ekranın state'ini göremiyor. Aradaki kanal bu modül.
//
// SAYI KONUŞMA SAYISI, mesaj sayısı değil. "12 mesaj" kaç kişinin
// beklediğini söylemiyor; "3" söylüyor.
//
// ARALIKLI YOKLAMA YOK. Tazeleme YALNIZCA bir şeyin değişmiş olabileceği
// anlarda: sekme değişimi, uygulamanın öne gelmesi, oturum değişimi ve
// sohbetten çıkış. Arka planda saniyede bir istek atmanın karşılığı yok —
// kullanıcı zaten uygulamayla etkileşirken tazeleniyor.
// ─────────────────────────────────────────────────────────────────────────────

let unread = 0;
const listeners = new Set();

// Aynı anda iki istek gitmesin: sekme değişimi ve öne gelme aynı saniyede
// tetiklenebiliyor.
let inFlight = null;

function emit() {
  for (const fn of listeners) fn(unread);
}

export function getUnread() {
  return unread;
}

export function subscribeUnread(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Sunucudan tazeler. Çevrimdışıysa SESSİZ: rozet eski değerinde kalıyor. */
export function refreshUnread() {
  if (!getSession()) {
    if (unread !== 0) { unread = 0; emit(); }
    return Promise.resolve(0);
  }
  if (inFlight) return inFlight;

  inFlight = getChatList()
    .then((r) => {
      const n = Number(r?.unread) || 0;
      if (n !== unread) { unread = n; emit(); }
      return n;
    })
    .catch(() => unread)
    .finally(() => { inFlight = null; });

  return inFlight;
}

/**
 * Rozet için sayaç.
 *
 * Uygulama öne geldiğinde tazeleniyor: telefon cebindeyken gelen mesajlar
 * ekran açılır açılmaz rozete yansımalı, kullanıcının bir yere dokunmasını
 * beklememeli.
 */
export function useUnread() {
  const [n, setN] = useState(unread);

  useEffect(() => {
    const offList = subscribeUnread(setN);
    // Oturum değişince (çıkış/giriş) sayaç anlamını yitiriyor.
    const offSession = subscribeSession(() => refreshUnread());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshUnread();
    });
    refreshUnread();

    return () => { offList(); offSession(); sub.remove(); };
  }, []);

  return n;
}
