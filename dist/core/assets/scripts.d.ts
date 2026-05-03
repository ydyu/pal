import { type ByteSource } from "../binary.js";
/**
 * Common PAL script opcodes.
 */
export declare enum Opcode {
    STOP_EXECUTION = 0,
    STOP_AND_ADVANCE = 1,
    STOP_AND_CHANGE = 2,
    JUMP = 3,
    CALL_SCRIPT = 4,
    CLEAR_SCREEN = 5,
    RANDOM_JUMP = 6,
    START_BATTLE = 7,
    CONTINUE_NEXT = 8,
    WAIT_STOP_MOVE = 9,
    CHOICE_DIALOGUE = 10,
    WALK_WEST = 11,
    WALK_NORTH = 12,
    WALK_EAST = 13,
    WALK_SOUTH = 14,
    SET_DIRECTION = 15,
    WALK_TO_TILE = 16,
    WALK_TO_TILE_SLOW = 17,
    MOVE_EVENT_REL = 18,
    SET_EVENT_POS = 19,
    SET_EVENT_IMAGE = 20,
    SET_EVENT_ANIM = 22,
    SET_TRIGGER_SCRIPT = 37,
    SET_PLAYER_IMAGE = 49,
    TELEPORT_OUT = 56,
    TEXT_CENTER_NARRATOR = 59,
    TEXT_UPPER_DIALOGUE = 60,
    TEXT_LOWER_DIALOGUE = 61,
    TEXT_CENTER_WINDOW = 62,
    SET_TRIGGER_MODE = 64,
    PLAY_MUSIC = 67,
    SET_PARTY_POS = 70,
    PLAY_SOUND = 71,
    SET_EVENT_STATE = 73,
    ADD_CASH = 30,
    ADD_ITEM = 31,
    REMOVE_ITEM = 32,
    SCREEN_FADE_RED = 79,
    FADE_OUT = 80,
    FADE_IN = 81,
    VANISH = 82,
    USE_DAY_PALETTE = 83,
    USE_NIGHT_PALETTE = 84,
    LEARN_MAGIC = 85,
    CHANGE_SCENE = 89,
    MOVE_EVENT_REL_MULTI = 108,
    TOGGLE_PALETTE_MODE = 128,
    WAIT = 133,
    OBJ_IDLE_WALK = 135,
    SET_PALETTE_INDEX = 139,
    COLOR_FADE = 140,
    CLEAR_TEXT = 142,
    SHOW_DIALOGUE = 65535
}
export type ParamType = "number" | "boolean" | "word" | "dialogue" | "worldFrame" | "script" | "portrait" | "scene" | "music" | "sound" | "magic" | "event" | "worldSprite" | "battleSprite" | "signed" | "item" | "battleGroup";
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
export declare const OPCODE_DEFINITIONS: Record<number, OpcodeDefinition>;
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
export declare function parseScript(source: ByteSource, startIndex: number, limit?: number): Instruction[];
export declare function collectScriptRewards(source: ByteSource, startIndex: number, context: ScriptContext, options?: CollectScriptRewardsOptions): ScriptReward[];
/**
 * Formats a decoded instruction into a human-readable string.
 */
export declare function formatInstruction(inst: Instruction, context?: ScriptContext): string;
/**
 * Heuristically identifies a descriptive label for a script (e.g., character name or item).
 */
export declare function getScriptSummary(source: ByteSource, startIndex: number, context: ScriptContext): string;
