import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gr_accessibility_playback_v2';
const DEFAULTS = { reduceMotion: false, autoplay: false };
let snapshot = DEFAULTS;
let loaded;
let writes = Promise.resolve();
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => snapshot;
function load() {
  if (!loaded) loaded = AsyncStorage.getItem(KEY).then(raw => {
    const saved = JSON.parse(raw || '{}');
    snapshot = { reduceMotion: saved.reduceMotion === true, autoplay: saved.autoplay === true };
    emit();
  }).catch(() => {});
  return loaded;
}
export async function setAppPreference(key, value) {
  if (!(key in DEFAULTS) || typeof value !== 'boolean') return;
  await load();
  snapshot = { ...snapshot, [key]: value };
  emit();
  const serialized = JSON.stringify(snapshot);
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(KEY, serialized));
  await writes;
}
export function useAppPreferences() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { load(); }, []);
  return value;
}
