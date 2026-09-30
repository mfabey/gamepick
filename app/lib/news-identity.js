import { createHash } from 'node:crypto';

// Article identity must survive feed reordering; never use a list index.
export function newsId(url) {
  return `news_${createHash('sha256').update(String(url)).digest('hex').slice(0, 24)}`;
}
