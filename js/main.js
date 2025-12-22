const MAP_SOURCES = {
  normal: "assets/images/map-small.jpg",
  ai: "assets/images/full_map_small_ai.png"
};
const SPAWN_MASK_SRC = "assets/images/stand.png";
const MASK_TARGET_WIDTH = 1200;
const GUESS_MAP_WIDTH = 800;    // Low-res for fast panning/zooming
const SPAWN_VIEW_RADIUS = 100;  // pixels around spawn point to show (3x more zoomed)
const SPAWN_PAN_LIMIT = 50;     // max pixels you can pan in spawn view
const TILE_SIZE = 2048;
const TILE_OVERLAY_SCALE_FACTOR = 1.2; // When to start drawing hi-res tiles over the low-res map

const LOADING_MESSAGES = [
  "Loading map... watering crops...",
  "Robin is measuring beams...",
  "Linus is sharing the best hiding spots...",
  "Pam's bus is warming up...",
  "Abigail is picking amethysts...",
  "Checking Pierre's prices (again)...",
  "Marnie is herding the animals...",
  "Demetrius is calibrating sensors...",
  "Sebastian is updating the map code...",
  "Evelyn baked cookies for the road...",
  "Maru tightened every bolt...",
  "Lewis is hanging another plaque...",
  "Krobus is hiding in the sewers...",
  "Willy is baiting the hooks...",
  "Clint is cracking geodes...",
  "Penny is reading a book...",
  "Haley is ignoring you...",
  "Alex is lifting weights...",
  "Sam is practicing guitar...",
  "Leah is sculpting...",
  "Elliott is writing poetry...",
  "Harvey is checking your pulse...",
  "Shane is... well, Shane is here...",
  "Emily is dancing...",
  "Gus is cooking the special...",
  "The Wizard is brewing potions...",
  "Junimos are collecting bundles...",
  "Grandpa is watching..."
];

// Settings (persisted in localStorage)
const settings = {
  mapStyle: localStorage.getItem('mapStyle') || 'normal'
};

