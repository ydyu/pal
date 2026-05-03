import { ByteReader, WordBitReader, readUint16LE, readUint32LE, type ByteSource } from "../binary.js";

/**
 * Node in the Huffman-like tree used for YJ_1 literal values.
 */
interface Yj1TreeNode {
  leaf: boolean;
  value: number;
  left: number;
  right: number;
}

/**
 * Control tables and parameters for a single YJ_1 compressed block.
 */
interface Yj1BlockHeader {
  uncompressedLength: number;
  compressedLength: number;
  lzssRepeatTable: [number, number, number, number];
  lzssOffsetCodeLengthTable: [number, number, number, number];
  lzssRepeatCodeLengthTable: [number, number, number];
  codeCountCodeLengthTable: [number, number, number];
  codeCountTable: [number, number];
}

/**
 * Checks if a buffer contains a YJ_1 signature ("YJ_1" at offset 0).
 */
export function isYj1Compressed(source: ByteSource): boolean {
  const bytes = source instanceof Uint8Array ? source : new ByteReader(source).bytes;
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x59 &&
    bytes[1] === 0x4a &&
    bytes[2] === 0x5f &&
    bytes[3] === 0x31
  );
}

/**
 * Reads a loop/iteration count from the bitstream using the block header's tables.
 */
function readLoop(reader: WordBitReader, header: Yj1BlockHeader): number {
  if (reader.readBits(1) !== 0) {
    return header.codeCountTable[0];
  }

  const mode = reader.readBits(2);
  if (mode !== 0) {
    return reader.readBits(header.codeCountCodeLengthTable[mode - 1]!);
  }

  return header.codeCountTable[1];
}

/**
 * Reads an LZSS repeat count from the bitstream using the block header's tables.
 */
function readCount(reader: WordBitReader, header: Yj1BlockHeader): number {
  const mode = reader.readBits(2);
  if (mode !== 0) {
    if (reader.readBits(1) !== 0) {
      return reader.readBits(header.lzssRepeatCodeLengthTable[mode - 1]!);
    }
    return header.lzssRepeatTable[mode]!;
  }

  return header.lzssRepeatTable[0];
}

/**
 * Parses the 24-byte header for a YJ_1 block.
 */
function readBlockHeader(bytes: Uint8Array, offset: number): Yj1BlockHeader {
  return {
    uncompressedLength: readUint16LE(bytes, offset, "YJ_1"),
    compressedLength: readUint16LE(bytes, offset + 2, "YJ_1"),
    lzssRepeatTable: [
      readUint16LE(bytes, offset + 4, "YJ_1"),
      readUint16LE(bytes, offset + 6, "YJ_1"),
      readUint16LE(bytes, offset + 8, "YJ_1"),
      readUint16LE(bytes, offset + 10, "YJ_1")
    ],
    lzssOffsetCodeLengthTable: [
      bytes[offset + 12]!,
      bytes[offset + 13]!,
      bytes[offset + 14]!,
      bytes[offset + 15]!
    ],
    lzssRepeatCodeLengthTable: [
      bytes[offset + 16]!,
      bytes[offset + 17]!,
      bytes[offset + 18]!
    ],
    codeCountCodeLengthTable: [
      bytes[offset + 19]!,
      bytes[offset + 20]!,
      bytes[offset + 21]!
    ],
    codeCountTable: [
      bytes[offset + 22]!,
      bytes[offset + 23]!
    ]
  };
}

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
export function decompressYj1(source: ByteSource): Uint8Array {
  const reader = new ByteReader(source, "YJ_1");
  const input = reader.bytes;

  if (input.length < 16) {
    throw new Error("YJ_1 data is truncated.");
  }

  if (!isYj1Compressed(input)) {
    throw new Error("Missing YJ_1 signature.");
  }

  const uncompressedLength = readUint32LE(input, 4, "YJ_1");
  const blockCount = readUint16LE(input, 12, "YJ_1");
  const treeLength = input[15]! * 2;
  const flagOffset = 16 + treeLength;
  if (flagOffset > input.length) {
    throw new Error("YJ_1 tree header is truncated.");
  }

  // Parse the shared Huffman tree.
  const flagReader = new WordBitReader(input.subarray(flagOffset), "YJ_1 tree");
  const nodes: Yj1TreeNode[] = new Array(treeLength + 1);
  nodes[0] = { leaf: false, value: 0, left: 1, right: 2 };

  for (let i = 1; i <= treeLength; i += 1) {
    const leaf = flagReader.readBits(1) === 0;
    const value = input[15 + i]!;
    nodes[i] = {
      leaf,
      value,
      left: leaf ? -1 : (value << 1) + 1,
      right: leaf ? -1 : (value << 1) + 2
    };
  }

  const treeFootprint =
    (((treeLength & 0x0f) !== 0 ? (treeLength >> 4) + 1 : treeLength >> 4) << 1);
  let srcOffset = 16 + treeLength + treeFootprint;
  const output = new Uint8Array(uncompressedLength);
  let destOffset = 0;

  // Process each block.
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    if (srcOffset + 24 > input.length) {
      throw new Error("YJ_1 block header is truncated.");
    }

    const blockStart = srcOffset;
    const header = readBlockHeader(input, blockStart);
    srcOffset += 24;

    if (header.compressedLength === 0) {
      // Raw block.
      const rawEnd = srcOffset + header.uncompressedLength;
      if (rawEnd > input.length) {
        throw new Error("YJ_1 uncompressed block overruns input.");
      }
      output.set(input.subarray(srcOffset, rawEnd), destOffset);
      destOffset += header.uncompressedLength;
      srcOffset = rawEnd;
      continue;
    }

    if (blockStart + header.compressedLength > input.length) {
      throw new Error("YJ_1 compressed block overruns input.");
    }

    const bitReader = new WordBitReader(input.subarray(srcOffset, blockStart + header.compressedLength), "YJ_1 block");

    while (true) {
      // Step 1: Read byte literals using the shared tree.
      let loop = readLoop(bitReader, header);
      if (loop === 0) {
        break;
      }

      while (loop > 0) {
        let nodeIndex = 0;
        while (!nodes[nodeIndex]!.leaf) {
          nodeIndex = bitReader.readBits(1) !== 0 ? nodes[nodeIndex]!.right : nodes[nodeIndex]!.left;
        }

        if (destOffset >= output.length) {
          throw new Error("YJ_1 output exceeds advertised length.");
        }

        output[destOffset] = nodes[nodeIndex]!.value;
        destOffset += 1;
        loop -= 1;
      }

      // Step 2: Read back-references (LZSS).
      loop = readLoop(bitReader, header);
      if (loop === 0) {
        break;
      }

      while (loop > 0) {
        const count = readCount(bitReader, header);
        const mode = bitReader.readBits(2);
        const distance = bitReader.readBits(header.lzssOffsetCodeLengthTable[mode]!);
        if (distance <= 0 || distance > destOffset) {
          throw new Error("YJ_1 back-reference is invalid.");
        }

        for (let i = 0; i < count; i += 1) {
          if (destOffset >= output.length) {
            throw new Error("YJ_1 output exceeds advertised length.");
          }

          output[destOffset] = output[destOffset - distance]!;
          destOffset += 1;
        }
        loop -= 1;
      }
    }

    srcOffset = blockStart + header.compressedLength;
  }

  if (destOffset !== uncompressedLength) {
    throw new Error(`YJ_1 output length mismatch (${destOffset} !== ${uncompressedLength}).`);
  }

  return output;
}
