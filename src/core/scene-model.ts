import { EventObject } from "./assets/event-objects.js";
import { SaveData, PartyMember } from "./assets/saves.js";
import { Scene } from "./assets/scenes.js";
import { PalMap } from "./map.js";
import { SpriteType, SpriteDirectory } from "./codecs/rle.js";
import { RenderableSprite } from "./render/scene-engine.js";
import { pixelToTile } from "./coords.js";

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
export class SceneModel {
  /** The immutable base scene definition. */
  public readonly scene: Scene;
  /** The immutable map geometry and tileset. */
  public readonly map: PalMap;
  
  /** The active player party. */
  public party: PartyMember[] = [];
  /** Mapping roleId -> spriteNum for party members (populated from SaveData when available). */
  private playerRoleSpriteNums: Map<number, number> = new Map();
  /** Global party layer offset (SDLPAL wLayer). */
  private partyLayer = 0;
  /** Active event objects (NPCs, triggers, pickups) in this scene. */
  public objects: Map<number, ActiveObject> = new Map();

  constructor(scene: Scene, map: PalMap, baseObjects: EventObject[]) {
    this.scene = scene;
    this.map = map;

    for (const obj of baseObjects) {
      this.objects.set(obj.slot, {
        data: obj,
        x: obj.x,
        y: obj.y,
        state: obj.state,
        currentFrame: obj.currentFrame,
        direction: obj.direction,
      });
    }
  }

  /**
   * Applies state overrides from a save file.
   * @param save The save data to apply.
   * @param currentLogicalSceneId Optional. If provided, the party will only be loaded if the save is in this scene.
   */
  public applyState(save: SaveData, currentLogicalSceneId?: number): void {
    if (currentLogicalSceneId === undefined || save.numScene === currentLogicalSceneId) {
      this.party = save.party.map(p => ({
        ...p,
        x: p.x + save.viewportX,
        y: p.y + save.viewportY,
      }));
      this.partyLayer = save.wLayer;

      // Capture the role -> sprite mapping from the save data
      for (const role of save.playerRoles) {
        this.playerRoleSpriteNums.set(role.roleId, role.spriteNum);
      }
    }

    // Update active objects from save data
    for (const savedObj of save.eventObjects) {
      const activeObj = this.objects.get(savedObj.slot);
      if (activeObj) {
        activeObj.data = { ...savedObj };
        activeObj.x = savedObj.x;
        activeObj.y = savedObj.y;
        activeObj.state = savedObj.state;
        activeObj.currentFrame = savedObj.currentFrame;
        activeObj.direction = savedObj.direction;
      }
    }
  }

  public setPartyLayer(layer: number): void {
    this.partyLayer = layer;
  }

  /**
   * Resolves runtime-controlled frame counts for non-directional event sprites.
   * In SSS.MKF, these objects report nSpriteFrames=0 and rely on the sprite chunk's
   * actual frame count instead.
   */
  public resolveAutoFrames(resolver: SpriteResolver): void {
    for (const obj of this.objects.values()) {
      if (obj.data.nSpriteFrames !== 0 || obj.data.spriteNum <= 0) {
        continue;
      }

      // Only resolve auto-frames if the object has an auto-script.
      // Environmental objects (fire, water) and simple NPCs with idle logic
      // use autoScript to trigger their multi-frame animation loop.
      // Static objects like chests or doors (nSpriteFrames=0, but no auto-script)
      // should NOT cycle automatically.
      if (obj.data.autoScript === 0) {
        continue;
      }

      const directory = resolver.getSprite("world", obj.data.spriteNum);
      obj.data.nSpriteFramesAuto = directory.numFrames;
    }
  }

  /**
   * Translates the active state into a flat list of renderable sprites.
   * This bridges the logical model to the `SceneEngine`.
   * @param resolver A provider for looking up SpriteDirectory objects.
   * @param animationStep Optional animation tick; enables auto-animation cycling.
   */
  public generateRenderList(resolver: SpriteResolver, animationStep?: number): RenderableSprite[] {
    const sprites: RenderableSprite[] = [];

    const getObjectFrameIndex = (obj: ActiveObject) => {
      const { nSpriteFrames, nSpriteFramesAuto } = obj.data;
      let frame = obj.currentFrame;
      if (nSpriteFrames === 0) {
        if (nSpriteFramesAuto > 0 && animationStep !== undefined)
          return (frame + animationStep) % nSpriteFramesAuto;
        return Math.max(0, frame);
      }
      if (nSpriteFrames === 3) {
        if (frame === 2) {
          frame = 0;
        } else if (frame === 3) {
          frame = 2;
        }
      }
      return obj.direction * nSpriteFrames + frame;
    };

    const getPartySpriteNum = (roleId: number) => {
      // Use loaded save mapping if available, otherwise fallback to 2 (Li Xiaoyao)
      const mapped = this.playerRoleSpriteNums.get(roleId);
      return mapped !== undefined ? mapped : 2;
    };

    // 1. Party Members
    for (const member of this.party) {
      try {
        const spriteNum = getPartySpriteNum(member.roleId);
        const directory = resolver.getSprite("world", spriteNum);
        sprites.push({
          directory,
          frameIndex: member.frame,
          x: member.x,
          y: member.y,
          sLayer: 0,
          sortOffsetY: this.partyLayer + 10,
          layerOffset: this.partyLayer + 6,
          anchorTile: pixelToTile(member.x, member.y),
        });
      } catch (e) {
        // Missing sprite, skip
      }
    }

    // 2. Active Objects (use sLayer from EventObject data)
    for (const obj of this.objects.values()) {
      if (obj.state !== 0 && obj.data.spriteNum > 0) {
        try {
          const directory = resolver.getSprite("world", obj.data.spriteNum);
          sprites.push({
            directory,
            frameIndex: getObjectFrameIndex(obj),
            x: obj.x,
            y: obj.y,
            sLayer: obj.data.sLayer,
            sortOffsetY: obj.data.sLayer * 8 + 9,
            layerOffset: obj.data.sLayer * 8 + 2,
            anchorTile: pixelToTile(obj.x, obj.y),
          });
        } catch (e) {
          // Missing sprite, skip
        }
      }
    }

    return sprites;
  }

  /**
   * Queries the scene to find interactive objects at a specific pixel coordinate.
   * @param pixelX Target X coordinate in world pixels.
   * @param pixelY Target Y coordinate in world pixels.
   * @returns The ActiveObject found, or null.
   */
  public hitTest(pixelX: number, pixelY: number): ActiveObject | null {
    // 1. Convert pixel coordinate to tile coordinate
    const targetTile = pixelToTile(pixelX, pixelY);

    // 2. Check objects
    // Objects are usually registered with world pixel coordinates that map to their base tile.
    for (const obj of this.objects.values()) {
      if (obj.state === 0) continue; // Skip hidden objects

      const objTile = pixelToTile(obj.x, obj.y);
      if (objTile.x === targetTile.x && objTile.y === targetTile.y && objTile.h === targetTile.h) {
        return obj;
      }
    }

    // Fallback pixel-perfect bounding box hit testing could be added here
    // by evaluating the dimensions of the generated RenderableSprites.

    return null;
  }
}
