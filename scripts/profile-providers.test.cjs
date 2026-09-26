const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('next/dist/compiled/babel/core');

// Evaluate the actual handlers with isolated provider/session doubles. No network.
function handler(file, fetch, session = {}) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, presets: ['next/babel'], envName: 'test' }).code;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, URLSearchParams, AbortSignal, Buffer,
    process: { env: { STEAM_API_KEY: 'local-test-key' } },
    console: { warn() {}, error() {} }, fetch,
    require: id => {
      if (id.startsWith('@babel/runtime/')) return require('next/dist/compiled/' + id);
      if (id === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (id === 'next/headers') return { cookies: async () => ({ get: name => name === 'gp_xbox_session' ? { value: 'test-session' } : undefined }) };
      if (id.endsWith('session-cookie')) return { readValue: async () => session };
      if (id.endsWith('steam-owner')) return { resolveOwnedSteamId: async () => ({ ok: true, steamId: '12345678901234567' }) };
      if (id.endsWith('api-error')) return { sunucuHatasi: () => ({ status: 500, body: { error: 'unavailable' } }) };
      if (id.endsWith('redis')) return { redisGetJSON: async () => null };
      if (id.endsWith('mobile-auth')) return { verifyMobileToken: async () => null };
      throw new Error('Unexpected import: ' + id);
    },
  });
  return exports.GET;
}
const request = { url: 'http://local/api/oyun?steamId=12345678901234567', headers: { get: () => null } };
test('Steam private response stays unavailable, explicit empty response is zero', async () => {
  const privateGET = handler('app/api/oyun/route.js', async () => ({ ok: true, json: async () => ({ response: {} }) }));
  assert.equal((await privateGET(request)).body.unavailable, true);
  const emptyGET = handler('app/api/oyun/route.js', async () => ({ ok: true, json: async () => ({ response: { game_count: 0 } }) }));
  const empty = await emptyGET(request);
  assert.equal(empty.body.dataAvailable, true);
  assert.equal(empty.body.totalHours, 0);
});
test('Steam reports provider minutes as hours, including the recent period', async () => {
  const GET = handler('app/api/oyun/route.js', async () => ({ ok: true, json: async () => ({ response: { games: [{ appid: 1, name: 'Test', playtime_forever: 120, playtime_2weeks: 30 }] } }) }));
  const result = await GET(request);
  assert.equal(result.body.games[0].hours, 2);
  assert.equal(result.body.games[0].hoursRecent, 0.5);
});
test('Xbox demo library carries an explicit marker', async () => {
  const GET = handler('app/api/xbox-library/route.js', () => { throw new Error('Unexpected network'); }, { isMock: true, gamertag: 'Test' });
  assert.equal((await GET(request)).body.isMock, true);
});
test('Xbox title history errors are not converted to an empty successful library', async () => {
  let calls = 0;
  const GET = handler('app/api/xbox-library/route.js', async () => {
    calls++;
    if (calls === 1) return { json: async () => ({ access_token: 'test' }) };
    if (calls === 2) return { json: async () => ({ Token: 'test' }) };
    if (calls === 3) return { json: async () => ({ Token: 'test', DisplayClaims: { xui: [{ uhs: 'test' }] } }) };
    return { ok: false, status: 403 };
  }, { refreshToken: 'test', xuid: 'test' });
  assert.equal((await GET(request)).status, 500);
  assert.equal(calls, 4);
});
