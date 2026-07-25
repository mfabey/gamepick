const { GET } = require('../app/api/games/route');

async function test() {
  const req = {
    url: 'http://localhost:3000/api/games?section=new&num=16'
  };
  const res = await GET(req);
  const data = await res.json();
  console.log(JSON.stringify(data.results.slice(0, 5), null, 2));
}

test().catch(console.error);
