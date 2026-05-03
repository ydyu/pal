import { describe, expect, test } from "vitest";

import { readUint32LE } from "../../src/core/binary.js";
import { MkfArchive } from "../../src/core/mkf.js";
import { decompressYj1, isYj1Compressed } from "../../src/core/codecs/yj1.js";
import { hasGameFile, readGameFile } from "../helpers/game-data.js";

describe("YJ_1 decompression", () => {
  test("recognizes the file signature", () => {
    expect(isYj1Compressed(new Uint8Array([0x59, 0x4a, 0x5f, 0x31]))).toBe(true);
    expect(isYj1Compressed(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBe(false);
  });

  test("rejects non-YJ_1 input", () => {
    expect(() => decompressYj1(new Uint8Array(16))).toThrow("Missing YJ_1 signature.");
  });

  test.runIf(hasGameFile("MAP.MKF"))("decompresses the first live map chunk to the expected tile words", () => {
    const archive = MkfArchive.fromBytes(readGameFile("MAP.MKF"));
    const chunk = archive.getChunk(1);
    expect(isYj1Compressed(chunk)).toBe(true);

    const bytes = decompressYj1(chunk);
    expect(bytes.length).toBe(128 * 64 * 2 * 4);

    const hits: Array<[number, number]> = [];
    for (let index = 0; index < bytes.length / 4 && hits.length < 12; index += 1) {
      const value = readUint32LE(bytes, index * 4);
      if (value !== 0) {
        hits.push([index, value]);
      }
    }

    expect(hits).toEqual([
      [106, 114],
      [107, 98],
      [108, 6815842],
      [109, 6619234],
      [110, 7012450],
      [111, 98],
      [112, 98],
      [113, 7143522],
      [114, 6815842],
      [115, 98],
      [116, 7209058],
      [117, 6815842]
    ]);
  });
});
