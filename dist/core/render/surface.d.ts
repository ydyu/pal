/**
 * A platform-neutral drawing surface for 8-bit indexed color data.
 */
export interface Surface {
    readonly width: number;
    readonly height: number;
    /**
     * Sets a pixel at (x, y) to the given palette index.
     * Coordinates are relative to the top-left of the surface.
     */
    setPixel(x: number, y: number, colorIndex: number): void;
    /**
     * Retrieves the palette index at (x, y).
     */
    getPixel(x: number, y: number): number;
    /**
     * Clears the surface with the specified color index (default: 0).
     */
    clear(colorIndex?: number): void;
    /**
     * Returns the raw pixel buffer as a Uint8Array.
     */
    getPixels(): Uint8Array;
}
/**
 * An in-memory implementation of the Surface interface.
 */
export declare class MemorySurface implements Surface {
    readonly width: number;
    readonly height: number;
    private readonly buffer;
    constructor(width: number, height: number);
    setPixel(x: number, y: number, colorIndex: number): void;
    getPixel(x: number, y: number): number;
    clear(colorIndex?: number): void;
    getPixels(): Uint8Array;
}
