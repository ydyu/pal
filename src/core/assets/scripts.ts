import { ByteReader, type ByteSource, toSigned16 } from "../binary.js";

/**
 * Common PAL script opcodes.
 */
export enum Opcode {
  STOP_EXECUTION = 0x0000,
  STOP_AND_ADVANCE = 0x0001,
  STOP_AND_CHANGE = 0x0002,
  JUMP = 0x0003,
  CALL_SCRIPT = 0x0004,
  CLEAR_SCREEN = 0x0005,
  RANDOM_JUMP = 0x0006,
  START_BATTLE = 0x0007,
  CONTINUE_NEXT = 0x0008,
  WAIT_STOP_MOVE = 0x0009,
  CHOICE_DIALOGUE = 0x000A,
  WALK_WEST = 0x000B,
  WALK_NORTH = 0x000C,
  WALK_EAST = 0x000D,
  WALK_SOUTH = 0x000E,
  SET_DIRECTION = 0x000F,
  WALK_TO_TILE = 0x0010,
  WALK_TO_TILE_SLOW = 0x0011,
  MOVE_EVENT_REL = 0x0012,
  SET_EVENT_POS = 0x0013,
  SET_EVENT_IMAGE = 0x0014,
  SET_EVENT_ANIM = 0x0016,
  SET_TRIGGER_SCRIPT = 0x0025,
  SET_PLAYER_IMAGE = 0x0031,
  TELEPORT_OUT = 0x0038,
  TEXT_CENTER_NARRATOR = 0x003B,
  TEXT_UPPER_DIALOGUE = 0x003C,
  TEXT_LOWER_DIALOGUE = 0x003D,
  TEXT_CENTER_WINDOW = 0x003E,
  SET_TRIGGER_MODE = 0x0040,
  PLAY_MUSIC = 0x0043,
  SET_PARTY_POS = 0x0046,
  PLAY_SOUND = 0x0047,
  SET_EVENT_STATE = 0x0049,
  ADD_CASH = 0x001E,
  ADD_ITEM = 0x001F,
  REMOVE_ITEM = 0x0020,
  SCREEN_FADE_RED = 0x004F,
  FADE_OUT = 0x0050,
  FADE_IN = 0x0051,
  VANISH = 0x0052,
  USE_DAY_PALETTE = 0x0053,
  USE_NIGHT_PALETTE = 0x0054,
  LEARN_MAGIC = 0x0055,
  CHANGE_SCENE = 0x0059,
  MOVE_EVENT_REL_MULTI = 0x006C,
  TOGGLE_PALETTE_MODE = 0x0080,
  WAIT = 0x0085,
  OBJ_IDLE_WALK = 0x0087,
  SET_PALETTE_INDEX = 0x008B,
  COLOR_FADE = 0x008C,
  CLEAR_TEXT = 0x008E,
  SHOW_DIALOGUE = 0xFFFF,
}

export type ParamType =
  | "number" | "boolean" | "word" | "dialogue" | "worldFrame"
  | "script" | "portrait" | "scene" | "music" | "sound"
  | "magic" | "event" | "worldSprite" | "battleSprite" | "signed"
  | "item" | "battleGroup" | "direction";

export interface ParamDef {
  label: string;
  type: ParamType;
}

export interface OpcodeDefinition {
  name: string;
  a?: ParamDef;
  b?: ParamDef;
  c?: ParamDef;
}

/**
 * The single source of truth for PAL script opcodes and their parameters.
 */
