async function test() {
  const userCookie = 'gp_user_session=' + JSON.stringify({ uid: 'mock_user', name: 'Batu', email: 'batu@mail.com' });
  const steamCookie = 'gp_steam_session=' + JSON.stringify({ steamId: '76561198000000000', name: 'batokan' });
  const xboxCookie = 'gp_xbox_session=' + JSON.stringify({ isMock: true, gamertag: 'batokan4098', gamepassType: 'pc' });
  const cookies = `${userCookie}; ${steamCookie}; ${xboxCookie}`;

  const urls = [
    'http://localhost:3000/api/auth/user-me',
    'http://localhost:3000/api/oyun',
    'http://localhost:3000/api/xbox-library'
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching ${url} with cookies...`);
      const res = await fetch(url, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'node'
        }
      });
      console.log(`Status for ${url}:`, res.status);
      const text = await res.text();
      console.log(`Response for ${url}:`, text.slice(0, 300));
    } catch (err) {
      console.error(`Error for ${url}:`, err.message);
    }
  }
}

test();
