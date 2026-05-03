import { describe, it, expect } from "vitest";
import { parseScenes, getSceneEventSlotRange } from "../../../src/core/assets/scenes.js";

describe("scenes asset parser", () => {
  it("should parse scene records correctly", () => {
    // Ground truth from python dump of first 5 scenes:
    // 0c00101f00000000
    // 0c00000000002000
    // 0a00000000002c00
    // 01004d0c00004c00
    // 0200000000007300
    const raw = new Uint8Array([
      0x0c, 0x00, 0x10, 0x1f, 0x00, 0x00, 0x00, 0x00,
      0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
      0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00,
      0x01, 0x00, 0x4d, 0x0c, 0x00, 0x00, 0x4c, 0x00,
      0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x73, 0x00,
    ]);

    const scenes = parseScenes(raw);
    expect(scenes).toHaveLength(5);

    expect(scenes[0]).toEqual({
      mapNum: 12,
      scriptOnEnter: 0x1f10,
      scriptOnTeleport: 0,
      eventObjectIndex: 0
    });

    expect(scenes[1]).toEqual({
      mapNum: 12,
      scriptOnEnter: 0,
      scriptOnTeleport: 0,
      eventObjectIndex: 32
    });

    expect(scenes[2]).toEqual({
      mapNum: 10,
      scriptOnEnter: 0,
      scriptOnTeleport: 0,
      eventObjectIndex: 44
    });

    expect(scenes[3]).toEqual({
      mapNum: 1,
      scriptOnEnter: 0x0c4d,
      scriptOnTeleport: 0,
      eventObjectIndex: 76
    });
  });

  it("should calculate scene event slot ranges correctly", () => {
    const scenes = [
      { mapNum: 12, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0 },
      { mapNum: 12, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 32 },
      { mapNum: 10, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 44 },
      { mapNum: 1,  scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 76 },
    ];

    // Scene 1 owns [1 .. S[1].eventObjectIndex - 1] -> [1 .. 32-1] = [1..31]
    expect(getSceneEventSlotRange(scenes, 1, 1000)).toEqual([1, 31]);
    
    // Scene 2 owns [S[1].eventObjectIndex .. S[2].eventObjectIndex - 1] -> [32 .. 44-1] = [32..43]
    expect(getSceneEventSlotRange(scenes, 2, 1000)).toEqual([32, 43]);

    // Scene 3 owns [S[2].eventObjectIndex .. S[3].eventObjectIndex - 1] -> [44 .. 76-1] = [44..75]
    expect(getSceneEventSlotRange(scenes, 3, 1000)).toEqual([44, 75]);

    // Scene 4 owns [S[3].eventObjectIndex .. total] -> [76 .. 1000]
    expect(getSceneEventSlotRange(scenes, 4, 1000)).toEqual([76, 1000]);
  });
});
