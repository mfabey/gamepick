async function test() {
  const imageUrls = [
    'https://www.merlininkazani.com/social-image/article/262459.jpg',
    'https://www.merlininkazani.com/social-image/article/262458.jpg',
    'https://www.merlininkazani.com/social-image/article/262457.jpg'
  ];
  
  for (const url of imageUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      console.log(`Image: ${url} - Status: ${res.status}`);
      console.log(`  Content-Type: ${res.headers.get('content-type')}`);
    } catch (err) {
      console.error(`Error for ${url}:`, err.message);
    }
  }
}

test();
