const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
  }
} catch (err) {
  console.error('Failed to load .env.local', err);
}

const { redisCmd } = require('../app/lib/redis.js');

async function run() {
  const keys = await redisCmd(['KEYS', '*']);
  console.log('Redis Keys:', keys);
  if (keys && keys.length > 0) {
    for (const key of keys) {
      if (key.startsWith('user_connections:')) {
        const val = await redisCmd(['GET', key]);
        console.log(`Value for ${key}:`, val);
      }
    }
  }
}

run();
