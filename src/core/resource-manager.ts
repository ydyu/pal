import { MkfArchive } from "./mkf.js";
import { parseScenes, getSceneEventSlotRange, type Scene } from "./assets/scenes.js";
import { parseMessages, parseWordDat } from "./assets/text.js";
import { parseSave, type SaveData } from "./assets/saves.js";
import { getScriptSummary } from "./assets/scripts.js";
import { SssSubfile, DataSubfile } from "./assets/metadata.js";
import { decompressYj1, isYj1Compressed } from "./codecs/yj1.js";
import { iterateMapTiles, type PalMap } from "./map.js";
import { parseSpriteDirectory, type SpriteDirectory, type SpriteType, wrapSingleFrameSprite } from "./codecs/rle.js";
import { decodePalette, type PaletteSet } from "./palette.js";
import { parseEventObject, type EventObject } from "./assets/event-objects.js";
import { ByteReader } from "./binary.js";
import { SceneModel, type SpriteResolver } from "./scene-model.js";
import { parseEnemyTeam, parseEnemyStatsTable, type EnemyStats } from "./assets/battle.js";
import { parseItemTable, type Item } from "./assets/items.js";

/**
 * High-level interface for accessing PAL game assets without needing to know
 * the underlying file structure (MKF indices, filenames, etc.).
 */
export class ResourceManager implements SpriteResolver {
  private archives: Map<string, MkfArchive> = new Map();
  private cache: {
    messages?: string[];
    words?: string[];
    scenes?: readonly Scene[];
    enemyStats?: EnemyStats[];
    items?: (Item | undefined)[];
  } = {};

  constructor(private files: Record<string, Uint8Array>) {}

  public getArchive(name: string): MkfArchive {
    let archive = this.archives.get(name);
    if (!archive) {
      const data = this.files[name];
      if (!data) throw new Error(`Game file not found: ${name}. Ensure keys match exactly (usually uppercase).`);
      archive = MkfArchive.fromBytes(data);
      this.archives.set(name, archive);
    }
    return archive;
  }

  private getDecompressedChunk(archiveName: string, chunkIndex: number): Uint8Array {
    const chunk = this.getArchive(archiveName).getChunk(chunkIndex);
    return isYj1Compressed(chunk) ? decompressYj1(chunk) : chunk;
  }

  /**
   * Retrieves a dialogue message by its global index.
   */
  public getDialogue(index: number): string {
    if (!this.cache.messages) {
      const sss = this.getArchive("SSS.MKF");
      const msgData = this.files["M.MSG"];
      if (!msgData) throw new Error("M.MSG not loaded");
      this.cache.messages = parseMessages(sss.getChunk(SssSubfile.MessageOffsets), msgData);
    }
    return this.cache.messages[index] || "";
  }

  /**
   * Retrieves an item, skill, or enemy name from the global word table.
   */
  public getWord(index: number): string {
    if (!this.cache.words) {
      const data = this.files["WORD.DAT"];
      if (!data) throw new Error("WORD.DAT not loaded");
      this.cache.words = parseWordDat(data);
    }
    return this.cache.words[index] || "";
  }

  /**
   * Retrieves a scene definition by its 1-based scene number.
   */
  public getScene(sceneNumber: number): Scene {
    const scene = this.getSceneTable()[sceneNumber - 1];
    if (!scene) throw new Error(`Invalid scene number: ${sceneNumber}`);
    return scene;
  }

  /**
   * Returns the number of scenes available in the game.
   */
  public getSceneCount(): number {
    return this.getSceneTable().length;
  }

  /**
   * Returns the number of maps available in MAP.MKF.
   */
  public getMapCount(): number {
    return this.getArchive("MAP.MKF").chunkCount;
  }

  /**
   * Calculates the range of 1-based EventObject slots owned by a specific scene.
   */
  public getSceneEventSlotRange(sceneNumber: number): [number, number] {
    const template = this.getEventObjectTemplate();
    // The template includes a sentinel record at slot 0. Logical slots are 1..totalSlots-1.
    const totalSlots = Math.max(0, Math.floor(template.length / 0x20) - 1);
    return getSceneEventSlotRange(this.getSceneTable(), sceneNumber, totalSlots);
  }