const els = {
  spawnMap: document.getElementById("spawnMap"),
  spawnCanvas: document.getElementById("spawnCanvas"),
  guessMap: document.getElementById("guessMap"),
  guessCanvas: document.getElementById("guessCanvas"),
  markers: document.getElementById("markers"),
  newRoundBtn: document.getElementById("newRoundBtn"),
  checkBtn: document.getElementById("checkBtn"),
  resetViewBtn: document.getElementById("resetViewBtn"),
  roundLabel: document.getElementById("roundLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  distanceLabel: document.getElementById("distanceLabel"),
  roundScoreLabel: document.getElementById("roundScoreLabel"),
  avgScoreLabel: document.getElementById("avgScoreLabel"),
  history: document.getElementById("history"),
  // Settings
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  // Zoom buttons
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  // Mobile buttons
  mobileNewRoundBtn: document.getElementById("mobileNewRoundBtn"),
  mobileCheckBtn: document.getElementById("mobileCheckBtn"),
};

const state = {
  mapSize: { width: 0, height: 0 },
  // Guess map pan/zoom
  zoom: 1,
  minZoom: 0.02,
  maxZoom: 2,
  pan: { x: 0, y: 0 },
  // Spawn view pan (limited)
  spawnPan: { x: 0, y: 0 },
  // Game state
  spawnMask: null,
  round: 0,
  totalScore: 0,
  target: null,
  guess: null,
  revealed: false,
  history: [],
  // Bitmaps
  spawnBitmap: null,
  spawnBitmapScale: 1,
  guessBitmap: null,
  guessBitmapScale: 1,
  tileGrid: { cols: 0, rows: 0 },
  loading: true,
  loadingMsgTimer: null,
  loadingMsgIndex: 0,
};

// Cache tile bitmaps so we only fetch each tile once
const tileCache = new Map();

const markers = {
  guess: createMarker("guess"),
  target: createMarker("target"),
  ping: createMarker("ping"),
};

function startLoadingMessages() {
  const hint = document.querySelector(".hint");
  if (!hint) return;
  stopLoadingMessages();
  state.loadingMsgIndex = 0;
  hint.textContent = LOADING_MESSAGES[state.loadingMsgIndex];
  state.loadingMsgTimer = setInterval(() => {
    state.loadingMsgIndex = (state.loadingMsgIndex + 1) % LOADING_MESSAGES.length;
    hint.textContent = LOADING_MESSAGES[state.loadingMsgIndex];
  }, 2400);
}

function stopLoadingMessages() {
  if (state.loadingMsgTimer) {
    clearInterval(state.loadingMsgTimer);
    state.loadingMsgTimer = null;
  }
}

// Show loading immediately
document.querySelector(".hint").textContent = "Loading map...";
startLoadingMessages();

initBackground(); // Start background scaling logic
initSettings(); // Setup settings modal

init().catch((err) => {
  console.error("Init failed:", err);
  stopLoadingMessages();
  document.querySelector(".hint").textContent = "Error loading: " + err.message;
});

function initBackground() {
  const bgImg = document.getElementById("bg-img");
  const fgLeft = document.getElementById("fg-left");
  const fgRight = document.getElementById("fg-right");

  function updateLayout() {
    if (!bgImg.complete || !bgImg.naturalWidth) return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const imgW = bgImg.naturalWidth;
    const imgH = bgImg.naturalHeight;

    // Calculate scale to cover the screen (max of width/height ratios)
    // "Top to bottom always filled" and "no white space" implies cover behavior
    const scale = Math.max(winW / imgW, winH / imgH);

    const width = imgW * scale;
    const height = imgH * scale;

    // Center the background
    const left = (winW - width) / 2;
    const top = (winH - height) / 2;

    bgImg.style.width = `${width}px`;
    bgImg.style.height = `${height}px`;
    bgImg.style.left = `${left}px`;
    bgImg.style.top = `${top}px`;

    // Scale foregrounds identically
    if (fgLeft.complete) {
      fgLeft.style.width = `${fgLeft.naturalWidth * scale}px`;
      fgLeft.style.height = `${fgLeft.naturalHeight * scale}px`;
      fgLeft.style.left = "0px";
      fgLeft.style.bottom = "0px";
    }

    if (fgRight.complete) {
      fgRight.style.width = `${fgRight.naturalWidth * scale}px`;
      fgRight.style.height = `${fgRight.naturalHeight * scale}px`;
      fgRight.style.right = "0px";
      fgRight.style.left = "auto";
      fgRight.style.bottom = "0px";
    }
  }

  // Update on load and resize
  bgImg.onload = updateLayout;
  fgLeft.onload = updateLayout;
  fgRight.onload = updateLayout;
  window.addEventListener("resize", updateLayout);
  
  // Initial call in case already loaded
  updateLayout();
}

function initSettings() {
  // Set initial radio button state
  const radios = document.querySelectorAll('input[name="mapStyle"]');
  radios.forEach(radio => {
    if (radio.value === settings.mapStyle) radio.checked = true;
  });

  // Open modal
  els.settingsBtn?.addEventListener('click', () => {
    els.settingsModal?.classList.remove('hidden');
  });

  // Close modal
  els.closeSettingsBtn?.addEventListener('click', () => {
    els.settingsModal?.classList.add('hidden');
  });

  // Close on backdrop click
  els.settingsModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    els.settingsModal?.classList.add('hidden');
  });

  // Save settings
  els.saveSettingsBtn?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="mapStyle"]:checked');
    if (selected) {
      settings.mapStyle = selected.value;
      localStorage.setItem('mapStyle', settings.mapStyle);
    }
    els.settingsModal?.classList.add('hidden');
    // Reload the game with new settings
    location.reload();
  });
}

