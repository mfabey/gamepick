async function test() {
  const appids = [4001890, 3065940];
  const fileNames = [
    'header.jpg',
    'capsule_616x353.jpg',
    'capsule_231x87.jpg',
    'library_600x900.jpg'
  ];
  
  for (const appid of appids) {
    console.log(`Testing appid: ${appid}`);
    for (const file of fileNames) {
      const url = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/${file}`;
      try {
        const res = await fetch(url);
        console.log(`  ${file}: ${res.status}`);
      } catch (err) {
        console.log(`  ${file} Error: ${err.message}`);
      }
    }
  }
}

test();
