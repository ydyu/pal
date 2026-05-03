/**
 * Union type representing various sources of raw byte data.
 */
export type ByteSource = Uint8Array | ArrayBuffer | ArrayBufferView | ArrayLike<number>;
/**
 * Normalizes a ByteSource into a Uint8Array.
 * If the source is already a Uint8Array, it is returned as-is.
 * Otherwise, a new Uint8Array view or copy is created.
 */
export declare function toUint8Array(source: ByteSource): Uint8Array;
/**
 * Validates that a requested offset and length are within the bounds of a buffer.
 * @throws {RangeError} If the range is invalid or exceeds the buffer's length.
 */
export declare function assertRange(bytes: Uint8Array, offset: number, length: number, label?: string): void;
/**
 * Reads a 16-bit unsigned integer in little-endian format.
 */
export declare function readUint16LE(bytes: Uint8Array, offset: number, label?: string): number;
/**
 * Reads a 16-bit signed integer in little-endian format.
 */
export declare function readInt16LE(bytes: Uint8Array, offset: number, label?: string): number;
/**
 * Converts an unsigned 16-bit integer to a signed 16-bit integer.
 */
export declare function toSigned16(value: number): number;
/**
 * Reads a 32-bit unsigned integer in little-endian format.
 */
export declare function readUint32LE(bytes: Uint8Array, offset: number, label?: string): number;
/**
 * Helper class for sequential or random-access reading of a byte buffer.
 */
export declare class ByteReader {
    readonly bytes: Uint8Array;
    readonly label: string;
    constructor(source: ByteSource, label?: string);
    /** Total length of the underlying buffer. */
    get length(): number;
    /** Reads a 16-bit unsigned integer at the given offset. */
    readUint16LE(offset: number): number;
    /** Reads a 16-bit signed integer at the given offset. */
    readInt16LE(offset: number): number;
    /** Reads a 32-bit unsigned integer at the given offset. */
    readUint32LE(offset: number): number;
    /** Creates a sub-view of the buffer, with bounds checking. */
    subarray(start: number, end?: number): Uint8Array;
}
/**
 * Reads bits from a byte stream using 16-bit word-aligned chunks.
 * This matches the specific bit-reading behavior used in various PAL compression formats.
 */
export declare class WordBitReader {
    private readonly bytes;
    private readonly label;
    private bitPosition;
    constructor(source: ByteSource, label?: string, bitPosition?: number);
    /** Current bit position in the stream. */
    get position(): number;
    /**
     * Reads up to 16 bits from the stream.
     * Bits are read from most-significant to least-significant within 16-bit little-endian words.
     */
    readBits(count: number): number;
}