async function init() {
  console.log("Init started");

  const maskImage = await loadImage(SPAWN_MASK_SRC);
  console.log("Mask loaded:", maskImage.naturalWidth, "x", maskImage.naturalHeight);
  state.mapSize = { width: maskImage.naturalWidth, height: maskImage.naturalHeight };
  state.tileGrid = {
    cols: Math.ceil(state.mapSize.width / TILE_SIZE),
    rows: Math.ceil(state.mapSize.height / TILE_SIZE),
  };

  state.spawnMask = await buildSpawnMask(maskImage);
  console.log("Spawn mask built, positions:", state.spawnMask.positions.length);

  await loadProgressiveBitmaps();
  fitGuessView();
  bindInteractions();
  startRound();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildSpawnMask(maskImage) {
  const scale = MASK_TARGET_WIDTH / maskImage.naturalWidth;
  const targetHeight = Math.max(1, Math.round(maskImage.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = MASK_TARGET_WIDTH;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const positions = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) positions.push(i / 4);
  }
  return {
    positions,
    width: canvas.width,
    height: canvas.height,
    scale,
  };
}

async function loadProgressiveBitmaps() {
  console.log("Loading map...");

  try {
    const mapSrc = MAP_SOURCES[settings.mapStyle] || MAP_SOURCES.normal;
    console.log("Loading low-res map:", mapSrc);
    const img = await loadImage(mapSrc);
    const lowBitmap = await createImageBitmap(img);
    console.log("Low-res bitmap ready:", lowBitmap.width, "x", lowBitmap.height);
    state.guessBitmap = lowBitmap;
    state.guessBitmapScale = lowBitmap.width / state.mapSize.width;
    state.loading = false;
    stopLoadingMessages();
    updateHint();
    renderGuessView();
  } catch (err) {
    console.error("Map load failed:", err);
    state.loading = false;
    stopLoadingMessages();
    updateHint();
    alert("Failed to load map: " + err.message);
  }
}

// Load only the cropped region around spawn point at full resolution
async function loadSpawnCrop() {
  if (!state.target) return;
  
  const cropRadius = SPAWN_VIEW_RADIUS + SPAWN_PAN_LIMIT + 50; // extra margin
  const cropSize = cropRadius * 2;
  
  // Calculate crop bounds in original image coordinates
  const sx = Math.max(0, Math.floor(state.target.x - cropRadius));
  const sy = Math.max(0, Math.floor(state.target.y - cropRadius));
  const sw = Math.min(cropSize, state.mapSize.width - sx);
  const sh = Math.min(cropSize, state.mapSize.height - sy);
  
  console.log("Loading spawn crop:", sx, sy, sw, sh);
  
  try {
    const cropBitmap = await buildRegionBitmap({ sx, sy, sw, sh });
    if (!cropBitmap) throw new Error("Tiles missing");
    console.log("Spawn crop loaded:", cropBitmap.width, "x", cropBitmap.height);

    state.spawnBitmap = cropBitmap;
    state.spawnCropOffset = { x: sx, y: sy };
    renderSpawnView();
  } catch (err) {
    console.warn("Spawn crop failed:", err);
    // Fallback to low-res
    state.spawnBitmap = state.guessBitmap;
    state.spawnCropOffset = { x: 0, y: 0 };
    state.spawnBitmapScale = state.guessBitmapScale;
    renderSpawnView();
  }
}

function updateHint() {
  const hint = document.querySelector(".hint");
  if (state.loading) {
    if (!state.loadingMsgTimer) hint.textContent = "Loading map...";
  } else if (state.guess) {
    hint.textContent = "Click 'Submit Guess' to see your score!";
  } else {
    hint.textContent = "Tap on the map to place your guess.";
  }
}

function startRound() {
  if (!state.spawnMask || state.spawnMask.positions.length === 0) {
    alert("No spawn pixels found in stand.png");
    return;
  }
  state.round += 1;
  state.guess = null;
  state.revealed = false;
  state.target = pickRandomSpawn();
  state.spawnPan = { x: 0, y: 0 }; // Reset spawn pan
  markers.guess.style.display = "none";
  markers.target.style.display = "none";
  markers.ping.style.display = "none";
  updateHud();
  updateHint();
  loadSpawnCrop(); // Load cropped region for this spawn
  renderGuessView();
  renderMarkers();
}

function pickRandomSpawn() {
  const m = state.spawnMask;
  const idx = m.positions[Math.floor(Math.random() * m.positions.length)];
  const xScaled = idx % m.width;
  const yScaled = Math.floor(idx / m.width);
  const invScale = 1 / m.scale;
  return {
    x: (xScaled + Math.random()) * invScale,
    y: (yScaled + Math.random()) * invScale,
  };
}

function bindInteractions() {
  let drag = null;
  let dragMoved = false;
  let spawnDrag = null;

  // Spawn map interactions (limited pan only)
  els.spawnMap.addEventListener("pointerdown", (e) => {
    spawnDrag = { x: e.clientX, y: e.clientY, panStart: { ...state.spawnPan } };
    els.spawnMap.setPointerCapture(e.pointerId);
  });

  els.spawnMap.addEventListener("pointermove", (e) => {
    if (!spawnDrag) return;
    const dx = e.clientX - spawnDrag.x;
    const dy = e.clientY - spawnDrag.y;
    // Limit pan to SPAWN_PAN_LIMIT pixels
    state.spawnPan = {
      x: clamp(spawnDrag.panStart.x + dx, -SPAWN_PAN_LIMIT, SPAWN_PAN_LIMIT),
      y: clamp(spawnDrag.panStart.y + dy, -SPAWN_PAN_LIMIT, SPAWN_PAN_LIMIT),
    };
    renderSpawnView();
  });

  els.spawnMap.addEventListener("pointerup", (e) => {
    if (!spawnDrag) return;
    els.spawnMap.releasePointerCapture(e.pointerId);
    spawnDrag = null;
  });

  // Guess map interactions (pan, zoom, click)
  els.guessMap.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, panStart: { ...state.pan } };
    dragMoved = false;
    els.guessMap.setPointerCapture(e.pointerId);
  });

  els.guessMap.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    state.pan = { x: drag.panStart.x + dx, y: drag.panStart.y + dy };
    renderGuessView();
    renderMarkers();
  });

  els.guessMap.addEventListener("pointerup", (e) => {
    if (!drag) return;
    els.guessMap.releasePointerCapture(e.pointerId);
    
    // If not dragged, place guess
    if (!dragMoved && !state.revealed) {
      const point = clientToMapCoords(e.clientX, e.clientY);
      state.guess = point;
      updateHint();
      renderMarkers();
    }
    drag = null;
  });

  els.guessMap.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = els.guessMap.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    zoomAtPoint(e.deltaY < 0 ? 1.15 : 0.87, { x: cx, y: cy });
  }, { passive: false });

  // Touch zoom (pinch)
  let lastTouchDist = 0;
  let lastTouchCenter = null;
  
  els.guessMap.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDist = getTouchDistance(e.touches);
      lastTouchCenter = getTouchCenter(e.touches, els.guessMap);
    }
  }, { passive: false });

  els.guessMap.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newDist = getTouchDistance(e.touches);
      const newCenter = getTouchCenter(e.touches, els.guessMap);
      
      if (lastTouchDist > 0) {
        const scale = newDist / lastTouchDist;
        zoomAtPoint(scale, newCenter);
      }
      
      lastTouchDist = newDist;
      lastTouchCenter = newCenter;
    }
  }, { passive: false });

  els.guessMap.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      lastTouchDist = 0;
      lastTouchCenter = null;
    }
  });

  // Zoom buttons
  els.zoomInBtn?.addEventListener("click", () => {
    const rect = els.guessMap.getBoundingClientRect();
    zoomAtPoint(1.3, { x: rect.width / 2, y: rect.height / 2 });
  });

  els.zoomOutBtn?.addEventListener("click", () => {
    const rect = els.guessMap.getBoundingClientRect();
    zoomAtPoint(0.7, { x: rect.width / 2, y: rect.height / 2 });
  });

  els.newRoundBtn.addEventListener("click", () => startRound());
  els.checkBtn.addEventListener("click", () => revealRound());
  els.resetViewBtn.addEventListener("click", () => fitGuessView());

  // Mobile buttons
  els.mobileNewRoundBtn?.addEventListener("click", () => startRound());
  els.mobileCheckBtn?.addEventListener("click", () => revealRound());

  window.addEventListener("resize", () => {
    renderSpawnView();
    renderGuessView();
    renderMarkers();
  });
}

