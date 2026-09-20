// ─────────────────────────────────────────────────────────────────────────────
// Geliştirici & Yetkili Hesap Tanımları
//
// Yalnızca doğrulanmış Gamerisen geliştirici hesapları kalkan rozetine ve
// özel yetkilere sahip olur. Bu liste değiştirilemez, sunucu tarafındaki
// Redis benzersizlik doğrulayıcısı ile korunur.
// ─────────────────────────────────────────────────────────────────────────────

export const DEVELOPER_USERNAMES = new Set(['batuta', 'test']);

/**
 * Bir kullanıcı nesnesinin veya kullanıcı adının geliştirici olup olmadığını doğrular.
 * @param {object|string|null|undefined} userOrUsername
 * @returns {boolean}
 */
export function isDeveloperUser(userOrUsername) {
  if (!userOrUsername) return false;

  if (typeof userOrUsername === 'object') {
    if (userOrUsername.isDeveloper === true) return true;
    const name = String(userOrUsername.username || '').replace(/^@/, '').toLowerCase().trim();
    return DEVELOPER_USERNAMES.has(name);
  }

  const handle = String(userOrUsername).replace(/^@/, '').toLowerCase().trim();
  return DEVELOPER_USERNAMES.has(handle);
}