export const OPCODE_DEFINITIONS: Record<number, OpcodeDefinition> = {
  [Opcode.STOP_EXECUTION]: { name: "STOP_EXECUTION" },
  [Opcode.STOP_AND_ADVANCE]: { name: "STOP_AND_ADVANCE" },
  [Opcode.STOP_AND_CHANGE]: { name: "STOP_AND_CHANGE", a: { label: "next", type: "script" }, b: { label: "loops", type: "number" } },
  [Opcode.JUMP]: { name: "JUMP", a: { label: "target", type: "script" }, b: { label: "loops", type: "number" } },
  [Opcode.CALL_SCRIPT]: { name: "CALL_SCRIPT", a: { label: "script", type: "script" }, b: { label: "event", type: "event" } },
  [Opcode.CLEAR_SCREEN]: { name: "CLEAR_SCREEN", b: { label: "delay", type: "number" }, c: { label: "update_gestures", type: "boolean" } },
  [Opcode.RANDOM_JUMP]: { name: "RANDOM_JUMP", a: { label: "rate", type: "number" }, b: { label: "target", type: "script" } },
  [Opcode.START_BATTLE]: { name: "START_BATTLE", a: { label: "group", type: "battleGroup" }, b: { label: "lost_jump", type: "script" }, c: { label: "flee_jump", type: "script" } },
  [Opcode.CONTINUE_NEXT]: { name: "CONTINUE_NEXT" },
  [Opcode.WAIT_STOP_MOVE]: { name: "WAIT_STOP_MOVE", a: { label: "frames", type: "number" }, c: { label: "update_gestures", type: "boolean" } },
  [Opcode.CHOICE_DIALOGUE]: { name: "CHOICE_DIALOGUE", a: { label: "target", type: "script" } },
  [Opcode.WALK_WEST]: { name: "WALK_WEST" },
  [Opcode.WALK_NORTH]: { name: "WALK_NORTH" },
  [Opcode.WALK_EAST]: { name: "WALK_EAST" },
  [Opcode.WALK_SOUTH]: { name: "WALK_SOUTH" },
  [Opcode.SET_DIRECTION]: { name: "SET_DIRECTION", a: { label: "dir", type: "direction" }, b: { label: "frame", type: "worldFrame" } },
  [Opcode.WALK_TO_TILE]: { name: "WALK_TO_TILE", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.WALK_TO_TILE_SLOW]: { name: "WALK_TO_TILE_SLOW", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.MOVE_EVENT_REL]: { name: "MOVE_EVENT_REL", a: { label: "event", type: "event" }, b: { label: "dx", type: "number" }, c: { label: "dy", type: "number" } },
  [Opcode.SET_EVENT_POS]: { name: "SET_EVENT_POS", a: { label: "event", type: "event" }, b: { label: "x", type: "number" }, c: { label: "y", type: "number" } },
  [Opcode.SET_EVENT_IMAGE]: { name: "SET_EVENT_IMAGE", a: { label: "frame", type: "worldFrame" } },
  [Opcode.SET_EVENT_ANIM]: { name: "SET_EVENT_ANIM", a: { label: "event", type: "event" }, b: { label: "dir", type: "direction" }, c: { label: "frame", type: "worldFrame" } },
  [Opcode.SET_TRIGGER_SCRIPT]: { name: "SET_TRIGGER_SCRIPT", a: { label: "event", type: "event" }, b: { label: "script", type: "script" } },
  [Opcode.SET_PLAYER_IMAGE]: { name: "SET_PLAYER_IMAGE", a: { label: "img", type: "battleSprite" } },
  [Opcode.TELEPORT_OUT]: { name: "TELEPORT_OUT", a: { label: "failure_jump", type: "script" } },
  [Opcode.TEXT_CENTER_NARRATOR]: { name: "TEXT_CENTER_NARRATOR", a: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_UPPER_DIALOGUE]: { name: "TEXT_UPPER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_LOWER_DIALOGUE]: { name: "TEXT_LOWER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_CENTER_WINDOW]: { name: "TEXT_CENTER_WINDOW", a: { label: "color", type: "number" } },
  [Opcode.SET_TRIGGER_MODE]: { name: "SET_TRIGGER_MODE", a: { label: "event", type: "event" }, b: { label: "mode", type: "number" } },
  [Opcode.PLAY_MUSIC]: { name: "PLAY_MUSIC", a: { label: "music", type: "music" }, b: { label: "loop", type: "number" } },
  [Opcode.SET_PARTY_POS]: { name: "SET_PARTY_POS", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.PLAY_SOUND]: { name: "PLAY_SOUND", a: { label: "sound", type: "sound" } },
  [Opcode.SET_EVENT_STATE]: { name: "SET_EVENT_STATE", a: { label: "event", type: "event" }, b: { label: "state", type: "number" } },
  [Opcode.ADD_CASH]: { name: "ADD_CASH", a: { label: "amount", type: "signed" }, b: { label: "failure_jump", type: "script" } },
  [Opcode.ADD_ITEM]: { name: "ADD_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" } },
  [Opcode.REMOVE_ITEM]: { name: "REMOVE_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" }, c: { label: "failure_jump", type: "script" } },
  [Opcode.FADE_OUT]: { name: "FADE_OUT", a: { label: "fast", type: "boolean" } },
  [Opcode.FADE_IN]: { name: "FADE_IN", a: { label: "fast", type: "boolean" } },
  [Opcode.SCREEN_FADE_RED]: { name: "SCREEN_FADE_RED" },
  [Opcode.VANISH]: { name: "VANISH", a: { label: "frames", type: "number" } },
  [Opcode.USE_DAY_PALETTE]: { name: "USE_DAY_PALETTE" },
  [Opcode.USE_NIGHT_PALETTE]: { name: "USE_NIGHT_PALETTE" },
  [Opcode.LEARN_MAGIC]: { name: "LEARN_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "player", type: "number" } },
  [Opcode.CHANGE_SCENE]: { name: "CHANGE_SCENE", a: { label: "scene", type: "scene" } },
  [Opcode.MOVE_EVENT_REL_MULTI]: { name: "MOVE_EVENT_REL_MULTI", a: { label: "event", type: "event" }, b: { label: "dx", type: "signed" }, c: { label: "dy", type: "signed" } },
  [Opcode.TOGGLE_PALETTE_MODE]: { name: "TOGGLE_PALETTE_MODE", a: { label: "skip_update", type: "boolean" } },
  [Opcode.WAIT]: { name: "WAIT", a: { label: "delay", type: "number" } },
  [Opcode.OBJ_IDLE_WALK]: { name: "OBJ_IDLE_WALK" },
  [Opcode.SET_PALETTE_INDEX]: { name: "SET_PALETTE_INDEX", a: { label: "index", type: "number" } },
  [Opcode.COLOR_FADE]: { name: "COLOR_FADE", a: { label: "color", type: "number" }, b: { label: "delay", type: "number" }, c: { label: "from", type: "boolean" } },
  [Opcode.CLEAR_TEXT]: { name: "CLEAR_TEXT" },
  [Opcode.SHOW_DIALOGUE]: { name: "SHOW_DIALOGUE", a: { label: "index", type: "dialogue" } },
};

