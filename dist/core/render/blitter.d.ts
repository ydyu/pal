import { type Surface } from "./surface.js";
import { type SpriteDirectory, type RleFrame } from "../codecs/rle.js";
/**
 * Handles optimized drawing of RLE frames and tiles to a Surface.
 * Includes a cache to prevent redundant RLE decoding.
 */
export declare class Blitter {
    private frameCache;
    /**
     * Draws an RLE-encoded frame from a sprite directory to the surface.
     * @param surface Target surface.
     * @param directory Sprite directory containing the frame.
     * @param frameIndex Index of the frame in the directory.
     * @param x Destination X coordinate.
     * @param y Destination Y coordinate.
     * @param cacheKey Unique key for the directory (e.g., map ID or sprite type+id).
     */
    drawSpriteFrame(surface: Surface, directory: SpriteDirectory, frameIndex: number, x: number, y: number, cacheKey?: string): void;
    /**
     * Directly draws a decoded RleFrame to the surface.
     */
    drawPixels(surface: Surface, frame: RleFrame, destX: number, destY: number): void;
    /**
     * Retrieves a decoded frame from the cache or decodes it on demand.
     */
    getFrame(directory: SpriteDirectory, frameIndex: number, cacheKey?: string): RleFrame | null;
    /**
     * Clears the internal frame cache.
     */
    clearCache(): void;
}
