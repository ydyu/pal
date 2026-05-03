import { Opcode } from "../core/assets/scripts.js";
import { getSpriteBounds } from "../core/render/bounds.js";
export const DEFAULT_VIEWPORT_WIDTH = 320;
export const DEFAULT_VIEWPORT_HEIGHT = 200;
export function resolveInitialSceneNumber(sceneCount, preferredScene) {
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
export function clampViewport(viewport, bounds) {
    return { ...viewport };
}
export function getMapViewportOrigin(map) {
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
export function centerViewportOnPoint(pointX, pointY, canvasCenterX, canvasCenterY, viewportWidth, viewportHeight, bounds) {
    void bounds;
    return {
        x: Math.floor(pointX - canvasCenterX),
        y: Math.floor(pointY - canvasCenterY),
        width: viewportWidth,
        height: viewportHeight,
    };
}
export function resolveAnimatedObjectFrame(direction, currentFrame, nSpriteFrames, animationStep, nSpriteFramesAuto = 0) {
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
export function formatRewardLabel(reward) {
    if (reward.kind === "cash") {
        return `${reward.amount >= 0 ? "+" : ""}${reward.amount}$`;
    }
    const base = reward.name.trim().length > 0 ? reward.name.trim() : `ITEM ${reward.itemId}`;
    return reward.quantity === 1 ? base : `${base} x${reward.quantity}`;
}
export function findFirstPortraitId(instructions) {
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
export function getSceneBounds(map, sprites, blitter) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const includeRect = (x, y, width, height) => {
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
        const bounds = getSpriteBounds(sprite.x, sprite.y, sprite.sLayer, frame.width, frame.height, sprite.sortOffsetY, sprite.layerOffset);
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
//# sourceMappingURL=viewer-helpers.js.map