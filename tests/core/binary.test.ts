import { describe, expect, test } from "vitest";

import { ByteReader, WordBitReader, readUint16LE, readUint32LE, toSigned16 } from "../../src/core/binary.js";

describe("binary helpers", () => {
  test("read little-endian values", () => {
    const bytes = new Uint8Array([0x34, 0x12, 0xef, 0xcd, 0xab, 0x89]);
    expect(readUint16LE(bytes, 0)).toBe(0x1234);
    expect(readUint32LE(bytes, 2)).toBe(0x89abcdef);
  });

  test("toSigned16 converts unsigned word to signed short", () => {
    expect(toSigned16(0x0000)).toBe(0);
    expect(toSigned16(0x0001)).toBe(1);
    expect(toSigned16(0x7FFF)).toBe(32767);
    expect(toSigned16(0x8000)).toBe(-32768);
    expect(toSigned16(0xFFFF)).toBe(-1);
    expect(toSigned16(0xFE0C)).toBe(-500);
  });

  test("read signed 16-bit values", () => {
    const bytes = new Uint8Array([0xff, 0xff, 0x01, 0x80]);
    expect(ByteReader.prototype.readInt16LE.call({ bytes, label: "test" }, 0)).toBe(-1);
    expect(ByteReader.prototype.readInt16LE.call({ bytes, label: "test" }, 2)).toBe(-32767);
    
    const reader = new ByteReader(new Uint8Array([0x01, 0x00, 0xfe, 0xff]), "test");
    expect(reader.readInt16LE(0)).toBe(1);
    expect(reader.readInt16LE(2)).toBe(-2);
  });

  test("ByteReader keeps typed access together", () => {
    const reader = new ByteReader(new Uint8Array([0x78, 0x56, 0x34, 0x12]), "fixture");
    expect(reader.readUint16LE(0)).toBe(0x5678);
    expect(reader.readUint32LE(0)).toBe(0x12345678);
  });

  test("WordBitReader matches the YJ_1 word-aligned bit order", () => {
    const reader = new WordBitReader(new Uint8Array([0x00, 0xc0, 0x00, 0xc0]), "fixture");
    expect(reader.readBits(2)).toBe(3);
    expect(reader.readBits(2)).toBe(0);
    expect(reader.readBits(12)).toBe(0);
    expect(reader.readBits(2)).toBe(3);
  });

  test("range overruns fail loudly", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02]);
    expect(() => readUint32LE(bytes, 0)).toThrow(/overruns input/);
  });
});
