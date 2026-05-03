import { describe, it, expect } from "vitest";
import { iterateMapTiles } from "../../src/index.js";

describe("map layout", () => {
  it("should fail on invalid map size", () => {
    const data = new Uint8Array(100);
    expect(() => Array.from(iterateMapTiles(data))).toThrow();
  });

  it("should iterate exactly 128 * 64 * 2 tiles", () => {
    const data = new Uint8Array(128 * 64 * 2 * 4);
    const tiles = Array.from(iterateMapTiles(data));
    expect(tiles.length).toBe(128 * 64 * 2);
  });

  it("should correctly decode tile fields", () => {
    const data = new Uint8Array(128 * 64 * 2 * 4);
    // AA BB CC DD
    // AA = 0x12, BB = 0x15 (height 5, bit 4 set -> +256)
    // CC = 0x34, DD = 0x19 (height 9, bit 4 set -> +256)
    data[0] = 0x12;
    data[1] = 0x15;
    data[2] = 0x34;
    data[3] = 0x19;

    const [tile] = iterateMapTiles(data);
    expect(tile!.lowerIdx).toBe(0x112);
    expect(tile!.lowerHeight).toBe(5);
    expect(tile!.upperIdx).toBe(0x134 - 1);
    expect(tile!.upperHeight).toBe(9);
  });
});
