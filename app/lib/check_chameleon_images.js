async function check(url) {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    console.log(`${url} => ${buf.byteLength} bytes`);
  } catch (e) {
    console.log(`${url} => ERROR: ${e.message}`);
  }
}
async function run() {
  console.log('--- Meccha Chameleon (4704690) ---');
  await check('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/library_600x900.jpg');
  await check('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/header.jpg');
  await check('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/capsule_231x87.jpg');
  await check('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/capsule_sm_120.jpg');
}
run();
