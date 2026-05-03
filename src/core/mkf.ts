import { ByteReader, type ByteSource } from "./binary.js";

/**
 * Represents an MKF archive, a chunk-based file format used in PAL.
 * The archive begins with an offset table that points to the start of each chunk.
 * Chunks are indexed starting from 0.
 */
export class MkfArchive {
  readonly bytes: Uint8Array;
  readonly offsets: Uint32Array;

  private constructor(bytes: Uint8Array, offsets: Uint32Array) {
    this.bytes = bytes;
    this.offsets = offsets;
  }

  /**
   * Creates an MkfArchive from a ByteSource.
   * Parses the offset table and validates that offsets are within the input bounds and in order.
   */
  static fromBytes(source: ByteSource): MkfArchive {
    const reader = new ByteReader(source, "MKF");
    const firstOffset = reader.readUint32LE(0);

    if (firstOffset < 8 || firstOffset % 4 !== 0) {
      throw new Error("Invalid MKF offset table.");
    }

    if (firstOffset > reader.length) {
      throw new Error("MKF offset table overruns input.");
    }

    const offsetCount = firstOffset / 4;
    const chunkCount = offsetCount - 1;
    const offsets = new Uint32Array(offsetCount);

    for (let i = 0; i < offsetCount; i += 1) {
      offsets[i] = reader.readUint32LE(i * 4);
    }

    for (let i = 0; i < offsets.length; i += 1) {
      const offset = offsets[i]!;
      if (offset > reader.length) {
        throw new Error(`MKF offset ${i} points beyond the archive.`);
      }

      if (i === 0 && offset !== firstOffset) {
        throw new Error("Invalid MKF offset table.");
      }

      if (i > 0 && offset < offsets[i - 1]!) {
        throw new Error(`MKF offset ${i} is out of order.`);
      }
    }

    const archive = new MkfArchive(reader.bytes, offsets);
    if (archive.chunkCount !== chunkCount) {
      throw new Error("Internal MKF chunk count mismatch.");
    }
    return archive;
  }

  /** The number of chunks contained in the archive. */
  get chunkCount(): number {
    return this.offsets.length - 1;
  }

  /**
   * Retrieves the raw byte data for a specific chunk by index.
   * @throws {Error} If the index is out of range or the chunk has invalid bounds.
   */
  getChunk(index: number): Uint8Array {
    if (!Number.isInteger(index) || index < 0 || index >= this.chunkCount) {
      throw new Error(`MKF chunk index ${index} out of range (0-${this.chunkCount - 1}).`);
    }

    const start = this.offsets[index]!;
    const end = this.offsets[index + 1]!;
    if (end < start || end > this.bytes.length) {
      throw new Error(`MKF chunk ${index} has invalid bounds.`);
    }

    return this.bytes.subarray(start, end);
  }
}

/**
 * Convenience function to parse an MKF archive.
 */
export function parseMkf(source: ByteSource): MkfArchive {
  return MkfArchive.fromBytes(source);
}
