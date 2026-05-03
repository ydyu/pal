import { ByteReader } from "../binary.js";
/**
 * Parses a single 32-byte EventObject record from a specific offset.
 * @param reader ByteReader containing the source data.
 * @param offset The byte offset where the 32-byte record begins.
 * @param slot The logical 1-based slot number to assign to this object.
 */
export function parseEventObject(reader, offset, slot) {
    return {
        slot,
        x: reader.readUint16LE(offset + 2),
        y: reader.readUint16LE(offset + 4),
        sLayer: reader.readInt16LE(offset + 6),
        triggerScript: reader.readUint16LE(offset + 8),
        autoScript: reader.readUint16LE(offset + 10),
        state: reader.readInt16LE(offset + 12),
        triggerMode: reader.readUint16LE(offset + 14),
        spriteNum: reader.readUint16LE(offset + 16),
        nSpriteFrames: reader.readUint16LE(offset + 18),
        direction: reader.readUint16LE(offset + 20),
        currentFrame: reader.readUint16LE(offset + 22),
        nSpriteFramesAuto: reader.readUint16LE(offset + 28),
    };
}
/**
 * Parses a contiguous table of EventObject records.
 * @param source The raw bytes of the table.
 * @param startSlot The 1-based slot index of the first record in the source.
 */
export function parseEventObjectTable(source, startSlot = 1) {
    const reader = new ByteReader(source, "EventObjectTable");
    const count = Math.floor(reader.length / 32);
    const objects = [];
    for (let i = 0; i < count; i++) {
        objects.push(parseEventObject(reader, i * 32, startSlot + i));
    }
    return objects;
}
//# sourceMappingURL=event-objects.js.map