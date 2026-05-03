/**
 * Represents an RGB color with 8-bit components.
 */
export interface Color {
    /** Red component (0-255). */
    r: number;
    /** Green component (0-255). */
    g: number;
    /** Blue component (0-255). */
    b: number;
}
/**
 * Represents a palette set with optional day/night modes.
 */
export interface PaletteSet {
    day: Color[];
    night?: Color[];
}
/**
 * Decodes a PAL palette chunk (256 * 3 bytes, 6-bit VGA colors) into 8-bit RGB.
 * Supports single 768-byte chunks (day-only) or combined 1536-byte chunks (day + night).
 * @param chunk 768 or 1536 bytes of palette data.
 * @param isNight If true and chunk is 1536 bytes, decode the night palette (second half).
 * @returns Array of 256 colors.
 */
export declare function decodePalette(chunk: Uint8Array, isNight?: boolean): Color[];
/**
 * Packs a Color array into a Uint32Array (0xRRGGBB).
 * Supports both single colors array and PaletteSet with day/night.
 */
export declare function packPaletteUint32(colors: Color[] | PaletteSet): Uint32Array;
