// ─────────────────────────────────────────────────────────────────────────────
// Bildirim merkezi okunmamış sayacı (G-20, 27 Eyl) — ana sayfa zilinin noktası.
//
// services/unread.js ile aynı ilke: ARALIKLI YOKLAMA YOK. Tazeleme ana sayfa
// odaklanınca, uygulama öne gelince, oturum değişince ve bildirim ekranında
// okundu işaretlenince. Sunucu henüz bu ucu tanımıyorsa (eski dağıtım) ya da
// çevrimdışıysa SESSİZ: nokta görünmüyor, hata yok.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react';
import { fetchNotifCount } from '../api/social';
import { getSession, subscribeSession } from './session';

let sayi = 0;
let ucusta = null;
const dinleyiciler = new Set();
const yay = () => dinleyiciler.forEach((f) => f());

export function bildirimSayisiYaz(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v !== sayi) { sayi = v; yay(); }
}

export function bildirimSayisiTazele() {
  if (!getSession()) { bildirimSayisiYaz(0); return Promise.resolve(0); }
  if (ucusta) return ucusta;
  ucusta = fetchNotifCount()
    .then((r) => { bildirimSayisiYaz(r?.unread); return sayi; })
    .catch(() => sayi)
    .finally(() => { ucusta = null; });
  return ucusta;
}

subscribeSession(() => { bildirimSayisiTazele(); });

function abone(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }
export function useBildirimSayisi() {
  return useSyncExternalStore(abone, () => sayi, () => sayi);
}
