import { describe, it, expect } from "vitest";
import { parseWordDat, parseMessages, decodeBig5 } from "../../../src/core/assets/text.js";

describe("text asset parser", () => {
  it("should decode Big5 correctly", () => {
    // a7 f5 b3 70 bb bb -> 李逍遙
    const raw = new Uint8Array([0xa7, 0xf5, 0xb3, 0x70, 0xbb, 0xbb]);
    expect(decodeBig5(raw)).toBe("李逍遙");
  });

  it("should parse WORD.DAT correctly", () => {
    // Entry 0, 1 are spaces (0x20)
    // Entry 2 is 經驗值 (b8 67 c5 e7 ad c8)
    const raw = new Uint8Array([
      0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
      0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
      0xb8, 0x67, 0xc5, 0xe7, 0xad, 0xc8, 0x20, 0x20, 0x20, 0x20,
    ]);

    const words = parseWordDat(raw);
    expect(words).toHaveLength(3);
    expect(words[0]).toBe("");
    expect(words[1]).toBe("");
    expect(words[2]).toBe("經驗值");
  });

  it("should parse M.MSG correctly using offset table", () => {
    // Real ground truth from early M.MSG:
    // msg[0]: '此門已上鎖' (a6b9 aaf9 a477 a457 c2ea)
    // msg[1]: '?(2)' (3f28 3229)
    // Offset table (u32 LE): 0, 10, 14
    const offsetTable = new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x0a, 0x00, 0x00, 0x00,
      0x0e, 0x00, 0x00, 0x00,
    ]);

    const messageData = new Uint8Array([
      0xa6, 0xb9, 0xaa, 0xf9, 0xa4, 0x77, 0xa4, 0x57, 0xc2, 0xea,
      0x3f, 0x28, 0x32, 0x29
    ]);

    const messages = parseMessages(offsetTable, messageData);
    expect(messages).toHaveLength(3);
    expect(messages[0]).toBe("此門已上鎖");
    expect(messages[1]).toBe("?(2)");
    expect(messages[2]).toBe("");
  });
});
