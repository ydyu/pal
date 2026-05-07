import { type Instruction, Opcode, type ScriptReward } from "../core/assets/scripts.js";
import { type PalMap } from "../core/map.js";
import { getSpriteBounds, type Viewport } from "../core/render/bounds.js";
import { type Blitter } from "../core/render/blitter.js";
import { type RenderableSprite } from "../core/render/scene-engine.js";

export const DEFAULT_VIEWPORT_WIDTH = 320;
export const DEFAULT_VIEWPORT_HEIGHT = 200;

export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ExitInfo {
  sceneId: number;
  x?: number;
  y?: number;
  h?: number;
}

export function getScriptExit(instructions: Instruction[]): ExitInfo | null {
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i]!;
    if (inst.op === Opcode.CHANGE_SCENE) {
      const sceneParam = inst.params.find((p) => p.type === "scene");
      if (!sceneParam) continue;

      const exit: ExitInfo = { sceneId: sceneParam.raw };

      // Look for landing coordinates in adjacent instructions
      const posInst = [instructions[i + 1], instructions[i - 1]].find((inst) => inst?.op === Opcode.SET_PARTY_POS);
      if (posInst) {
        const [x, y, h] = posInst.params.map((p) => p.raw);
        if (x !== undefined && y !== undefined) {
          Object.assign(exit, h !== undefined ? { x, y, h } : { x, y });
        }
      }
      return exit;
    }

    if (inst.op === Opcode.STOP_EXECUTION) {
      break;
    }
  }
  return null;
}

export function resolveInitialSceneNumber(sceneCount: number, preferredScene?: number): number {
  if (sceneCount < 1) {
    throw new Error("No scenes are available in the loaded data.");
  }

  if (preferredScene === undefined) {
    return 1;
  }

  if (preferredScene < 1 || preferredScene > sceneCount) {
    throw new Error(`Save file references invalid scene ${preferredScene}. Expected 1-${sceneCount}.`);
  }

  return preferredScene;
}

export function clampViewport(viewport: Viewport, bounds: SceneBounds): Viewport {
  return { ...viewport };
}

export function getMapViewportOrigin(map: Pick<PalMap, "tiles">): { x: number; y: number } {
  if (map.tiles.length === 0) {
    return { x: 0, y: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const tile of map.tiles) {
    minX = Math.min(minX, tile.px);
    minY = Math.min(minY, tile.py);
  }

  return {
    x: Number.isFinite(minX) ? minX : 0,
    y: Number.isFinite(minY) ? minY : 0,
  };
}

export function centerViewportOnPoint(
  pointX: number,
  pointY: number,
  canvasCenterX: number,
  canvasCenterY: number,
  viewportWidth: number,
  viewportHeight: number,
  bounds: SceneBounds
): Viewport {
  void bounds;
  return {
    x: Math.floor(pointX - canvasCenterX),
    y: Math.floor(pointY - canvasCenterY),
    width: viewportWidth,
    height: viewportHeight,
  };
}

export function resolveAnimatedObjectFrame(
  direction: number,
  currentFrame: number,
  nSpriteFrames: number,
  animationStep: number,
  nSpriteFramesAuto: number = 0
): number {
  if (nSpriteFrames === 0) {
    if (nSpriteFramesAuto > 0)
      return (currentFrame + animationStep) % nSpriteFramesAuto;
    return Math.max(0, currentFrame);
  }

  if (nSpriteFrames === 1) {
    return direction + Math.max(0, currentFrame);
  }

  if (nSpriteFrames === 3) {
    const phase = (currentFrame + animationStep) % 4;
    const frame = phase === 2 ? 0 : phase === 3 ? 2 : phase;
    return direction * nSpriteFrames + frame;
  }

  return direction * nSpriteFrames + ((currentFrame + animationStep) % nSpriteFrames);
}

export function formatRewardLabel(reward: ScriptReward): string {
  if (reward.kind === "cash") {
    return `${reward.amount >= 0 ? "+" : ""}${reward.amount}$`;
  }

  const base = reward.name.trim().length > 0 ? reward.name.trim() : `ITEM ${reward.itemId}`;
  return reward.quantity === 1 ? base : `${base} x${reward.quantity}`;
}

export function findFirstPortraitId(instructions: Instruction[]): number | null {
  for (const instruction of instructions) {
    if (instruction.op !== Opcode.TEXT_UPPER_DIALOGUE && instruction.op !== Opcode.TEXT_LOWER_DIALOGUE) {
      continue;
    }

    const portrait = instruction.params.find((param) => param.type === "portrait");
    if (portrait) {
      return portrait.raw;
    }
  }

  return null;
}

export function getSceneBounds(map: PalMap, sprites: RenderableSprite[], blitter: Blitter): SceneBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includeRect = (x: number, y: number, width: number, height: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  };

  for (const tile of map.tiles) {
    const lowerFrame = blitter.getFrame(map.tileSet, tile.lowerIdx, `map:${map.id}`);
    if (lowerFrame) {
      includeRect(tile.px, tile.py, lowerFrame.width, lowerFrame.height);
    }

    if (tile.upperIdx >= 0) {
      const upperFrame = blitter.getFrame(map.tileSet, tile.upperIdx, `map:${map.id}`);
      if (upperFrame) {
        includeRect(tile.px, tile.py, upperFrame.width, upperFrame.height);
      }
    }
  }

  for (const sprite of sprites) {
    const frame = blitter.getFrame(sprite.directory, sprite.frameIndex);
    if (!frame) {
      continue;
    }

    const bounds = getSpriteBounds(
      sprite.x,
      sprite.y,
      sprite.sLayer,
      frame.width,
      frame.height,
      sprite.sortOffsetY,
      sprite.layerOffset
    );

    includeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      minX: 0,
      minY: 0,
      maxX: DEFAULT_VIEWPORT_WIDTH,
      maxY: DEFAULT_VIEWPORT_HEIGHT,
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