  /**
   * Retrieves all EventObject templates for a given scene.
   */
  public getSceneEventObjects(sceneNumber: number): EventObject[] {
    const [startSlot, endSlot] = this.getSceneEventSlotRange(sceneNumber);
    const template = this.getEventObjectTemplate();
    const reader = new ByteReader(template, `EventObjectTemplate-Scene${sceneNumber}`);
    const objects: EventObject[] = [];

    for (let slot = startSlot; slot <= endSlot; slot++) {
      // Note: Logical slot N starts at offset N * 0x20 in the template (since slot 0 is a sentinel).
      objects.push(parseEventObject(reader, slot * 0x20, slot));
    }

    return objects;
  }

  /**
   * Loads a complete scene model, including map and event objects.
   */
  public loadSceneModel(sceneNumber: number): SceneModel {
    const scene = this.getScene(sceneNumber);
    const map = this.getMap(scene.mapNum);
    const objects = this.getSceneEventObjects(sceneNumber);
    const model = new SceneModel(scene, map, objects);
    model.resolveAutoFrames(this);
    return model;
  }

  /**
   * Retrieves a combined map object containing layout and tile-set.
   */
  public getMap(mapId: number): PalMap {
    // Treat mapId 0 as "no map" (empty scene/background).
    if (mapId === 0) {
      const emptyDir = parseSpriteDirectory(new Uint8Array([0, 0]));
      return { id: 0, tiles: [], tileSet: emptyDir };
    }

    const layoutData = this.getDecompressedChunk("MAP.MKF", mapId);
    const tileSetData = this.getArchive("GOP.MKF").getChunk(mapId);
    
    return {
      id: mapId,
      tiles: Array.from(iterateMapTiles(layoutData)),
      tileSet: parseSpriteDirectory(tileSetData)
    };
  }

  /**
   * Returns the number of sprites available for a given type.
   */
  public getSpriteCount(type: SpriteType): number {
    const fileMap: Record<SpriteType, string> = {
      world: "MGO.MKF",
      item: "BALL.MKF",
      playerBattle: "F.MKF",
      enemyBattle: "ABC.MKF",
      effect: "FIRE.MKF",
      portrait: "RGM.MKF"
    };
    return this.getArchive(fileMap[type]).chunkCount;
  }

  /**
   * Retrieves a sprite directory (multiple frames) for a semantic type.
   * Handles automatic decompression and specific file headers (item/portrait).
   */
  public getSprite(type: SpriteType, id: number): SpriteDirectory {
    const fileMap: Record<SpriteType, string> = {
      world: "MGO.MKF",
      item: "BALL.MKF",
      playerBattle: "F.MKF",
      enemyBattle: "ABC.MKF",
      effect: "FIRE.MKF",
      portrait: "RGM.MKF"
    };

    const fileName = fileMap[type];
    let chunk = this.getArchive(fileName).getChunk(id);

    // Items and Portraits have a 4-byte palette ID prefix before the RLE data.
    // They are also technically single-frame "sprite directories".
    if (type === "item" || type === "portrait") {
      return wrapSingleFrameSprite(chunk.subarray(4));
    }

    if (isYj1Compressed(chunk)) {
      chunk = decompressYj1(chunk);
    }

    return parseSpriteDirectory(chunk);
  }

  /**
   * Returns the asset ID (V1, u16 LE at offset 0) from SSS.MKF sub[2] (NameDefinition) for the given WORD.DAT index.
   * For items, this is the BALL.MKF sprite index. For enemies, this is the combat stats and ABC.MKF index.
   */
  public getWordAssetId(wordDatIndex: number): number {
    const chunk = this.getArchive("SSS.MKF").getChunk(SssSubfile.NameDefinition);
    const entrySize = chunk.length % 14 === 0 ? 14 : 12;
    const offset = wordDatIndex * entrySize;
    if (offset + 2 > chunk.length) return 0;
    return chunk[offset]! | (chunk[offset + 1]! << 8);
  }

