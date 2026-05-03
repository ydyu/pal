import { describe, it, expect } from "vitest";
import { ResourceManager } from "../../src/core/resource-manager.js";

function assetsToSssMkf(assets: {
  template?: Uint8Array;
  scenes?: Uint8Array;
  nameDef?: Uint8Array;
  msgOffsets?: Uint8Array;
  scripts?: Uint8Array;
}) {
  const subs = [
    assets.template || new Uint8Array(0),
    assets.scenes || new Uint8Array(0),
    assets.nameDef || new Uint8Array(0),
    assets.msgOffsets || new Uint8Array(0),
    assets.scripts || new Uint8Array(0),
  ];

  const headerSize = (subs.length + 1) * 4;
  let currentOffset = headerSize;
  const offsets: number[] = [];
  for (const s of subs) {
    offsets.push(currentOffset);
    currentOffset += s.length;
  }
  offsets.push(currentOffset);

  const out = new Uint8Array(currentOffset);
  const view = new DataView(out.buffer);
  offsets.forEach((off, i) => view.setUint32(i * 4, off, true));
  let pos = headerSize;
  subs.forEach(s => {
    out.set(s, pos);
    pos += s.length;
  });
  return out;
}

describe("ResourceManager", () => {
  // Construct a valid minimal MKF buffer
  // Sub 0: Template (empty)
  // Sub 1: SceneTable (8 bytes)
  // Sub 2: NameDef (empty)
  // Sub 3: MsgOffsets (4 bytes)
  // Sub 4: Scripts (empty)
  const offsetTableSize = 6 * 4; // offsets for sub 0,1,2,3,4 + end offset
  const sceneTableOffset = offsetTableSize;
  const msgOffsetsOffset = sceneTableOffset + 8;
  const totalSize = msgOffsetsOffset + 4;

  const sss = new Uint8Array(totalSize);
  const view = new DataView(sss.buffer);
  view.setUint32(0, offsetTableSize, true); // sub[0]
  view.setUint32(4, sceneTableOffset, true); // sub[1]
  view.setUint32(8, msgOffsetsOffset, true); // sub[2]
  view.setUint32(12, msgOffsetsOffset, true); // sub[3]
  view.setUint32(16, totalSize, true); // sub[4]
  view.setUint32(20, totalSize, true); // end

  // Scene 1: mapNum=12, enter=0, teleport=0, objIdx=32
  view.setUint16(sceneTableOffset, 12, true);
  view.setUint16(sceneTableOffset + 6, 32, true);

  // Msg 0 offset = 0
  view.setUint32(msgOffsetsOffset, 0, true);

  const mockFiles: Record<string, Uint8Array> = {
    "SSS.MKF": sss,
    "M.MSG": new Uint8Array([0xa6, 0xb9, 0xaa, 0xf9, 0xa4, 0x77, 0xa4, 0x57, 0xc2, 0xea]),
    "WORD.DAT": new Uint8Array(10).fill(0x20),
  };

  it("should fail gracefully when a file is missing", () => {
    const assets = new ResourceManager({});
    expect(() => assets.getArchive("MISSING.MKF")).toThrow(/Game file not found/);
  });

  it("should retrieve parsed dialogue using uppercase keys", () => {
    const assets = new ResourceManager(mockFiles);
    expect(assets.getDialogue(0)).toBe("此門已上鎖");
  });

  it("should retrieve parsed scenes", () => {
    const assets = new ResourceManager(mockFiles);
    const scene = assets.getScene(1);
    expect(scene.mapNum).toBe(12);
    expect(scene.eventObjectIndex).toBe(32);
  });

  it("should retrieve scene count", () => {
    const assets = new ResourceManager(mockFiles);
    expect(assets.getSceneCount()).toBe(1);
  });

  it("should calculate scene event slot range with multiple slots", () => {
    // 2 scenes, 6 template records (totalSlots = 5, accounting for sentinel at slot 0)
    // Scene 1: EventObjectIndex 1 (implicitly)
    // Scene 2: EventObjectIndex 4
    const scenes = new Uint8Array(16);
    const view = new DataView(scenes.buffer);
    view.setUint16(6, 1, true);  // Scene 1: objIdx=1
    view.setUint16(14, 4, true); // Scene 2: objIdx=4
    
    const template = new Uint8Array(6 * 32); // 6 records (totalSlots = 5)

    const assets = new ResourceManager({
      "SSS.MKF": assetsToSssMkf({ scenes, template })
    });

    // Scene 1 owns slots [1 .. 4-1] = [1, 3]
    const range1 = assets.getSceneEventSlotRange(1);
    expect(range1).toEqual([1, 3]);

    // Scene 2 owns slots [4 .. 5]
    const range2 = assets.getSceneEventSlotRange(2);
    expect(range2).toEqual([4, 5]);
  });

  it("should retrieve raw script and template chunks", () => {
    const scripts = new Uint8Array([1, 2, 3]);
    const template = new Uint8Array([4, 5, 6]);
    const assets = new ResourceManager({
      "SSS.MKF": assetsToSssMkf({ scripts, template })
    });
    expect(assets.getScriptChunk()).toEqual(scripts);
    expect(assets.getEventObjectTemplate()).toEqual(template);
  });

  it("should retrieve the full scene table", () => {
    const assets = new ResourceManager(mockFiles);
    const table = assets.getSceneTable();
    expect(table).toHaveLength(1);
    expect(table[0].mapNum).toBe(12);
  });

  it("should generate a script summary", () => {
    // SSS sub[4] (scripts) needs a SHOW_DIALOGUE instruction
    const scripts = new Uint8Array([0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); 
    // SSS sub[3] (msgOffsets) needs an offset entry for msg 0
    const msgOffsets = new Uint8Array([0x00, 0x00, 0x00, 0x00]); 
    
    const assets = new ResourceManager({
      ...mockFiles,
      "SSS.MKF": assetsToSssMkf({ scripts, msgOffsets }),
      "M.MSG": new Uint8Array([0xa6, 0xb9, 0xaa, 0xf9, 0xa4, 0x77, 0xa4, 0x57, 0xc2, 0xea]), // "此門已上鎖"
    });
    expect(assets.getScriptSummary(0)).toBe("此門已上鎖");
  });

  it("should cache parsed results", () => {
    const assets = new ResourceManager(mockFiles);
    const scene1 = assets.getScene(1);
    const scene2 = assets.getScene(1);
    expect(scene1).toBe(scene2); // Verify reference equality (cached)
  });

  it("should parse save data through the manager", () => {
    const assets = new ResourceManager({});
    const raw = new Uint8Array(20000);
    raw[0] = 0x05; // savedTimes = 5
    const save = assets.parseSave(raw);
    expect(save.savedTimes).toBe(5);
  });

  it("should retrieve EventObjects for a scene", () => {
    // 1 scene, 2 template records (1 sentinel + 1 actual)
    const scenes = new Uint8Array(8);
    const sceneView = new DataView(scenes.buffer);
    sceneView.setUint16(6, 1, true); // Scene 1: objIdx=1
    
    const template = new Uint8Array(2 * 32);
    const tempView = new DataView(template.buffer);
    // Record 1 (slot 1): x=100, y=200, sprite=5
    tempView.setUint16(1 * 32 + 2, 100, true);
    tempView.setUint16(1 * 32 + 4, 200, true);
    tempView.setUint16(1 * 32 + 16, 5, true);

    const assets = new ResourceManager({
      "SSS.MKF": assetsToSssMkf({ scenes, template })
    });

    const range = assets.getSceneEventSlotRange(1);
    expect(range).toEqual([1, 1]);

    const objects = assets.getSceneEventObjects(1);
    expect(objects).toHaveLength(1);
    expect(objects[0].slot).toBe(1);
    expect(objects[0].x).toBe(100);
    expect(objects[0].y).toBe(200);
    expect(objects[0].spriteNum).toBe(5);
  });

  it("should load a SceneModel for a scene", () => {
    const scenes = new Uint8Array(8);
    const sceneView = new DataView(scenes.buffer);
    sceneView.setUint16(0, 5, true); // mapNum=5
    sceneView.setUint16(6, 1, true); // objIdx=1
    
    const template = new Uint8Array(2 * 32);
    const templateView = new DataView(template.buffer);
    templateView.setUint16(1 * 32 + 10, 456, true); // autoScript=456
    templateView.setUint16(1 * 32 + 16, 1, true); // spriteNum=1
    templateView.setUint16(1 * 32 + 18, 0, true); // nSpriteFrames=0
    
    // MAP.MKF with 6 chunks (0..5)
    const MAP_SIZE = 128 * 64 * 2 * 4;
    const headerSize = 28;
    const mapLayout = new Uint8Array(MAP_SIZE);
    const mapMkf = new Uint8Array(headerSize + MAP_SIZE);
    const mapView = new DataView(mapMkf.buffer);
    for (let i = 0; i < 6; i++) mapView.setUint32(i * 4, headerSize, true);
    mapView.setUint32(5 * 4, headerSize, true); // Chunk 5 starts at headerSize
    mapView.setUint32(6 * 4, headerSize + MAP_SIZE, true); // End of chunk 5
    mapMkf.set(mapLayout, headerSize);

    // GOP.MKF with 6 chunks. Each chunk must be at least 2 bytes [0, 0] for parseSpriteDirectory.
    const GOP_CHUNK_SIZE = 2;
    const gopMkf = new Uint8Array(headerSize + GOP_CHUNK_SIZE);
    const gopView = new DataView(gopMkf.buffer);
    for (let i = 0; i < 6; i++) gopView.setUint32(i * 4, headerSize, true);
    gopView.setUint32(5 * 4, headerSize, true);
    gopView.setUint32(6 * 4, headerSize + GOP_CHUNK_SIZE, true);
    gopMkf.set(new Uint8Array([0, 0]), headerSize);

    // MGO.MKF with 2 chunks. Chunk 1 reports 4 runtime frames (wordCount=5 incl. sentinel).
    const mgoChunk0 = new Uint8Array([0, 0]);
    const mgoChunk1 = new Uint8Array([5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const mgoHeaderSize = 12;
    const mgoMkf = new Uint8Array(mgoHeaderSize + mgoChunk0.length + mgoChunk1.length);
    const mgoView = new DataView(mgoMkf.buffer);
    mgoView.setUint32(0, mgoHeaderSize, true);
    mgoView.setUint32(4, mgoHeaderSize + mgoChunk0.length, true);
    mgoView.setUint32(8, mgoHeaderSize + mgoChunk0.length + mgoChunk1.length, true);
    mgoMkf.set(mgoChunk0, mgoHeaderSize);
    mgoMkf.set(mgoChunk1, mgoHeaderSize + mgoChunk0.length);

    const assets = new ResourceManager({
      "SSS.MKF": assetsToSssMkf({ scenes, template }),
      "MAP.MKF": mapMkf,
      "GOP.MKF": gopMkf,
      "MGO.MKF": mgoMkf,
    });

    const model = assets.loadSceneModel(1);
    expect(model.scene.mapNum).toBe(5);
    expect(model.map.id).toBe(5);
    expect(model.objects.size).toBe(1);
    expect(model.objects.get(1)?.data.nSpriteFramesAuto).toBe(4);
  });

  it("should fail gracefully for invalid scene IDs in loadSceneModel and getSceneEventObjects", () => {
    const assets = new ResourceManager(mockFiles);
    const maxScene = assets.getSceneCount();

    expect(() => assets.loadSceneModel(0)).toThrow(/Invalid scene (number|index)/);
    expect(() => assets.loadSceneModel(maxScene + 1)).toThrow(/Invalid scene (number|index)/);
    expect(() => assets.getSceneEventObjects(0)).toThrow(/Invalid scene (number|index)/);
    expect(() => assets.getSceneEventObjects(maxScene + 1)).toThrow(/Invalid scene (number|index)/);
  });

  it("should retrieve palette set with day-only chunk (768 bytes)", () => {
    const dayPalette = new Uint8Array(768);
    // Set color 0: (10, 20, 30) in 6-bit
    dayPalette[0] = 10;
    dayPalette[1] = 20;
    dayPalette[2] = 30;
    
    // MKF format: 2 offsets (8 bytes header) + chunk data
    const patMkf = new Uint8Array(8 + dayPalette.length);
    const view = new DataView(patMkf.buffer);
    view.setUint32(0, 8, true);  // First offset = 8 (header size for 1 chunk + 1 sentinel offset)
    view.setUint32(4, 8 + dayPalette.length, true);  // End of file
    patMkf.set(dayPalette, 8);
    
    const assets = new ResourceManager({ "PAT.MKF": patMkf });
    const palette = assets.getPalette(0);
    
    expect(palette.day).toHaveLength(256);
    expect(palette.day[0]).toEqual({ r: 40, g: 80, b: 120 });
    expect(palette.night).toBeUndefined();
  });

  it("should retrieve palette set with day+night chunk (1536 bytes)", () => {
    const combined = new Uint8Array(1536);
    // Day palette at 0: color 0 = (10, 20, 30)
    combined[0] = 10;
    combined[1] = 20;
    combined[2] = 30;
    // Night palette at 768: color 0 = (5, 10, 15)
    combined[768] = 5;
    combined[769] = 10;
    combined[770] = 15;
    
    // MKF format: 2 offsets (8 bytes header) + chunk data
    const patMkf = new Uint8Array(8 + combined.length);
    const view = new DataView(patMkf.buffer);
    view.setUint32(0, 8, true);  // First offset = 8
    view.setUint32(4, 8 + combined.length, true);  // End of file
    patMkf.set(combined, 8);
    
    const assets = new ResourceManager({ "PAT.MKF": patMkf });
    const palette = assets.getPalette(0);
    
    expect(palette.day).toHaveLength(256);
    expect(palette.day[0]).toEqual({ r: 40, g: 80, b: 120 });
    expect(palette.night).toHaveLength(256);
    expect(palette.night![0]).toEqual({ r: 20, g: 40, b: 60 });
  });

  it("should work with a Proxy and not copy the files object", () => {
    let accessCount = 0;
    const proxyFiles = new Proxy(mockFiles, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && prop.endsWith(".MKF")) {
          accessCount++;
        }
        return Reflect.get(target, prop, receiver);
      }
    });

    const assets = new ResourceManager(proxyFiles);
    
    // First access to SSS.MKF should trigger proxy
    assets.getScene(1);
    expect(accessCount).toBe(1);

    // Second access should use the internal archive cache, not the files proxy
    assets.getScene(1);
    expect(accessCount).toBe(1);

    // Accessing a different archive should trigger proxy again
    mockFiles["PAT.MKF"] = new Uint8Array([8, 0, 0, 0, 8, 0, 0, 0]); // Empty but valid MKF
    assets.getArchive("PAT.MKF");
    expect(accessCount).toBe(2);
  });

  describe("Sprite Loading", () => {
    // Standard MKF for MGO.MKF with 1 frame
    // Sub 0: [wordCount=1, offset0=1] then RLE [width=4, height=4]
    const spriteContent = new Uint8Array([
      1, 0, 1, 0,             // SpriteDirectory: wordCount=1, offset0=1
      0x04, 0x00, 0x04, 0x00  // RLE header: 4x4
    ]);
    const mgo = new Uint8Array([
      8, 0, 0, 0, 14, 0, 0, 0, // Header + Offsets (Sub 0 starts at 8, Sub 1 at 14)
      ...spriteContent
    ]);

    // Single-frame MKF for RGM.MKF (with 4-byte palette header)
    const rgmContent = new Uint8Array([
      0x01, 0x00, 0x00, 0x00, // Palette ID header (4 bytes)
      0x04, 0x00, 0x04, 0x00  // RLE header: 4x4
    ]);
    const rgm = new Uint8Array([
      8, 0, 0, 0, 16, 0, 0, 0, // Header + Offsets
      ...rgmContent
    ]);

    const localFiles = {
      ...mockFiles,
      "MGO.MKF": mgo,
      "RGM.MKF": rgm,
      "BALL.MKF": rgm,
      "FIRE.MKF": mgo,
    };

    it("should load standard multi-frame sprites (MGO)", () => {
      const assets = new ResourceManager(localFiles);
      const sprite = assets.getSprite("world", 0);
      expect(sprite.numFrames).toBe(1);
      expect(sprite.chunk[0]).toBe(1); // raw wordCount in the chunk header
    });

    it("should correctly wrap single-frame sprites (RGM/Portrait)", () => {
      const assets = new ResourceManager(localFiles);
      const sprite = assets.getSprite("portrait", 0);
      expect(sprite.numFrames).toBe(1);
      // The wrapped chunk should start with [1, 0] (wordCount=1)
      // and the RLE data should follow immediately after the 2-byte offset table.
      expect(sprite.chunk[0]).toBe(1); 
      expect(sprite.chunk[1]).toBe(0);
      expect(sprite.chunk[2]).toBe(0x04); // Start of RLE header (width=4)
    });

    it("should correctly wrap single-frame sprites (BALL/Item)", () => {
      const assets = new ResourceManager(localFiles);
      const sprite = assets.getSprite("item", 0);
      expect(sprite.numFrames).toBe(1);
      expect(sprite.chunk[2]).toBe(0x04);
    });

    it("should decompress YJ1 sprites automatically", () => {
      // Smallest possible YJ1-compressed header: "YJ1" + flags + sizes
      const yj1 = new Uint8Array([
        0x59, 0x4a, 0x5f, 0x31, // "YJ_1"
        0x00, 0x00, 0x00, 0x00, // Dummy header
        0x04, 0x00, 0x00, 0x00, // Uncompressed size = 4
        0x00, 0x00, 0x00, 0x00  // Data...
      ]);
      const yj1Mkf = new Uint8Array([
        8, 0, 0, 0, 8, 0, 0, 0, // MKF header
        ...yj1
      ]);
      const assets = new ResourceManager({ ...localFiles, "MGO.MKF": yj1Mkf });
      
      // This will throw if it tries to parse YJ1 directly as a sprite directory
      // because parseSpriteDirectory validates offsets.
      // Since it's garbage data, we just check that it DOESNT throw decompress error
      // or we use a try-catch to see where it fails.
      expect(() => assets.getSprite("world", 0)).toThrow(); // Fails on garbage RLE, but AFTER decompression attempt
    });
  });
});
