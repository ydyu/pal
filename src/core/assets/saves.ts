import { ByteReader, type ByteSource } from "../binary.js";
import { type EventObject, parseEventObject } from "./event-objects.js";

/**
 * Represents a single entry in the inventory.
 */
export interface InventorySlot {
  /** The 0-based index of the slot in the inventory. */
  index: number;
  /** Item ID (indexes into WORD.DAT and item attributes). */
  itemId: number;
  /** Quantity of the item. */
  quantity: number;
}

/**
 * Represents current experience and level for a role/category.
 */
export interface ExpInfo {
  exp: number;
  level: number;
  count: number;
}

/**
 * Represents a player's current status and attributes.
 */
export interface PlayerRole {
  roleId: number; // 0-based index (0..5)
  spriteNum: number; // MGO.MKF sprite number used for this role in normal scenes
  level: number;
  maxHP: number;
  maxMP: number;
  hp: number;
  mp: number;
  attackStrength: number;
  magicStrength: number;
  defense: number;
  dexterity: number;
  fleeRate: number;
  poisonResistance: number;
  elementalResistance: number[]; // 5 elements
  equipment: number[]; // 6 slots
  magics: number[]; // up to 32 slots
  coveredBy: number;
}

/**
 * Represents a member of the current active party.
 */
export interface PartyMember {
  roleId: number;
  x: number;
  y: number;
  frame: number;
}

/**
 * High-level structure of a PAL DOS save file (.RPG).
 */
export interface SaveData {
  /** Total number of times this slot has been saved. */
  savedTimes: number;
  /** Viewport X coordinate (top-left of the camera). */
  viewportX: number;
  /** Viewport Y coordinate (top-left of the camera). */
  viewportY: number;
  /** Number of members currently in the party. */
  partyMemberCount: number;
  /** 1-based current logical scene number. */
  numScene: number;
  /** Global scene layer offset used when rendering the party. */
  wLayer: number;
  /** Palette offset in the palette data (0 = day-only, nonzero = day+night). */
  paletteOffset: number;
  /** Current cash amount. */
  cash: number;
  /** Party members and their positions. */
  party: PartyMember[];
  /** Stats for all 6 possible player roles. */
  playerRoles: PlayerRole[];
  /** All inventory slots (usually 256). */
  inventory: InventorySlot[];
  /** All event objects in the global table. */
  eventObjects: EventObject[];
}

/**
 * Parses a PAL DOS save file.
 */
export function parseSave(source: ByteSource): SaveData {
  const reader = new ByteReader(source, "SAVEDGAME");

  const partyMemberCount = reader.readUint16LE(0x0006);
  const party: PartyMember[] = [];
  // PARTY Array (5 x 10 bytes) at 0x002C
  for (let i = 0; i < 5; i++) {
    if (i > partyMemberCount) break;
    const offset = 0x002C + i * 10;
    const roleId = reader.readUint16LE(offset);
    if (roleId === 0xFFFF) continue; 
    party.push({
      roleId,
      x: reader.readInt16LE(offset + 2),
      y: reader.readInt16LE(offset + 4),
      frame: reader.readUint16LE(offset + 6),
    });
  }

  const playerRoles: PlayerRole[] = [];
  const baseOff = 0x01FC;
  for (let i = 0; i < 6; i++) {
    const getVal = (relOff: number) => reader.readUint16LE(baseOff + relOff + i * 2);
    
    const equipment: number[] = [];
    for (let e = 0; e < 6; e++) {
      equipment.push(reader.readUint16LE(baseOff + 0x84 + e * 12 + i * 2));
    }

    const elementalResistance: number[] = [];
    for (let e = 0; e < 5; e++) {
      elementalResistance.push(reader.readUint16LE(baseOff + 0x114 + e * 12 + i * 2));
    }

    const magics: number[] = [];
    for (let m = 0; m < 32; m++) {
      const mid = reader.readUint16LE(baseOff + 0x180 + m * 12 + i * 2);
      if (mid === 0) break;
      magics.push(mid);
    }

    // rgwSpriteNum is stored early in the PLAYERROLES block (relative offset 0x18)
    const spriteNum = reader.readUint16LE(baseOff + 0x18 + i * 2);

    playerRoles.push({
      roleId: i,
      spriteNum,
      level: getVal(0x48),
      maxHP: getVal(0x54),
      maxMP: getVal(0x60),
      hp: getVal(0x6C),
      mp: getVal(0x78),
      attackStrength: getVal(0xCC),
      magicStrength: getVal(0xD8),
      defense: getVal(0xE4),
      dexterity: getVal(0xF0),
      fleeRate: getVal(0xFC),
      poisonResistance: getVal(0x108),
      elementalResistance,
      equipment,
      magics,
      coveredBy: getVal(0x174),
    });
  }

  const inventory: InventorySlot[] = [];
  // Inventory starts at 0x06C0, 256 slots of 6 bytes each.
  for (let i = 0; i < 256; i++) {
    const offset = 0x06c0 + i * 6;
    if (offset + 6 > reader.length) break;

    const itemId = reader.readUint16LE(offset);
    const quantity = reader.readUint16LE(offset + 2);
    if (itemId > 0 || quantity > 0) {
      inventory.push({ index: i, itemId, quantity });
    }
  }

  const eventObjects: EventObject[] = [];
  // Event objects start at 0x3260, stride 0x20 (32 bytes).
  const objTableStart = 0x3260;
  const objCount = Math.floor((reader.length - objTableStart) / 0x20);
  for (let i = 0; i < objCount; i++) {
    const offset = objTableStart + i * 0x20;
    eventObjects.push(parseEventObject(reader, offset, i + 1));
  }

  return {
    savedTimes: reader.readUint16LE(0x0000),
    viewportX: reader.readUint16LE(0x0002),
    viewportY: reader.readUint16LE(0x0004),
    partyMemberCount: reader.readUint16LE(0x0006),
    numScene: reader.readUint16LE(0x0008),
    paletteOffset: reader.readUint16LE(0x000A),
    wLayer: reader.readUint16LE(0x001a),
    cash: reader.readUint32LE(0x0028),
    party,
    playerRoles,
    inventory,
    eventObjects,
  };
}
