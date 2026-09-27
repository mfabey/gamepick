// Gönderinin istemciye giden biçimi: kayıt + yazar profili. Tartışma akışı
// (api/social/posts) ve oyun topluluğu (api/social/community) AYNI biçimi
// döndürmeli — mobil ikisini de aynı PostCard'la çiziyor.
export function shapePost(post, profiles) {
  const p = profiles[post.uid];
  const uname = String(p?.username || '').replace(/^@/, '').toLowerCase().trim();
  const isDev = ['batuta', 'test'].includes(uname);
  return {
    ...post,
    author: {
      uid: post.uid,
      username: p?.username || null,
      displayName: p?.displayName || p?.username || null,
      avatar: p?.avatar || null,
      isDeveloper: isDev,
    },
  };
}
