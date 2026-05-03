/**
 * Normalizes a ByteSource into a Uint8Array.
 * If the source is already a Uint8Array, it is returned as-is.
 * Otherwise, a new Uint8Array view or copy is created.
 */
export function toUint8Array(source) {
    if (source instanceof Uint8Array) {
        return source;
    }
    if (source instanceof ArrayBuffer) {
        return new Uint8Array(source);
    }
    if (ArrayBuffer.isView(source)) {
        return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    }
    return Uint8Array.from(source);
}
/**
 * Validates that a requested offset and length are within the bounds of a buffer.
 * @throws {RangeError} If the range is invalid or exceeds the buffer's length.
 */
export function assertRange(bytes, offset, length, label = "buffer") {
    if (!Number.isInteger(offset) || offset < 0) {
        throw new RangeError(`Invalid ${label} offset ${offset}.`);
    }
    if (!Number.isInteger(length) || length < 0) {
        throw new RangeError(`Invalid ${label} length ${length}.`);
    }
    if (offset + length > bytes.length) {
        throw new RangeError(`${label} read overruns input (${offset} + ${length} > ${bytes.length}).`);
    }
}
/**
 * Reads a 16-bit unsigned integer in little-endian format.
 */
export function readUint16LE(bytes, offset, label = "buffer") {
    assertRange(bytes, offset, 2, label);
    return bytes[offset] | (bytes[offset + 1] << 8);
}
/**
 * Reads a 16-bit signed integer in little-endian format.
 */
export function readInt16LE(bytes, offset, label = "buffer") {
    const val = readUint16LE(bytes, offset, label);
    return toSigned16(val);
}
/**
 * Converts an unsigned 16-bit integer to a signed 16-bit integer.
 */
export function toSigned16(value) {
    return (value << 16) >> 16;
}
/**
 * Reads a 32-bit unsigned integer in little-endian format.
 */
export function readUint32LE(bytes, offset, label = "buffer") {
    assertRange(bytes, offset, 4, label);
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>> 0;
}
/**
 * Helper class for sequential or random-access reading of a byte buffer.
 */
export class ByteReader {
    bytes;
    label;
    constructor(source, label = "buffer") {
        this.bytes = toUint8Array(source);
        this.label = label;
    }
    /** Total length of the underlying buffer. */
    get length() {
        return this.bytes.length;
    }
    /** Reads a 16-bit unsigned integer at the given offset. */
    readUint16LE(offset) {
        return readUint16LE(this.bytes, offset, this.label);
    }
    /** Reads a 16-bit signed integer at the given offset. */
    readInt16LE(offset) {
        return readInt16LE(this.bytes, offset, this.label);
    }
    /** Reads a 32-bit unsigned integer at the given offset. */
    readUint32LE(offset) {
        return readUint32LE(this.bytes, offset, this.label);
    }
    /** Creates a sub-view of the buffer, with bounds checking. */
    subarray(start, end) {
        if (end === undefined) {
            assertRange(this.bytes, start, 0, this.label);
            return this.bytes.subarray(start);
        }
        assertRange(this.bytes, start, Math.max(0, end - start), this.label);
        return this.bytes.subarray(start, end);
    }
}
/**
 * Reads bits from a byte stream using 16-bit word-aligned chunks.
 * This matches the specific bit-reading behavior used in various PAL compression formats.
 */
export class WordBitReader {
    bytes;
    label;
    bitPosition;
    constructor(source, label = "bitstream", bitPosition = 0) {
        if (!Number.isInteger(bitPosition) || bitPosition < 0) {
            throw new RangeError(`Invalid ${label} bit position ${bitPosition}.`);
        }
        this.bytes = toUint8Array(source);
        this.label = label;
        this.bitPosition = bitPosition;
    }
    /** Current bit position in the stream. */
    get position() {
        return this.bitPosition;
    }
    /**
     * Reads up to 16 bits from the stream.
     * Bits are read from most-significant to least-significant within 16-bit little-endian words.
     */
    readBits(count) {
        if (!Number.isInteger(count) || count < 0 || count > 16) {
            throw new RangeError(`Invalid ${this.label} bit count ${count}.`);
        }
        if (count === 0) {
            return 0;
        }
        const byteOffset = (this.bitPosition >> 4) << 1;
        const bitOffset = this.bitPosition & 0x0f;
        const currentWord = readUint16LE(this.bytes, byteOffset, this.label);
        const crossesWordBoundary = count > 16 - bitOffset;
        const nextWord = crossesWordBoundary ? readUint16LE(this.bytes, byteOffset + 2, this.label) : 0;
        this.bitPosition += count;
        if (crossesWordBoundary) {
            const shiftedCount = count + bitOffset - 16;
            const mask = 0xffff >> bitOffset;
            return (((currentWord & mask) << shiftedCount) | (nextWord >> (16 - shiftedCount))) >>> 0;
        }
        return (((currentWord << bitOffset) & 0xffff) >>> (16 - count)) >>> 0;
    }
}
//# sourceMappingURL=binary.js.map