/**
 * Context required for resolving semantic values (words, dialogues).
 */
export interface ScriptContext {
  getDialogue(index: number): string;
  getWord(index: number): string;
}

/**
 * A decoded parameter with its raw value and semantic type.
 */
export interface DecodedParam {
  label: string;
  type: ParamType;
  raw: number;
}

/**
 * A fully decoded script instruction.
 */
export interface Instruction {
  index: number;
  op: number;
  name: string;
  params: DecodedParam[];
}

export interface ItemReward {
  kind: "item";
  itemId: number;
  quantity: number;
  name: string;
}

export interface CashReward {
  kind: "cash";
  amount: number;
}

export type ScriptReward = ItemReward | CashReward;

export interface CollectScriptRewardsOptions {
  instructionLimit?: number;
  maxCallDepth?: number;
}

/**
 * Parses a script starting at a specific instruction index.
 * Continues reading instructions until a STOP opcode is encountered or a limit is reached.
 * 
 * @param source The full SSS.MKF subfile [4] (script operation table).
 * @param startIndex The 0-based index to start reading from.
 * @param context Optional context to resolve item names and dialogues during parsing.
 * @param limit Maximum number of instructions to read.
 * @returns An array of Instructions.
 */
export function parseScript(
  source: ByteSource,
  startIndex: number,
  limit: number = 256
): Instruction[] {
  const reader = new ByteReader(source, "scripts");
  const totalInstructions = Math.floor(reader.length / 8);
  const script: Instruction[] = [];

  for (let i = 0; i < limit; i++) {
    const idx = startIndex + i;
    if (idx < 0 || idx >= totalInstructions) break;

    const offset = idx * 8;
    const op = reader.readUint16LE(offset);
    const a = reader.readUint16LE(offset + 2);
    const b = reader.readUint16LE(offset + 4);
    const c = reader.readUint16LE(offset + 6);

    const def = OPCODE_DEFINITIONS[op] || { name: `UNKNOWN_0x${op.toString(16).toUpperCase()}` };
    const params: DecodedParam[] = [];
    const rawVals = [a, b, c];
    const pDefs = [def.a, def.b, def.c];

    for (let j = 0; j < 3; j++) {
      const pDef = pDefs[j];
      if (!pDef) continue;
      
      const val = rawVals[j]!;
      const param: DecodedParam = { label: pDef.label, type: pDef.type, raw: val };
      params.push(param);
    }

    script.push({
      index: idx,
      op,
      name: def.name,
      params
    });

    if (op === Opcode.STOP_EXECUTION || op === Opcode.JUMP) {
      break;
    }
  }

  return script;
}

