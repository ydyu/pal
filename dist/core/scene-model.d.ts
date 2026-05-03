import { EventObject } from "./assets/event-objects.js";
import { SaveData, PartyMember } from "./assets/saves.js";
import { Scene } from "./assets/scenes.js";
import { PalMap } from "./map.js";
import { SpriteType, SpriteDirectory } from "./codecs/rle.js";
import { RenderableSprite } from "./render/scene-engine.js";
/**
 * Represents a live, interactive object in the scene.
 */
export interface ActiveObject {
    /** The underlying raw event object data. */
    data: EventObject;
    /** Current X pixel coordinate. */
    x: number;
    /** Current Y pixel coordinate. */
    y: number;
    /** Current state (e.g., 0 = hidden, 1 = normal). */
    state: number;
    /** Current animation frame (if applicable). */
    currentFrame: number;
    /** Direction facing (if it's an NPC). */
    direction: number;
}
export interface SpriteResolver {
    getSprite(type: SpriteType, id: number): SpriteDirectory;
}
/**
 * Central state manager for a loaded scene.
 */
export declare class SceneModel {
    /** The immutable base scene definition. */
    readonly scene: Scene;
    /** The immutable map geometry and tileset. */
    readonly map: PalMap;
    /** The active player party. */
    party: PartyMember[];
    /** Mapping roleId -> spriteNum for party members (populated from SaveData when available). */
    private playerRoleSpriteNums;
    /** Global party layer offset (SDLPAL wLayer). */
    private partyLayer;
    /** Active event objects (NPCs, triggers, pickups) in this scene. */
    objects: Map<number, ActiveObject>;
    constructor(scene: Scene, map: PalMap, baseObjects: EventObject[]);
    /**
     * Applies state overrides from a save file.
     * @param save The save data to apply.
     * @param currentLogicalSceneId Optional. If provided, the party will only be loaded if the save is in this scene.
     */
    applyState(save: SaveData, currentLogicalSceneId?: number): void;
    setPartyLayer(layer: number): void;
    /**
     * Resolves runtime-controlled frame counts for non-directional event sprites.
     * In SSS.MKF, these objects report nSpriteFrames=0 and rely on the sprite chunk's
     * actual frame count instead.
     */
    resolveAutoFrames(resolver: SpriteResolver): void;
    /**
     * Translates the active state into a flat list of renderable sprites.
     * This bridges the logical model to the `SceneEngine`.
     * @param resolver A provider for looking up SpriteDirectory objects.
     * @param animationStep Optional animation tick; enables auto-animation cycling.
     */
    generateRenderList(resolver: SpriteResolver, animationStep?: number): RenderableSprite[];
    /**
     * Queries the scene to find interactive objects at a specific pixel coordinate.
     * @param pixelX Target X coordinate in world pixels.
     * @param pixelY Target Y coordinate in world pixels.
     * @returns The ActiveObject found, or null.
     */
    hitTest(pixelX: number, pixelY: number): ActiveObject | null;
}
