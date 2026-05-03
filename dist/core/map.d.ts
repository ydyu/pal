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
export declare function iterateMapTiles(mapData: Uint8Array): Generator<MapTile>;
