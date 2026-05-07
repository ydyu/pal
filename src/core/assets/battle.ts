import { ByteReader } from "../binary.js";

const TEAM_SLOTS = 5;
const TEAM_SIZE = TEAM_SLOTS * 2; // 10 bytes per ENEMYTEAM record (5 u16 object indices)

/**
 * Returns the OBJECT indices for all non-empty slots in the given enemy team.
 * Each returned value is an OBJECT index; use it directly with getWord() for names
 * and getNameDefV1() to get the ABC.MKF sprite index (wEnemyID).
 */
export function parseEnemyTeam(chunk: Uint8Array, groupId: number): number[] {
  const offset = groupId * TEAM_SIZE;
  if (offset + TEAM_SIZE > chunk.length) return [];
  const ids: number[] = [];
  for (let i = 0; i < TEAM_SLOTS; i++) {
    const id = (chunk[offset + i * 2]! | (chunk[offset + i * 2 + 1]! << 8));
    if (id > 0 && id !== 0xFFFF) ids.push(id);
  }
  return ids;
}

export interface EnemyStats {
  id: number;
  spriteId: number;
  idleFrames: number;
  magicFrames: number;
  attackFrames: number;
  idleAnimSpeed: number;
  actWaitFrames: number;
  yPosOffset: number;
  attackSound: number;
  actionSound: number;
  magicSound: number;
  deathSound: number;
  callSound: number;
  health: number;
  exp: number;
  cash: number;
  level: number;
  magic: number;
  magicRate: number;
  attackEquivItem: number;
  attackEquivItemRate: number;
  stealItem: number;
  stealItemAmount: number;
  attackStrength: number; // Signed SHORT, offset
  magicStrength: number; // Signed SHORT, offset
  defense: number; // Signed SHORT, offset
  dexterity: number; // Signed SHORT
  fleeRate: number;
  poisonResistance: number;
  elemResistance: [number, number, number, number, number]; // Wind, Lightning, Water, Fire, Earth
  physicalResistance: number; // Divisor for physical damage
  dualMove: number;
  collectValue: number;
}

const ENEMY_RECORD_SIZE = 70;

/**
 * Parses a 70-byte ENEMY record from DATA.MKF subfile 1.
 */
function parseEnemyRecord(reader: ByteReader, index: number): EnemyStats {
  const offset = index * ENEMY_RECORD_SIZE;
  return {
    id: index,
    spriteId: index,
    idleFrames: reader.readUint16LE(offset + 0),
    magicFrames: reader.readUint16LE(offset + 2),
    attackFrames: reader.readUint16LE(offset + 4),
    idleAnimSpeed: reader.readUint16LE(offset + 6),
    actWaitFrames: reader.readUint16LE(offset + 8),
    yPosOffset: reader.readUint16LE(offset + 10),
    attackSound: reader.readInt16LE(offset + 12),
    actionSound: reader.readInt16LE(offset + 14),
    magicSound: reader.readInt16LE(offset + 16),
    deathSound: reader.readInt16LE(offset + 18),
    callSound: reader.readInt16LE(offset + 20),
    health: reader.readUint16LE(offset + 22),
    exp: reader.readUint16LE(offset + 24),
    cash: reader.readUint16LE(offset + 26),
    level: reader.readUint16LE(offset + 28),
    magic: reader.readUint16LE(offset + 30),
    magicRate: reader.readUint16LE(offset + 32),
    attackEquivItem: reader.readUint16LE(offset + 34),
    attackEquivItemRate: reader.readUint16LE(offset + 36),
    stealItem: reader.readUint16LE(offset + 38),
    stealItemAmount: reader.readUint16LE(offset + 40),
    attackStrength: reader.readInt16LE(offset + 42),
    magicStrength: reader.readInt16LE(offset + 44),
    defense: reader.readInt16LE(offset + 46),
    dexterity: reader.readInt16LE(offset + 48),
    fleeRate: reader.readUint16LE(offset + 50),
    poisonResistance: reader.readUint16LE(offset + 52),
    elemResistance: [
      reader.readUint16LE(offset + 54),
      reader.readUint16LE(offset + 56),
      reader.readUint16LE(offset + 58),
      reader.readUint16LE(offset + 60),
      reader.readUint16LE(offset + 62),
    ],
    physicalResistance: reader.readUint16LE(offset + 64),
    dualMove: reader.readUint16LE(offset + 66),
    collectValue: reader.readUint16LE(offset + 68),
  };
}

/**
 * Parses the entire enemy data chunk (DATA.MKF subfile 1) into an array of stats.
 */
export function parseEnemyStatsTable(source: Uint8Array): EnemyStats[] {
  const reader = new ByteReader(source, "EnemyStatsTable");
  const count = Math.floor(reader.length / ENEMY_RECORD_SIZE);
  const stats: EnemyStats[] = [];
  for (let i = 0; i < count; i++) {
    stats.push(parseEnemyRecord(reader, i));
  }
  return stats;
}

/**
 * Calculates the effective attack power of an enemy based on their base offset and level.
 */
export function getEffectiveAttack(level: number, attackOffset: number): number {
  return Math.max(0, attackOffset + (level + 6) * 6);
}

/**
 * Calculates the effective defense power of an enemy based on their base offset and level.
 */
export function getEffectiveDefense(level: number, defenseOffset: number): number {
  return Math.max(0, defenseOffset + (level + 6) * 4);
}