function zoomAtPoint(factor, center) {
  const newZoom = clamp(state.zoom * factor, state.minZoom, state.maxZoom);
  const imgPoint = {
    x: (center.x - state.pan.x) / state.zoom,
    y: (center.y - state.pan.y) / state.zoom,
  };
  state.zoom = newZoom;
  state.pan = {
    x: center.x - imgPoint.x * state.zoom,
    y: center.y - imgPoint.y * state.zoom,
  };
  renderGuessView();
  renderMarkers();
}

function fitGuessView() {
  const rect = els.guessMap.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const fit = Math.min(rect.width / state.mapSize.width, rect.height / state.mapSize.height) * 0.95;
  state.zoom = clamp(fit, state.minZoom, state.maxZoom);
  state.pan = {
    x: (rect.width - state.mapSize.width * state.zoom) / 2,
    y: (rect.height - state.mapSize.height * state.zoom) / 2,
  };
  renderGuessView();
  renderMarkers();
}

function clientToMapCoords(clientX, clientY) {
  const rect = els.guessMap.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return {
    x: (x - state.pan.x) / state.zoom,
    y: (y - state.pan.y) / state.zoom,
  };
}

// Render the spawn view (cropped, centered on target with limited pan) - FULL RES
function renderSpawnView() {
  const bitmap = state.spawnBitmap;
  if (!bitmap || !state.target) return;

  const rect = els.spawnMap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvas = els.spawnCanvas;
  const cw = rect.width * dpr;
  const ch = rect.height * dpr;
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, cw, ch);

  // Calculate zoom to show SPAWN_VIEW_RADIUS pixels around target
  const viewSize = SPAWN_VIEW_RADIUS * 2;
  const spawnZoom = Math.min(rect.width / viewSize, rect.height / viewSize);
  
  // The bitmap is cropped, so we need to offset relative to crop origin
  const cropOffset = state.spawnCropOffset || { x: 0, y: 0 };
  const localTargetX = state.target.x - cropOffset.x;
  const localTargetY = state.target.y - cropOffset.y;

  // Center on target with pan offset
  const dx = rect.width / 2 - localTargetX * spawnZoom + state.spawnPan.x;
  const dy = rect.height / 2 - localTargetY * spawnZoom + state.spawnPan.y;
  const dw = bitmap.width * spawnZoom;
  const dh = bitmap.height * spawnZoom;

  // Disable smoothing for crisp pixel art
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, dx * dpr, dy * dpr, dw * dpr, dh * dpr);

  // Draw crosshair at center (where target is when pan is 0)
  const crossX = cw / 2 + state.spawnPan.x * dpr;
  const crossY = ch / 2 + state.spawnPan.y * dpr;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2 * dpr;
  const crossSize = 20 * dpr;
  
  ctx.beginPath();
  ctx.moveTo(crossX - crossSize, crossY);
  ctx.lineTo(crossX + crossSize, crossY);
  ctx.moveTo(crossX, crossY - crossSize);
  ctx.lineTo(crossX, crossY + crossSize);
  ctx.stroke();

  // Draw circle around crosshair
  ctx.beginPath();
  ctx.arc(crossX, crossY, 12 * dpr, 0, Math.PI * 2);
  ctx.stroke();
}

