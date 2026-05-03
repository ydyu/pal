import { type ByteSource } from "./binary.js";
/**
 * Represents an MKF archive, a chunk-based file format used in PAL.
 * The archive begins with an offset table that points to the start of each chunk.
 * Chunks are indexed starting from 0.
 */
export declare class MkfArchive {
    readonly bytes: Uint8Array;
    readonly offsets: Uint32Array;
    private constructor();
    /**
     * Creates an MkfArchive from a ByteSource.
     * Parses the offset table and validates that offsets are within the input bounds and in order.
     */
    static fromBytes(source: ByteSource): MkfArchive;
    /** The number of chunks contained in the archive. */
    get chunkCount(): number;
    /**
     * Retrieves the raw byte data for a specific chunk by index.
     * @throws {Error} If the index is out of range or the chunk has invalid bounds.
     */
    getChunk(index: number): Uint8Array;
}
/**
 * Convenience function to parse an MKF archive.
 */
export declare function parseMkf(source: ByteSource): MkfArchive;
