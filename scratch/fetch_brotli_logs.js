const https = require('https');
const zlib = require('zlib');

const url = "https://storage.googleapis.com/eas-workflows-production/logs/bb9d1812-5eeb-45ba-bd98-f07998f7fa7a/f794e115-912f-4333-99a4-148f50d34338/2026-07-29T21%3A59%3A35Z-5f945045-0b58-4dca-8e9b-4d1c4caf8f5e.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260729%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260729T220931Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=09c4171cec5b4e70eb4392563fc174ec7c626ec0c9de4818d751b18163b8ea80976b87c6715f3ba353081aade7a160598f6599ab062c52143c18315c81f483382ec6ea8ad681f2b6ac7bde80f6b38c9219db6f0593ad3cf371c5329d99fb644f78949b915c75571646f247a23fbe5de370269ee4be36f0154cdd8270bfef5c1df090a4279d6dbe62fa0d4a26ca86fcb63b9ee8bc6b0e554bc81d9fb78b0ec7f14b3902caf5f069fcba4726495afa97a30462d0db3ba962b712837ed5fb98e53391d493e34fe514cea06137d7fc27e03949caac0b6ddc0aef8dfff9c1c4038a0999877071aa262d71791e20f59a06b12871838c77d062d164aaf7418c9dd9a002";

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log(`Downloaded ${buffer.length} bytes.`);
    
    try {
      // Decompress Brotli
      const decompressed = zlib.brotliDecompressSync(buffer);
      console.log(`Decompressed to ${decompressed.length} bytes.`);
      
      const logText = decompressed.toString('utf8');
      const lines = logText.split('\n');
      console.log(`Total lines in log: ${lines.length}`);
      
      console.log("\n--- LAST 100 LINES OF DECOMPRESSED LOGS ---");
      const lastLines = lines.slice(-100);
      lastLines.forEach((line) => console.log(line));
    } catch (err) {
      console.error("Decompress failed, printing raw sample:", err.message);
      console.log(buffer.toString('utf8', 0, 500));
    }
  });
}).on('error', (err) => {
  console.error("Fetch failed:", err.message);
});
