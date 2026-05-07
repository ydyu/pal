import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { cac } from "cac";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GifWriter } from "omggif";

import {
  ResourceManager,
  ByteReader,
  collectScriptRewards,
  packPaletteUint32,
  type SpriteType,
  parseScript,
  parseEventObject,
  type EventObject,
  pixelToTile,
  formatInstruction,
  MemorySurface,
  Blitter,
  SceneEngine,
  SceneModel,
  type PalMap,
  type RenderableSprite,
  type RleFrame,
  type PaletteSet,
  getSpriteBounds,
  getEffectiveAttack,
  getEffectiveDefense,
} from "../src/index.js";
const cli = cac("pal-export");
const DEFAULT_GAME_DIR = "/data/data/com.termux/files/home/dev/palgame";
const VIEWPORT_WIDTH = 320;
const VIEWPORT_HEIGHT = 200;
const VIEWPORT_BOX_COLOR = 0xff;
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT = 18;
const LABEL_FONT_FAMILY = "PAL-NotoSansCJK";
const LABEL_FONT_PATHS = [
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts", "NotoSansCJK-Regular.ttc"),
  "/system/fonts/NotoSansCJK-Regular.ttc",
  "/system/fonts/DroidSansFallback.ttf",
];
const LABEL_FONT_PATH = LABEL_FONT_PATHS.find(p => existsSync(p)) || LABEL_FONT_PATHS[0];
const FONT_WIDTH = 5;
const FONT_HEIGHT = 7;
const FONT_SPACING = 1;
let unicodeFontRegistered = false;

