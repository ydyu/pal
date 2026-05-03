import { describe, it, expect } from "vitest";
import { decodePalette, packPaletteUint32, type PaletteSet } from "../../src/index.js";

describe("palette transformation", () => {
  it("should decode VGA 6-bit colors to 8-bit", () => {
    const chunk = new Uint8Array(768);
    // Color 1: RGB (1, 2, 3) in 6-bit -> (4, 8, 12) in 8-bit
    chunk[3] = 1;
    chunk[4] = 2;
    chunk[5] = 3;

    const colors = decodePalette(chunk);
    expect(colors[1]).toEqual({ r: 4, g: 8, b: 12 });
  });

  it("should decode 1536-byte chunk with day palette (first half)", () => {
    const chunk = new Uint8Array(1536);
    // Day palette: color 0 at offset 0
    chunk[0] = 10;
    chunk[1] = 20;
    chunk[2] = 30;
    
    const colors = decodePalette(chunk, false);
    expect(colors[0]).toEqual({ r: 40, g: 80, b: 120 });
  });

  it("should decode 1536-byte chunk with night palette (second half)", () => {
    const chunk = new Uint8Array(1536);
    // Night palette: color 0 at offset 768
    chunk[768] = 5;
    chunk[769] = 10;
    chunk[770] = 15;
    
    const colors = decodePalette(chunk, true);
    expect(colors[0]).toEqual({ r: 20, g: 40, b: 60 });
  });

  it("should throw on invalid chunk size", () => {
    const chunk = new Uint8Array(512);
    expect(() => decodePalette(chunk)).toThrow("Invalid palette chunk size");
  });

  it("should pack colors to uint32", () => {
    const colors = [{ r: 0xff, g: 0xaa, b: 0x55 }];
    const packed = packPaletteUint32(colors);
    expect(packed[0]).toBe(0xffaa55);
  });

  it("should pack PaletteSet to uint32 (uses day palette)", () => {
    const palette: PaletteSet = {
      day: [{ r: 0xff, g: 0xaa, b: 0x55 }],
      night: [{ r: 0x80, g: 0x55, b: 0x2a }]
    };
    const packed = packPaletteUint32(palette);
    expect(packed[0]).toBe(0xffaa55);
  });
});