// Render the guess view (interactive, full map) - LOW RES
function renderGuessView() {
  const bitmap = state.guessBitmap;
  if (!bitmap) return;

  const rect = els.guessMap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvas = els.guessCanvas;
  const cw = rect.width * dpr;
  const ch = rect.height * dpr;
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, cw, ch);

  const bitmapToMap = state.guessBitmapScale;
  const drawScale = state.zoom / bitmapToMap;

  const dx = state.pan.x;
  const dy = state.pan.y;
  const dw = bitmap.width * drawScale;
  const dh = bitmap.height * drawScale;

  // Disable smoothing for crisp pixel art
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, dx * dpr, dy * dpr, dw * dpr, dh * dpr);
}

function shouldDrawTileOverlay() {
  if (!state.guessBitmap) return false;
  // When the low-res bitmap would be upscaled more than the factor, start pulling tiles
  return state.zoom > state.guessBitmapScale * TILE_OVERLAY_SCALE_FACTOR;
}

function drawHighResTiles(ctx, dpr) {
  if (!shouldDrawTileOverlay()) return;
  const rect = els.guessMap.getBoundingClientRect();
  const view = {
    x: (-state.pan.x) / state.zoom,
    y: (-state.pan.y) / state.zoom,
    w: rect.width / state.zoom,
    h: rect.height / state.zoom,
  };

  const startCol = clamp(Math.floor(view.x / TILE_SIZE), 0, state.tileGrid.cols - 1);
  const endCol = clamp(Math.floor((view.x + view.w) / TILE_SIZE), 0, state.tileGrid.cols - 1);
  const startRow = clamp(Math.floor(view.y / TILE_SIZE), 0, state.tileGrid.rows - 1);
  const endRow = clamp(Math.floor((view.y + view.h) / TILE_SIZE), 0, state.tileGrid.rows - 1);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = tileKey(col, row);
      const cached = tileCache.get(key);

      if (cached && cached.ready && cached.bitmap) {
        const tileX = col * TILE_SIZE;
        const tileY = row * TILE_SIZE;
        const dw = cached.bitmap.width * state.zoom;
        const dh = cached.bitmap.height * state.zoom;
        const dx = state.pan.x + tileX * state.zoom;
        const dy = state.pan.y + tileY * state.zoom;
        ctx.drawImage(cached.bitmap, 0, 0, cached.bitmap.width, cached.bitmap.height, dx * dpr, dy * dpr, dw * dpr, dh * dpr);
        continue;
      }

      if (!cached) {
        const promise = loadTile(col, row)
          .then((bitmap) => {
            if (!bitmap) return;
            tileCache.set(key, { ready: true, bitmap, promise: null });
            // Re-render so the freshly loaded tile is visible
            renderGuessView();
            renderMarkers();
          })
          .catch((err) => {
            console.warn(`Tile ${key} failed:`, err);
            tileCache.delete(key);
          });

        tileCache.set(key, { ready: false, bitmap: null, promise });
      }
    }
  }
}

