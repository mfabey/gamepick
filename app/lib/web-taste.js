'use client';

import { addTasteSignal, mergeTasteSnapshot } from '../../mobile/src/services/recommendProfile';
import { canonicalGenre } from '../../mobile/src/services/recommend';

let owner;
let controller = new AbortController();
let queue = Promise.resolve();
const empty = () => ({ genres: {}, events: 0 });
const key = uid => `gamerisen_taste:${uid || 'guest'}`;

// Cancel pending work when authentication changes so one account cannot
// write preferences through the next account's session cookie.
export function bindTasteOwner(uid) {
  if (owner === uid) return;
  controller.abort();
  controller = new AbortController();
  owner = uid;
  queue = Promise.resolve();
}

export function readWebTaste(uid) {
  try { return JSON.parse(localStorage.getItem(key(uid))) || empty(); } catch { return empty(); }
}

function save(uid, profile) {
  try { localStorage.setItem(key(uid), JSON.stringify(profile)); } catch {}
  window.dispatchEvent(new CustomEvent('gamerisen:taste', { detail: { uid, profile } }));
  return profile;
}

export async function loadWebTaste(uid, signal) {
  const cached = readWebTaste(uid);
  if (!uid) return cached;
  try {
    const res = await fetch('/api/user/data', { cache: 'no-store', signal });
    if (!res.ok) return cached;
    const data = await res.json();
    if (signal?.aborted || owner !== uid || data.user?.uid !== uid) return empty();
    const merged = save(uid, mergeTasteSnapshot(data.taste || {}, readWebTaste(uid)));
    const remote = data.taste || {};
    const hasPending = Object.entries(merged.genres).some(([name, value]) => value > (remote.genres?.[name] || 0))
      || (merged.library?.updatedAt || 0) > (remote.library?.updatedAt || 0);
    if (hasPending) push(uid, { taste: merged }, merged);
    return merged;
  } catch { return cached; }
}

function push(uid, payload, local) {
  if (!uid || owner !== uid) return Promise.resolve(local);
  const signal = controller.signal;
  queue = queue.catch(() => {}).then(async () => {
    if (signal.aborted || owner !== uid) return local;
    try {
      const res = await fetch('/api/user/data', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal,
      });
      if (!res.ok) return local;
      const data = await res.json();
      if (!signal.aborted && owner === uid && data.taste) {
        return save(uid, mergeTasteSnapshot(data.taste, readWebTaste(uid)));
      }
    } catch { /* Cached preferences remain usable offline. */ }
    return local;
  });
  return queue;
}

export function recordWebTaste(uid, genres, type = 'view') {
  if (owner !== uid) return Promise.resolve();
  const names = (genres || []).map(canonicalGenre).filter(name => typeof name === 'string');
  if (!names.length) return Promise.resolve();
  const signal = { type, genres: names };
  const profile = save(uid, addTasteSignal(readWebTaste(uid), signal));
  return push(uid, { tasteSignal: signal }, profile);
}

export function saveWebLibraryTaste(uid, library) {
  if (owner !== uid) return Promise.resolve();
  const profile = save(uid, mergeTasteSnapshot(readWebTaste(uid), { library }));
  return push(uid, { taste: { library } }, profile);
}
