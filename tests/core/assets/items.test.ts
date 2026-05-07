import { describe, it, expect } from "vitest";
import { parseItemTable } from "../../../src/core/assets/items.js";

describe("Item parsing", () => {
  it("parses 12-byte (DOS) records correctly", () => {
    // 295 records * 12 bytes
    const buf = new Uint8Array(295 * 12);
    
    // Set up record for item 61 (止血草)
    const offset = 61 * 12;
    // wBitmap (spriteId) = 1
    buf[offset + 0] = 0x01;
    buf[offset + 1] = 0x00;
    // wPrice = 50
    buf[offset + 2] = 0x32;
    buf[offset + 3] = 0x00;
    // wScriptOnUse = 161 (0xA1)
    buf[offset + 4] = 0xA1;
    buf[offset + 5] = 0x00;
    // wFlags = 0x0029 (usable=1, consuming=1, sellable=1)
    buf[offset + 10] = 0x29;
    buf[offset + 11] = 0x00;

    const items = parseItemTable(buf, id => `Item ${id}`);
    const item = items[61]!;

    expect(item).toBeDefined();
    expect(item.id).toBe(61);
    expect(item.name).toBe("Item 61");
    expect(item.spriteId).toBe(1);
    expect(item.price).toBe(50);
    expect(item.scriptOnUse).toBe(161);
    expect(item.flags.usable).toBe(true);
    expect(item.flags.consuming).toBe(true);
    expect(item.flags.sellable).toBe(true);
    expect(item.flags.equippable).toBe(false);
  });

  it("parses 14-byte (Windows) records correctly", () => {
    // 295 records * 14 bytes
    const buf = new Uint8Array(295 * 14);
    
    // Set up record for item 61
    const offset = 61 * 14;
    // wBitmap = 1
    buf[offset + 0] = 0x01;
    buf[offset + 1] = 0x00;
    // wPrice = 50
    buf[offset + 2] = 0x32;
    buf[offset + 3] = 0x00;
    // wScriptDesc = 178 (0xB2)
    buf[offset + 10] = 0xB2;
    buf[offset + 11] = 0x00;
    // wFlags = 0x0029
    buf[offset + 12] = 0x29;
    buf[offset + 13] = 0x00;

    const items = parseItemTable(buf, id => `Item ${id}`);
    const item = items[61]!;

    expect(item.scriptDesc).toBe(178);
    expect(item.flags.usable).toBe(true);
  });

  it("decodes role equippability flags correctly", () => {
    const buf = new Uint8Array(295 * 12);
    const offset = 61 * 12;
    // flags = 0x0140 (Usable + Role 0 + Role 2)
    buf[offset + 10] = 0x41;
    buf[offset + 11] = 0x01;

    const items = parseItemTable(buf, id => `Item ${id}`);
    const item = items[61]!;

    expect(item.flags.usable).toBe(true);
    expect(item.flags.equippableByRole[0]).toBe(true);
    expect(item.flags.equippableByRole[1]).toBe(false);
    expect(item.flags.equippableByRole[2]).toBe(true);
  });
});
