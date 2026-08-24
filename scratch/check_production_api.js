async function test() {
  const url = 'https://www.gamerisen.com/api/games?section=sale&num=12';
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('Results from production API:');
    json.results.forEach((g, idx) => {
      console.log(`${idx + 1}. [${g.id}] ${g.name} - Image: ${g.image} - Logo: ${g.logo}`);
    });
  } catch (err) {
    console.error(err);
  }
}

test();
