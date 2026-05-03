/**
 * Returns the OBJECT indices for all non-empty slots in the given enemy team.
 * Each returned value is an OBJECT index; use it directly with getWord() for names
 * and getNameDefV1() to get the ABC.MKF sprite index (wEnemyID).
 */
export declare function parseEnemyTeam(chunk: Uint8Array, groupId: number): number[];
export interface EnemyStats {
    id: number;
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
    attackStrength: number;
    magicStrength: number;
    defense: number;
    dexterity: number;
    fleeRate: number;
    poisonResistance: number;
    elemResistance: [number, number, number, number, number];
    physicalResistance: number;
    dualMove: number;
    collectValue: number;
}
/**
 * Parses the entire enemy data chunk (DATA.MKF subfile 1) into an array of stats.
 */
export declare function parseEnemyStatsTable(source: Uint8Array): EnemyStats[];
/**
 * Calculates the effective attack power of an enemy based on their base offset and level.
 */
export declare function getEffectiveAttack(level: number, attackOffset: number): number;
/**
 * Calculates the effective defense power of an enemy based on their base offset and level.
 */
export declare function getEffectiveDefense(level: number, defenseOffset: number): number;
