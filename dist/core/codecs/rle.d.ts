import { type ByteSource } from "../binary.js";
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
export declare function wrapSingleFrameSprite(rleData: Uint8Array): SpriteDirectory;
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
export declare function parseSpriteDirectory(source: ByteSource): SpriteDirectory;
/**
 * Retrieves the raw RLE-encoded bytes for a specific frame within a sprite chunk.
 * @returns The frame's byte data, or null if the index is invalid or the frame is missing.
 */
export declare function getSpriteFrameBytes(directory: SpriteDirectory, frameIndex: number): Uint8Array | null;
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
export declare function decodeRleFrame(source: ByteSource | null | undefined): RleFrame | null;
