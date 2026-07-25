import { getSteamDetailsCached } from '../app/lib/steam-cache.js';
import { isSteamDataAdult } from '../app/lib/adult-filter.js';

async function test() {
  const appid = 4877400; // LOVE 2077 appid
  console.log(`Checking mature status for Steam AppID ${appid} ("LOVE 2077")...`);
  
  const steamData = await getSteamDetailsCached(appid);
  if (!steamData) {
    console.error("❌ Failed to fetch Steam details for appid:", appid);
    process.exit(1);
  }

  const isAdult = isSteamDataAdult(steamData);
  console.log(`Result: isAdult = ${isAdult}`);
  
  if (isAdult === true) {
    console.log("🎉 SUCCESS: LOVE 2077 is correctly detected as ADULT/MATURE and will be filtered!");
  } else {
    console.error("❌ FAILURE: LOVE 2077 was NOT detected as adult!");
    process.exit(1);
  }
}

test();