export function collectScriptRewards(
  source: ByteSource,
  startIndex: number,
  context: ScriptContext,
  options: CollectScriptRewardsOptions = {}
): ScriptReward[] {
  const reader = new ByteReader(source, "scripts");
  const totalInstructions = Math.floor(reader.length / 8);
  const instructionLimit = options.instructionLimit ?? 100;
  const maxCallDepth = options.maxCallDepth ?? 2;
  const rewards: ScriptReward[] = [];
  const callStack = new Set<number>();
  let instructionsRead = 0;

  const visit = (entryIndex: number, depth: number): void => {
    if (depth > maxCallDepth || entryIndex < 0 || entryIndex >= totalInstructions || callStack.has(entryIndex)) {
      return;
    }

    callStack.add(entryIndex);

    const visitedEntries = new Set<number>();
    let currentIndex = entryIndex;

    while (currentIndex >= 0 && currentIndex < totalInstructions && instructionsRead < instructionLimit) {
      if (visitedEntries.has(currentIndex)) {
        break;
      }

      visitedEntries.add(currentIndex);
      instructionsRead++;

      const offset = currentIndex * 8;
      const op = reader.readUint16LE(offset);
      const a = reader.readUint16LE(offset + 2);
      const b = reader.readUint16LE(offset + 4);

      switch (op) {
      case Opcode.STOP_EXECUTION:
        currentIndex = -1;
        break;

      case Opcode.STOP_AND_ADVANCE:
        currentIndex++;
        break;

      case Opcode.STOP_AND_CHANGE:
        currentIndex = -1;
        break;

      case Opcode.CALL_SCRIPT:
        visit(a, depth + 1);
        currentIndex++;
        break;

      case Opcode.ADD_CASH:
        rewards.push({
          kind: "cash",
          amount: toSigned16(a),
        });
        currentIndex++;
        break;

      case Opcode.ADD_ITEM:
        rewards.push({
          kind: "item",
          itemId: a,
          quantity: toSigned16(b) === 0 ? 1 : toSigned16(b),
          name: context.getWord(a),
        });
        currentIndex++;
        break;

      default:
        currentIndex++;
        break;
      }
    }

    callStack.delete(entryIndex);
  };

  visit(startIndex, 0);
  return rewards;
}

/**
 * Formats a decoded instruction into a human-readable string.
 */
export function formatInstruction(inst: Instruction, context?: ScriptContext): string {
  const parts = inst.params.map(p => {
    if (p.type === "dialogue") {
      const text = context?.getDialogue(p.raw);
      return text !== undefined ? `'${text.replace(/\n/g, "\\n")}'` : `'<msg ${p.raw}>'`;
    }
    if (p.type === "word" || p.type === "item") {
      const text = context?.getWord(p.raw);
      return text !== undefined ? `${p.label}=${text} (${p.raw})` : `${p.label}=${p.raw}`;
    }
    if (p.type === "script") {
      return `${p.label}=0x${p.raw.toString(16).padStart(4, "0").toUpperCase()}`;
    }
    if (p.type === "signed") {
      return `${p.label}=${toSigned16(p.raw)}`;
    }
    return `${p.label}=${p.raw}`;
  });
  
  return `  ${inst.name.padEnd(18)} ${parts.join(" ")}`.trimEnd();
}

/**
 * Heuristically identifies a descriptive label for a script (e.g., character name or item).
 */
export function getScriptSummary(source: ByteSource, startIndex: number, context: ScriptContext): string {
  if (startIndex === undefined) return "";
  const insts = parseScript(source, startIndex, 10);

  for (const inst of insts) {
    if (inst.op === Opcode.SHOW_DIALOGUE) {
      const param = inst.params.find(p => p.type === "dialogue");
      if (param) return context.getDialogue(param.raw).split("\n")[0]?.substring(0, 20) ?? "";
    }
    if (inst.op === Opcode.ADD_ITEM) {
      const param = inst.params.find(p => p.type === "item");
      if (param) return `[ITEM] ${context.getWord(param.raw)}`;
    }
  }
  return "";
}
