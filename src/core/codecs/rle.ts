import { ByteReader, readUint16LE, type ByteSource } from "../binary.js";

/**
 * Supported sprite categories with semantic names.
 */
export type SpriteType = "world" | "item" | "playerBattle" | "enemyBattle" | "effect" | "portrait";

/**
 * Metadata for a sprite chunk, which contains a directory (offset table) and multiple frames.
 */
export interface SpriteDirectory {
  /** The full byte data of the sprite chunk. */
  chunk: Uint8Array;
  /**
   * The number of playable frames. For multi-frame sprites, this equals the raw
   * table word count minus the trailing sentinel entry. For single-frame sprites
   * (wordCount=1, no sentinel), this equals 1.
   */
  numFrames: number;
}

/**
 * Wraps raw RLE data into a SpriteDirectory structure for single-frame assets.
 * 
 * Some assets (like Items and Portraits in BALL.MKF/RGM.MKF) are stored as raw RLE
 * without the leading offset table. This function prepends the necessary 16-bit
 * word count (1) which also serves as the offset (1 word = 2 bytes) to the first frame.
 */
export function wrapSingleFrameSprite(rleData: Uint8Array): SpriteDirectory {
  const wrapped = new Uint8Array(2 + rleData.length);
  wrapped[0] = 1;
  wrapped[1] = 0; // wordCount = 1, which also means offset0 = 1 (2 bytes)
  wrapped.set(rleData, 2);
  return parseSpriteDirectory(wrapped);
}

/**
 * A decoded RLE frame.
 */
export interface RleFrame {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Raw pixel data (8-bit palette indices). */
  pixels: Uint8Array;
  /** 1 for decoded pixels, 0 for skipped transparent pixels. */
  mask: Uint8Array;
}

/**
 * Parses a sprite chunk's directory.
 * Sprite chunks begin with a 16-bit word count followed by an offset table.
 * Each offset in the table is in 16-bit words (must be multiplied by 2 to get bytes).
 */
export function parseSpriteDirectory(source: ByteSource): SpriteDirectory {
  const reader = new ByteReader(source, "sprite chunk");
  if (reader.length < 2) {
    throw new Error("Sprite chunk is truncated.");
  }

  const wordCount = reader.readUint16LE(0);
  if (wordCount * 2 > reader.length) {
    throw new Error("Sprite directory offset table is truncated.");
  }

  // The last word in the offset table is a sentinel (not a real frame).
  // Single-frame sprites (wordCount=1) have no sentinel.
  const numFrames = wordCount > 1 ? wordCount - 1 : wordCount;

  return {
    chunk: reader.bytes,
    numFrames
  };
}

/**
 * Retrieves the raw RLE-encoded bytes for a specific frame within a sprite chunk.
 * @returns The frame's byte data, or null if the index is invalid or the frame is missing.
 */
export function getSpriteFrameBytes(directory: SpriteDirectory, frameIndex: number): Uint8Array | null {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= directory.numFrames) {
    return null;
  }

  const tableOffset = frameIndex * 2;
  if (tableOffset + 2 > directory.chunk.length) {
    return null;
  }

  const start = readUint16LE(directory.chunk, tableOffset, "sprite directory") * 2;
  if (start <= 0 || start >= directory.chunk.length) {
    return null;
  }

  // Scan all table entries including the sentinel to find the end of this frame.
  // We derive the raw entry count directly from the chunk header so we see the sentinel.
  const rawWordCount = readUint16LE(directory.chunk, 0, "sprite directory");
  let end = directory.chunk.length;
  for (let i = frameIndex + 1; i < rawWordCount; i += 1) {
    const candidateOffset = i * 2;
    if (candidateOffset + 2 > directory.chunk.length) {
      break;
    }

    const candidate = readUint16LE(directory.chunk, candidateOffset, "sprite directory") * 2;
    if (candidate > start) {
      end = candidate;
      break;
    }
  }

  return directory.chunk.subarray(start, end);
}

/**
 * Decodes an RLE-encoded sprite frame.
 * 
 * The format uses a simple RLE scheme:
 * - A byte with the high bit set (0x80 + N) represents N transparent/skipped pixels.
 * - Other bytes represent a literal run of N pixels following the token.
 * 
 * @param source The RLE-encoded bytes for a single frame.
 * @returns Decoded frame metadata and pixels, or null if decoding fails.
 */
export function decodeRleFrame(source: ByteSource | null | undefined): RleFrame | null {
  if (source == null) {
    return null;
  }

  const frameBytes = source instanceof Uint8Array ? source : new ByteReader(source, "RLE frame").bytes;
  if (frameBytes.length < 4) {
    return null;
  }

  let offset = 0;
  // Some frames have an optional 4-byte header [0x02, 0x00, 0x00, 0x00]
  if (
    frameBytes.length >= 8 &&
    frameBytes[0] === 0x02 &&
    frameBytes[1] === 0x00 &&
    frameBytes[2] === 0x00 &&
    frameBytes[3] === 0x00
  ) {
    offset = 4;
  }

  if (offset + 4 > frameBytes.length) {
    return null;
  }

  const width = readUint16LE(frameBytes, offset, "RLE frame");
  const height = readUint16LE(frameBytes, offset + 2, "RLE frame");
  offset += 4;

  if (width === 0 || height === 0 || width > 2048 || height > 2048) {
    return null;
  }

  const pixels = new Uint8Array(width * height);
  const mask = new Uint8Array(width * height);
  let pixelIndex = 0;

  while (pixelIndex < pixels.length && offset < frameBytes.length) {
    const token = frameBytes[offset]!;
    offset += 1;

    if ((token & 0x80) !== 0 && token <= 0x80 + width) {
      // Token specifies a number of pixels to skip (transparency).
      pixelIndex += token - 0x80;
      continue;
    }

    // Token specifies a literal run of N pixels.
    const count = token;
    const runEnd = Math.min(offset + count, frameBytes.length);
    const writeCount = Math.min(runEnd - offset, pixels.length - pixelIndex);
    pixels.set(frameBytes.subarray(offset, offset + writeCount), pixelIndex);
    mask.fill(1, pixelIndex, pixelIndex + writeCount);
    pixelIndex += writeCount;
    offset = runEnd;
  }

  return { width, height, pixels, mask };
}
