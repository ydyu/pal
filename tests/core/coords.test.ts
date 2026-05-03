import { describe, it, expect } from "vitest";
import { tileToPixel, pixelToTile, getTileDistance } from "../../src/core/coords.js";

describe("coordinate transforms", () => {
  it("should convert tile to pixel correctly (SDLPAL standard)", () => {
    // Standard: px = x*32 + h*16, py = y*16 + h*8
    expect(tileToPixel(0, 0, 0)).toEqual({ px: 0, py: 0 });
    expect(tileToPixel(1, 1, 0)).toEqual({ px: 32, py: 16 });
    expect(tileToPixel(0, 0, 1)).toEqual({ px: 16, py: 8 });
  });

  it("should convert pixel to tile correctly (SDLPAL standard)", () => {
    // Inverse of above
    expect(pixelToTile(0, 0)).toEqual({ x: 0, y: 0, h: 0 });
    expect(pixelToTile(32, 16)).toEqual({ x: 1, y: 1, h: 0 });
    expect(pixelToTile(16, 8)).toEqual({ x: 0, y: 0, h: 1 });
    
    // Test a real-world coordinate from the game (Xiaohu)
    expect(pixelToTile(1152, 1664)).toEqual({ x: 36, y: 104, h: 0 });
  });

  it("should calculate correct distances on the flat grid", () => {
    // (0,0)h0 and (0,0)h1 are adjacent (distance 1)
    expect(getTileDistance(0, 0, 0, 0, 0, 1)).toBe(1);
    
    // (0,0)h0 and (1,0,0) are distance 2 apart on flat grid
    // flat(0,0,0) = (0, 0)
    // flat(1,0,0) = (1, -1)
    // dist = |1-0| + |-1-0| = 2
    expect(getTileDistance(0, 0, 0, 1, 0, 0)).toBe(2);
  });
});
