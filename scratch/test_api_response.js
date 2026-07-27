import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/rawg-game?slug=dying-light');
    if (res.status !== 200) {
      console.log(`API returned status: ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log("Game detail object keys:", Object.keys(data.game));
    console.log("trailer:", data.game.trailer);
    console.log("trailerMp4:", data.game.trailerMp4);
  } catch (err) {
    console.error("Local API fetch failed (is the local dev server running?):", err.message);
    
    // Let's try to query RAWG directly to see if we get the appid or check how the server behaves
    console.log("Let's try to query the backend route directly using mock data or fetch directly from Steam CDN...");
  }
}

main();
