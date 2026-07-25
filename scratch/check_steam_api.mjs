import fetch from 'node-fetch'; // wait, Next.js has fetch natively, but in Node.js 18+ fetch is native too! So we can use global fetch.

async function test() {
  const appid = 4877400; // LOVE 2077 appid
  const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=en`);
  const data = await res.json();
  console.log(JSON.stringify(data[appid], null, 2));
}

test();
