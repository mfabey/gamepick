import { useEffect, useState } from 'react';
import {
  loadProfile, subscribeProfile, getProfile,
  topGenres, normalizedGenres, isCold,
} from '../services/tasteProfile';

/**
 * Zevk profilini okuyan hook (A2/A3 tüketicileri için).
 * Profil güncellenince (yeni sinyal) yeniden render eder.
 */
export function useTasteProfile() {
  const [, force] = useState(0);
  useEffect(() => {
    loadProfile();
    return subscribeProfile(() => force((n) => n + 1));
  }, []);
  return {
    profile: getProfile(),
    topGenres,
    normalizedGenres,
    isCold: isCold(),
  };
}