async function buildRegionBitmap({ sx, sy, sw, sh }) {
  const startCol = clamp(Math.floor(sx / TILE_SIZE), 0, state.tileGrid.cols - 1);
  const endCol = clamp(Math.floor((sx + sw) / TILE_SIZE), 0, state.tileGrid.cols - 1);
  const startRow = clamp(Math.floor(sy / TILE_SIZE), 0, state.tileGrid.rows - 1);
  const endRow = clamp(Math.floor((sy + sh) / TILE_SIZE), 0, state.tileGrid.rows - 1);

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let drewAnything = false;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const bitmap = await ensureTileBitmap(col, row);
      if (!bitmap) continue;

      const tileX = col * TILE_SIZE;
      const tileY = row * TILE_SIZE;
      const tileRight = tileX + bitmap.width;
      const tileBottom = tileY + bitmap.height;

      const overlapX = Math.min(tileRight, sx + sw) - Math.max(tileX, sx);
      const overlapY = Math.min(tileBottom, sy + sh) - Math.max(tileY, sy);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const srcX = Math.max(0, sx - tileX);
      const srcY = Math.max(0, sy - tileY);
      const dstX = Math.max(0, tileX - sx);
      const dstY = Math.max(0, tileY - sy);

      ctx.drawImage(bitmap, srcX, srcY, overlapX, overlapY, dstX, dstY, overlapX, overlapY);
      drewAnything = true;
    }
  }

  if (!drewAnything) return null;
  return createImageBitmap(canvas);
}

