import fetch from 'node-fetch';

async function main() {
  try {
    const url = "https://video.akamai.steamstatic.com/store_trailers/257022021/movie_max.mp4";
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`Dying Light first movie URL: ${url} -> Status: ${res.status}`);
  } catch (err) {
    console.error(err);
  }
}

main();
