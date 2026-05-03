import { describe, it, expect } from "vitest";
import { ByteReader } from "../../../src/core/binary.js";
import { parseEventObject, parseEventObjectTable } from "../../../src/core/assets/event-objects.js";

describe("EventObject asset parser", () => {
  it("should parse a single record correctly", () => {
    const raw = new Uint8Array(32);
    const reader = new ByteReader(raw, "test");
    
    // Fill with sample data using correct offsets
    // x (2): 0x0123 (291), y (4): 0x0456 (1110)
    raw[2] = 0x23; raw[3] = 0x01;
    raw[4] = 0x56; raw[5] = 0x04;
    // triggerScript (8): 0x0064 (100)
    raw[8] = 0x64; raw[9] = 0x00;
    // state (12): 1, mode (14): 2
    raw[12] = 0x01; raw[13] = 0x00;
    raw[14] = 0x02; raw[15] = 0x00;
    // sprite (16): 50
    raw[16] = 0x32; raw[17] = 0x00;
    // nSpriteFrames (18): 4, direction (20): 2, currentFrame (22): 3
    raw[18] = 0x04; raw[19] = 0x00;
    raw[20] = 0x02; raw[21] = 0x00;
    raw[22] = 0x03; raw[23] = 0x00;

    const obj = parseEventObject(reader, 0, 10);
    expect(obj).toEqual({
      slot: 10,
      x: 291,
      y: 1110,
      sLayer: 0,
      triggerScript: 100,
      autoScript: 0,
      state: 1,
      triggerMode: 2,
      spriteNum: 50,
      nSpriteFrames: 4,
      direction: 2,
      currentFrame: 3,
      nSpriteFramesAuto: 0,
    });
  });

  it("should parse a table of records", () => {
    const raw = new Uint8Array(64); // 2 records
    // Record 1 (slot 5)
    raw[2] = 0x01; // x=1
    // Record 2 (slot 6)
    raw[32 + 2] = 0x02; // x=2

    const table = parseEventObjectTable(raw, 5);
    expect(table).toHaveLength(2);
    expect(table[0].slot).toBe(5);
    expect(table[0].x).toBe(1);
    expect(table[1].slot).toBe(6);
    expect(table[1].x).toBe(2);
  });

  it("should handle template mapping where slot N is record N (Record 0 is sentinel)", () => {
    // Construct a template with 2 records
    // Record 0: sentinel (all zeros)
    // Record 1: Data for Slot 1
    const raw = new Uint8Array(64);
    raw[32 + 2] = 0x7F; // Record 1 (Slot 1), x=127

    // Logic used in tools: Template Offset = slot * 32
    const slot = 1;
    const reader = new ByteReader(raw, "template");
    const obj = parseEventObject(reader, slot * 32, slot);

    expect(obj.slot).toBe(1);
    expect(obj.x).toBe(127);
  });
});
