async function test() {
  const url = 'https://www.merlininkazani.com/social-image/article/262459.jpg';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.gamerisen.com/'
      }
    });
    console.log(`Fetch with referer: https://www.gamerisen.com/`);
    console.log(`  Status: ${res.status}`);
    console.log(`  Content-Length: ${res.headers.get('content-length')}`);
    
    const res2 = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://localhost:3000/'
      }
    });
    console.log(`Fetch with referer: http://localhost:3000/`);
    console.log(`  Status: ${res2.status}`);
  } catch (err) {
    console.error(err);
  }
}

test();
