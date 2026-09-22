import { useEffect, useRef, useState } from 'react';
import { useQuery } from './useQuery';
import { fetchVideoFeed } from '../api/videoFeed';

export function useVideoCatalog(lang) {
  const first = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const [tail, setTail] = useState({ lang, items: [], page: 1, hasMore: null, loading: false, error: false });
  const request = useRef(null);
  useEffect(() => { request.current = null; }, [lang]);
  const current = tail.lang === lang ? tail : { lang, items: [], page: 1, hasMore: null, loading: false, error: false };
  const items = [...new Map([...(first.data?.results || []), ...current.items].map(item => [item.id, item])).values()];
  const loadMore = async () => {
    if (request.current || current.loading) return;
    const token = { lang };
    request.current = token;
    setTail({ ...current, loading: true, error: false });
    try {
      const data = await fetchVideoFeed(current.page + 1, lang, 'catalog');
      if (request.current !== token) return;
      setTail({ lang, items: [...current.items, ...(data.results || [])], page: current.page + 1, hasMore: !!data.hasMore, loading: false, error: false });
    } catch {
      if (request.current === token) setTail({ ...current, loading: false, error: true });
    } finally { if (request.current === token) request.current = null; }
  };
  return { ...first, items, loadMore, loadingMore: current.loading, moreError: current.error, hasMore: current.hasMore ?? first.data?.hasMore };
}
