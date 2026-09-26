import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryStatus, summarizeProfile } from '../app/lib/profile-stats.mjs';

const source = (platform, games, extra = {}) => ({ platform, status: 'ready', data: { games }, ...extra });
const steamGame = (appid, hours, hoursRecent) => ({ appid, name: `Game ${appid}`, hours, hoursRecent });

test('missing and failed sources are not reported as zero', () => {
  for (const sources of [[], [source('steam', [], { status: 'error' })], [source('steam', [], { data: { games: [], unavailable: true } })]]) {
    const stats = summarizeProfile(sources);
    assert.equal(stats.steamCount, null);
    assert.equal(stats.totalHours, null);
    assert.equal(stats.recentHours, null);
  }
  assert.equal(summarizeProfile([source('steam', [])]).steamCount, 0);
  assert.equal(summarizeProfile([source('steam', [])]).totalHours, 0);
});

test('multiple Steam accounts count each app once and add actual playtime', () => {
  const stats = summarizeProfile([
    source('steam', [steamGame(1, 10, 2), steamGame(2, 0, 0)]),
    source('steam', [steamGame(1, 5.5, 1.5), steamGame(3, 2, 2)]),
  ]);
  assert.equal(stats.steamCount, 3);
  assert.equal(stats.totalHours, 17.5);
  assert.equal(stats.recentHours, 5.5);
  assert.deepEqual(stats.recentGames.map(g => g.appid), [1, 3]);
  assert.equal(stats.recentGames[0].hoursRecent, 3.5);
});

test('demo Xbox data is excluded even if a caller marks the source ready', () => {
  const games = [{ titleId: '1', name: 'Demo', currentAchievements: 75, totalAchievements: 100 }];
  for (const demo of [source('xbox', games, { status: 'demo' }), source('xbox', games, { data: { games, isMock: true } })]) {
    const stats = summarizeProfile([demo]);
    assert.equal(stats.xboxCount, null);
    assert.equal(stats.achievementTotal, 0);
  }
});

test('Xbox history stays separate from Steam ownership and uses actual achievements', () => {
  const stats = summarizeProfile([
    source('steam', [steamGame(1, 20, 0)]),
    source('xbox', [{ titleId: 'x', name: 'Game 1', currentAchievements: 3, totalAchievements: 10 }, { titleId: 'y', name: 'Unknown', totalAchievements: 100, currentAchievements: 0, achievementDataAvailable: false }]),
  ]);
  assert.equal(stats.steamCount, 1);
  assert.equal(stats.xboxCount, 2);
  assert.equal(stats.achievementCurrent, 3);
  assert.equal(stats.achievementTotal, 10);
  assert.equal(stats.achievementGames, 1);
});

test('invalid numbers and missing playtime never produce fabricated values', () => {
  const stats = summarizeProfile([source('steam', [steamGame(1, NaN, undefined), steamGame(2, -4, Infinity)])]);
  assert.equal(stats.totalHours, null);
  assert.equal(stats.recentHours, null);
  assert.equal(stats.steamPartial, true);
  assert.deepEqual(stats.recentGames, []);
});

test('a failed second account preserves available totals and marks them partial', () => {
  const stats = summarizeProfile([source('steam', [steamGame(1, 9, 2)]), source('steam', [], { status: 'error' })]);
  assert.equal(stats.totalHours, 9);
  assert.equal(stats.steamPartial, true);
});

test('provider status distinguishes empty, private, demo and truncated responses', () => {
  assert.equal(libraryStatus({ games: [] }), 'ready');
  assert.equal(libraryStatus({ games: [], unavailable: true }), 'unavailable');
  assert.equal(libraryStatus({ games: [], error: 'expired' }), 'error');
  assert.equal(libraryStatus({ games: [], isMock: true }), 'demo');
  assert.equal(libraryStatus({ games: [], partial: true }), 'partial');
  assert.equal(libraryStatus({}), 'error');
});
