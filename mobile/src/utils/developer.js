// ─────────────────────────────────────────────────────────────────────────────
// Geliştirici & Yetkili Hesap Tanımları
//
// Yalnızca doğrulanmış Gamerisen geliştirici hesapları kalkan rozetine ve
// özel yetkilere sahip olur. Bu liste değiştirilemez, sunucu tarafındaki
// Redis benzersizlik doğrulayıcısı ile korunur.
// ─────────────────────────────────────────────────────────────────────────────

export const DEVELOPER_USERNAMES = new Set(['batuta', 'test']);
export const DEVELOPER_UIDS = new Set([
  'M05J6kGPeqPAkPG55Blg7dJlVsY2',
  '5FimwbEHFQZ75FgL2PkgIY9OQV92',
]);
export const DEVELOPER_EMAILS = new Set([
  'xxxbatuhan@gmail.com',
  'gamerisen@hotmail.com',
  '240404021@ogr.kent.edu.tr',
]);

/**
 * Bir kullanıcı nesnesinin veya kullanıcı adının geliştirici olup olmadığını doğrular.
 * @param {object|string|null|undefined} userOrUsername
 * @returns {boolean}
 */
export function isDeveloperUser(userOrUsername) {
  if (!userOrUsername) return false;

  if (typeof userOrUsername === 'object') {
    if (userOrUsername.isDeveloper === true) return true;
    if (userOrUsername.uid && DEVELOPER_UIDS.has(userOrUsername.uid)) return true;
    if (userOrUsername.email && DEVELOPER_EMAILS.has(userOrUsername.email.toLowerCase().trim())) return true;
    const name = String(userOrUsername.username || '').replace(/^@/, '').toLowerCase().trim();
    return DEVELOPER_USERNAMES.has(name);
  }

  const handle = String(userOrUsername).replace(/^@/, '').toLowerCase().trim();
  return DEVELOPER_USERNAMES.has(handle) || DEVELOPER_UIDS.has(handle) || DEVELOPER_EMAILS.has(handle);
}
