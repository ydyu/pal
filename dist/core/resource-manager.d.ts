import { MkfArchive } from "./mkf.js";
import { type Scene } from "./assets/scenes.js";
import { type SaveData } from "./assets/saves.js";
import { type PalMap } from "./map.js";
import { type SpriteDirectory, type SpriteType } from "./codecs/rle.js";
import { type PaletteSet } from "./palette.js";
import { type EventObject } from "./assets/event-objects.js";
import { SceneModel, type SpriteResolver } from "./scene-model.js";
import { type EnemyStats } from "./assets/battle.js";
/**
 * High-level interface for accessing PAL game assets without needing to know
 * the underlying file structure (MKF indices, filenames, etc.).
 */
export declare class ResourceManager implements SpriteResolver {
    private files;
    private archives;
    private cache;
    constructor(files: Record<string, Uint8Array>);
    getArchive(name: string): MkfArchive;
    private getDecompressedChunk;
    /**
     * Retrieves a dialogue message by its global index.
     */
    getDialogue(index: number): string;
    /**
     * Retrieves an item, skill, or enemy name from the global word table.
     */
    getWord(index: number): string;
    /**
     * Retrieves a scene definition by its 1-based scene number.
     */
    getScene(sceneNumber: number): Scene;
    /**
     * Returns the number of scenes available in the game.
     */
    getSceneCount(): number;
    /**
     * Returns the number of maps available in MAP.MKF.
     */
    getMapCount(): number;
    /**
     * Calculates the range of 1-based EventObject slots owned by a specific scene.
     */
    getSceneEventSlotRange(sceneNumber: number): [number, number];
    /**
     * Retrieves all EventObject templates for a given scene.
     */
    getSceneEventObjects(sceneNumber: number): EventObject[];
    /**
     * Loads a complete scene model, including map and event objects.
     */
    loadSceneModel(sceneNumber: number): SceneModel;
    /**
     * Retrieves a combined map object containing layout and tile-set.
     */
    getMap(mapId: number): PalMap;
    /**
     * Returns the number of sprites available for a given type.
     */
    getSpriteCount(type: SpriteType): number;
    /**
     * Retrieves a sprite directory (multiple frames) for a semantic type.
     * Handles automatic decompression and specific file headers (item/portrait).
     */
    getSprite(type: SpriteType, id: number): SpriteDirectory;
    /**
     * Returns the asset ID (V1, u16 LE at offset 0) from SSS.MKF sub[2] (NameDefinition) for the given WORD.DAT index.
     * For items, this is the BALL.MKF sprite index. For enemies, this is the combat stats and ABC.MKF index.
     */
    getWordAssetId(wordDatIndex: number): number;
    /**
     * Retrieves the composition of an enemy team.
     * Returns an array of objects containing the name and master asset ID for each enemy.
     */
    getEnemyTeam(groupId: number): Array<{
        name: string;
        assetId: number;
        wordId: number;
    }>;
    /**
     * Retrieves the full table of parsed enemy stats from DATA.MKF.
     */
    getEnemyStatsTable(): readonly EnemyStats[];
    /**
     * Retrieves an enemy's combat stats by their master asset ID (V1).
     */
    getEnemyStats(assetId: number): EnemyStats | undefined;
    /**
     * Retrieves an enemy's combat stats by their WORD.DAT index.
     * This internally resolves the index to a master asset ID (V1).
     */
    getEnemyStatsByWord(wordDatIndex: number): EnemyStats | undefined;
    /**
     * Retrieves the raw script table chunk from SSS.MKF.
     */
    getScriptChunk(): Uint8Array;
    /**
     * Retrieves the master EventObject template table from SSS.MKF.
     */
    getEventObjectTemplate(): Uint8Array;
    /**
     * Retrieves the full scene table from SSS.MKF.
     */
    getSceneTable(): readonly Scene[];
    /**
     * Identifies a descriptive label for a script by looking at its first few instructions.
     */
    getScriptSummary(startIndex: number): string;
    /**
     * Retrieves a palette chunk.
     * @param paletteId 0 for default/day, 1 for night (if present).
     */
    getPaletteChunk(paletteId?: number): Uint8Array;
    /**
     * Retrieves a palette set with optional day/night modes.
     * Automatically detects if chunk is 1536 bytes (day+night) or 768 bytes (day-only).
     * @param paletteId Palette ID to load (usually 0).
     * @returns PaletteSet with day palette and optional night palette.
     */
    getPalette(paletteId?: number): PaletteSet;
    /**
     * Parses a PAL DOS save file.
     */
    parseSave(data: Uint8Array): SaveData;
}
