import { cac } from "cac";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GifWriter } from "omggif";

import {
  MkfArchive,
  decompressYj1,
  isYj1Compressed,
  decodeRleFrame,
  getSpriteFrameBytes,
  parseSpriteDirectory,
  readUint32LE,
  decodePalette,
  packPaletteUint32,
  iterateMapTiles
} from "../src/index.js";

const cli = cac("pal-export");

function loadPalette(gameDir: string, id: number = 0) {
  const buf = readFileSync(join(gameDir, "PAT.MKF"));
  const archive = MkfArchive.fromBytes(buf);
  const chunk = archive.getChunk(id);
  const colors = decodePalette(chunk);
  return packPaletteUint32(colors);
}

function loadMkf(gameDir: string, file: string) {
  const path = join(gameDir, file);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return MkfArchive.fromBytes(readFileSync(path));
}

function getDecompressedChunk(archive: MkfArchive, id: number) {
  const chunk = archive.getChunk(id);
  if (isYj1Compressed(chunk)) {
    return decompressYj1(chunk);
  }
  return chunk;
}

cli
  .command("map [id]", "Export a map to GIF")
  .option("--dir <dir>", "Game directory")
  .action((idStr, options) => {
    const gameDir = options.dir || process.env.PAL_GAME_DIR || "/data/data/com.termux/files/home/dev/palgame";
    const mapArchive = loadMkf(gameDir, "MAP.MKF");

    if (idStr === undefined) {
      console.log(`Please provide a map ID. Range: 0 to ${mapArchive.chunkCount - 1}`);
      return;
    }

    const mapId = parseInt(idStr, 10);
    if (isNaN(mapId) || mapId < 0 || mapId >= mapArchive.chunkCount) {
      console.error(`Invalid map ID. Range: 0 to ${mapArchive.chunkCount - 1}`);
      return;
    }
    
    const palette = loadPalette(gameDir, 0);
    const gopArchive = loadMkf(gameDir, "GOP.MKF");
    
    const mapData = getDecompressedChunk(mapArchive, mapId);
    const gopData = gopArchive.getChunk(mapId);
    const gopDir = parseSpriteDirectory(gopData);
    
    const width = 2048;
    const height = 2048;
    const pixels = new Uint8Array(width * height);
    
    // Cache for decoded tiles
    const tileCache = new Map<number, { width: number, height: number, pixels: Uint8Array }>();

    function getTile(index: number) {
      if (index < 0) return null;
      if (tileCache.has(index)) return tileCache.get(index);
      const frameBytes = getSpriteFrameBytes(gopDir, index);
      const rle = decodeRleFrame(frameBytes);
      if (rle) tileCache.set(index, rle);
      return rle;
    }

    function drawTile(tileIdx: number, px: number, py: number) {
      const tile = getTile(tileIdx);
      if (!tile) return;
      
      for (let y = 0; y < tile.height; y++) {
        const dy = py + y;
        if (dy < 0 || dy >= height) continue;
        for (let x = 0; x < tile.width; x++) {
          const dx = px + x;
          if (dx < 0 || dx >= width) continue;
          const p = tile.pixels[y * tile.width + x];
          if (p !== 0) {
            pixels[dy * width + dx] = p;
          }
        }
      }
    }

    for (const tile of iterateMapTiles(mapData)) {
      drawTile(tile.lowerIdx, tile.px, tile.py);
      if (tile.upperIdx >= 0) {
        drawTile(tile.upperIdx, tile.px, tile.py);
      }
    }
    
    const outPath = `map_${mapId}.gif`;
    const buf = Buffer.alloc(width * height + 1024);
    const gif = new GifWriter(buf, width, height, { loop: 0 });
    gif.addFrame(0, 0, width, height, pixels, { palette, transparent: 0 });
    writeFileSync(outPath, buf.subarray(0, gif.end()));
    console.log(`Exported map to ${outPath}`);
  });

