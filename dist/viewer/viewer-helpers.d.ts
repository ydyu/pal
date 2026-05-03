import { type Instruction, type ScriptReward } from "../core/assets/scripts.js";
import { type PalMap } from "../core/map.js";
import { type Viewport } from "../core/render/bounds.js";
import { type Blitter } from "../core/render/blitter.js";
import { type RenderableSprite } from "../core/render/scene-engine.js";
export declare const DEFAULT_VIEWPORT_WIDTH = 320;
export declare const DEFAULT_VIEWPORT_HEIGHT = 200;
export interface SceneBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}
export declare function resolveInitialSceneNumber(sceneCount: number, preferredScene?: number): number;
export declare function clampViewport(viewport: Viewport, bounds: SceneBounds): Viewport;
export declare function getMapViewportOrigin(map: Pick<PalMap, "tiles">): {
    x: number;
    y: number;
};
export declare function centerViewportOnPoint(pointX: number, pointY: number, canvasCenterX: number, canvasCenterY: number, viewportWidth: number, viewportHeight: number, bounds: SceneBounds): Viewport;
export declare function resolveAnimatedObjectFrame(direction: number, currentFrame: number, nSpriteFrames: number, animationStep: number, nSpriteFramesAuto?: number): number;
export declare function formatRewardLabel(reward: ScriptReward): string;
export declare function findFirstPortraitId(instructions: Instruction[]): number | null;
export declare function getSceneBounds(map: PalMap, sprites: RenderableSprite[], blitter: Blitter): SceneBounds;
