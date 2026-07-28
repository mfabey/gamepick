from PIL import Image

def main():
    img = Image.open(r"C:\Users\User\.gemini\antigravity\brain\576f5578-3e3c-41d8-aa7c-da350b13079a\story_promo_glow_1785243191815.jpg")
    
    # Let's inspect rows to find the screen region.
    # The phone is centered, and it starts around y=400 or y=500.
    # Let's check brightness transitions on y=600.
    img_gray = img.convert("L")
    row = [img_gray.getpixel((x, 600)) for x in range(img.width)]
    
    left = None
    right = None
    # Background is dark (glow is at the top, so at y=600 it should be very dark, < 25)
    # The bezel is also dark, but the screen contents are brighter.
    for x in range(50, img.width - 50):
        if row[x] > 30 and left is None:
            left = x
        if row[x] > 30:
            right = x
            
    print(f"y=600 screen bounds: left={left}, right={right}, width={right - left}")
    
    # Center of screen is roughly (left + right) // 2
    cx = (left + right) // 2 if left else img.width // 2
    col = [img_gray.getpixel((cx, y)) for y in range(img.height)]
    
    top = None
    bottom = None
    for y in range(250, img.height - 100):
        if col[y] > 25 and top is None:
            top = y
        if col[y] > 25:
            bottom = y
            
    print(f"x={cx} screen bounds: top={top}, bottom={bottom}, height={bottom - top}")

if __name__ == "__main__":
    main()
