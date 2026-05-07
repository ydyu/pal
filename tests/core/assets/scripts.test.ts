import { describe, it, expect } from "vitest";
import { collectScriptRewards, parseScript, formatInstruction, Opcode, getScriptSummary, type ScriptContext } from "../../../src/core/assets/scripts.js";

describe("scripts asset parser", () => {
  const mockContext: ScriptContext = {
    getDialogue: (i) => i === 100 ? "Hello\nWorld" : `Msg ${i}`,
    getWord: (i) => i === 50 ? "Magic Sword" : `Word ${i}`,
  };

  it("should parse a script into semantic instructions", () => {
    // 4900 ffff 0000 0000 (SET_EVENT_STATE event=65535 state=0)
    // 1f00 3200 0100 0000 (ADD_ITEM item=50 qty=1)
    // 0000 0000 0000 0000 (STOP_EXECUTION)
    const raw = new Uint8Array([
      0x49, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
      0x1f, 0x00, 0x32, 0x00, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);

    const script = parseScript(raw, 0);
    expect(script).toHaveLength(3);

    // Verify first instruction (SET_EVENT_STATE)
    expect(script[0].name).toBe("SET_EVENT_STATE");
    expect(script[0].params).toEqual([
      { label: "event", type: "event", raw: 0xFFFF },
      { label: "state", type: "number", raw: 0 },
    ]);

    // Verify second instruction (ADD_ITEM)
    expect(script[1].name).toBe("ADD_ITEM");
    expect(script[1].params).toEqual([
      { label: "item", type: "item", raw: 50 },
      { label: "qty", type: "signed", raw: 1 },
    ]);
  });

  it("should format instructions correctly", () => {
    const raw = new Uint8Array([
      0xff, 0xff, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, // SHOW_DIALOGUE 100
      0x03, 0x00, 0xc0, 0x18, 0x01, 0x00, 0x00, 0x00, // JUMP target=0x18C0 loops=1
    ]);

    const script = parseScript(raw, 0);
    
    expect(formatInstruction(script[0], mockContext)).toBe("  SHOW_DIALOGUE      'Hello\\nWorld'");
    expect(formatInstruction(script[1])).toBe("  JUMP               target=0x18C0 loops=1");
  });

  it("should format signed parameters correctly", () => {
    // 1e00 0cfe 0000 0000 (ADD_CASH amount=-500)
    const raw = new Uint8Array([
      0x1e, 0x00, 0x0c, 0xfe, 0x00, 0x00, 0x00, 0x00,
    ]);

    const script = parseScript(raw, 0);
    expect(formatInstruction(script[0])).toBe("  ADD_CASH           amount=-500 failure_jump=0x0000");
  });

  it("should decode animation control opcodes with semantic names", () => {
    const raw = new Uint8Array([
      0x16, 0x00, 0x4d, 0x00, 0x04, 0x00, 0x01, 0x00, // SET_EVENT_ANIM event=77 direction=4 frame=1
      0x87, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // OBJ_IDLE_WALK
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_EXECUTION
    ]);

    const script = parseScript(raw, 0);

    expect(script).toHaveLength(3);
    expect(script[0]).toMatchObject({
      op: Opcode.SET_EVENT_ANIM,
      name: "SET_EVENT_ANIM",
      params: [
        { label: "event", raw: 77 },
        { label: "dir", raw: 4 },
        { label: "frame", raw: 1 },
      ],
    });
    expect(script[1]).toMatchObject({
      op: Opcode.OBJ_IDLE_WALK,
      name: "OBJ_IDLE_WALK",
      params: [],
    });
    expect(formatInstruction(script[0])).toBe("  SET_EVENT_ANIM     event=77 dir=4 frame=1");
    expect(formatInstruction(script[1])).toBe("  OBJ_IDLE_WALK");
  });

  it("should generate a heuristic script summary", () => {
    const raw = new Uint8Array([
      0x47, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, // PLAY_SOUND 1
      0xff, 0xff, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, // SHOW_DIALOGUE 100 ("Hello\nWorld")
    ]);

    const summary = getScriptSummary(raw, 0, mockContext);
    expect(summary).toBe("Hello");
  });

  it("should stop parsing on terminators", () => {
    const raw = new Uint8Array([
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_AND_ADVANCE
      0x47, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, // PLAY_SOUND 1
    ]);

    const script = parseScript(raw, 0);
    expect(script).toHaveLength(2);
    expect(script[0].op).toBe(Opcode.STOP_AND_ADVANCE);
    expect(script[1].op).toBe(Opcode.PLAY_SOUND);
  });

  it("should stop parsing on STOP_AND_CHANGE", () => {
    const raw = new Uint8Array([
      0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_AND_CHANGE
      0x47, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, // PLAY_SOUND 1
    ]);

    const script = parseScript(raw, 0);
    expect(script).toHaveLength(1);
    expect(script[0].op).toBe(Opcode.STOP_AND_CHANGE);
  });

  it("should collect rewards across STOP_AND_ADVANCE chains", () => {
    const raw = new Uint8Array([
      0xff, 0xff, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, // SHOW_DIALOGUE 100
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_AND_ADVANCE
      0x1f, 0x00, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, // ADD_ITEM item=50 qty=0 -> 1
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_EXECUTION
    ]);

    expect(collectScriptRewards(raw, 0, mockContext)).toEqual([
      { kind: "item", itemId: 50, quantity: 1, name: "Magic Sword" },
    ]);
  });

  it("should collect rewards from called scripts and signed cash amounts", () => {
    const raw = new Uint8Array([
      0x04, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, // CALL_SCRIPT 3
      0x1e, 0x00, 0xf4, 0x01, 0x00, 0x00, 0x00, 0x00, // ADD_CASH +500
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_EXECUTION
      0x1e, 0x00, 0x9c, 0xff, 0x00, 0x00, 0x00, 0x00, // ADD_CASH -100
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // STOP_EXECUTION
    ]);

    expect(collectScriptRewards(raw, 0, mockContext)).toEqual([
      { kind: "cash", amount: -100 },
      { kind: "cash", amount: 500 },
    ]);
  });
});
