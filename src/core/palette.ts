import { assertRange } from "./binary.js";

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
export function decodePalette(chunk: Uint8Array, isNight: boolean = false): Color[] {
  if (chunk.length !== 768 && chunk.length !== 1536) {
    throw new Error(`Invalid palette chunk size: ${chunk.length}. Expected 768 or 1536 bytes.`);
  }
  
  const offset = isNight && chunk.length === 1536 ? 768 : 0;
  const colors: Color[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const idx = offset + i * 3;
    colors[i] = {
      r: Math.min(255, chunk[idx]! << 2),
      g: Math.min(255, chunk[idx + 1]! << 2),
      b: Math.min(255, chunk[idx + 2]! << 2),
    };
  }
  return colors;
}

/**
 * Packs a Color array into a Uint32Array (0xRRGGBB).
 * Supports both single colors array and PaletteSet with day/night.
 */
export function packPaletteUint32(colors: Color[] | PaletteSet): Uint32Array {
  const palette = Array.isArray(colors) ? colors : colors.day;
  const result = new Uint32Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    const { r, g, b } = palette[i]!;
    result[i] = (r << 16) | (g << 8) | b;
  }
  return result;
}