const FONT_GLYPHS: Record<string, string[]> = {
  " ": [
    "00000",
    "00000",
    "00000",
    "00000",
    "00000",
    "00000",
    "00000",
  ],
  "$": [
    "00100",
    "01111",
    "10100",
    "01110",
    "00101",
    "11110",
    "00100",
  ],
  "+": [
    "00000",
    "00100",
    "00100",
    "11111",
    "00100",
    "00100",
    "00000",
  ],
  "-": [
    "00000",
    "00000",
    "00000",
    "11111",
    "00000",
    "00000",
    "00000",
  ],
  "0": [
    "01110",
    "10001",
    "10011",
    "10101",
    "11001",
    "10001",
    "01110",
  ],
  "1": [
    "00100",
    "01100",
    "00100",
    "00100",
    "00100",
    "00100",
    "01110",
  ],
  "2": [
    "01110",
    "10001",
    "00001",
    "00010",
    "00100",
    "01000",
    "11111",
  ],
  "3": [
    "11110",
    "00001",
    "00001",
    "01110",
    "00001",
    "00001",
    "11110",
  ],
  "4": [
    "00010",
    "00110",
    "01010",
    "10010",
    "11111",
    "00010",
    "00010",
  ],
  "5": [
    "11111",
    "10000",
    "10000",
    "11110",
    "00001",
    "00001",
    "11110",
  ],
  "6": [
    "01110",
    "10000",
    "10000",
    "11110",
    "10001",
    "10001",
    "01110",
  ],
  "7": [
    "11111",
    "00001",
    "00010",
    "00100",
    "01000",
    "01000",
    "01000",
  ],
  "8": [
    "01110",
    "10001",
    "10001",
    "01110",
    "10001",
    "10001",
    "01110",
  ],
  "9": [
    "01110",
    "10001",
    "10001",
    "01111",
    "00001",
    "00001",
    "01110",
  ],
  "A": [
    "01110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ],
  "B": [
    "11110",
    "10001",
    "10001",
    "11110",
    "10001",
    "10001",
    "11110",
  ],
  "C": [
    "01111",
    "10000",
    "10000",
    "10000",
    "10000",
    "10000",
    "01111",
  ],
  "D": [
    "11110",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "11110",
  ],
  "E": [
    "11111",
    "10000",
    "10000",
    "11110",
    "10000",
    "10000",
    "11111",
  ],
  "F": [
    "11111",
    "10000",
    "10000",
    "11110",
    "10000",
    "10000",
    "10000",
  ],
  "G": [
    "01111",
    "10000",
    "10000",
    "10111",
    "10001",
    "10001",
    "01110",
  ],
  "H": [
    "10001",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
  ],
  "I": [
    "01110",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "01110",
  ],
  "J": [
    "00001",
    "00001",
    "00001",
    "00001",
    "00001",
    "10001",
    "01110",
  ],
  "K": [
    "10001",
    "10010",
    "10100",
    "11000",
    "10100",
    "10010",
    "10001",
  ],
  "L": [
    "10000",
    "10000",
    "10000",
    "10000",
    "10000",
    "10000",
    "11111",
  ],
  "M": [
    "10001",
    "11011",
    "10101",
    "10101",
    "10001",
    "10001",
    "10001",
  ],
  "N": [
    "10001",
    "10001",
    "11001",
    "10101",
    "10011",
    "10001",
    "10001",
  ],
  "O": [
    "01110",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01110",
  ],
  "P": [
    "11110",
    "10001",
    "10001",
    "11110",
    "10000",
    "10000",
    "10000",
  ],
  "Q": [
    "01110",
    "10001",
    "10001",
    "10001",
    "10101",
    "10010",
    "01101",
  ],
  "R": [
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001",
  ],
  "S": [
    "01111",
    "10000",
    "10000",
    "01110",
    "00001",
    "00001",
    "11110",
  ],
  "T": [
    "11111",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
  "U": [
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01110",
  ],
  "V": [
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01010",
    "00100",
  ],
  "W": [
    "10001",
    "10001",
    "10001",
    "10101",
    "10101",
    "10101",
    "01010",
  ],
  "X": [
    "10001",
    "10001",
    "01010",
    "00100",
    "01010",
    "10001",
    "10001",
  ],
  "Y": [
    "10001",
    "10001",
    "01010",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
  "Z": [
    "11111",
    "00001",
    "00010",
    "00100",
    "01000",
    "10000",
    "11111",
  ],
};

/**
 * Lazy loader that reads files from disk into the ResourceManager.
 */
function getLoader(gameDir: string): ResourceManager {
  const files: Record<string, Uint8Array> = {};
  const handler: ProxyHandler<Record<string, Uint8Array>> = {
    get: (target, prop: string) => {
      const fileName = prop.toUpperCase();
      if (!target[fileName]) {
        const path = join(gameDir, fileName);
        if (existsSync(path)) target[fileName] = readFileSync(path);
      }
      return target[fileName];
    }
  };
  return new ResourceManager(new Proxy(files, handler));
}

function getVisualWidth(s: string): number {
  let width = 0;
  for (let i = 0; i < s.length; i++) {
    width += s.charCodeAt(i) > 255 ? 2 : 1;
  }
  return width;
}

function padVisual(s: string, width: number): string {
  const current = getVisualWidth(s);
  return s + " ".repeat(Math.max(0, width - current));
}

function getPalette(assets: ResourceManager, id: number = 0, palette?: PaletteSet): Uint32Array {
  const set = palette || assets.getPalette(id);
  return packPaletteUint32(set);
}

function getGameDir(dir?: string): string {
  return dir || process.env.PAL_GAME_DIR || DEFAULT_GAME_DIR;
}

interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function getSceneBounds(map: PalMap, sprites: RenderableSprite[], blitter: Blitter): SceneBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includeRect = (x: number, y: number, width: number, height: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  };

  for (const tile of map.tiles) {
    const lowerFrame = blitter.getFrame(map.tileSet, tile.lowerIdx, `map:${map.id}`);
    if (lowerFrame) {
      includeRect(tile.px, tile.py, lowerFrame.width, lowerFrame.height);
    }

    if (tile.upperIdx >= 0) {
      const upperFrame = blitter.getFrame(map.tileSet, tile.upperIdx, `map:${map.id}`);
      if (upperFrame) {
        includeRect(tile.px, tile.py, upperFrame.width, upperFrame.height);
      }
    }
  }

  for (const sprite of sprites) {
    const frame = blitter.getFrame(sprite.directory, sprite.frameIndex);
    if (!frame) {
      continue;
    }

    const bounds = getSpriteBounds(
      sprite.x,
      sprite.y,
      sprite.sLayer,
      frame.width,
      frame.height,
      sprite.sortOffsetY,
      sprite.layerOffset
    );
    includeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    throw new Error(`Unable to determine scene bounds for map ${map.id}.`);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function drawBox(surface: MemorySurface, x: number, y: number, width: number, height: number, colorIndex: number): void {
  if (width <= 0 || height <= 0) {
    return;
  }

  const right = x + width - 1;
  const bottom = y + height - 1;

  for (let px = x; px <= right; px++) {
    surface.setPixel(px, y, colorIndex);
    surface.setPixel(px, bottom, colorIndex);
  }

  for (let py = y; py <= bottom; py++) {
    surface.setPixel(x, py, colorIndex);
    surface.setPixel(right, py, colorIndex);
  }
}

function findClosestPaletteIndex(
  colors: { r: number; g: number; b: number }[],
  target: { r: number; g: number; b: number }
): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i]!;
    const dr = color.r - target.r;
    const dg = color.g - target.g;
    const db = color.b - target.b;
    const distance = dr * dr + dg * dg + db * db;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function drawLine(surface: MemorySurface, x0: number, y0: number, x1: number, y1: number, colorIndex: number): void {
  let currentX = x0;
  let currentY = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    surface.setPixel(currentX, currentY, colorIndex);

    if (currentX === x1 && currentY === y1) {
      return;
    }

    const err2 = err * 2;
    if (err2 > -dy) {
      err -= dy;
      currentX += stepX;
    }
    if (err2 < dx) {
      err += dx;
      currentY += stepY;
    }
  }
}

function drawDiamond(surface: MemorySurface, x: number, y: number, colorIndex: number): void {
  drawLine(surface, x + 16, y, x + 31, y + 8, colorIndex);
  drawLine(surface, x + 31, y + 8, x + 16, y + 15, colorIndex);
  drawLine(surface, x + 16, y + 15, x, y + 8, colorIndex);
  drawLine(surface, x, y + 8, x + 16, y, colorIndex);
}

function ensureUnicodeFont(): void {
  if (unicodeFontRegistered) {
    return;
  }

  if (!existsSync(LABEL_FONT_PATH)) {
    throw new Error(`Missing label font: ${LABEL_FONT_PATH}`);
  }

  const registered = GlobalFonts.registerFromPath(LABEL_FONT_PATH, LABEL_FONT_FAMILY);
  if (!registered) {
    throw new Error(`Failed to register label font: ${LABEL_FONT_PATH}`);
  }

  unicodeFontRegistered = true;
}

function measureLabelWidth(text: string): number {
  ensureUnicodeFont();
  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  ctx.font = `${LABEL_FONT_SIZE}px "${LABEL_FONT_FAMILY}"`;
  return Math.max(1, Math.ceil(ctx.measureText(text).width));
}

function drawUnicodeText(
  surface: MemorySurface,
  x: number,
  y: number,
  text: string,
  textColorIndex: number,
  shadowColorIndex: number
): void {
  if (text.length === 0) {
    return;
  }

  ensureUnicodeFont();

  const width = measureLabelWidth(text) + 4;
  const canvas = createCanvas(width, LABEL_LINE_HEIGHT + 4);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${LABEL_FONT_SIZE}px "${LABEL_FONT_FAMILY}"`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  ctx.fillText(text, 3, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 2, 2);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const offset = (py * canvas.width + px) * 4;
      const alpha = pixels[offset + 3]!;
      if (alpha < 32) {
        continue;
      }

      const r = pixels[offset]!;
      const g = pixels[offset + 1]!;
      const b = pixels[offset + 2]!;
      const brightness = (r + g + b) / 3;
      surface.setPixel(x + px, y + py, brightness >= 128 ? textColorIndex : shadowColorIndex);
    }
  }
}

function formatRewardLabel(reward: ReturnType<typeof collectScriptRewards>[number]): string {
  if (reward.kind === "cash") {
    return `${reward.amount >= 0 ? "+" : ""}${reward.amount}$`;
  }

  const base = reward.name.trim().length > 0 ? reward.name.trim() : `ITEM ${reward.itemId}`;
  return reward.quantity === 1 ? base : `${base} x${reward.quantity}`;
}

function drawTreasureOverlay(
  surface: MemorySurface,
  model: SceneModel,
  assets: ResourceManager,
  bounds: SceneBounds,
  colors: { r: number; g: number; b: number }[]
): number {
  const highlightColor = findClosestPaletteIndex(colors, { r: 255, g: 215, b: 0 });
  const textColor = findClosestPaletteIndex(colors, { r: 255, g: 255, b: 255 });
  const shadowColor = findClosestPaletteIndex(colors, { r: 0, g: 0, b: 0 });
  let highlightCount = 0;

  for (const obj of model.objects.values()) {
    if (obj.state <= 0) {
      continue;
    }

    const rewards = collectScriptRewards(assets.getScriptChunk(), obj.data.triggerScript, assets);
    if (rewards.length === 0) {
      continue;
    }

    const drawX = obj.x - 16 - bounds.minX;
    const drawY = obj.y - 8 - bounds.minY;
    drawDiamond(surface, drawX, drawY, highlightColor);

    rewards.forEach((reward, index) => {
      const label = formatRewardLabel(reward);
      const labelX = drawX + 16 - Math.floor(measureLabelWidth(label) / 2);
      const labelY = drawY + 18 + index * LABEL_LINE_HEIGHT;
      drawUnicodeText(surface, labelX, labelY, label, textColor, shadowColor);
    });

    highlightCount++;
  }

  return highlightCount;
}

function writeGif(
  outPath: string,
  width: number,
  height: number,
  pixels: Uint8Array,
  palette: number[],
  transparentIndex?: number
): void {
  const buf = Buffer.alloc(width * height * 2 + 4096);
  const gif = new GifWriter(buf, width, height, { loop: 0 });
  gif.addFrame(0, 0, width, height, pixels, transparentIndex === undefined ? { palette } : { palette, transparent: transparentIndex });
  writeFileSync(outPath, buf.subarray(0, gif.end()));
}

function findTransparentIndex(frames: RleFrame[]): number {
  const used = new Uint8Array(256);
  for (const frame of frames) {
    for (let i = 0; i < frame.pixels.length; i++) {
      if (frame.mask[i] !== 0) {
        used[frame.pixels[i]!] = 1;
      }
    }
  }

  for (let i = 0; i < used.length; i++) {
    if (used[i] === 0) {
      return i;
    }
  }

  throw new Error("No unused palette index available for GIF transparency.");
}

function encodeGifFrame(
  frame: RleFrame,
  width: number,
  height: number,
  transparentIndex: number,
  offsetX: number = 0,
  offsetY: number = 0
): Uint8Array {
  const pixels = new Uint8Array(width * height);
  pixels.fill(transparentIndex);

  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const src = y * frame.width + x;
      if (frame.mask[src] === 0) {
        continue;
      }

      const destX = x + offsetX;
      const destY = y + offsetY;
      pixels[destY * width + destX] = frame.pixels[src]!;
    }
  }

  return pixels;
}

function exportSnapshot(assets: ResourceManager, file: string, targetScene: number, showItems: boolean = false): void {
  const save = assets.parseSave(readFileSync(file));
  const currentScene = save.numScene;
  const model = assets.loadSceneModel(targetScene);
  model.applyState(save, targetScene);

  const scene = model.scene;
  const map = model.map;

  const paletteSet = assets.getPalette(0);
  const isNight = save.paletteOffset !== 0;
  const colors = isNight && paletteSet.night ? paletteSet.night : paletteSet.day;
  const palette = packPaletteUint32(colors);
  
  const blitter = new Blitter();
  const engine = new SceneEngine(blitter);
  const sprites = model.generateRenderList(assets);

  // If the map has no tiles and there are no sprites, skip rendering (empty scene).
  if (map.tiles.length === 0 && sprites.length === 0) {
    const stem = basename(file).replace(/\.[^.]+$/, "");
    console.log(`Skipping snapshot for scene ${targetScene}: empty map and no sprites`);
    return;
  }

  const bounds = getSceneBounds(map, sprites, blitter);
  const surface = new MemorySurface(bounds.width, bounds.height);

  engine.render(surface, map, sprites, {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.width,
    height: bounds.height,
  });

  if (targetScene === currentScene) {
    // draw a box to show viewport on the big map
    drawBox(
      surface,
      save.viewportX - bounds.minX,
      save.viewportY - bounds.minY,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
      VIEWPORT_BOX_COLOR
    );
  }

  const highlightCount = showItems ? drawTreasureOverlay(surface, model, assets, bounds, colors) : 0;

  const stem = basename(file).replace(/\.[^.]+$/, "");
  const outPath = `snapshot_${stem}_scene${String(targetScene).padStart(3, "0")}_map${String(scene.mapNum).padStart(3, "0")}.gif`;
  writeGif(outPath, bounds.width, bounds.height, surface.getPixels(), palette);
  console.log(`Exported snapshot to ${outPath}`);
  if (targetScene === currentScene) {
    console.log(`  Scene ${targetScene} / Map ${scene.mapNum}`);
  } else {
    console.log(`  Current: Scene ${currentScene} / Map ${assets.getScene(currentScene).mapNum}`);
    console.log(`  Viewing: Scene ${targetScene} / Map ${scene.mapNum}`);
  }
  console.log(`  Bounds: (${bounds.minX}, ${bounds.minY}) -> (${bounds.maxX}, ${bounds.maxY})`);
  if (targetScene === currentScene) {
    console.log(`  Viewport: (${save.viewportX}, ${save.viewportY}) ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`);
  }
  console.log(`  Palette: ${isNight ? 'night' : 'day'}`);
  if (showItems) {
    console.log(`  Treasure markers: ${highlightCount}`);
  }
}

cli
  .command("map [id]", "Export a map to GIF (background only, no sprites)")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);

    const mapCount = assets.getMapCount();
    if (idStr === undefined) {
      console.log(`Map IDs range: 0 to ${mapCount - 1}`);
      return;
    }

    const mapId = parseInt(idStr, 10);
    if (isNaN(mapId) || mapId < 0 || mapId >= mapCount) {
      console.error(`Invalid map ID: ${idStr}. Range: 0 to ${mapCount - 1}`);
      return;
    }

    const palette = getPalette(assets, 0);
    const map = assets.getMap(mapId);
    const blitter = new Blitter();
    const engine = new SceneEngine(blitter);
    const bounds = getSceneBounds(map, [], blitter);
    const surface = new MemorySurface(bounds.width, bounds.height);

    engine.render(surface, map, [], {
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
    });

    const outPath = `map_${String(mapId).padStart(3, "0")}.gif`;
    writeGif(outPath, bounds.width, bounds.height, surface.getPixels(), palette);
    console.log(`Exported map to ${outPath}`);
  });

function exportSprite(assets: ResourceManager, type: SpriteType, id: number, frameIndex?: number) {
  const palette = getPalette(assets, 0);
  const directory = assets.getSprite(type, id);
  const blitter = new Blitter();
  
  const isSingleFrame = type === "portrait" || type === "item";
  
  if (isSingleFrame) {
    const frameIdx = frameIndex !== undefined ? frameIndex : 0;
    const frame = blitter.getFrame(directory, frameIdx);
    if (!frame) {
      console.error(`Failed to decode frame ${frameIdx} for ${type}`);
      return;
    }

    const outPath = `sprite_${type}_${String(id).padStart(3, "0")}.gif`;
    const transparentIndex = findTransparentIndex([frame]);
    writeGif(outPath, frame.width, frame.height, encodeGifFrame(frame, frame.width, frame.height, transparentIndex), palette, transparentIndex);
    console.log(`Exported ${type} sprite to ${outPath}`);
    return;
  }

  if (frameIndex !== undefined) {
    const frame = blitter.getFrame(directory, frameIndex);
    if (!frame) {
      console.error(`Failed to decode frame ${frameIndex}`);
      return;
    }
    const outPath = `sprite_${type}_${id}_${frameIndex}.gif`;
    const transparentIndex = findTransparentIndex([frame]);
    writeGif(outPath, frame.width, frame.height, encodeGifFrame(frame, frame.width, frame.height, transparentIndex), palette, transparentIndex);
    console.log(`Exported ${type} frame ${frameIndex} to ${outPath}`);
  } else {
    let maxWidth = 0, maxHeight = 0;
    const frames = [];
    for (let i = 0; i < directory.numFrames; i++) {
      const frame = blitter.getFrame(directory, i);
      if (frame) {
        if (frame.width > maxWidth) maxWidth = frame.width;
        if (frame.height > maxHeight) maxHeight = frame.height;
        frames.push(frame);
      }
    }
    
    if (frames.length === 0) {
      console.error(`No frames to animate.`);
      return;
    }
    
    const outPath = `anim_${type}_${id}.gif`;
    const buf = Buffer.alloc(maxWidth * maxHeight * (frames.length + 1) + 1024);
    const gif = new GifWriter(buf, maxWidth, maxHeight, { loop: 0 });
    const transparentIndex = findTransparentIndex(frames);
    
    for (const f of frames) {
      const framePixels = encodeGifFrame(
        f,
        maxWidth,
        maxHeight,
        transparentIndex,
        Math.floor((maxWidth - f.width) / 2),
        maxHeight - f.height
      );
      gif.addFrame(0, 0, maxWidth, maxHeight, framePixels, {
        palette,
        transparent: transparentIndex,
        disposal: 2,
        delay: 10
      });
    }
    writeFileSync(outPath, buf.subarray(0, gif.end()));
    console.log(`Exported ${type} animation to ${outPath}`);
  }
}

cli
  .command("sprite [type] [id] [frame]", "Export a sprite (world, item, playerBattle, enemyBattle, effect, portrait)")
  .option("--dir <dir>", "Game directory")
  .action((type, idStr, frameStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    
    const validTypes: SpriteType[] = ["world", "item", "playerBattle", "enemyBattle", "effect", "portrait"];
    if (!type || !validTypes.includes(type as SpriteType)) {
      console.error(`Invalid sprite type: ${type}. Valid types: ${validTypes.join(", ")}`);
      return;
    }

    const spriteType = type as SpriteType;
    const count = assets.getSpriteCount(spriteType);

    if (idStr === undefined) {
      console.log(`Please provide an ID for ${type}. Range: 0 to ${count - 1}`);
      return;
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 0 || id >= count) {
      console.error(`Invalid ${type} ID: ${idStr}. Range: 0 to ${count - 1}`);
      return;
    }

    const frame = frameStr !== undefined ? parseInt(frameStr, 10) : undefined;
    exportSprite(assets, spriteType, id, frame);
  });

cli
  .command("script [id]", "Export a script to human-readable format")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    const scriptTable = assets.getScriptChunk();
    const totalCount = Math.floor(scriptTable.length / 8);

    if (idStr === undefined) {
      console.log(`Script IDs range: 0 to ${totalCount - 1}`);
      return;
    }

    const id = parseInt(idStr, 0);
    if (isNaN(id) || id < 0 || id >= totalCount) {
      console.error(`Invalid script ID: ${idStr}. Range: 0 to ${totalCount - 1}`);
      return;
    }

    const instructions = parseScript(scriptTable, id);
    console.log(`--- script @ 0x${id.toString(16).padStart(4, "0").toUpperCase()} (${id}) ---`);
    for (const inst of instructions) {
      console.log(`  [${inst.index.toString().padStart(5)} | 0x${inst.index.toString(16).padStart(4, "0").toUpperCase()}]${formatInstruction(inst, assets)}`);
    }
  });

cli
  .command("scene [id]", "Show scene information and event objects")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    const totalScenes = assets.getSceneCount();

    if (idStr === undefined) {
      console.log(`Scene IDs range: 1 to ${totalScenes}`);
      return;
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 1 || id > totalScenes) {
      console.error(`Invalid scene ID: ${idStr}. Range: 1 to ${totalScenes}`);
      return;
    }

    const sceneData = assets.getScene(id);
    console.log(`\n-- raw scene data (scene ${id}) --`);
    console.log(`  wMapNum:           ${sceneData.mapNum}`);
    console.log(`  wScriptOnEnter:    0x${sceneData.scriptOnEnter.toString(16).padStart(4, "0").toUpperCase()}`);
    console.log(`  wScriptOnTeleport: 0x${sceneData.scriptOnTeleport.toString(16).padStart(4, "0").toUpperCase()}`);
    console.log(`  wEventObjectIndex: ${sceneData.eventObjectIndex}`);

    const objects = assets.getSceneEventObjects(id);

    console.log("\n  slot  coords       script  auto   mode  state  sprite  label");
    for (const obj of objects) {
      const { x: tx, y: ty, h } = pixelToTile(obj.x, obj.y);
      const coords = `(${tx.toString().padStart(3)},${ty.toString().padStart(3)})h${h}`;

      const label = assets.getScriptSummary(obj.triggerScript);
      console.log(`  ${obj.slot.toString().padStart(4)}  ${coords}  0x${obj.triggerScript.toString(16).padStart(4, "0").toUpperCase()}  0x${obj.autoScript.toString(16).padStart(4, "0").toUpperCase()}  ${obj.triggerMode.toString().padStart(4)}  ${obj.state.toString().padStart(5)}  ${obj.spriteNum.toString().padStart(6)}  ${label}`);
    }
  });

cli
  .command("snapshot [file]", "Export a save as a full-scene GIF with a viewport box")
  .option("--items", "Highlight active treasure and cash reward sources in the current scene")
  .option("--scene <id>", "Render a different logical scene using save-altered object state")
  .option("--dir <dir>", "Game directory")
  .action((file, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);

    if (!file) {
      console.error("Please provide a path to a save file (.RPG).");
      return;
    }

    if (!existsSync(file)) {
      console.error(`File not found: ${file}`);
      return;
    }

    const save = assets.parseSave(readFileSync(file));
    const targetScene = options.scene !== undefined ? parseInt(options.scene, 10) : save.numScene;
    if (isNaN(targetScene) || targetScene < 1 || targetScene > assets.getSceneCount()) {
      console.error(`Invalid scene ID: ${options.scene}. Range: 1 to ${assets.getSceneCount()}`);
      return;
    }

    exportSnapshot(assets, file, targetScene, Boolean(options.items));
  });

cli
  .command("save [file] [scene]", "Display information from a save file (.RPG)")
  .option("--dir <dir>", "Game directory (for name lookups)")
  .action((file, sceneStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);

    if (!file) {
      console.error("Please provide a path to a save file (.RPG).");
      return;
    }

    if (!existsSync(file)) {
      console.error(`File not found: ${file}`);
      return;
    }

    const data = readFileSync(file);
    const save = assets.parseSave(data);

    const currentScene = save.numScene;
    const targetScene = sceneStr !== undefined ? parseInt(sceneStr, 10) : currentScene;

    if (isNaN(targetScene) || targetScene < 1 || targetScene > assets.getSceneCount()) {
      console.error(`Invalid scene ID: ${sceneStr}. Range: 1 to ${assets.getSceneCount()}`);
      return;
    }

    const sceneData = assets.getScene(targetScene);
    const saveSceneData = assets.getScene(currentScene);

    console.log(`\n=== Save File: ${file} ===`);
    console.log(`  Save Count:  ${save.savedTimes}`);
    console.log(`  Cash:        ${save.cash}`);
    console.log(`  Current:     Scene ${currentScene} (Map ${saveSceneData.mapNum})`);
    if (targetScene !== currentScene) {
      console.log(`  Viewing:     Scene ${targetScene} (Map ${sceneData.mapNum})`);
    }
    console.log(`  Viewport:    (${save.viewportX}, ${save.viewportY})`);
    console.log(`  Party Count: ${save.partyMemberCount}`);

    console.log("\n--- Active Party ---");
    console.log("  Role  ID  Name       Position    Frame");
    save.party.forEach((p, i) => {
      const name = assets.getWord(36 + p.roleId);
      console.log(`  #${i + 1}   ${p.roleId}   ${padVisual(name, 10)} (${p.x.toString().padStart(5)}, ${p.y.toString().padStart(5)})  ${p.frame}`);
    });

    console.log("\n--- Inventory ---");
    if (save.inventory.length === 0) {
      console.log("  (Empty)");
    } else {
      console.log("  Slot  ID    Name                 Qty");
      save.inventory.forEach(item => {
        const name = assets.getWord(item.itemId);
        console.log(`  ${item.index.toString().padStart(4)}  ${item.itemId.toString().padStart(4)}  ${padVisual(name, 20)} ${item.quantity}`);
      });
    }

    console.log("\n--- Player Roles (Stats) ---");
    save.playerRoles.forEach(role => {
      if (role.level === 0) return;
      const name = assets.getWord(36 + role.roleId);
      console.log(`  [${role.roleId}] ${name} (LV ${role.level})`);
      console.log(`    HP: ${role.hp}/${role.maxHP}  MP: ${role.mp}/${role.maxMP}`);
      console.log(`    ATK: ${role.attackStrength.toString().padStart(3)}  DEF: ${role.defense.toString().padStart(3)}  DEX: ${role.dexterity.toString().padStart(3)}  MGK: ${role.magicStrength.toString().padStart(3)}`);
      
      const equipNames = role.equipment.map(id => id === 0 ? "---" : assets.getWord(id));
      console.log(`    Equip: ${equipNames.join(", ")}`);
      
      const magicNames = role.magics.map(id => assets.getWord(id));
      if (magicNames.length > 0) {
        console.log(`    Magics: ${magicNames.join(", ")}`);
      }
    });

    console.log(`\n--- Event Object Table (Scene ${targetScene}) ---`);
    console.log("  slot  coords       script  auto   mode  state  sprite  label");
    const model = assets.loadSceneModel(targetScene);
    model.applyState(save, targetScene);
    const objects = Array.from(model.objects.values()).sort((a, b) => a.data.slot - b.data.slot);
    objects.forEach(obj => {
      const { x: tx, y: ty, h } = pixelToTile(obj.x, obj.y);
      const coords = `(${tx.toString().padStart(3)},${ty.toString().padStart(3)})h${h}`;
      const label = assets.getScriptSummary(obj.data.triggerScript);
      console.log(`  ${obj.data.slot.toString().padStart(4)}  ${coords}  0x${obj.data.triggerScript.toString(16).padStart(4, "0").toUpperCase()}  0x${obj.data.autoScript.toString(16).padStart(4, "0").toUpperCase()}  ${obj.data.triggerMode.toString().padStart(4)}  ${obj.state.toString().padStart(5)}  ${obj.data.spriteNum.toString().padStart(6)}  ${label}`);
    });
  });

