import { useState, useEffect } from 'react';
import { loadOnboarding, isOnboarded, subscribeOnboarding } from '../services/onboarding';

/**
 * İlk açılış durumu — ÜÇ DEĞERLİ:
 *   `null`  → depo henüz okunmadı
 *   `false` → keşif ekranı gösterilecek
 *   `true`  → geçilmiş
 *
 * Üçüncü değer şart. `null`'ı `false` saymak, depo okunurken geçen karelerde
 * onboarding'i ÇOKTAN GEÇMİŞ kullanıcıya da "hiç açmamış" muamelesi yapar ve
 * (tabs)/_layout.jsx onu her açılışta oyun seçme ekranına atardı.
 */
export function useOnboarding() {
  const [durum, setDurum] = useState(() => isOnboarded());

  useEffect(() => {
    // ÖNCE ABONE OL, SONRA OKU. Ters sırada yarış var: kök düzen okumayı
    // bizden önce başlatmış olabiliyor, o okuma biz dinlemeye başlamadan
    // emit ederse haber kaçar ve durum sonsuza dek `null` kalır.
    const unsub = subscribeOnboarding(() => setDurum(isOnboarded()));

    let alive = true;
    // Okuma bitince AYRICA senkronlanıyor: depo daha önce okunmuşsa
    // loadOnboarding() önbellekten erken dönüyor ve hiç emit etmiyor.
    loadOnboarding()
      .then(() => { if (alive) setDurum(isOnboarded()); })
      .catch(() => {});

    return () => { alive = false; unsub(); };
  }, []);

  return durum;
}
