import { type ByteSource } from "../binary.js";
/**
 * Checks if a buffer contains a YJ_1 signature ("YJ_1" at offset 0).
 */
export declare function isYj1Compressed(source: ByteSource): boolean;
/**
 * Decompresses YJ_1 data.
 *
 * YJ_1 is a complex compression format used in PAL that combines:
 * 1. A shared Huffman-like tree for byte literal values.
 * 2. Multiple blocks, each optionally compressed using a custom LZSS scheme.
 * 3. A sophisticated bitstream format with variable-length codes for offsets and counts.
 *
 * @param source The YJ_1 compressed data.
 * @returns The uncompressed byte data.
 * @throws {Error} If the data is truncated, invalid, or decompression fails.
 */
export declare function decompressYj1(source: ByteSource): Uint8Array;
