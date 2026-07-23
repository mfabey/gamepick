// Upstash Redis REST istemcisi — basit komut sarmalayıcı
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function hasRedis() {
  return !!(REDIS_URL && REDIS_TOKEN);
}

// Tek komut çalıştır: redisCmd(['SET', key, value]) → result
export async function redisCmd(cmd) {
  if (!hasRedis()) return null;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch (err) {
    console.warn('Redis command error:', err.message);
    return null;
  }
}

export async function redisGetJSON(key) {
  const r = await redisCmd(['GET', key]);
  if (!r) return null;
  try { return JSON.parse(r); } catch { return null; }
}

export async function redisSetJSON(key, value) {
  return redisCmd(['SET', key, JSON.stringify(value)]);
}
