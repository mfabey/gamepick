import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('../mobile/node_modules/typescript');
function load(path, imports) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => { if (!(name in imports)) throw Error(`Unexpected import ${name}`); return imports[name]; }, URL, console, AbortSignal, fetch: () => { throw Error('Unexpected network'); } };
  vm.runInNewContext(source, context);
  return context.exports;
}
const NextResponse = { json: (body, options = {}) => ({ body, status: options.status || 200 }) };
let cached = null, detail = null, lookups = 0;
const video = load('../app/api/video-feed/route.js', {
  'next/server': { NextResponse },
  '../../lib/steam-cache.js': { getSteamDetailsCached: async () => { lookups++; if (detail instanceof Error) throw detail; return detail; } },
  '../../lib/adult-filter.js': { isAdultTitleOrSlug: () => false, isSteamDataAdult: d => !!d.adult },
  '../../lib/redis': { redisGetJSON: async () => cached, redisCmd: async () => {}, redisPipeline: async () => [], parseJSON: JSON.parse },
});
const request = query => ({ url: `https://gamerisen.test/api/video-feed?${query}` });
for (const id of ['bad', 'rawg_0', 'rawg_-1', 'rawg_123456789012', 'rawg_1/../../secret']) {
  assert.equal((await video.GET(request(`id=${encodeURIComponent(id)}`))).status, 400);
}
assert.equal(lookups, 0, 'invalid ids must not reach Steam');
assert.equal((await video.GET(request('id=rawg_123'))).status, 404);
detail = { name: 'Game', movies: [{ hls_h264: 'https://video.test/game.m3u8', thumbnail: 'image' }], genres: [] };
let result = await video.GET(request('id=rawg_123'));
assert.equal(result.body.item.id, 'rawg_123');
assert.equal(result.body.item.appid, '123');
assert.equal(result.body.item.hls, detail.movies[0].hls_h264);
detail.adult = true;
assert.equal((await video.GET(request('id=rawg_123'))).status, 404);
detail = new Error('upstream');
assert.equal((await video.GET(request('id=rawg_123'))).status, 503);
cached = { id: 'rawg_123', hls: 'cached' };
assert.equal((await video.GET(request('id=rawg_123'))).body.item.hls, 'cached');
const { newsId } = load('../app/lib/news-identity.js', { 'node:crypto': require('node:crypto') });
assert.equal(newsId('https://news.test/a'), newsId('https://news.test/a'));
assert.notEqual(newsId('https://news.test/a'), newsId('https://news.test/b'));
assert.match(newsId('https://news.test/a'), /^news_[a-f0-9]{24}$/);
const article = { id: newsId('https://news.test/a'), title: 'Article', url: 'https://news.test/a' };
let archived = article;
const news = load('../app/api/news/route.js', {
  'next/server': { NextResponse }, '../../lib/news-list': { getNewsList: async () => [article] },
  '../../lib/redis': { redisGetJSON: async () => archived },
});
assert.equal((await news.GET(request('id=news_0'))).status, 400);
assert.equal((await news.GET(request(`id=${article.id}`))).body.item.title, 'Article');
archived = null;
assert.equal((await news.GET(request(`id=${article.id}`))).body.item.title, 'Article');
assert.equal((await news.GET(request(`id=${newsId('missing')}`))).status, 404);
assert.equal((await news.GET(request('lang=tr'))).body.count, 1);
console.log('✓ Video/news deep links: invalid ids, lookup, cache, adult filtering, upstream failure, stable identity, archive fallback');
