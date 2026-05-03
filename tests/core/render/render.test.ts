import { describe, it, expect } from "vitest";
import { MemorySurface } from "../../../src/core/render/surface.js";
import { Blitter } from "../../../src/core/render/blitter.js";
import { PaletteRenderer } from "../../../src/core/render/palette-render.js";
import { type RleFrame } from "../../../src/core/codecs/rle.js";

describe("rendering engine (Phase 3)", () => {
  describe("MemorySurface", () => {
    it("should set and get pixels correctly", () => {
      const surface = new MemorySurface(10, 10);
      surface.setPixel(5, 5, 42);
      expect(surface.getPixel(5, 5)).toBe(42);
    });

    it("should handle out-of-bounds pixels gracefully", () => {
      const surface = new MemorySurface(10, 10);
      surface.setPixel(100, 100, 42);
      expect(surface.getPixel(100, 100)).toBe(0);
    });

    it("should clear with a specific color", () => {
      const surface = new MemorySurface(2, 2);
      surface.clear(255);
      expect(Array.from(surface.getPixels())).toEqual([255, 255, 255, 255]);
    });
  });

  describe("Blitter", () => {
    it("should draw pixels with transparency from the mask and allow visible black", () => {
      const surface = new MemorySurface(4, 4);
      surface.clear(9);
      const blitter = new Blitter();
      
      const frame: RleFrame = {
        width: 2,
        height: 2,
        pixels: new Uint8Array([
          0, 1, // Transparent, Blue
          2, 0  // Green, visible black
        ]),
        mask: new Uint8Array([
          0, 1,
          1, 1
        ]),
      };

      blitter.drawPixels(surface, frame, 1, 1);

      expect(surface.getPixel(1, 1)).toBe(9);
      expect(surface.getPixel(2, 1)).toBe(1);
      expect(surface.getPixel(1, 2)).toBe(2);
      expect(surface.getPixel(2, 2)).toBe(0);
    });

    it("should clip frames to surface boundaries", () => {
      const surface = new MemorySurface(2, 2);
      const blitter = new Blitter();
      const frame: RleFrame = {
        width: 2,
        height: 2,
        pixels: new Uint8Array([1, 2, 3, 4]),
        mask: new Uint8Array([1, 1, 1, 1]),
      };

      // Draw partially off-screen
      blitter.drawPixels(surface, frame, 1, 1);
      
      expect(surface.getPixel(1, 1)).toBe(1);
      expect(surface.getPixel(0, 0)).toBe(0);
    });
  });

  describe("PaletteRenderer", () => {
    it("should convert indexed pixels to RGBA", () => {
      const surface = new MemorySurface(1, 1);
      surface.setPixel(0, 0, 1);
      
      const palette = new Array(256).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
      palette[1] = { r: 255, g: 128, b: 0 };
      
      const renderer = new PaletteRenderer();
      const rgba = renderer.toRgba(surface, palette);
      
      expect(rgba[0]).toBe(255);
      expect(rgba[1]).toBe(128);
      expect(rgba[2]).toBe(0);
      expect(rgba[3]).toBe(255);
    });

    it("should handle transparency (index 0)", () => {
      const surface = new MemorySurface(1, 1);
      surface.setPixel(0, 0, 0);
      
      const palette = new Array(256).fill(null).map(() => ({ r: 255, g: 255, b: 255 }));
      
      const renderer = new PaletteRenderer();
      const rgba = renderer.toRgba(surface, palette);
      
      expect(rgba[3]).toBe(0); // Alpha channel should be 0
    });
  });
});
