import { ByteReader, type ByteSource } from "../binary.js";

/**
 * Represents a pickable object, NPC, or scene trigger.
 * This structure is identical in both the SSS.MKF template and .RPG save files.
 */
export interface EventObject {
  /** 1-based index in the global object table. */
  slot: number;
  /** X coordinate in world pixels. */
  x: number;
  /** Y coordinate in world pixels. */
  y: number;
  /** Layer/depth value for rendering priority. */
  sLayer: number;
  /** Trigger script index (indexes into SSS.MKF subfile [4]). */
  triggerScript: number;
  /** Auto script index (runs automatically). */
  autoScript: number;
  /** 
   * Current state:
   * 0: Hidden (picked/opened/inactive)
   * 1: Normal
   * 2: Normal + Auto Script active
   * 3: Normal + Auto Script stopped
   */
  state: number;
  /** 
   * Trigger mode/range:
   * 1-3: Search (Near/Normal/Far)
   * 4-8: Touch
   */
  triggerMode: number;
  /** Sprite number (indexes into MGO.MKF for NPCs). */
  spriteNum: number;
  /** Number of frames in the sprite animation. */
  nSpriteFrames: number;
  /** Facing direction used for multi-directional sprites. */
  direction: number;
  /** Current animation frame within the direction block. */
  currentFrame: number;
  /**
   * Number of frames in the auto-script animation loop.
   * Used when nSpriteFrames === 0; cycles through frames ignoring direction.
   */
  nSpriteFramesAuto: number;
}

/**
 * Parses a single 32-byte EventObject record from a specific offset.
 * @param reader ByteReader containing the source data.
 * @param offset The byte offset where the 32-byte record begins.
 * @param slot The logical 1-based slot number to assign to this object.
 */
export function parseEventObject(reader: ByteReader, offset: number, slot: number): EventObject {
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
export function parseEventObjectTable(source: ByteSource, startSlot: number = 1): EventObject[] {
  const reader = new ByteReader(source, "EventObjectTable");
  const count = Math.floor(reader.length / 32);
  const objects: EventObject[] = [];

  for (let i = 0; i < count; i++) {
    objects.push(parseEventObject(reader, i * 32, startSlot + i));
  }

  return objects;
}
