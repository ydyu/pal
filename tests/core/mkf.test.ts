import { describe, expect, test } from "vitest";

import { MkfArchive } from "../../src/core/mkf.js";
import { hasGameFile, readGameFile } from "../helpers/game-data.js";

describe("MKF archive parsing", () => {
  test("parses empty and non-empty chunks from a synthetic archive", () => {
    const archive = MkfArchive.fromBytes(
      new Uint8Array([
        0x10, 0x00, 0x00, 0x00,
        0x14, 0x00, 0x00, 0x00,
        0x14, 0x00, 0x00, 0x00,
        0x18, 0x00, 0x00, 0x00,
        0xaa, 0xbb, 0xcc, 0xdd,
        0xee, 0xff, 0x11, 0x22
      ])
    );

    expect(archive.chunkCount).toBe(3);
    expect(Array.from(archive.getChunk(0))).toEqual([0xaa, 0xbb, 0xcc, 0xdd]);
    expect(Array.from(archive.getChunk(1))).toEqual([]);
    expect(Array.from(archive.getChunk(2))).toEqual([0xee, 0xff, 0x11, 0x22]);
  });

  test.runIf(hasGameFile("SSS.MKF"))("matches the live SSS archive header", () => {
    const archive = MkfArchive.fromBytes(readGameFile("SSS.MKF"));
    expect(archive.chunkCount).toBe(5);
    expect(Array.from(archive.offsets.slice(0, 6))).toEqual([24, 171832, 174232, 181300, 223284, 563236]);

    const sceneChunk = archive.getChunk(1);
    const records = Array.from({ length: 4 }, (_, index) => {
      const offset = index * 8;
      return [
        sceneChunk[offset]! | (sceneChunk[offset + 1]! << 8),
        sceneChunk[offset + 2]! | (sceneChunk[offset + 3]! << 8),
        sceneChunk[offset + 4]! | (sceneChunk[offset + 5]! << 8),
        sceneChunk[offset + 6]! | (sceneChunk[offset + 7]! << 8)
      ];
    });

    expect(records).toEqual([
      [12, 7952, 0, 0],
      [12, 0, 0, 32],
      [10, 0, 0, 44],
      [1, 3149, 0, 76]
    ]);
  });
});
