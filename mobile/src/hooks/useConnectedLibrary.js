import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from './useQuery';
import { fetchSteamLibrary, fetchXboxLibrary } from '../api/library';

const EMPTY = { steam: {}, xbox: null };

// Bağlı tüm Steam + Xbox kütüphanelerini TEK seferde çeker — HAM per-hesap yanıtlar
// (games + total/played/totalHours + hata korunur). Hem önerici hem Library ekranı
// aynı cache anahtarını paylaşır → çift fetch olmaz.
async function fetchConnectedLibraryRaw(steamAccounts, xbox) {
  const steamEntries = await Promise.all(
    steamAccounts.map((a) =>
      fetchSteamLibrary(a.steamId)
        .then((d) => [a.steamId, d])
        .catch((e) => [a.steamId, { error: e.message, games: [] }])
    )
  );
  const steam = {};
  steamEntries.forEach(([id, d]) => { steam[id] = d; });

  // `expired` KORUNUYOR. Öncesinde yalnız `e.message` alınıyordu ve
  // api/library.js'in `err.expired` bayrağı burada düşüyordu — çağıran taraf
  // "oturum süresi doldu" ile "istek başarısız"ı ayırt edemiyordu.
  // Oyun detayındaki sahiplik bandı bu ayrımı gösteriyor.
  const xboxData = xbox
    ? await fetchXboxLibrary(xbox).catch((e) => ({ error: e.message, expired: !!e.expired, games: [] }))
    : null;

  return { steam, xbox: xboxData };
}

/**
 * Bağlı kütüphaneler (Steam+Xbox), 30 dk cache'li paylaşımlı fetch.
 * - Önerici için: `steamGames`, `xboxGames` (düz oyun listeleri).
 * - Library ekranı için: `steam` (per-hesap ham), `xbox` (ham), `loading`.
 */
export function useConnectedLibrary(enabled = true) {
  const { steamAccounts = [], xbox } = useAuth();
  const steamKey = steamAccounts.map((a) => a.steamId).join(',');
  const hasAny = !!(steamKey || xbox);
  const key = hasAny ? `connlib:${steamKey}:${xbox?.xuid || ''}` : null;

  const { data, loading } = useQuery(
    key,
    () => fetchConnectedLibraryRaw(steamAccounts, xbox),
    { ttl: 30 * 60 * 1000, enabled: enabled && hasAny }
  );

  const raw = data || EMPTY;
  const steamGames = useMemo(() => Object.values(raw.steam).flatMap((l) => l?.games || []), [raw]);
  const xboxGames = useMemo(() => raw.xbox?.games || [], [raw]);

  return { steam: raw.steam, xbox: raw.xbox, steamGames, xboxGames, loading: !!loading };
}
