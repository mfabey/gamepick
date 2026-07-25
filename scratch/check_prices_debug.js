const { getUsdToTry } = require('../app/lib/exchange');

async function check() {
  const rate = await getUsdToTry();
  console.log('Exchange rate:', rate);
  const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr');
  const data = await res.json();
  const newReleases = data.new_releases?.items || [];
  
  const results = newReleases.map(item => {
    const isFree = item.final_price === 0 && !item.original_price;
    const priceUSD = item.final_price ? item.final_price / 100 : null;
    const originalUSD = item.original_price ? item.original_price / 100 : null;
    const price = priceUSD ? Math.round(priceUSD * rate) : null;
    const original = originalUSD ? Math.round(originalUSD * rate) : null;
    return {
      name: item.name,
      final_price: item.final_price,
      priceUSD,
      price,
      original
    };
  });
  console.log(JSON.stringify(results.slice(0, 5), null, 2));
}

check().catch(console.error);
