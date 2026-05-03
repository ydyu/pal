import { decodeRleFrame, getSpriteFrameBytes } from "../codecs/rle.js";
/**
 * Handles optimized drawing of RLE frames and tiles to a Surface.
 * Includes a cache to prevent redundant RLE decoding.
 */
export class Blitter {
    frameCache = new Map();
    /**
     * Draws an RLE-encoded frame from a sprite directory to the surface.
     * @param surface Target surface.
     * @param directory Sprite directory containing the frame.
     * @param frameIndex Index of the frame in the directory.
     * @param x Destination X coordinate.
     * @param y Destination Y coordinate.
     * @param cacheKey Unique key for the directory (e.g., map ID or sprite type+id).
     */
    drawSpriteFrame(surface, directory, frameIndex, x, y, cacheKey) {
        const frame = this.getFrame(directory, frameIndex, cacheKey);
        if (frame) {
            this.drawPixels(surface, frame, x, y);
        }
    }
    /**
     * Directly draws a decoded RleFrame to the surface.
     */
    drawPixels(surface, frame, destX, destY) {
        const { width, height, pixels, mask } = frame;
        // Simple clipping and blitting
        for (let y = 0; y < height; y++) {
            const sy = destY + y;
            if (sy < 0 || sy >= surface.height)
                continue;
            for (let x = 0; x < width; x++) {
                const sx = destX + x;
                if (sx < 0 || sx >= surface.width)
                    continue;
                const index = y * width + x;
                if (mask[index] !== 0) {
                    const colorIndex = pixels[index];
                    surface.setPixel(sx, sy, colorIndex);
                }
            }
        }
    }
    /**
     * Retrieves a decoded frame from the cache or decodes it on demand.
     */
    getFrame(directory, frameIndex, cacheKey) {
        const key = cacheKey ? `${cacheKey}:${frameIndex}` : null;
        if (key && this.frameCache.has(key)) {
            return this.frameCache.get(key);
        }
        const frameBytes = getSpriteFrameBytes(directory, frameIndex);
        const frame = decodeRleFrame(frameBytes);
        if (key) {
            this.frameCache.set(key, frame);
        }
        return frame;
    }
    /**
     * Clears the internal frame cache.
     */
    clearCache() {
        this.frameCache.clear();
    }
}
//# sourceMappingURL=blitter.js.map