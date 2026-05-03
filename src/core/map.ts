import { readUint32LE } from "./binary.js";
import { type SpriteDirectory } from "./codecs/rle.js";

/**
 * Represents a single tile within a PAL map, including its coordinates and indices.
 */
export interface MapTile {
  /** Column index (0-63). */
  x: number;
  /** Row index (0-127). */
  y: number;
  /** Calculated pixel X coordinate (relative to map origin). */
  px: number;
  /** Calculated pixel Y coordinate (relative to map origin). */
  py: number;
  /** Half-tile offset (0 or 1). 1 indicates the staggered tile. */
  h: number;
  /** Index of the frame in the lower tile-set. */
  lowerIdx: number;
  /** Index of the frame in the upper tile-set, or -1 if none. */
  upperIdx: number;
  /** Height or layer priority for the lower tile. */
  lowerHeight: number;
  /** Height or layer priority for the upper tile. */
  upperHeight: number;
}

/**
 * A combined Map object containing both layout and tile-set graphics.
 */
export interface PalMap {
  id: number;
  tiles: MapTile[];
  tileSet: SpriteDirectory;
}

/**
 * Iterates over map tiles in rendering order (y -> h -> x).
 * Each map is 128 rows x 64 columns, with 2 staggered tiles per slot.
 */
export function* iterateMapTiles(mapData: Uint8Array): Generator<MapTile> {
  if (mapData.length !== 128 * 64 * 2 * 4) {
    throw new Error("Invalid map data length.");
  }

  for (let y = 0; y < 128; y++) {
    for (let h = 0; h < 2; h++) {
      for (let x = 0; x < 64; x++) {
        const tileOffset = ((y * 64 + x) * 2) + h;
        const dword = readUint32LE(mapData, tileOffset * 4);

        const lowerIdx = (dword & 0xff) | ((dword >> 4) & 0x100);
        const upperIdx = (((dword >> 16) & 0xff) | ((dword >> 20) & 0x100)) - 1;
        
        const lowerHeight = (dword >> 8) & 0x0f;
        const upperHeight = (dword >> 24) & 0x0f;

        yield {
          x, y, h,
          px: x * 32 + h * 16 - 16,
          py: y * 16 + h * 8 - 8,
          lowerIdx,
          upperIdx,
          lowerHeight,
          upperHeight
        };
      }
    }
  }
}
