async function test() {
  let attempts = 0;
  while (attempts < 10) {
    try {
      const res = await fetch('http://localhost:3000/api/games?section=new');
      if (res.ok) {
        const data = await res.json();
        console.log('API responded successfully:');
        console.log(JSON.stringify(data.results.slice(0, 5), null, 2));
        return;
      }
    } catch (e) {
      // wait 1 second
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
  }
  console.log('Failed to fetch after 10 attempts');
}

test().catch(console.error);
