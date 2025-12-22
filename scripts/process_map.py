import os
from PIL import Image

# Disable DecompressionBombError for large images
Image.MAX_IMAGE_PIXELS = None 

SRC = "../assets/images/Untitled-1.jpg"
TILE_SIZE = 2048

def main():
    if not os.path.exists("../assets/tiles"):
        os.makedirs("../assets/tiles")

    print("Loading image...")
    try:
        img = Image.open(SRC)
        w, h = img.size
        print(f"Image size: {w}x{h}")

        # Small map
        if not os.path.exists("../assets/images/map-small.jpg"):
            print("Generating map-small.jpg...")
            small = img.copy()
            small.thumbnail((1200, 1200))
            small.save("../assets/images/map-small.jpg", quality=80)
            print("map-small.jpg saved")
        else:
            print("map-small.jpg already exists")

        # Tiles
        print("Generating tiles...")
        cols = (w + TILE_SIZE - 1) // TILE_SIZE
        rows = (h + TILE_SIZE - 1) // TILE_SIZE
        
        for r in range(rows):
            for c in range(cols):
                tile_path = f"../assets/tiles/tile_{c}_{r}.png"
                if os.path.exists(tile_path):
                    continue
                
                x = c * TILE_SIZE
                y = r * TILE_SIZE
                # Crop region
                box = (x, y, min(x + TILE_SIZE, w), min(y + TILE_SIZE, h))
                tile = img.crop(box)
                tile.save(tile_path, format="PNG")
                print(f"Saved {tile_path}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
