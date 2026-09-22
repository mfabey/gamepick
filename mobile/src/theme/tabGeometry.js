// Both platform bars overlay the scene; lists reserve the full occupied area.
export function tabGeometry(platform, safeBottom, extra = 12) {
  const safe = Math.max(0, Number(safeBottom) || 0);
  const ios = platform === 'ios';
  const height = ios ? 62 : 64;
  const bottom = ios ? Math.max(safe - 13, 12) : 0;
  const occupied = height + (ios ? bottom : safe);
  return { height, bottom, occupied, contentInset: occupied + extra };
}