cli
  .command("battle [group]", "Show enemy group composition: obj#, name, ABC.MKF sprite index")
  .option("--dir <dir>", "Game directory")
  .option("--all", "Show all teams (ignore [group] argument)")
  .action((groupStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    const numTeams = assets.getArchive("DATA.MKF").getChunk(2).length / 10; // Subfile 2 is EnemyTeam

    const printTeam = (g: number) => {
      const enemies = assets.getEnemyTeam(g);
      if (enemies.length === 0) return;
      const entries = enemies.map(e => `${e.wordId} ${e.name} [enemy=${e.enemyId}, sprite=${e.spriteId}]`);
      console.log(`Team ${g}: ${entries.join("  |  ")}`);
    };

    if (options.all || groupStr === undefined) {
      for (let g = 0; g < numTeams; g++) printTeam(g);
    } else {
      const g = parseInt(groupStr, 10);
      if (isNaN(g) || g < 0 || g >= numTeams) {
        console.error(`Invalid group ${groupStr}. Range: 0 to ${numTeams - 1}`);
        return;
      }
      printTeam(g);
    }
  });

cli
  .command("enemy <id>", "Show complete enemy stats by WORD.DAT index")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    
    const wordId = parseInt(idStr, 10);
    if (isNaN(wordId) || wordId < 398 || wordId > 550) {
      console.error(`Invalid enemy word ID: ${idStr}. Range: 398 to 550`);
      return;
    }

    const stats = assets.getEnemyStatsByWord(wordId);
    if (!stats) {
      console.error(`No enemy stats found for word ID ${wordId}`);
      return;
    }

    const name = assets.getWord(wordId);
    
    let stealItemName = "None";
    if (stats.stealItem !== 0) stealItemName = assets.getWord(stats.stealItem) || "Unknown";
    
    let magicName = "None";
    if (stats.magic !== 0) magicName = assets.getWord(stats.magic) || "Unknown";

    const effAtk = getEffectiveAttack(stats.level, stats.attackStrength);
    const effDef = getEffectiveDefense(stats.level, stats.defense);

    console.log(`Enemy Word ID: ${wordId}  |  Name: "${name}"  |  Enemy ID: ${stats.id}  |  Sprite ID: ${stats.spriteId}`);
    console.log(`HP: ${stats.health}  |  Level: ${stats.level}  |  Exp: ${stats.exp}  |  Cash: ${stats.cash}`);
    console.log(`Attack: ${effAtk} (Base: ${stats.attackStrength})  |  Defense: ${effDef} (Base: ${stats.defense})`);
    console.log(`Magic: ${stats.magicStrength}  |  Dexterity: ${stats.dexterity}`);
    console.log(`Elem Resistances (Wind, Lightning, Water, Fire, Earth): ${stats.elemResistance.join(", ")}`);
    console.log(`Physical Resistance (Divisor): ${stats.physicalResistance}  |  Poison Resistance: ${stats.poisonResistance}`);
    console.log(`Steal Item: ${stats.stealItem} (${stealItemName}, Amt: ${stats.stealItemAmount})`);
    console.log(`Magic Spell: ${stats.magic} (${magicName})`);
  });