function exportSprite(gameDir: string, type: string, id: number, anim: boolean, frameIndex?: number) {
  const fileMap: Record<string, string> = {
    mgo: "MGO.MKF",
    ball: "BALL.MKF",
    f: "F.MKF",
    fire: "FIRE.MKF",
    rgm: "RGM.MKF"
  };
  
  const file = fileMap[type.toLowerCase()];
  if (!file) {
    console.error(`Unknown sprite type: ${type}. Available types: ${Object.keys(fileMap).join(", ")}`);
    return;
  }
  
  const archive = loadMkf(gameDir, file);
  let palette = loadPalette(gameDir, 0);
  
  const chunk = archive.getChunk(id);
  
  if (type.toLowerCase() === "ball" || type.toLowerCase() === "rgm") {
    const rle = decodeRleFrame(chunk.subarray(4));
    if (!rle) {
      console.error("Failed to decode RLE");
      return;
    }
    const outPath = `sprite_${type}_${id}.gif`;
    const buf = Buffer.alloc(rle.width * rle.height + 1024);
    const gif = new GifWriter(buf, rle.width, rle.height, { loop: 0 });
    gif.addFrame(0, 0, rle.width, rle.height, rle.pixels, { palette, transparent: 0 });
    writeFileSync(outPath, buf.subarray(0, gif.end()));
    console.log(`Exported ${type} sprite to ${outPath}`);
    return;
  }
  
  const decompressed = isYj1Compressed(chunk) ? decompressYj1(chunk) : chunk;
  const directory = parseSpriteDirectory(decompressed);
  
  if (!anim && frameIndex !== undefined) {
    const frameBytes = getSpriteFrameBytes(directory, frameIndex);
    const rle = decodeRleFrame(frameBytes);
    if (!rle) {
      console.error(`Failed to decode frame ${frameIndex}`);
      return;
    }
    const outPath = `sprite_${type}_${id}_${frameIndex}.gif`;
    const buf = Buffer.alloc(rle.width * rle.height + 1024);
    const gif = new GifWriter(buf, rle.width, rle.height, { loop: 0 });
    gif.addFrame(0, 0, rle.width, rle.height, rle.pixels, { palette, transparent: 0 });
    writeFileSync(outPath, buf.subarray(0, gif.end()));
    console.log(`Exported ${type} frame ${frameIndex} to ${outPath}`);
  } else {
    let maxWidth = 0;
    let maxHeight = 0;
    const frames = [];
    for (let i = 0; i < directory.numFrames; i++) {
      const bytes = getSpriteFrameBytes(directory, i);
      const rle = decodeRleFrame(bytes);
      if (rle) {
        if (rle.width > maxWidth) maxWidth = rle.width;
        if (rle.height > maxHeight) maxHeight = rle.height;
        frames.push(rle);
      }
    }
    
    if (frames.length === 0) {
      console.error(`No frames to animate.`);
      return;
    }
    
    const outPath = `anim_${type}_${id}.gif`;
    const buf = Buffer.alloc(maxWidth * maxHeight * (frames.length + 1) + 1024);
    const gif = new GifWriter(buf, maxWidth, maxHeight, { loop: 0 });
    
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const framePixels = new Uint8Array(maxWidth * maxHeight);
      for (let y = 0; y < f.height; y++) {
        for (let x = 0; x < f.width; x++) {
          const py = y + (maxHeight - f.height);
          const px = x + Math.floor((maxWidth - f.width) / 2);
          framePixels[py * maxWidth + px] = f.pixels[y * f.width + x];
        }
      }
      gif.addFrame(0, 0, maxWidth, maxHeight, framePixels, {
        palette,
        transparent: 0,
        disposal: 2,
        delay: 10
      });
    }
    writeFileSync(outPath, buf.subarray(0, gif.end()));
    console.log(`Exported ${type} animation to ${outPath}`);
  }
}

cli
  .command("sprite [type] [id] [frame]", "Export a sprite (mgo, ball, f, fire, rgm)")
  .option("--dir <dir>", "Game directory")
  .option("--anim", "Export as animated gif")
  .action((type, idStr, frameStr, options) => {
    const gameDir = options.dir || process.env.PAL_GAME_DIR || "/data/data/com.termux/files/home/dev/palgame";
    
    const fileMap: Record<string, string> = {
      mgo: "MGO.MKF",
      ball: "BALL.MKF",
      f: "F.MKF",
      fire: "FIRE.MKF",
      rgm: "RGM.MKF"
    };

    if (!type) {
      console.log(`Please provide a sprite type. Available types: ${Object.keys(fileMap).join(", ")}`);
      return;
    }

    const file = fileMap[type.toLowerCase()];
    if (!file) {
      console.error(`Unknown sprite type: ${type}. Available types: ${Object.keys(fileMap).join(", ")}`);
      return;
    }

    const archive = loadMkf(gameDir, file);

    if (idStr === undefined) {
      console.log(`Please provide an ID for ${type}. Range: 0 to ${archive.chunkCount - 1}`);
      return;
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 0 || id >= archive.chunkCount) {
      console.error(`Invalid ID for ${type}. Range: 0 to ${archive.chunkCount - 1}`);
      return;
    }

    const frame = frameStr !== undefined ? parseInt(frameStr, 10) : undefined;
    exportSprite(gameDir, type, id, !!options.anim, frame);
  });

cli.help();
if (process.argv.length <= 2) {
  cli.outputHelp();
} else {
  cli.parse();
}
