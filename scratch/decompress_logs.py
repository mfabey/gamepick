import urllib.request
import ssl
import gzip
import io
import sys

def main():
    url = "https://storage.googleapis.com/eas-workflows-production/logs/bb9d1812-5eeb-45ba-bd98-f07998f7fa7a/f794e115-912f-4333-99a4-148f50d34338/2026-07-29T21%3A59%3A35Z-5f945045-0b58-4dca-8e9b-4d1c4caf8f5e.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260729%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260729T220931Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=09c4171cec5b4e70eb4392563fc174ec7c626ec0c9de4818d751b18163b8ea80976b87c6715f3ba353081aade7a160598f6599ab062c52143c18315c81f483382ec6ea8ad681f2b6ac7bde80f6b38c9219db6f0593ad3cf371c5329d99fb644f78949b915c75571646f247a23fbe5de370269ee4be36f0154cdd8270bfef5c1df090a4279d6dbe62fa0d4a26ca86fcb63b9ee8bc6b0e554bc81d9fb78b0ec7f14b3902caf5f069fcba4726495afa97a30462d0db3ba962b712837ed5fb98e53391d493e34fe514cea06137d7fc27e03949caac0b6ddc0aef8dfff9c1c4038a0999877071aa262d71791e20f59a06b12871838c77d062d164aaf7418c9dd9a002"
    
    context = ssl._create_unverified_context()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=context) as response:
            raw_data = response.read()
            print(f"Downloaded {len(raw_data)} bytes.")
            
            # Check if it is gzipped
            if raw_data.startswith(b'\x1f\x8b'):
                print("Gzip compression detected. Decompressing...")
                try:
                    raw_data = gzip.decompress(raw_data)
                    print(f"Decompressed to {len(raw_data)} bytes.")
                except Exception as de_err:
                    print(f"Decompression error: {de_err}")
            else:
                print("Raw text detected (no Gzip header).")
                
            content = raw_data.decode('utf-8', errors='ignore')
            lines = content.splitlines()
            print(f"Total lines: {len(lines)}")
            
            # Print the last 150 lines to find the error
            print("--- LAST 150 LINES ---")
            for line in lines[-150:]:
                safe_line = line.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding)
                print(safe_line)
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