async function ensureTileBitmap(col, row) {
  if (col < 0 || row < 0 || col >= state.tileGrid.cols || row >= state.tileGrid.rows) return null;
  const key = tileKey(col, row);
  const cached = tileCache.get(key);
  if (cached && cached.ready && cached.bitmap) return cached.bitmap;
  if (cached && cached.promise) return cached.promise;

  const promise = loadTile(col, row).then((bitmap) => {
    if (!bitmap) return null;
    tileCache.set(key, { ready: true, bitmap, promise: null });
    return bitmap;
  });
  tileCache.set(key, { ready: false, bitmap: null, promise });
  return promise;
}

async function loadTile(col, row) {
  const src = tileSrc(col, row);
  try {
    const img = await loadImage(src);
    return createImageBitmap(img);
  } catch (err) {
    console.warn(`Tile ${src} kon niet geladen worden:`, err);
    return null;
  }
}

function tileKey(col, row) {
  return `${col}_${row}`;
}

function tileSrc(col, row) {
  return `assets/tiles/tile_${col}_${row}.png`;
}

function renderMarkers() {
  const rect = els.guessMap.getBoundingClientRect();

  const place = (marker, point) => {
    const x = state.pan.x + point.x * state.zoom;
    const y = state.pan.y + point.y * state.zoom;
    marker.style.display = "block";
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
  };

  if (state.guess) {
    place(markers.guess, state.guess);
  } else {
    markers.guess.style.display = "none";
  }

  if (state.revealed && state.target) {
    place(markers.target, state.target);
    place(markers.ping, state.target);
  } else {
    markers.target.style.display = "none";
    markers.ping.style.display = "none";
  }

  els.markers.style.width = `${rect.width}px`;
  els.markers.style.height = `${rect.height}px`;
}

function revealRound() {
  if (!state.guess) {
    alert("Click on the map to make a guess first.");
    return;
  }
  state.revealed = true;
  const distance = Math.hypot(state.guess.x - state.target.x, state.guess.y - state.target.y);
  const diag = Math.hypot(state.mapSize.width, state.mapSize.height);
  const score = scoreFromDistance(distance, diag);
  state.totalScore += score;
  state.history.unshift({ round: state.round, distance, score });
  state.history = state.history.slice(0, 10);
  updateHud(distance, score);
  renderMarkers();
  
  // Pan to show target
  const rect = els.guessMap.getBoundingClientRect();
  state.pan = {
    x: rect.width / 2 - state.target.x * state.zoom,
    y: rect.height / 2 - state.target.y * state.zoom,
  };
  renderGuessView();
  renderMarkers();
}

function scoreFromDistance(distance, diag) {
  const normalized = clamp(distance / diag, 0, 1);
  return Math.max(0, Math.round(5000 * Math.pow(1 - normalized, 1.6)));
}

function updateHud(distance, roundScore) {
  els.roundLabel.textContent = `Round ${state.round}`;
  els.scoreLabel.textContent = `Total ${state.totalScore}`;
  if (distance != null) {
    const percent = ((distance / Math.hypot(state.mapSize.width, state.mapSize.height)) * 100).toFixed(2);
    els.distanceLabel.textContent = `${distance.toFixed(0)} px (${percent}%)`;
  } else {
    els.distanceLabel.textContent = "-";
  }
  els.roundScoreLabel.textContent = roundScore != null ? `${roundScore} / 5000` : "-";
  const roundsPlayed = state.history.length;
  els.avgScoreLabel.textContent = roundsPlayed ? `${Math.round(state.totalScore / roundsPlayed)} avg` : "-";
  renderHistory();
}

function renderHistory() {
  els.history.innerHTML = "";
  state.history.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Round ${item.round}</strong> · ${item.distance.toFixed(0)} px · ${item.score} pt`;
    els.history.appendChild(li);
  });
}

function createMarker(kind) {
  const el = document.createElement("div");
  el.className = `marker ${kind}`;
  el.style.display = "none";
  els.markers.appendChild(el);
  return el;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getTouchCenter(touches, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
    y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
  };
}
