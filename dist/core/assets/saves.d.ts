import { type ByteSource } from "../binary.js";
import { type EventObject } from "./event-objects.js";
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
    roleId: number;
    spriteNum: number;
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
    elementalResistance: number[];
    equipment: number[];
    magics: number[];
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
export declare function parseSave(source: ByteSource): SaveData;
