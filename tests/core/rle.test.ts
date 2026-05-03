import { describe, expect, test } from "vitest";

import { MkfArchive } from "../../src/core/mkf.js";
import { decodeRleFrame, getSpriteFrameBytes, parseSpriteDirectory } from "../../src/core/codecs/rle.js";
import { hasGameFile, readGameFile } from "../helpers/game-data.js";

describe("GOP RLE helpers", () => {
  test("decodes a simple synthetic frame", () => {
    const frame = decodeRleFrame(
      new Uint8Array([
        0x04, 0x00, 0x02, 0x00,
        0x82,
        0x02, 0x10, 0x11,
        0x04, 0x20, 0x21, 0x22, 0x23
      ])
    );

    expect(frame).not.toBeNull();
    expect(frame).toMatchObject({ width: 4, height: 2 });
    expect(Array.from(frame!.pixels)).toEqual([0, 0, 0x10, 0x11, 0x20, 0x21, 0x22, 0x23]);
    expect(Array.from(frame!.mask)).toEqual([0, 0, 1, 1, 1, 1, 1, 1]);
  });

  test.runIf(hasGameFile("GOP.MKF"))("matches the first live sprite directory and frame", () => {
    const archive = MkfArchive.fromBytes(readGameFile("GOP.MKF"));
    const directory = parseSpriteDirectory(archive.getChunk(1));
    expect(directory.numFrames).toBe(301);

    const starts = [0, 1, 2, 3, 4].map((index) => getSpriteFrameBytes(directory, index)).map((frame) => frame?.byteOffset ? (frame.byteOffset - directory.chunk.byteOffset) : 0);
    expect(starts).toEqual([604, 908, 1212, 1516, 1820]);

    const frame = decodeRleFrame(getSpriteFrameBytes(directory, 0));
    expect(frame).not.toBeNull();
    expect(frame).toMatchObject({ width: 32, height: 15 });

    const nonZero: Array<[number, number]> = [];
    for (let index = 0; index < frame!.pixels.length && nonZero.length < 16; index += 1) {
      const value = frame!.pixels[index]!;
      if (value !== 0) {
        nonZero.push([index, value]);
      }
    }

    expect(nonZero).toEqual([
      [14, 197],
      [15, 228],
      [16, 229],
      [17, 197],
      [44, 197],
      [45, 197],
      [46, 198],
      [47, 197],
      [48, 198],
      [49, 196],
      [50, 229],
      [51, 197],
      [74, 228],
      [75, 227],
      [76, 197],
      [77, 198]
    ]);
  });
});
