import { MkfArchive } from "./mkf.js";
import { parseScenes, getSceneEventSlotRange } from "./assets/scenes.js";
import { parseMessages, parseWordDat } from "./assets/text.js";
import { parseSave } from "./assets/saves.js";
import { getScriptSummary } from "./assets/scripts.js";
import { SssSubfile, DataSubfile } from "./assets/metadata.js";
import { decompressYj1, isYj1Compressed } from "./codecs/yj1.js";
import { iterateMapTiles } from "./map.js";
import { parseSpriteDirectory, wrapSingleFrameSprite } from "./codecs/rle.js";
import { decodePalette } from "./palette.js";
import { parseEventObject } from "./assets/event-objects.js";
import { ByteReader } from "./binary.js";
import { SceneModel } from "./scene-model.js";
import { parseEnemyTeam, parseEnemyStatsTable } from "./assets/battle.js";
/**
 * High-level interface for accessing PAL game assets without needing to know
 * the underlying file structure (MKF indices, filenames, etc.).
 */
export class ResourceManager {
    files;
    archives = new Map();
    cache = {};
    constructor(files) {
        this.files = files;
    }
    getArchive(name) {
        let archive = this.archives.get(name);
        if (!archive) {
            const data = this.files[name];
            if (!data)
                throw new Error(`Game file not found: ${name}. Ensure keys match exactly (usually uppercase).`);
            archive = MkfArchive.fromBytes(data);
            this.archives.set(name, archive);
        }
        return archive;
    }
    getDecompressedChunk(archiveName, chunkIndex) {
        const chunk = this.getArchive(archiveName).getChunk(chunkIndex);
        return isYj1Compressed(chunk) ? decompressYj1(chunk) : chunk;
    }
    /**
     * Retrieves a dialogue message by its global index.
     */
    getDialogue(index) {
        if (!this.cache.messages) {
            const sss = this.getArchive("SSS.MKF");
            const msgData = this.files["M.MSG"];
            if (!msgData)
                throw new Error("M.MSG not loaded");
            this.cache.messages = parseMessages(sss.getChunk(SssSubfile.MessageOffsets), msgData);
        }
        return this.cache.messages[index] || "";
    }
    /**
     * Retrieves an item, skill, or enemy name from the global word table.
     */
    getWord(index) {
        if (!this.cache.words) {
            const data = this.files["WORD.DAT"];
            if (!data)
                throw new Error("WORD.DAT not loaded");
            this.cache.words = parseWordDat(data);
        }
        return this.cache.words[index] || "";
    }
    /**
     * Retrieves a scene definition by its 1-based scene number.
     */
    getScene(sceneNumber) {
        const scene = this.getSceneTable()[sceneNumber - 1];
        if (!scene)
            throw new Error(`Invalid scene number: ${sceneNumber}`);
        return scene;
    }
    /**
     * Returns the number of scenes available in the game.
     */
    getSceneCount() {
        return this.getSceneTable().length;
    }
    /**
     * Returns the number of maps available in MAP.MKF.
     */
    getMapCount() {
        return this.getArchive("MAP.MKF").chunkCount;
    }
    /**
     * Calculates the range of 1-based EventObject slots owned by a specific scene.
     */
    getSceneEventSlotRange(sceneNumber) {
        const template = this.getEventObjectTemplate();
        // The template includes a sentinel record at slot 0. Logical slots are 1..totalSlots-1.
        const totalSlots = Math.max(0, Math.floor(template.length / 0x20) - 1);
        return getSceneEventSlotRange(this.getSceneTable(), sceneNumber, totalSlots);
    }
    /**
     * Retrieves all EventObject templates for a given scene.
     */
    getSceneEventObjects(sceneNumber) {
        const [startSlot, endSlot] = this.getSceneEventSlotRange(sceneNumber);
        const template = this.getEventObjectTemplate();
        const reader = new ByteReader(template, `EventObjectTemplate-Scene${sceneNumber}`);
        const objects = [];
        for (let slot = startSlot; slot <= endSlot; slot++) {
            // Note: Logical slot N starts at offset N * 0x20 in the template (since slot 0 is a sentinel).
            objects.push(parseEventObject(reader, slot * 0x20, slot));
        }
        return objects;
    }
    /**
     * Loads a complete scene model, including map and event objects.
     */
    loadSceneModel(sceneNumber) {
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
    getMap(mapId) {
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
    getSpriteCount(type) {
        const fileMap = {
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
    getSprite(type, id) {
        const fileMap = {
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
    getWordAssetId(wordDatIndex) {
        const chunk = this.getArchive("SSS.MKF").getChunk(SssSubfile.NameDefinition);
        const entrySize = chunk.length % 14 === 0 ? 14 : 12;
        const offset = wordDatIndex * entrySize;
        if (offset + 2 > chunk.length)
            return 0;
        return chunk[offset] | (chunk[offset + 1] << 8);
    }
    /**
     * Retrieves the composition of an enemy team.
     * Returns an array of objects containing the name and master asset ID for each enemy.
     */
    getEnemyTeam(groupId) {
        const teamChunk = this.getArchive("DATA.MKF").getChunk(DataSubfile.EnemyTeam);
        const wordIndices = parseEnemyTeam(teamChunk, groupId);
        return wordIndices.map(idx => ({
            name: this.getWord(idx),
            assetId: this.getWordAssetId(idx),
            wordId: idx,
        }));
    }
    /**
     * Retrieves the full table of parsed enemy stats from DATA.MKF.
     */
    getEnemyStatsTable() {
        if (!this.cache.enemyStats) {
            const chunk = this.getArchive("DATA.MKF").getChunk(DataSubfile.EnemyData);
            this.cache.enemyStats = parseEnemyStatsTable(chunk);
        }
        return this.cache.enemyStats;
    }
    /**
     * Retrieves an enemy's combat stats by their master asset ID (V1).
     */
    getEnemyStats(assetId) {
        return this.getEnemyStatsTable()[assetId];
    }
    /**
     * Retrieves an enemy's combat stats by their WORD.DAT index.
     * This internally resolves the index to a master asset ID (V1).
     */
    getEnemyStatsByWord(wordDatIndex) {
        const assetId = this.getWordAssetId(wordDatIndex);
        if (assetId === 0)
            return undefined;
        return this.getEnemyStats(assetId);
    }
    /**
     * Retrieves the raw script table chunk from SSS.MKF.
     */
    getScriptChunk() {
        return this.getArchive("SSS.MKF").getChunk(SssSubfile.ScriptTable);
    }
    /**
     * Retrieves the master EventObject template table from SSS.MKF.
     */
    getEventObjectTemplate() {
        return this.getArchive("SSS.MKF").getChunk(SssSubfile.EventObjectTemplate);
    }
    /**
     * Retrieves the full scene table from SSS.MKF.
     */
    getSceneTable() {
        if (!this.cache.scenes) {
            this.cache.scenes = parseScenes(this.getArchive("SSS.MKF").getChunk(SssSubfile.SceneTable));
        }
        return this.cache.scenes;
    }
    /**
     * Identifies a descriptive label for a script by looking at its first few instructions.
     */
    getScriptSummary(startIndex) {
        return getScriptSummary(this.getScriptChunk(), startIndex, this);
    }
    /**
     * Retrieves a palette chunk.
     * @param paletteId 0 for default/day, 1 for night (if present).
     */
    getPaletteChunk(paletteId = 0) {
        return this.getArchive("PAT.MKF").getChunk(paletteId);
    }
    /**
     * Retrieves a palette set with optional day/night modes.
     * Automatically detects if chunk is 1536 bytes (day+night) or 768 bytes (day-only).
     * @param paletteId Palette ID to load (usually 0).
     * @returns PaletteSet with day palette and optional night palette.
     */
    getPalette(paletteId = 0) {
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
    parseSave(data) {
        return parseSave(data);
    }
}
//# sourceMappingURL=resource-manager.js.map