import { ByteReader } from "../binary.js";
/**
 * Parses the scene table from SSS.MKF subfile [1].
 * @param source The raw bytes of the scene table (typically 2400 bytes for 300 scenes).
 * @returns A readonly array of Scene objects.
 */
export function parseScenes(source) {
    const reader = new ByteReader(source, "scenes");
    const count = Math.floor(reader.length / 8);
    const scenes = new Array(count);
    for (let i = 0; i < count; i++) {
        const offset = i * 8;
        scenes[i] = {
            mapNum: reader.readUint16LE(offset),
            scriptOnEnter: reader.readUint16LE(offset + 2),
            scriptOnTeleport: reader.readUint16LE(offset + 4),
            eventObjectIndex: reader.readUint16LE(offset + 6),
        };
    }
    return Object.freeze(scenes);
}
/**
 * Calculates the range of 1-based EventObject slots owned by a specific scene.
 * @param scenes The full parsed scene table.
 * @param sceneIndex 1-based logical scene number.
 * @param totalSlots Total number of slots in the global EventObject table.
 * @returns [startIndex, endIndex] inclusive, 1-based.
 */
export function getSceneEventSlotRange(scenes, sceneIndex, totalSlots) {
    if (sceneIndex < 1 || sceneIndex > scenes.length) {
        throw new Error(`Invalid scene index ${sceneIndex}.`);
    }
    const K = sceneIndex - 1;
    const lo = K === 0 ? 1 : scenes[K].eventObjectIndex;
    const hi = K + 1 < scenes.length ? scenes[K + 1].eventObjectIndex - 1 : totalSlots;
    return [lo, hi];
}
//# sourceMappingURL=scenes.js.map