import { describe, expect, it } from "vitest";
import {
  clampViewport,
  centerViewportOnPoint,
  formatRewardLabel,
  getScriptExit,
  getMapViewportOrigin,
  resolveAnimatedObjectFrame,
  resolveInitialSceneNumber,
} from "../../src/viewer/viewer-helpers.js";
import { Opcode, type Instruction } from "../../src/index.js";

describe("viewer helpers", () => {
  it("detects an adjacent change-scene exit with landing coordinates", () => {
    const instructions: Instruction[] = [
      {
        index: 0x350F,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 44 }],
      },
      {
        index: 0x3510,
        op: Opcode.SET_PARTY_POS,
        name: "SET_PARTY_POS",
        params: [
          { label: "x", type: "number", raw: 57 },
          { label: "y", type: "number", raw: 117 },
          { label: "half", type: "boolean", raw: 0 },
        ],
      },
      {
        index: 0x3511,
        op: Opcode.STOP_EXECUTION,
        name: "STOP_EXECUTION",
        params: [],
      },
    ];

    expect(getScriptExit(instructions)).toEqual({ sceneId: 44, x: 57, y: 117, h: 0 });
  });

  it("still detects a late adjacent exit in a long script window", () => {
    const filler: Instruction[] = Array.from({ length: 24 }, (_, index) => ({
      index: 0x34EA + index,
      op: Opcode.WALK_NORTH,
      name: "WALK_NORTH",
      params: [],
    }));
    const instructions: Instruction[] = [
      ...filler,
      {
        index: 0x350F,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 44 }],
      },
      {
        index: 0x3510,
        op: Opcode.SET_PARTY_POS,
        name: "SET_PARTY_POS",
        params: [
          { label: "x", type: "number", raw: 57 },
          { label: "y", type: "number", raw: 117 },
          { label: "half", type: "boolean", raw: 0 },
        ],
      },
      {
        index: 0x3513,
        op: Opcode.STOP_EXECUTION,
        name: "STOP_EXECUTION",
        params: [],
      },
    ];

    expect(getScriptExit(instructions)).toEqual({ sceneId: 44, x: 57, y: 117, h: 0 });
  });

  it("does not pair landing coordinates across a stop boundary", () => {
    const instructions: Instruction[] = [
      {
        index: 0x350F,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 44 }],
      },
      {
        index: 0x3513,
        op: Opcode.STOP_EXECUTION,
        name: "STOP_EXECUTION",
        params: [],
      },
      {
        index: 0x3514,
        op: Opcode.SET_PARTY_POS,
        name: "SET_PARTY_POS",
        params: [
          { label: "x", type: "number", raw: 57 },
          { label: "y", type: "number", raw: 117 },
          { label: "half", type: "boolean", raw: 0 },
        ],
      },
    ];

    expect(getScriptExit(instructions)).toEqual({ sceneId: 44 });
  });

  it("does not pair landing coordinates across STOP_AND_CHANGE or JUMP boundaries", () => {
    const stopAndChange: Instruction[] = [
      {
        index: 0x350F,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 44 }],
      },
      {
        index: 0x3510,
        op: Opcode.STOP_AND_CHANGE,
        name: "STOP_AND_CHANGE",
        params: [{ label: "next", type: "script", raw: 0x1234 }, { label: "loops", type: "number", raw: 0 }],
      },
      {
        index: 0x3511,
        op: Opcode.SET_PARTY_POS,
        name: "SET_PARTY_POS",
        params: [
          { label: "x", type: "number", raw: 57 },
          { label: "y", type: "number", raw: 117 },
          { label: "half", type: "boolean", raw: 0 },
        ],
      },
    ];

    const jump: Instruction[] = [
      {
        index: 0x350F,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 44 }],
      },
      {
        index: 0x3510,
        op: Opcode.JUMP,
        name: "JUMP",
        params: [{ label: "target", type: "script", raw: 0x1234 }, { label: "loops", type: "number", raw: 0 }],
      },
      {
        index: 0x3511,
        op: Opcode.SET_PARTY_POS,
        name: "SET_PARTY_POS",
        params: [
          { label: "x", type: "number", raw: 57 },
          { label: "y", type: "number", raw: 117 },
          { label: "half", type: "boolean", raw: 0 },
        ],
      },
    ];

    expect(getScriptExit(stopAndChange)).toEqual({ sceneId: 44 });
    expect(getScriptExit(jump)).toEqual({ sceneId: 44 });
  });

  it("finds CHANGE_SCENE even if it appears after a JUMP (relying on flattened parser)", () => {
    const instructions: Instruction[] = [
      {
        index: 0x1000,
        op: Opcode.JUMP,
        name: "JUMP",
        params: [{ label: "target", type: "script", raw: 0x2000 }, { label: "loops", type: "number", raw: 0 }],
      },
      {
        index: 0x2000,
        op: Opcode.CHANGE_SCENE,
        name: "CHANGE_SCENE",
        params: [{ label: "scene", type: "scene", raw: 99 }],
      },
    ];

    expect(getScriptExit(instructions)).toEqual({ sceneId: 99 });
  });

  it("uses the save scene when it is valid", () => {
    expect(resolveInitialSceneNumber(300, 42)).toBe(42);
  });

  it("rejects an invalid save scene", () => {
    expect(() => resolveInitialSceneNumber(10, 11)).toThrow(/invalid scene/i);
  });

  it("does not clamp viewport movement", () => {
    expect(
      clampViewport(
        { x: 0, y: 0, width: 320, height: 200 },
        { minX: 0, minY: 0, maxX: 160, maxY: 80, width: 160, height: 80 }
      )
    ).toEqual({ x: 0, y: 0, width: 320, height: 200 });
  });

  it("centers a focus point without scene bounds clamping", () => {
    expect(
      centerViewportOnPoint(
        480,
        320,
        160,
        100,
        320,
        200,
        { minX: 0, minY: 0, maxX: 640, maxY: 480, width: 640, height: 480 }
      )
    ).toEqual({ x: 320, y: 220, width: 320, height: 200 });
  });

  it("centers on the visible portion of a partially off-screen canvas", () => {
    // Canvas is 320x800; only the top 400px is visible (visibleTop=0, visibleBottom=400)
    // canvasCenterY = (0 + 400) / 2 = 200 (canvas pixels, scale 1:1)
    expect(
      centerViewportOnPoint(
        480,
        600,
        160,
        200,
        320,
        800,
        { minX: 0, minY: 0, maxX: 640, maxY: 1200, width: 640, height: 1200 }
      )
    ).toEqual({ x: 320, y: 400, width: 320, height: 800 });
  });

  it("uses map tile extents for startup origin", () => {
    expect(
      getMapViewportOrigin({
        tiles: [
          { px: 48, py: 24 },
          { px: -16, py: 8 },
          { px: 80, py: -8 },
        ] as Array<{ px: number; py: number }>,
      })
    ).toEqual({ x: -16, y: -8 });
  });

  it("maps PAL 3-frame animation through the 0-1-0-2 cycle", () => {
    expect(resolveAnimatedObjectFrame(1, 0, 3, 0)).toBe(3);
    expect(resolveAnimatedObjectFrame(1, 0, 3, 1)).toBe(4);
    expect(resolveAnimatedObjectFrame(1, 0, 3, 2)).toBe(3);
    expect(resolveAnimatedObjectFrame(1, 0, 3, 3)).toBe(5);
  });

  it("preserves direction for one-frame directional sprites", () => {
    expect(resolveAnimatedObjectFrame(2, 0, 1, 4)).toBe(2);
  });

  it("cycles auto-animated frames when nSpriteFrames is 0 and nSpriteFramesAuto > 0", () => {
    // frame = (currentFrame + animationStep) % nSpriteFramesAuto; direction is ignored
    expect(resolveAnimatedObjectFrame(2, 0, 0, 0, 5)).toBe(0);
    expect(resolveAnimatedObjectFrame(2, 0, 0, 3, 5)).toBe(3);
    expect(resolveAnimatedObjectFrame(2, 0, 0, 5, 5)).toBe(0); // wraps
    expect(resolveAnimatedObjectFrame(2, 0, 0, 7, 5)).toBe(2);
    expect(resolveAnimatedObjectFrame(0, 2, 0, 1, 3)).toBe(0); // currentFrame + step wraps
  });

  it("returns static frame when nSpriteFrames is 0 and nSpriteFramesAuto is 0", () => {
    expect(resolveAnimatedObjectFrame(1, 0, 0, 5, 0)).toBe(0);
    expect(resolveAnimatedObjectFrame(1, 3, 0, 5, 0)).toBe(3);
  });

  it("formats item and cash rewards for overlays", () => {
    expect(formatRewardLabel({ kind: "cash", amount: 500 })).toBe("+500$");
    expect(formatRewardLabel({ kind: "item", itemId: 12, quantity: 2, name: "金蠶王" })).toBe("金蠶王 x2");
  });
});
