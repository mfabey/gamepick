const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('next/dist/compiled/babel/core');

function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, presets: ['next/babel'], envName: 'test' }).code;
    vm.runInNewContext(code, {
      exports, URL, URLSearchParams, AbortSignal, AbortController, console, ...globals,
      require(id) {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        if (id.startsWith('@babel/runtime/')) return require('next/dist/compiled/' + id);
        if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + (path.extname(id) ? '' : '.js')));
        throw new Error('Unexpected dependency: ' + id);
      },
    });
    return exports;
  }
  return load;
}
const load = loader();
const { profileWeights, mergeTasteSnapshot, addTasteSignal, libraryWeights } = load('mobile/src/services/recommendProfile.js');
const { rankCandidates, genreSlugsFor } = load('mobile/src/services/recommend.js');
const games = [
  { id: 'rpg', name: 'Role Game', genres: ['RPG'], image: '/rpg.jpg', metacritic: 85 },
  { id: 'strategy', name: 'Strategy Game', genres: ['Strateji'], image: '/strategy.jpg', metacritic: 85 },
];
test('two users get different recommendations from the same catalogue', () => {
  assert.equal(rankCandidates(games, { genreWeights: profileWeights({ genres: { RPG: 5 } }) })[0].id, 'rpg');
  assert.equal(rankCandidates(games, { genreWeights: profileWeights({ genres: { Strategy: 5 } }) })[0].id, 'strategy');
  assert.equal(genreSlugsFor(['Rol Yapma'])[0], 'role-playing-games-rpg');
});
test('library snapshots have equal influence regardless of raw versus normalized storage', () => {
  const a = profileWeights({ genres: { RPG: 3 }, library: { genres: { Strategy: 120 } } });
  assert.equal(a.RPG, .5);
  assert.equal(a.Strategy, .5);
  assert.equal(profileWeights({ genres: { Strateji: 3 } }).Strategy, 1);
  assert.equal(libraryWeights([{ appid: 1, hours: 40 }], { 1: ['Strategy'] }).Strategy, 2);
});
test('sync snapshots are idempotent and transfer the newest library to both clients', () => {
  const incoming = { genres: { RPG: 8 }, events: 4, library: { genres: { Strategy: 12 }, sig: '1', updatedAt: 50 } };
  const a = mergeTasteSnapshot({}, incoming, 100);
  const b = mergeTasteSnapshot(a, a, 100);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(b.genres.RPG, 8);
  assert.equal(b.library.sig, '1');
  assert.equal(mergeTasteSnapshot(b, { library: { sig: 'old', updatedAt: 20 } }, 100).library.sig, '1');
  assert.equal(addTasteSignal(b, { type: 'wishlist', genres: ['RPG', 'RPG'] }).genres.RPG, 11);
  assert.equal(addTasteSignal(b, null), b);
  assert.equal(addTasteSignal(b, { type: 'constructor', genres: ['RPG'] }), b);
});
test('owned titles are deprioritized and duplicate provider records do not fill the shelf', () => {
  assert.equal(rankCandidates(games, { ownedNames: new Set(['rolegame']) })[0].id, 'strategy');
  assert.equal(rankCandidates([...games, { ...games[0], id: 'other-provider' }]).length, 2);
  assert.equal(rankCandidates(games, { dismissedIds: new Set(['id:rpg']) }).some(g => g.id === 'rpg'), false);
});
const responseMock = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
test('candidate pool uses daily catalogue pages, interleaves fresh games, and never queries trends', async () => {
  const calls = [];
  const { GET } = loader({ 'next/server': responseMock }, {
    fetch: async url => {
      calls.push(url);
      const source = new URL(url).searchParams.get('genres') || new URL(url).searchParams.get('section');
      return { ok: true, json: async () => ({ results: Array.from({ length: 25 }, (_, i) => ({ id: `${source}-${i}` })) }) };
    },
  })('app/api/for-you/route.js');
  const result = await GET({ url: 'https://local/api/for-you?genres=action,strategy,rpg,indie&num=20' });
  assert.equal(calls.length, 6);
  assert.ok(calls.every(url => !url.includes('trending')));
  assert.ok(calls.some(url => /page=[123]/.test(url)));
  assert.ok(result.body.results.slice(0, 6).some(g => g.id === 'new-0'));
  assert.equal(result.body.results.length, 80);
});
test('provider outage returns an empty pool instead of pretending stale trends are personal', async () => {
  const { GET } = loader({ 'next/server': responseMock }, { fetch: async () => { throw new Error('offline'); } })('app/api/for-you/route.js');
  const result = await GET({ url: 'https://local/api/for-you' });
  assert.equal(result.status, 503);
  assert.equal(result.body.results.length, 0);
});
test('web and mobile API authentication access the same taste and isolated account keys', async () => {
  const db = new Map();
  const writes = [];
  let mobileUid = 'A';
  let cookieUid = null;
  const api = loader({
    'next/server': responseMock,
    'next/headers': { cookies: () => ({ get: () => cookieUid ? { value: 'signed-cookie' } : null }) },
    '../../../lib/mobile-auth': { verifyMobileToken: async () => mobileUid ? { uid: mobileUid } : null },
    '../../../lib/session-cookie': { readValue: async () => ({ uid: cookieUid }) },
    '../../../lib/redis': {
      redisPipeline: async commands => commands.map(([, key]) => db.get(key)),
      parseJSON: value => value,
      redisSetJSON: async (key, value) => { writes.push(key); db.set(key, value); },
    },
    '../../../lib/social-store': { mergeProfile: async () => {} },
  })('app/api/user/data/route.js');
  const put = body => api.PUT({ json: async () => body });
  await put({ taste: { genres: { RPG: 8 }, events: 4, library: { genres: { RPG: 10 }, updatedAt: 100 } } });
  mobileUid = null; cookieUid = 'A';
  const web = (await api.GET({})).body;
  assert.equal(web.taste.genres.RPG, 8);
  await put({ tasteSignal: { type: 'pick', genres: ['Strategy'] } });
  assert.ok(writes.every(key => key === 'user_taste:A'), 'taste writes must not overwrite wishlist or collections');
  mobileUid = 'A'; cookieUid = null;
  assert.equal((await api.GET({})).body.taste.genres.Strategy, 4);
  mobileUid = 'B';
  assert.equal(Object.keys((await api.GET({})).body.taste.genres).length, 0);
  mobileUid = null;
  assert.equal((await api.GET({})).status, 401);
});
test('web cancels pending taste uploads on account change and isolates guest preferences', async () => {
  const storage = new Map();
  const calls = [];
  const service = loader({}, {
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: { dispatchEvent() {} }, CustomEvent: class {},
    fetch: async (url, options) => { calls.push(options); return { ok: false }; },
  })('app/lib/web-taste.js');
  service.bindTasteOwner('A');
  const pending = service.recordWebTaste('A', ['RPG'], 'pick');
  service.bindTasteOwner('B');
  await pending;
  assert.equal(calls.length, 0);
  assert.equal(Object.keys(service.readWebTaste('B').genres).length, 0);
  service.bindTasteOwner(null);
  await service.recordWebTaste(null, ['Strategy'], 'pick');
  assert.equal(service.readWebTaste(null).genres.Strategy, 4);
  assert.equal(calls.length, 0);
});
