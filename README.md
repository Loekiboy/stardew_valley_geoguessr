# Stardew Valley GeoGuessr

A web-based GeoGuessr-style game set in the world of Stardew Valley. Test your knowledge of the map by guessing the exact location of random screenshots!

[**Play the Game**](https://loek.oerlemans.tv/stardew_valley_geoguessr)


## 🎮 Features

*   **Interactive Map**: Smooth zooming and panning using HTML5 Canvas.
*   **High-Res Tiling**: Dynamically loads high-resolution map tiles as you zoom in, ensuring crisp details without long load times.
*   **Random Locations**: Spawns you in a random location within the game world.
*   **Scoring System**: Points are awarded based on how close your guess is to the actual location.
*   **Round History**: Tracks your guesses and scores over multiple rounds.
*   **Mobile Friendly**: Touch controls for zooming and panning on mobile devices.
*   **Map Styles**: Toggle between the original map and an AI-enhanced version.

## 🛠️ Technical Overview

This project is built with **Vanilla JavaScript**, **HTML5**, and **CSS**. No heavy frontend frameworks were used, keeping it lightweight and fast.

### Map System
The map system is the core of the application. It uses a custom tiling implementation:
1.  **Base Layer**: A low-resolution version of the full map is loaded initially for performance and so you can't exactly line the two images up.
2.  **Tiling**: The high-resolution map (too large to load at once) is split into 2048x2048 pixel tiles.

### Coordinate System
The game translates screen coordinates (mouse/touch events) into map coordinates using the current transformation matrix (scale and translation), allowing for precise marker placement regardless of zoom level.

## 🚀 Development Setup

### Prerequisites
*   A web server (e.g., Live Server for VS Code, Python `http.server`) to serve the files.
*   Python 3 (only if you need to process a new map image).
*   `Pillow` library for Python (`pip install Pillow`).

### Running Locally
1.  Clone the repository.
2.  Open `index.html` via a local web server.
    *   *Note: Opening the file directly in the browser (`file://`) causes CORS issues with loading map tiles.*

### Map Processing
If you want to update the map image:
1.  Place your high-res map image in `assets/images/`.
2.  Update the `SRC` path in `scripts/process_map.py`.
3.  Run the script:
    ```bash
    cd scripts
    python process_map.py
    ```
    This will generate the `map-small.jpg` thumbnail and the tiled images in `assets/tiles/`.

## 🎨 Credits

*   **Game Art**: All Stardew Valley assets are property of [ConcernedApe](https://twitter.com/ConcernedApe).
*   **Map Source**: [Reddit - Hi-res Full World Map](https://www.reddit.com/r/StardewValley/comments/c2op6w/hires_full_world_map/)
*   **Font**: [Reddit - Stardew Valley Font](https://www.reddit.com/r/StardewValley/comments/4dtgp7/by_popular_request_a_stardew_valley_font_for_your)

---
*Note: The full resolution source map is not included in this repository due to file size limits (>100MB).*
