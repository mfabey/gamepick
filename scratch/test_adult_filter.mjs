import { isAdultContent, isAdultTitleOrSlug } from '../app/lib/adult-filter.js';

const testCases = [
  // Should be blocked
  { name: "Goblins Stole My Panties", expected: true },
  { name: "Succubus Cafe", expected: true },
  { name: "My Cute Waifu", expected: true },
  { name: "Harem Hotel", expected: true },
  { name: "Milf Simulator", expected: true },
  { name: "Babe Raiders", expected: true },
  { name: "Oppai Quest", expected: true },
  { name: "Sex with Stalin", expected: true },
  { name: "Nude Patch", expected: true },
  { name: "Rape Day", expected: true },

  // Should NOT be blocked
  { name: "Las Vegas Strip", expected: false },
  { name: "The Sexy Brutale", expected: false },
  { name: "Essex County", expected: false },
  { name: "Sussex Expedition", expected: false },
  { name: "Assassins Creed", expected: false }, 
  { name: "Butcher's Creek", expected: false }, 
  { name: "Noodle Stand", expected: false }, 
  { name: "Grape Escape", expected: false }, 
];

console.log("Running Adult Filter Tests...\n");
let failed = 0;

for (const tc of testCases) {
  const result = isAdultTitleOrSlug(tc.name, tc.name);
  if (result !== tc.expected) {
    console.error(`❌ FAIL: "${tc.name}" -> expected: ${tc.expected}, got: ${result}`);
    failed++;
  } else {
    console.log(`✅ PASS: "${tc.name}" -> ${result ? 'BLOCKED' : 'ALLOWED'}`);
  }
}

if (failed > 0) {
  console.error(`\n❌ Test failed: ${failed} errors.`);
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed successfully!");
}
