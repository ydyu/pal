import { type ByteSource } from "../binary.js";
/**
 * Decodes a Big5-encoded buffer into a string, stripping null bytes and whitespace.
 */
export declare function decodeBig5(bytes: Uint8Array): string;
/**
 * Parses fixed-length 10-byte strings from WORD.DAT.
 * @param source The raw bytes of WORD.DAT.
 * @returns An array of strings.
 */
export declare function parseWordDat(source: ByteSource): string[];
/**
 * Parses dialogue strings from M.MSG using the offset table from SSS.MKF subfile [3].
 * @param offsetTable The raw bytes of SSS.MKF subfile [3] (u32 LE offsets).
 * @param messageData The raw bytes of M.MSG.
 * @returns An array of decoded strings.
 */
export declare function parseMessages(offsetTable: ByteSource, messageData: ByteSource): string[];
