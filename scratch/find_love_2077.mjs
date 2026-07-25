import fetch from 'node-fetch';

async function test() {
  // Let's do a search on Steam or check SteamDB-like API
  // We can fetch search results directly with cc=tr
  const url = "https://store.steampowered.com/api/storesearch/?term=LOVE+2077&l=tr&cc=tr";
  const res = await fetch(url);
  const data = await res.json();
  console.log('Storesearch results:', JSON.stringify(data, null, 2));
}

test();
