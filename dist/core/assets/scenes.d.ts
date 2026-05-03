import { type ByteSource } from "../binary.js";
/**
 * Represents a logical scene in PAL, which groups map data, scripts, and event objects.
 */
export interface Scene {
    /** The engine map ID (indexes into MAP.MKF). */
    readonly mapNum: number;
    /** Script index triggered when entering the scene. */
    readonly scriptOnEnter: number;
    /** Script index triggered when using teleport items (e.g., Guide Bug). */
    readonly scriptOnTeleport: number;
    /**
     * The 1-based index of the first EventObject owned by this scene in the global table.
     * Note: The bounds for scene K are [scenes[K-1].eventObjectIndex .. scenes[K].eventObjectIndex - 1].
     */
    readonly eventObjectIndex: number;
}
/**
 * Parses the scene table from SSS.MKF subfile [1].
 * @param source The raw bytes of the scene table (typically 2400 bytes for 300 scenes).
 * @returns A readonly array of Scene objects.
 */
export declare function parseScenes(source: ByteSource): ReadonlyArray<Scene>;
/**
 * Calculates the range of 1-based EventObject slots owned by a specific scene.
 * @param scenes The full parsed scene table.
 * @param sceneIndex 1-based logical scene number.
 * @param totalSlots Total number of slots in the global EventObject table.
 * @returns [startIndex, endIndex] inclusive, 1-based.
 */
export declare function getSceneEventSlotRange(scenes: ReadonlyArray<Scene>, sceneIndex: number, totalSlots: number): [number, number];
