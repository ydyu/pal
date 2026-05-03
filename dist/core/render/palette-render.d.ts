import { type Surface } from "./surface.js";
import { type Color } from "../palette.js";
/**
 * Handles applying palettes to Surface data to produce final image buffers.
 */
export declare class PaletteRenderer {
    /**
     * Converts a Surface's indexed pixel data into a 32-bit RGBA buffer.
     * Useful for Canvas context.putImageData or PNG generation.
     *
     * @param surface Source indexed surface.
     * @param palette Array of 256 colors.
     * @returns Uint8ClampedArray (RGBA order: R, G, B, A).
     */
    toRgba(surface: Surface, palette: Color[]): Uint8ClampedArray;
}