  /**
   * Retrieves the composition of an enemy team.
   * Returns an array of objects containing the name and distinct IDs for each enemy.
   */
  public getEnemyTeam(groupId: number): Array<{ name: string, enemyId: number, spriteId: number, wordId: number }> {
    const teamChunk = this.getArchive("DATA.MKF").getChunk(DataSubfile.EnemyTeam);
    const wordIndices = parseEnemyTeam(teamChunk, groupId);
    return wordIndices.map(idx => {
      const assetId = this.getWordAssetId(idx);
      return {
        name: this.getWord(idx),
        enemyId: assetId,
        spriteId: assetId,
        wordId: idx,
      };
    });
  }

  /**
   * Retrieves the full table of parsed enemy stats from DATA.MKF.
   */
  public getEnemyStatsTable(): readonly EnemyStats[] {
    if (!this.cache.enemyStats) {
      const chunk = this.getArchive("DATA.MKF").getChunk(DataSubfile.EnemyData);
      this.cache.enemyStats = parseEnemyStatsTable(chunk);
    }
    return this.cache.enemyStats;
  }

  /**
   * Retrieves an enemy's combat stats by their logical enemy ID.
   */
  public getEnemyStats(enemyId: number): EnemyStats | undefined {
    return this.getEnemyStatsTable()[enemyId];
  }

  /**
   * Retrieves an item's combat stats by their WORD.DAT index.
   * This internally resolves the index to a logical enemy ID.
   */
  public getEnemyStatsByWord(wordDatIndex: number): EnemyStats | undefined {
    const enemyId = this.getWordAssetId(wordDatIndex);
    if (enemyId === 0) return undefined;
    return this.getEnemyStats(enemyId);
  }

  /**
   * Retrieves the full table of parsed items.
   * Items are located at WORD.DAT indices 61 to 294.
   */
  public getItems(): readonly (Item | undefined)[] {
    if (!this.cache.items) {
      const chunk = this.getArchive("SSS.MKF").getChunk(SssSubfile.NameDefinition);
      this.cache.items = parseItemTable(chunk, id => this.getWord(id));
    }
    return this.cache.items;
  }

  /**
   * Retrieves an item by its WORD.DAT ID.
   */
  public getItem(id: number): Item | undefined {
    return this.getItems()[id];
  }

  /**
   * Retrieves the raw script table chunk from SSS.MKF.
   */

  public getScriptChunk(): Uint8Array {
    return this.getArchive("SSS.MKF").getChunk(SssSubfile.ScriptTable);
  }

  /**
   * Retrieves the master EventObject template table from SSS.MKF.
   */
  public getEventObjectTemplate(): Uint8Array {
    return this.getArchive("SSS.MKF").getChunk(SssSubfile.EventObjectTemplate);
  }

  /**
   * Retrieves the full scene table from SSS.MKF.
   */
  public getSceneTable(): readonly Scene[] {
    if (!this.cache.scenes) {
      this.cache.scenes = parseScenes(this.getArchive("SSS.MKF").getChunk(SssSubfile.SceneTable));
    }
    return this.cache.scenes;
  }

  /**
   * Identifies a descriptive label for a script by looking at its first few instructions.
   */
  public getScriptSummary(startIndex: number): string {
    return getScriptSummary(this.getScriptChunk(), startIndex, this);
  }

  /**
   * Retrieves a palette chunk.
   * @param paletteId 0 for default/day, 1 for night (if present).
   */
  public getPaletteChunk(paletteId: number = 0): Uint8Array {
    return this.getArchive("PAT.MKF").getChunk(paletteId);
  }

  /**
   * Retrieves a palette set with optional day/night modes.
   * Automatically detects if chunk is 1536 bytes (day+night) or 768 bytes (day-only).
   * @param paletteId Palette ID to load (usually 0).
   * @returns PaletteSet with day palette and optional night palette.
   */
  public getPalette(paletteId: number = 0): PaletteSet {
    const chunk = this.getPaletteChunk(paletteId);
    const day = decodePalette(chunk, false);
    
    if (chunk.length === 1536) {
      const night = decodePalette(chunk, true);
      return { day, night };
    }
    
    return { day };
  }

  /**
   * Parses a PAL DOS save file.
   */
  public parseSave(data: Uint8Array): SaveData {
    return parseSave(data);
  }
}
