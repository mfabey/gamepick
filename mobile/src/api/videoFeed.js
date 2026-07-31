import { API_BASE } from './client';

/** Dikey video akışı — Steam HLS fragmanları. */
export function fetchVideoFeed(page = 1, lang = 'tr') {
  return fetch(`${API_BASE}/api/video-feed?page=${page}&lang=${lang}`)
    .then((r) => r.json());
}
