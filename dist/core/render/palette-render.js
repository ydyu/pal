/**
 * Handles applying palettes to Surface data to produce final image buffers.
 */
export class PaletteRenderer {
    /**
     * Converts a Surface's indexed pixel data into a 32-bit RGBA buffer.
     * Useful for Canvas context.putImageData or PNG generation.
     *
     * @param surface Source indexed surface.
     * @param palette Array of 256 colors.
     * @returns Uint8ClampedArray (RGBA order: R, G, B, A).
     */
    toRgba(surface, palette) {
        const pixels = surface.getPixels();
        const rgba = new Uint8ClampedArray(surface.width * surface.height * 4);
        for (let i = 0; i < pixels.length; i++) {
            const colorIndex = pixels[i];
            const rgbaBase = i * 4;
            if (colorIndex === 0) {
                // Transparent
                rgba[rgbaBase] = 0;
                rgba[rgbaBase + 1] = 0;
                rgba[rgbaBase + 2] = 0;
                rgba[rgbaBase + 3] = 0;
            }
            else {
                const color = palette[colorIndex];
                if (color) {
                    rgba[rgbaBase] = color.r;
                    rgba[rgbaBase + 1] = color.g;
                    rgba[rgbaBase + 2] = color.b;
                    rgba[rgbaBase + 3] = 255;
                }
                else {
                    // Fallback for out-of-range index
                    rgba[rgbaBase] = 0;
                    rgba[rgbaBase + 1] = 0;
                    rgba[rgbaBase + 2] = 0;
                    rgba[rgbaBase + 3] = 255;
                }
            }
        }
        return rgba;
    }
}
//# sourceMappingURL=palette-render.js.map