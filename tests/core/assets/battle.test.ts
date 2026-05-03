import { describe, it, expect } from "vitest";
import { getEffectiveAttack, getEffectiveDefense, parseEnemyStatsTable } from "../../../src/core/assets/battle.js";

describe("EnemyStats calculations", () => {
  it("scales effective attack based on level and offset", () => {
    // Slime example: wLevel=0, wAttackStrength=-1
    expect(getEffectiveAttack(0, -1)).toBe(35); // -1 + (0 + 6) * 6 = 35

    // High level example: wLevel=41, wAttackStrength=0
    expect(getEffectiveAttack(41, 0)).toBe(282); // 0 + (41 + 6) * 6 = 282
    
    // Negative clamping
    expect(getEffectiveAttack(0, -40)).toBe(0); // -40 + 36 = -4 => clamped to 0
  });

  it("scales effective defense based on level and offset", () => {
    // Slime example: wLevel=0, wDefense=-6
    expect(getEffectiveDefense(0, -6)).toBe(18); // -6 + (0 + 6) * 4 = 18

    // High level example: wLevel=41, wDefense=0
    expect(getEffectiveDefense(41, 0)).toBe(188); // 0 + (41 + 6) * 4 = 188
  });
});

describe("EnemyStats parsing", () => {
  it("parses 70-byte records correctly and handles signed stats", () => {
    const buf = new Uint8Array(70 * 2); // Create 2 empty records
    
    // Set up record 1 (Slime-like values)
    const offset = 70; // 2nd record
    buf[offset + 22] = 28; // HP
    buf[offset + 23] = 0;
    buf[offset + 28] = 0; // Level
    buf[offset + 29] = 0;
    
    // Set wAttackStrength to -1 (0xFFFF)
    buf[offset + 42] = 0xFF;
    buf[offset + 43] = 0xFF;

    // Set wDefense to -6 (0xFFFA)
    buf[offset + 46] = 0xFA;
    buf[offset + 47] = 0xFF;

    const statsTable = parseEnemyStatsTable(buf);
    expect(statsTable.length).toBe(2);

    const slime = statsTable[1]!;
    expect(slime.id).toBe(1);
    expect(slime.health).toBe(28);
    expect(slime.level).toBe(0);
    expect(slime.attackStrength).toBe(-1);
    expect(slime.defense).toBe(-6);
  });
});
