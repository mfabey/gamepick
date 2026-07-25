async function test() {
  const steamCookie = 'gp_steam_session=' + JSON.stringify({ steamId: '76561198000000000', name: 'batokan' });
  const cookies = `${steamCookie}`;

  const url = 'http://localhost:3000/api/auth/user-me';

  try {
    console.log(`Fetching ${url} with Steam cookie only (triggering auto-login)...`);
    const res = await fetch(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'node'
      }
    });
    console.log(`Status:`, res.status);
    const text = await res.text();
    console.log(`Response:`, text.slice(0, 500));
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

test();
