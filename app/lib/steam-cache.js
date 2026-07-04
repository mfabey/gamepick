// In-memory cache for Steam app details to prevent rate limits and speed up responses
if (!global.steamDetailsCache) {
  global.steamDetailsCache = new Map();
}

const cache = global.steamDetailsCache;

export async function getSteamDetailsCached(appid) {
  const cacheKey = String(appid);
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Promise-coalescing: prevent multiple parallel requests for the same appid
  if (!global.steamPromises) {
    global.steamPromises = new Map();
  }
  
  if (global.steamPromises.has(cacheKey)) {
    return global.steamPromises.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      // Fetch without l=tr first to ensure English date format is returned and correctly parsed
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr`, {
        next: { revalidate: 3600 } // 1-hour cache
      });
      if (!res.ok) return null;
      const data = await res.json();
      const entry = data[appid];
      if (entry && entry.success && entry.data) {
        return entry.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching Steam details for ${appid}:`, err);
      return null;
    } finally {
      global.steamPromises.delete(cacheKey);
    }
  })();

  global.steamPromises.set(cacheKey, fetchPromise);
  const data = await fetchPromise;

  if (data) {
    cache.set(cacheKey, data);
  }
  return data;
}
