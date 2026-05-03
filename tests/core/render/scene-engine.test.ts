import { describe, expect, it, vi } from "vitest";
import { SceneEngine, type RenderableSprite } from "../../../src/core/render/scene-engine.js";
import { Blitter } from "../../../src/core/render/blitter.js";
import { MemorySurface } from "../../../src/core/render/surface.js";
import { type RleFrame } from "../../../src/core/codecs/rle.js";
import { type PalMap } from "../../../src/core/map.js";

describe("SceneEngine", () => {
  it("renders background first and places sprites using PAL top-left math", () => {
    const blitter = new Blitter();
    const frame: RleFrame = {
      width: 20,
      height: 12,
      pixels: new Uint8Array(20 * 12).fill(1),
      mask: new Uint8Array(20 * 12).fill(1),
    };
    vi.spyOn(blitter, "getFrame").mockReturnValue(frame);
    const bgSpy = vi.spyOn(blitter, "drawSpriteFrame").mockImplementation(() => {});
    const spriteSpy = vi.spyOn(blitter, "drawPixels").mockImplementation(() => {});

    const engine = new SceneEngine(blitter);
    const surface = new MemorySurface(100, 100);
    const map: PalMap = {
      id: 1,
      tiles: [
        {
          x: 0, y: 0, h: 0,
          px: 0, py: 0,
          lowerIdx: 10,
          upperIdx: 20,
          lowerHeight: 0,
          upperHeight: 0,
        },
      ],
      tileSet: { chunk: new Uint8Array(), numFrames: 100 },
    };
    const sprite: RenderableSprite = {
      directory: { chunk: new Uint8Array(), numFrames: 1 },
      frameIndex: 0,
      x: 16,
      y: 8,
      sLayer: 0,
    };

    engine.render(surface, map, [sprite], { x: 0, y: 0, width: 100, height: 100 });

    expect(bgSpy.mock.calls.map((call) => call[2])).toEqual([10, 20]);
    expect(spriteSpy).toHaveBeenCalledTimes(1);
    expect(spriteSpy.mock.calls[0]?.[2]).toBe(6);
    expect(spriteSpy.mock.calls[0]?.[3]).toBe(3);
  });

  it("uses the SDLPAL five-point cover-tile scan instead of a rectangle", () => {
    const blitter = new Blitter();
    const frame: RleFrame = {
      width: 32,
      height: 16,
      pixels: new Uint8Array(32 * 16).fill(1),
      mask: new Uint8Array(32 * 16).fill(1),
    };
    vi.spyOn(blitter, "getFrame").mockReturnValue(frame);
    vi.spyOn(blitter, "drawSpriteFrame").mockImplementation(() => {});
    const spriteSpy = vi.spyOn(blitter, "drawPixels").mockImplementation(() => {});

    const engine = new SceneEngine(blitter);
    const surface = new MemorySurface(200, 200);
    const map: PalMap = {
      id: 1,
      tiles: [
        {
          x: 0, y: 0, h: 0,
          px: -16, py: -8,
          lowerIdx: 77,
          upperIdx: -1,
          lowerHeight: 2,
          upperHeight: 0,
        },
      ],
      tileSet: { chunk: new Uint8Array(), numFrames: 100 },
    };
    const sprite: RenderableSprite = {
      directory: { chunk: new Uint8Array(), numFrames: 1 },
      frameIndex: 0,
      x: 64,
      y: 32,
      sLayer: 0,
    };

    engine.render(surface, map, [sprite], { x: 0, y: 0, width: 200, height: 200 });

    expect(spriteSpy).toHaveBeenCalledTimes(1);
  });

  it("applies explicit layer offsets when computing the final sprite Y", () => {
    const blitter = new Blitter();
    const frame: RleFrame = {
      width: 18,
      height: 10,
      pixels: new Uint8Array(18 * 10).fill(1),
      mask: new Uint8Array(18 * 10).fill(1),
    };
    vi.spyOn(blitter, "getFrame").mockReturnValue(frame);
    vi.spyOn(blitter, "drawSpriteFrame").mockImplementation(() => {});
    const spriteSpy = vi.spyOn(blitter, "drawPixels").mockImplementation(() => {});

    const engine = new SceneEngine(blitter);
    const surface = new MemorySurface(100, 100);
    const map: PalMap = {
      id: 1,
      tiles: [],
      tileSet: { chunk: new Uint8Array(), numFrames: 100 },
    };
    const sprite: RenderableSprite = {
      directory: { chunk: new Uint8Array(), numFrames: 1 },
      frameIndex: 0,
      x: 32,
      y: 20,
      sLayer: 0,
      sortOffsetY: 34,
      layerOffset: 30,
    };

    engine.render(surface, map, [sprite], { x: 0, y: 0, width: 100, height: 100 });

    expect(spriteSpy.mock.calls[0]?.[2]).toBe(23);
    expect(spriteSpy.mock.calls[0]?.[3]).toBe(14);
  });
});
