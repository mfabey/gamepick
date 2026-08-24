async function test() {
  const urls = [
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4001890/header.jpg',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3065940/header.jpg'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`${url} - Status: ${res.status}`);
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }
}

test();
