import { describe, it, expect } from "vitest";
import { parseSave } from "../../../src/core/assets/saves.js";

describe("saves asset parser", () => {
  it("should parse a save file correctly", () => {
    // Event object table starts at 0x3260, with 1 object (0x20 bytes)
    // So we need 0x3260 + 0x20 = 0x3280 bytes minimum
    const raw = new Uint8Array(0x3280);

    // Header ground truth from 1.RPG:
    // 0x0000: c2 00 (194 saved times)
    // 0x0002: 50 02 (592 viewportX)
    // 0x0004: b8 02 (696 viewportY)
    // 0x0006: 00 00 (0 party members)
    // 0x0008: 0f 00 (15 numScene)
    raw[0x0000] = 0xc2; raw[0x0001] = 0x00;
    raw[0x0002] = 0x50; raw[0x0003] = 0x02;
    raw[0x0004] = 0xb8; raw[0x0005] = 0x02;
    raw[0x0006] = 0x00; raw[0x0007] = 0x00;
    raw[0x0008] = 0x0f; raw[0x0009] = 0x00;
    
    // 0x000A: 01 00 (1 paletteOffset - day+night present)
    raw[0x000a] = 0x01; raw[0x000b] = 0x00;

    // 0x0028: f5 00 00 00 (245 cash)
    raw[0x0028] = 0xf5; raw[0x0029] = 0x00; raw[0x002a] = 0x00; raw[0x002b] = 0x00;

    // Party member 1 at 0x002C:
    // Role 0, x=100, y=200, frame=1
    raw[0x002c] = 0x00; raw[0x002d] = 0x00;
    raw[0x002e] = 0x64; raw[0x002f] = 0x00;
    raw[0x0030] = 0xc8; raw[0x0031] = 0x00;
    raw[0x0032] = 0x01; raw[0x0033] = 0x00;

    // Player Role 0 (Li) at 0x01FC + 0x48 (level) and 0x54 (maxHP)
    const roleBase = 0x01fc;
    raw[roleBase + 0x48] = 0x0a; // Level 10
    raw[roleBase + 0x54] = 0xf4; raw[roleBase + 0x55] = 0x01; // 500 MaxHP

    // Inventory 0 at 0x06C0:
    // 63 00 (99 itemId), 04 00 (4 qty)
    raw[0x06c0] = 0x63; raw[0x06c1] = 0x00;
    raw[0x06c2] = 0x04; raw[0x06c3] = 0x00;

    // Inventory 1 at 0x06C6:
    // ec 00 (236 itemId), 01 00 (1 qty)
    raw[0x06c6] = 0xec; raw[0x06c7] = 0x00;
    raw[0x06c8] = 0x01; raw[0x06c9] = 0x00;

    // Event Object 0 at 0x3260:
    // x: a0 02 (672), y: 70 02 (624), script: 45 00 (69), 
     // auto: 00 00 (0), state: 01 00 (1), mode: 04 00 (4), 
     // sprite: 00 00 (0), frames: 03 00 (3), direction: 02 00 (2), currentFrame: 01 00 (1)
     const objBase = 0x3260;
     raw[objBase + 0x02] = 0xa0; raw[objBase + 0x03] = 0x02;
     raw[objBase + 0x04] = 0x70; raw[objBase + 0x05] = 0x02;
     raw[objBase + 0x08] = 0x45; raw[objBase + 0x09] = 0x00;
     raw[objBase + 0x0c] = 0x01; raw[objBase + 0x0d] = 0x00;
     raw[objBase + 0x0e] = 0x04; raw[objBase + 0x0f] = 0x00;
     raw[objBase + 0x12] = 0x03; raw[objBase + 0x13] = 0x00;
     raw[objBase + 0x14] = 0x02; raw[objBase + 0x15] = 0x00;
     raw[objBase + 0x16] = 0x01; raw[objBase + 0x17] = 0x00;
    
    // Sentinel to stop parsing after first object
    // (x=0, y=0 at offset +0x20)

    const save = parseSave(raw);
    expect(save.savedTimes).toBe(194);
    expect(save.viewportX).toBe(592);
    expect(save.viewportY).toBe(696);
    expect(save.numScene).toBe(15);
    expect(save.paletteOffset).toBe(1);
    expect(save.wLayer).toBe(0);
    expect(save.cash).toBe(245);

    expect(save.party).toHaveLength(1);
    expect(save.party[0]).toEqual({ roleId: 0, x: 100, y: 200, frame: 1 });

    expect(save.playerRoles).toHaveLength(6);
    expect(save.playerRoles[0].level).toBe(10);
    expect(save.playerRoles[0].maxHP).toBe(500);

    expect(save.inventory).toHaveLength(2);
    expect(save.inventory[0]).toEqual({ index: 0, itemId: 99, quantity: 4 });
    expect(save.inventory[1]).toEqual({ index: 1, itemId: 236, quantity: 1 });

    expect(save.eventObjects).toHaveLength(1);
    expect(save.eventObjects[0]).toEqual({
      slot: 1,
      x: 672,
      y: 624,
      sLayer: 0,
      triggerScript: 69,
      autoScript: 0,
      state: 1,
      triggerMode: 4,
      spriteNum: 0,
      nSpriteFrames: 3,
      direction: 2,
      currentFrame: 1,
      nSpriteFramesAuto: 0,
     });
  });
});