cli
  .command("item <id>", "Show complete item metadata by WORD.DAT index")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = getGameDir(options.dir);
    const assets = getLoader(gameDir);
    
    const wordId = parseInt(idStr, 10);
    if (isNaN(wordId) || wordId < 61 || wordId > 294) {
      console.error(`Invalid item word ID: ${idStr}. Range: 61 to 294`);
      return;
    }

    const item = assets.getItem(wordId);
    if (!item) {
      console.error(`No item metadata found for word ID ${wordId}`);
      return;
    }

    const flags = [];
    if (item.flags.usable) flags.push("usable");
    if (item.flags.equippable) flags.push("equippable");
    if (item.flags.throwable) flags.push("throwable");
    if (item.flags.consuming) flags.push("consuming");
    if (item.flags.applyToAll) flags.push("applyToAll");
    if (item.flags.sellable) flags.push("sellable");

    const compat = item.flags.equippableByRole
      .map((e, i) => e ? assets.getWord(36 + i) : null)
      .filter(r => r !== null);

    console.log(`Item Word ID: ${item.id}  |  Name: "${item.name}"  |  Sprite ID: ${item.spriteId}`);
    console.log(`Price: ${item.price}`);
    console.log(`Script On Use: 0x${item.scriptOnUse.toString(16).padStart(4, "0").toUpperCase()} (${item.scriptOnUse})  |  Script On Equip: 0x${item.scriptOnEquip.toString(16).padStart(4, "0").toUpperCase()} (${item.scriptOnEquip})`);
    console.log(`Script On Throw: 0x${item.scriptOnThrow.toString(16).padStart(4, "0").toUpperCase()} (${item.scriptOnThrow})${item.scriptDesc !== undefined ? `  |  Script Desc: 0x${item.scriptDesc.toString(16).padStart(4, "0").toUpperCase()} (${item.scriptDesc})` : ""}`);
    console.log(`Flags: ${flags.join(", ") || "none"}`);
    if (compat.length > 0) {
      console.log(`Role Compatibility: ${compat.join(", ")}`);
    }
  });

cli.help();
if (process.argv.length <= 2) {
  cli.outputHelp();
} else {
  cli.parse();
}
