import { describe, it, expect, vi } from "vitest";
import { SceneModel, SpriteResolver } from "../../src/core/scene-model.js";
import { EventObject } from "../../src/core/assets/event-objects.js";
import { Scene } from "../../src/core/assets/scenes.js";
import { PalMap } from "../../src/core/map.js";
import { SaveData } from "../../src/core/assets/saves.js";
import { SpriteDirectory } from "../../src/core/codecs/rle.js";

describe("SceneModel", () => {
  const mockScene: Scene = {
    mapNum: 1,
    scriptOnEnter: 0,
    scriptOnTeleport: 0,
    eventObjectIndex: 1,
  };

  const mockMap: PalMap = {
    id: 1,
    tiles: [],
    tileSet: { chunk: new Uint8Array(), numFrames: 0 },
  };

  const mockBaseObjects: EventObject[] = [
    {
      slot: 1,
      x: 32,
      y: 16,
      sLayer: 0,
      triggerScript: 0,
      autoScript: 0,
      state: 1,
      triggerMode: 1,
      spriteNum: 10,
      nSpriteFrames: 4,
      direction: 1,
      currentFrame: 2,
      nSpriteFramesAuto: 0,
    },
    {
      slot: 2,
      x: 64,
      y: 32,
      sLayer: 0,
      triggerScript: 0,
      autoScript: 0,
      state: 0, // hidden
      triggerMode: 1,
      spriteNum: 11,
      nSpriteFrames: 4,
      direction: 0,
      currentFrame: 0,
      nSpriteFramesAuto: 0,
    }
  ];

  it("should initialize with base objects", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    
    expect(model.objects.size).toBe(2);
    expect(model.objects.get(1)?.x).toBe(32);
    expect(model.objects.get(1)?.state).toBe(1);
    expect(model.objects.get(2)?.state).toBe(0);
    expect(model.party.length).toBe(0);
  });

  it("should apply save state", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    
    const mockSave: SaveData = {
      savedTimes: 1,
      viewportX: 200,
      viewportY: 300,
      partyMemberCount: 1,
      numScene: 1,
      wLayer: 24,
      cash: 0,
      party: [
        { roleId: 0, x: 100, y: 100, frame: 2 }
      ],
      playerRoles: [
        { roleId: 0, spriteNum: 5, level: 1, maxHP: 10, maxMP: 10, hp: 10, mp: 10, attackStrength: 1, magicStrength: 1, defense: 1, dexterity: 1, fleeRate: 1, poisonResistance: 1, elementalResistance: [], equipment: [], magics: [], coveredBy: 0 }
      ],
      inventory: [],
      eventObjects: [
        {
          slot: 1,
          x: 100, // moved
          y: 100,
          sLayer: 2,
          triggerScript: 123,
          autoScript: 456,
          state: 0, // became hidden
          triggerMode: 5,
          spriteNum: 22,
          nSpriteFrames: 6,
          direction: 3,
          currentFrame: 4,
          nSpriteFramesAuto: 0,
        }
      ]
    };

    model.applyState(mockSave, 1);

    expect(model.party.length).toBe(1);
    expect(model.party[0].x).toBe(300);
    expect(model.party[0].y).toBe(400);

    const obj = model.objects.get(1);
    expect(obj?.x).toBe(100);
    expect(obj?.state).toBe(0);
    expect(obj?.data.triggerScript).toBe(123);
    expect(obj?.data.spriteNum).toBe(22);
    expect(obj?.direction).toBe(3);
    expect(obj?.currentFrame).toBe(4);

    // Verify role mapping is used in render list
    const mockSpriteDir: SpriteDirectory = { chunk: new Uint8Array(), numFrames: 1 };
    const resolver: SpriteResolver = {
      getSprite: vi.fn().mockReturnValue(mockSpriteDir)
    };
    model.generateRenderList(resolver);
    expect(resolver.getSprite).toHaveBeenCalledWith("world", 5);
  });

  it("should not apply party state if logical scene ID does not match", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    const mockSave: SaveData = {
      savedTimes: 1, viewportX: 0, viewportY: 0, partyMemberCount: 1,
      numScene: 2, // different scene
      wLayer: 0,
      cash: 0,
      party: [{ roleId: 0, x: 100, y: 100, frame: 2 }],
      playerRoles: [], inventory: [],
      eventObjects: []
    };

    model.applyState(mockSave, 1);
    expect(model.party.length).toBe(0); // Party not loaded
  });

  it("should generate render list with anchor tiles and fallbacks", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    model.party = [
      { roleId: 0, x: 32, y: 16, frame: 5 }
    ];

    const mockSpriteDir: SpriteDirectory = { chunk: new Uint8Array(), numFrames: 1 };
    const resolver: SpriteResolver = {
      getSprite: vi.fn().mockReturnValue(mockSpriteDir)
    };

    const renderList = model.generateRenderList(resolver);
    
    // 1 party member + 1 visible active object
    expect(renderList.length).toBe(2);
    
    expect(resolver.getSprite).toHaveBeenCalledWith("world", 2); // Default fallback for party
    expect(resolver.getSprite).toHaveBeenCalledWith("world", 10); // Visible object
    
    expect(renderList[0].anchorTile).toEqual({ x: 1, y: 1, h: 0 }); // (32, 16) -> (1, 1, 0)
    expect(renderList[1].anchorTile).toEqual({ x: 1, y: 1, h: 0 });
    expect(renderList[1].frameIndex).toBe(6);
    expect(renderList[0].sortOffsetY).toBe(10);
    expect(renderList[0].layerOffset).toBe(6);
    expect(renderList[1].sortOffsetY).toBe(9);
    expect(renderList[1].layerOffset).toBe(2);
  });

  it("should map 3-frame walking sprites to SDLPal frame indices", () => {
    const walkingObject: EventObject = {
      slot: 3,
      x: 96,
      y: 48,
      sLayer: 0,
      triggerScript: 0,
      autoScript: 0,
      state: 1,
      triggerMode: 1,
      spriteNum: 12,
      nSpriteFrames: 3,
      direction: 2,
      currentFrame: 3,
      nSpriteFramesAuto: 0,
    };
    const model = new SceneModel(mockScene, mockMap, [walkingObject]);
    const mockSpriteDir: SpriteDirectory = { chunk: new Uint8Array(), numFrames: 1 };
    const resolver: SpriteResolver = {
      getSprite: vi.fn().mockReturnValue(mockSpriteDir)
    };

    const renderList = model.generateRenderList(resolver);
    expect(renderList).toHaveLength(1);
    expect(renderList[0]?.frameIndex).toBe(8);
  });

  it("should apply dynamic party layer offsets", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    model.party = [{ roleId: 0, x: 32, y: 16, frame: 5 }];
    model.setPartyLayer(24);

    const mockSpriteDir: SpriteDirectory = { chunk: new Uint8Array(), numFrames: 1 };
    const resolver: SpriteResolver = {
      getSprite: vi.fn().mockReturnValue(mockSpriteDir)
    };

    const renderList = model.generateRenderList(resolver);
    expect(renderList[0]?.sortOffsetY).toBe(34);
    expect(renderList[0]?.layerOffset).toBe(30);
  });

  it("should resolve auto-animation frame counts from sprite metadata", () => {
    const model = new SceneModel(mockScene, mockMap, [
      {
        slot: 3,
        x: 96,
        y: 48,
        sLayer: 0,
        triggerScript: 0,
        autoScript: 456, // Non-zero autoScript
        state: 1,
        triggerMode: 1,
        spriteNum: 12,
        nSpriteFrames: 0,
        direction: 0,
        currentFrame: 1,
        nSpriteFramesAuto: 0,
      },
      mockBaseObjects[0]!,
    ]);
    const resolver: SpriteResolver = {
      getSprite: vi.fn().mockImplementation((type, id) => {
        expect(type).toBe("world");
        return { chunk: new Uint8Array(), numFrames: id === 12 ? 5 : 4 };
      }),
    };

    model.resolveAutoFrames(resolver);

    expect(model.objects.get(3)?.data.nSpriteFramesAuto).toBe(5);
    expect(model.objects.get(1)?.data.nSpriteFramesAuto).toBe(0);
    expect(resolver.getSprite).toHaveBeenCalledTimes(1);
    expect(resolver.getSprite).toHaveBeenCalledWith("world", 12);
  });

  it("should perform hit testing based on tiles", () => {
    const model = new SceneModel(mockScene, mockMap, mockBaseObjects);
    
    const hit1 = model.hitTest(32, 16);
    expect(hit1).toBeDefined();
    expect(hit1?.data.slot).toBe(1);

    const miss = model.hitTest(0, 0);
    expect(miss).toBeNull();
  });
});
