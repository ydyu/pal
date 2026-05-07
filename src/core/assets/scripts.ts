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
  SET_PLAYER_DIR = 0x0015,
  SET_EVENT_ANIM = 0x0016,
  ADD_EQUIP_ATTR = 0x0017,
  EQUIP_ITEM = 0x0018,
  ADD_ATTR = 0x0019,
  SET_ATTR = 0x001A,
  RESTORE_HP = 0x001B,
  RESTORE_MP = 0x001C,
  RESTORE_HP_MP = 0x001D,
  ADD_CASH = 0x001E,
  ADD_ITEM = 0x001F,
  REMOVE_ITEM = 0x0020,
  DAMAGE_ENEMY = 0x0021,
  REVIVE_PARTY = 0x0022,
  UNEQUIP_ITEM = 0x0023,
  SET_AUTOSCRIPT = 0x0024,
  SET_TRIGGER_SCRIPT = 0x0025,
  OPEN_SHOP = 0x0026,
  OPEN_PAWNSHOP = 0x0027,
  POISON_ENEMY = 0x0028,
  POISON_PARTY = 0x0029,
  CURE_ENEMY = 0x002A,
  CURE_PARTY = 0x002B,
  CURE_PARTY_LEVEL = 0x002C,
  SET_PARTY_STATUS = 0x002D,
  SET_ENEMY_STATUS = 0x002E,
  CURE_PARTY_STATUS = 0x002F,
  BUFF_ATTR = 0x0030,
  SET_PLAYER_IMAGE = 0x0031,
  BRANCH_BATTLE = 0x0032,
  POUCH_COLLECT = 0x0033,
  COLLECT_ENEMIES = 0x0034,
  SHAKE_SCREEN = 0x0035,
  SET_ANIMATION = 0x0036,
  PLAY_ANIMATION = 0x0037,
  TELEPORT_OUT = 0x0038,
  DRAIN_ENEMY_HP = 0x0039,
  FLEE_BATTLE = 0x003A,
  TEXT_CENTER_NARRATOR = 0x003B,
  TEXT_UPPER_DIALOGUE = 0x003C,
  TEXT_LOWER_DIALOGUE = 0x003D,
  TEXT_CENTER_WINDOW = 0x003E,
  SHIP_TO_TILE_SLOW = 0x003F,
  SET_TRIGGER_MODE = 0x0040,
  MAGIC_INVALID = 0x0041,
  PARTY_USE_MAGIC = 0x0042,
  PLAY_MUSIC = 0x0043,
  SHIP_TO_TILE = 0x0044,
  SET_BATTLE_MUSIC = 0x0045,
  SET_PARTY_POS = 0x0046,
  PLAY_SOUND = 0x0047,
  SET_EVENT_STATE = 0x0049,
  SET_BATTLEFIELD = 0x004A,
  NULLIFY_EVENT = 0x004B,
  CHASE_PLAYER = 0x004C,
  WAIT_KEY = 0x004D,
  RELOAD_SAVE = 0x004E,
  SCREEN_FADE_RED = 0x004F,
  FADE_OUT = 0x0050,
  FADE_IN = 0x0051,
  VANISH = 0x0052,
  USE_DAY_PALETTE = 0x0053,
  USE_NIGHT_PALETTE = 0x0054,
  LEARN_MAGIC = 0x0055,
  FORGET_MAGIC = 0x0056,
  MP_TO_DAMAGE = 0x0057,
  BRANCH_ITEM = 0x0058,
  CHANGE_SCENE = 0x0059,
  HALVE_PARTY_HP = 0x005A,
  HALVE_ENEMY_HP = 0x005B,
  PARTY_INVIS = 0x005C,
  BRANCH_PARTY_POISON = 0x005D,
  BRANCH_ENEMY_POISON = 0x005E,
  PARTY_DIE = 0x005F,
  ENEMY_DIE = 0x0060,
  BRANCH_PARTY_POISONED = 0x0061,
  STOP_CHASE = 0x0062,
  DOUBLE_CHASE = 0x0063,
  CHECK_ENEMY_HP = 0x0064,
  SET_PARTY_IMAGE = 0x0065,
  THROW_WEAPON = 0x0066,
  SET_ENEMY_MAGIC = 0x0067,
  BRANCH_TARGET_PARTY = 0x0068,
  ENEMY_FLEE = 0x0069,
  STEAL = 0x006A,
  BLOW_AWAY_ENEMY = 0x006B,
  MOVE_EVENT_REL_MULTI = 0x006C,
  SET_SCENE_SCRIPT = 0x006D,
  MOVE_PLAYER_MULTI = 0x006E,
  SYNC_EVENT_STATE = 0x006F,
  PLAYER_WALK_TO = 0x0070,
  SCREEN_JIGGLE = 0x0071,
  SET_EVENT_MGO = 0x0072,
  GOLD_FADE = 0x0073,
  BRANCH_PARTY_INJURED = 0x0074,
  ADJUST_PARTY = 0x0075,
  SHOW_IMAGE = 0x0076,
  STOP_MUSIC = 0x0077,
  RETURN_TO_MAP = 0x0078,
  BRANCH_PARTY_HAS = 0x0079,
  PLAYER_WALK_FAST = 0x007A,
  PLAYER_WALK_RUN = 0x007B,
  OBJ_WALK_FAST = 0x007C,
  MOVE_EVENT_REL_2 = 0x007D,
  SET_EVENT_LAYER = 0x007E,
  MOVE_VIEW = 0x007F,
  TOGGLE_PALETTE_MODE = 0x0080,
  BRANCH_OBJ_VIEW = 0x0081,
  OBJ_RUN_TO = 0x0082,
  BRANCH_OBJ_DIST = 0x0083,
  PLACE_EVENT = 0x0084,
  WAIT = 0x0085,
  BRANCH_EQUIP_QTY = 0x0086,
  OBJ_IDLE_WALK = 0x0087,
  CASH_TO_DAMAGE = 0x0088,
  END_BATTLE = 0x0089,
  AUTO_BATTLE = 0x008A,
  SET_PALETTE_INDEX = 0x008B,
  COLOR_FADE = 0x008C,
  LEVEL_UP = 0x008D,
  CLEAR_TEXT = 0x008E,
  HALVE_CASH = 0x008F,
  SET_ENEMY_SCRIPT = 0x0090,
  BRANCH_SOLO_ENEMY = 0x0091,
  AWAKEN_POSE = 0x0092,
  FADE_IN_OUT = 0x0093,
  BRANCH_EVENT_STATE = 0x0094,
  BRANCH_IN_SCENE = 0x0095,
  LINGER_FLY = 0x0096,
  SHIP_TO_TILE_FAST = 0x0097,
  FOLLOW_EVENT = 0x0098,
  SET_SCENE_MAP = 0x0099,
  SET_EVENT_SEQ = 0x009A,
  FADE_TO_SCENE = 0x009B,
  ENEMY_DIVISION = 0x009C,
  BRANCH_REVIVE_FAIL = 0x009D,
  ENEMY_SUMMON = 0x009E,
  ENEMY_TRANSFORM = 0x009F,
  EXIT_GAME = 0x00A0,
  UPDATE_PLAYER = 0x00A1,
  RANDOM_MULTI_JUMP = 0x00A2,
  PLAY_CD_TRACK = 0x00A3,
  SCROLL_IMAGE = 0x00A4,
  FADE_IMAGE = 0x00A5,
  SET_BG_CURRENT = 0x00A6,
  ITEM_DESC = 0x00A7,
  SHOW_DIALOGUE = 0xFFFF,
}

export type ParamType =
  | "number" | "boolean" | "word" | "dialogue" | "worldFrame"
  | "script" | "portrait" | "scene" | "music" | "sound"
  | "magic" | "event" | "worldSprite" | "battleSprite" | "signed"
  | "item" | "battleGroup" | "direction" | "status" | "attr" | "player" | "pos" | "shop";

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
  [Opcode.SET_PLAYER_DIR]: { name: "SET_PLAYER_DIR", a: { label: "dir", type: "direction" }, b: { label: "frame", type: "worldFrame" }, c: { label: "player", type: "number" } },
  [Opcode.SET_EVENT_ANIM]: { name: "SET_EVENT_ANIM", a: { label: "event", type: "event" }, b: { label: "dir", type: "direction" }, c: { label: "frame", type: "worldFrame" } },
  [Opcode.ADD_EQUIP_ATTR]: { name: "ADD_EQUIP_ATTR", a: { label: "pos", type: "pos" }, b: { label: "attr", type: "attr" }, c: { label: "value", type: "signed" } },
  [Opcode.EQUIP_ITEM]: { name: "EQUIP_ITEM", a: { label: "pos", type: "pos" }, b: { label: "item", type: "item" } },
  [Opcode.ADD_ATTR]: { name: "ADD_ATTR", a: { label: "attr", type: "attr" }, b: { label: "value", type: "signed" }, c: { label: "player", type: "number" } },
  [Opcode.SET_ATTR]: { name: "SET_ATTR", a: { label: "attr", type: "attr" }, b: { label: "value", type: "signed" }, c: { label: "player", type: "number" } },
  [Opcode.RESTORE_HP]: { name: "RESTORE_HP", a: { label: "all", type: "boolean" }, b: { label: "value", type: "signed" } },
  [Opcode.RESTORE_MP]: { name: "RESTORE_MP", a: { label: "all", type: "boolean" }, b: { label: "value", type: "signed" } },
  [Opcode.RESTORE_HP_MP]: { name: "RESTORE_HP_MP", a: { label: "all", type: "boolean" }, b: { label: "value", type: "signed" } },
  [Opcode.ADD_CASH]: { name: "ADD_CASH", a: { label: "amount", type: "signed" }, b: { label: "failure_jump", type: "script" } },
  [Opcode.ADD_ITEM]: { name: "ADD_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" } },
  [Opcode.REMOVE_ITEM]: { name: "REMOVE_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" }, c: { label: "failure_jump", type: "script" } },
  [Opcode.DAMAGE_ENEMY]: { name: "DAMAGE_ENEMY", a: { label: "all", type: "boolean" }, b: { label: "value", type: "number" } },
  [Opcode.REVIVE_PARTY]: { name: "REVIVE_PARTY", a: { label: "all", type: "boolean" }, b: { label: "hp_pct", type: "number" } },
  [Opcode.UNEQUIP_ITEM]: { name: "UNEQUIP_ITEM", a: { label: "player", type: "number" }, b: { label: "pos", type: "pos" } },
  [Opcode.SET_AUTOSCRIPT]: { name: "SET_AUTOSCRIPT", a: { label: "event", type: "event" }, b: { label: "script", type: "script" } },
  [Opcode.SET_TRIGGER_SCRIPT]: { name: "SET_TRIGGER_SCRIPT", a: { label: "event", type: "event" }, b: { label: "script", type: "script" } },
  [Opcode.OPEN_SHOP]: { name: "OPEN_SHOP", a: { label: "shop", type: "shop" } },
  [Opcode.OPEN_PAWNSHOP]: { name: "OPEN_PAWNSHOP" },
  [Opcode.POISON_ENEMY]: { name: "POISON_ENEMY", a: { label: "all", type: "boolean" }, b: { label: "poison", type: "item" } },
  [Opcode.POISON_PARTY]: { name: "POISON_PARTY", a: { label: "all", type: "boolean" }, b: { label: "poison", type: "item" } },
  [Opcode.CURE_ENEMY]: { name: "CURE_ENEMY", a: { label: "all", type: "boolean" }, b: { label: "poison", type: "item" } },
  [Opcode.CURE_PARTY]: { name: "CURE_PARTY", a: { label: "all", type: "boolean" }, b: { label: "poison", type: "item" } },
  [Opcode.CURE_PARTY_LEVEL]: { name: "CURE_PARTY_LEVEL", a: { label: "all", type: "boolean" }, b: { label: "max_level", type: "number" } },
  [Opcode.SET_PARTY_STATUS]: { name: "SET_PARTY_STATUS", a: { label: "status", type: "status" }, b: { label: "turns", type: "number" } },
  [Opcode.SET_ENEMY_STATUS]: { name: "SET_ENEMY_STATUS", a: { label: "status", type: "status" }, b: { label: "turns", type: "number" }, c: { label: "fail_jump", type: "script" } },
  [Opcode.CURE_PARTY_STATUS]: { name: "CURE_PARTY_STATUS", a: { label: "status", type: "status" } },
  [Opcode.BUFF_ATTR]: { name: "BUFF_ATTR", a: { label: "attr", type: "attr" }, b: { label: "pct", type: "number" }, c: { label: "player", type: "number" } },
  [Opcode.SET_PLAYER_IMAGE]: { name: "SET_PLAYER_IMAGE", a: { label: "img", type: "battleSprite" } },
  [Opcode.BRANCH_BATTLE]: { name: "BRANCH_BATTLE", a: { label: "battle", type: "script" }, b: { label: "normal", type: "script" } },
  [Opcode.POUCH_COLLECT]: { name: "POUCH_COLLECT", a: { label: "fail_jump", type: "script" } },
  [Opcode.COLLECT_ENEMIES]: { name: "COLLECT_ENEMIES", a: { label: "jump", type: "script" } },
  [Opcode.SHAKE_SCREEN]: { name: "SHAKE_SCREEN", a: { label: "count", type: "number" }, b: { label: "magnitude", type: "number" } },
  [Opcode.SET_ANIMATION]: { name: "SET_ANIMATION", a: { label: "rng_idx", type: "number" } },
  [Opcode.PLAY_ANIMATION]: { name: "PLAY_ANIMATION", a: { label: "start", type: "number" }, b: { label: "end", type: "number" }, c: { label: "speed", type: "number" } },
  [Opcode.TELEPORT_OUT]: { name: "TELEPORT_OUT", a: { label: "failure_jump", type: "script" } },
  [Opcode.DRAIN_ENEMY_HP]: { name: "DRAIN_ENEMY_HP", a: { label: "amount", type: "number" } },
  [Opcode.FLEE_BATTLE]: { name: "FLEE_BATTLE", a: { label: "fail_jump", type: "script" } },
  [Opcode.TEXT_CENTER_NARRATOR]: { name: "TEXT_CENTER_NARRATOR", a: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_UPPER_DIALOGUE]: { name: "TEXT_UPPER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_LOWER_DIALOGUE]: { name: "TEXT_LOWER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
  [Opcode.TEXT_CENTER_WINDOW]: { name: "TEXT_CENTER_WINDOW", a: { label: "color", type: "number" } },
  [Opcode.SHIP_TO_TILE_SLOW]: { name: "SHIP_TO_TILE_SLOW", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.SET_TRIGGER_MODE]: { name: "SET_TRIGGER_MODE", a: { label: "event", type: "event" }, b: { label: "mode", type: "number" } },
  [Opcode.MAGIC_INVALID]: { name: "MAGIC_INVALID", a: { label: "magic", type: "magic" }, b: { label: "target", type: "number" }, c: { label: "player", type: "number" } },
  [Opcode.PARTY_USE_MAGIC]: { name: "PARTY_USE_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "target", type: "number" }, c: { label: "player", type: "number" } },
  [Opcode.PLAY_MUSIC]: { name: "PLAY_MUSIC", a: { label: "music", type: "music" }, b: { label: "loop", type: "number" } },
  [Opcode.SHIP_TO_TILE]: { name: "SHIP_TO_TILE", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.SET_BATTLE_MUSIC]: { name: "SET_BATTLE_MUSIC", a: { label: "music", type: "music" } },
  [Opcode.SET_PARTY_POS]: { name: "SET_PARTY_POS", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.PLAY_SOUND]: { name: "PLAY_SOUND", a: { label: "sound", type: "sound" } },
  [Opcode.SET_EVENT_STATE]: { name: "SET_EVENT_STATE", a: { label: "event", type: "event" }, b: { label: "state", type: "number" } },
  [Opcode.SET_BATTLEFIELD]: { name: "SET_BATTLEFIELD", a: { label: "field_id", type: "number" } },
  [Opcode.NULLIFY_EVENT]: { name: "NULLIFY_EVENT" },
  [Opcode.CHASE_PLAYER]: { name: "CHASE_PLAYER", a: { label: "range", type: "number" }, b: { label: "speed", type: "number" }, c: { label: "search", type: "boolean" } },
  [Opcode.WAIT_KEY]: { name: "WAIT_KEY" },
  [Opcode.RELOAD_SAVE]: { name: "RELOAD_SAVE" },
  [Opcode.SCREEN_FADE_RED]: { name: "SCREEN_FADE_RED" },
  [Opcode.FADE_OUT]: { name: "FADE_OUT", a: { label: "fast", type: "boolean" } },
  [Opcode.FADE_IN]: { name: "FADE_IN", a: { label: "fast", type: "boolean" } },
  [Opcode.VANISH]: { name: "VANISH", a: { label: "frames", type: "number" } },
  [Opcode.USE_DAY_PALETTE]: { name: "USE_DAY_PALETTE" },
  [Opcode.USE_NIGHT_PALETTE]: { name: "USE_NIGHT_PALETTE" },
  [Opcode.LEARN_MAGIC]: { name: "LEARN_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "player", type: "number" } },
  [Opcode.FORGET_MAGIC]: { name: "FORGET_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "player", type: "number" } },
  [Opcode.MP_TO_DAMAGE]: { name: "MP_TO_DAMAGE", a: { label: "magic", type: "magic" }, b: { label: "multiplier", type: "number" } },
  [Opcode.BRANCH_ITEM]: { name: "BRANCH_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "number" }, c: { label: "fail_jump", type: "script" } },
  [Opcode.CHANGE_SCENE]: { name: "CHANGE_SCENE", a: { label: "scene", type: "scene" } },
  [Opcode.HALVE_PARTY_HP]: { name: "HALVE_PARTY_HP" },
  [Opcode.HALVE_ENEMY_HP]: { name: "HALVE_ENEMY_HP", a: { label: "limit", type: "number" } },
  [Opcode.PARTY_INVIS]: { name: "PARTY_INVIS", a: { label: "turns", type: "number" } },
  [Opcode.BRANCH_PARTY_POISON]: { name: "BRANCH_PARTY_POISON", a: { label: "poison", type: "item" }, b: { label: "fail_jump", type: "script" } },
  [Opcode.BRANCH_ENEMY_POISON]: { name: "BRANCH_ENEMY_POISON", a: { label: "poison", type: "item" }, b: { label: "fail_jump", type: "script" } },
  [Opcode.PARTY_DIE]: { name: "PARTY_DIE" },
  [Opcode.ENEMY_DIE]: { name: "ENEMY_DIE" },
  [Opcode.BRANCH_PARTY_POISONED]: { name: "BRANCH_PARTY_POISONED", a: { label: "fail_jump", type: "script" } },
  [Opcode.STOP_CHASE]: { name: "STOP_CHASE", a: { label: "duration", type: "number" } },
  [Opcode.DOUBLE_CHASE]: { name: "DOUBLE_CHASE", a: { label: "duration", type: "number" } },
  [Opcode.CHECK_ENEMY_HP]: { name: "CHECK_ENEMY_HP", a: { label: "threshold", type: "number" }, b: { label: "jump", type: "script" } },
  [Opcode.SET_PARTY_IMAGE]: { name: "SET_PARTY_IMAGE", a: { label: "player", type: "number" }, b: { label: "img", type: "worldSprite" }, c: { label: "now", type: "boolean" } },
  [Opcode.THROW_WEAPON]: { name: "THROW_WEAPON", a: { label: "magic", type: "magic" }, b: { label: "damage", type: "number" } },
  [Opcode.SET_ENEMY_MAGIC]: { name: "SET_ENEMY_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "freq", type: "number" } },
  [Opcode.BRANCH_TARGET_PARTY]: { name: "BRANCH_TARGET_PARTY", a: { label: "jump", type: "script" } },
  [Opcode.ENEMY_FLEE]: { name: "ENEMY_FLEE", a: { label: "success_100", type: "boolean" } },
  [Opcode.STEAL]: { name: "STEAL", a: { label: "rate", type: "number" } },
  [Opcode.BLOW_AWAY_ENEMY]: { name: "BLOW_AWAY_ENEMY", a: { label: "qty", type: "number" } },
  [Opcode.MOVE_EVENT_REL_MULTI]: { name: "MOVE_EVENT_REL_MULTI", a: { label: "event", type: "event" }, b: { label: "dx", type: "signed" }, c: { label: "dy", type: "signed" } },
  [Opcode.SET_SCENE_SCRIPT]: { name: "SET_SCENE_SCRIPT", a: { label: "scene", type: "scene" }, b: { label: "enter", type: "script" }, c: { label: "exit", type: "script" } },
  [Opcode.MOVE_PLAYER_MULTI]: { name: "MOVE_PLAYER_MULTI", a: { label: "dx", type: "signed" }, b: { label: "dy", type: "signed" }, c: { label: "layer", type: "number" } },
  [Opcode.SYNC_EVENT_STATE]: { name: "SYNC_EVENT_STATE", a: { label: "event", type: "event" }, b: { label: "state", type: "number" } },
  [Opcode.PLAYER_WALK_TO]: { name: "PLAYER_WALK_TO", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.SCREEN_JIGGLE]: { name: "SCREEN_JIGGLE", a: { label: "layer", type: "number" }, b: { label: "step", type: "number" } },
  [Opcode.SET_EVENT_MGO]: { name: "SET_EVENT_MGO", a: { label: "event", type: "event" }, b: { label: "mgo", type: "number" }, c: { label: "rebuild", type: "boolean" } },
  [Opcode.GOLD_FADE]: { name: "GOLD_FADE", a: { label: "step", type: "number" } },
  [Opcode.BRANCH_PARTY_INJURED]: { name: "BRANCH_PARTY_INJURED", a: { label: "jump", type: "script" } },
  [Opcode.ADJUST_PARTY]: { name: "ADJUST_PARTY", a: { label: "p1", type: "number" }, b: { label: "p2", type: "number" }, c: { label: "p3", type: "number" } },
  [Opcode.SHOW_IMAGE]: { name: "SHOW_IMAGE", a: { label: "field", type: "number" }, b: { label: "delay", type: "number" } },
  [Opcode.STOP_MUSIC]: { name: "STOP_MUSIC", a: { label: "fade", type: "number" } },
  [Opcode.RETURN_TO_MAP]: { name: "RETURN_TO_MAP" },
  [Opcode.BRANCH_PARTY_HAS]: { name: "BRANCH_PARTY_HAS", a: { label: "player", type: "word" }, b: { label: "jump", type: "script" } },
  [Opcode.PLAYER_WALK_FAST]: { name: "PLAYER_WALK_FAST", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.PLAYER_WALK_RUN]: { name: "PLAYER_WALK_RUN", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.OBJ_WALK_FAST]: { name: "OBJ_WALK_FAST", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.MOVE_EVENT_REL_2]: { name: "MOVE_EVENT_REL_2", a: { label: "event", type: "event" }, b: { label: "dx", type: "signed" }, c: { label: "dy", type: "signed" } },
  [Opcode.SET_EVENT_LAYER]: { name: "SET_EVENT_LAYER", a: { label: "event", type: "event" }, b: { label: "layer", type: "number" } },
  [Opcode.MOVE_VIEW]: { name: "MOVE_VIEW", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "count", type: "number" } },
  [Opcode.TOGGLE_PALETTE_MODE]: { name: "TOGGLE_PALETTE_MODE", a: { label: "skip_update", type: "boolean" } },
  [Opcode.BRANCH_OBJ_VIEW]: { name: "BRANCH_OBJ_VIEW", a: { label: "event", type: "event" }, c: { label: "jump", type: "script" } },
  [Opcode.OBJ_RUN_TO]: { name: "OBJ_RUN_TO", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.BRANCH_OBJ_DIST]: { name: "BRANCH_OBJ_DIST", a: { label: "event", type: "event" }, b: { label: "dist", type: "number" }, c: { label: "jump", type: "script" } },
  [Opcode.PLACE_EVENT]: { name: "PLACE_EVENT", a: { label: "event", type: "event" }, b: { label: "mode", type: "number" }, c: { label: "fail_jump", type: "script" } },
  [Opcode.WAIT]: { name: "WAIT", a: { label: "delay", type: "number" } },
  [Opcode.BRANCH_EQUIP_QTY]: { name: "BRANCH_EQUIP_QTY", a: { label: "item", type: "item" }, b: { label: "qty", type: "number" }, c: { label: "jump", type: "script" } },
  [Opcode.OBJ_IDLE_WALK]: { name: "OBJ_IDLE_WALK" },
  [Opcode.CASH_TO_DAMAGE]: { name: "CASH_TO_DAMAGE", a: { label: "magic", type: "magic" } },
  [Opcode.END_BATTLE]: { name: "END_BATTLE", a: { label: "result", type: "number" } },
  [Opcode.AUTO_BATTLE]: { name: "AUTO_BATTLE" },
  [Opcode.SET_PALETTE_INDEX]: { name: "SET_PALETTE_INDEX", a: { label: "index", type: "number" } },
  [Opcode.COLOR_FADE]: { name: "COLOR_FADE", a: { label: "color", type: "number" }, b: { label: "delay", type: "number" }, c: { label: "from", type: "boolean" } },
  [Opcode.LEVEL_UP]: { name: "LEVEL_UP", a: { label: "amount", type: "number" } },
  [Opcode.CLEAR_TEXT]: { name: "CLEAR_TEXT" },
  [Opcode.HALVE_CASH]: { name: "HALVE_CASH" },
  [Opcode.SET_ENEMY_SCRIPT]: { name: "SET_ENEMY_SCRIPT", a: { label: "event", type: "event" }, b: { label: "script", type: "script" }, c: { label: "type", type: "number" } },
  [Opcode.BRANCH_SOLO_ENEMY]: { name: "BRANCH_SOLO_ENEMY", a: { label: "jump", type: "script" } },
  [Opcode.AWAKEN_POSE]: { name: "AWAKEN_POSE", a: { label: "player", type: "number" } },
  [Opcode.FADE_IN_OUT]: { name: "FADE_IN_OUT", a: { label: "speed", type: "signed" } },
  [Opcode.BRANCH_EVENT_STATE]: { name: "BRANCH_EVENT_STATE", a: { label: "event", type: "event" }, b: { label: "state", type: "number" }, c: { label: "jump", type: "script" } },
  [Opcode.BRANCH_IN_SCENE]: { name: "BRANCH_IN_SCENE", a: { label: "scene", type: "scene" }, b: { label: "jump", type: "script" } },
  [Opcode.LINGER_FLY]: { name: "LINGER_FLY" },
  [Opcode.SHIP_TO_TILE_FAST]: { name: "SHIP_TO_TILE_FAST", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
  [Opcode.FOLLOW_EVENT]: { name: "FOLLOW_EVENT", a: { label: "p1", type: "number" }, b: { label: "p2", type: "number" }, c: { label: "p3", type: "number" } },
  [Opcode.SET_SCENE_MAP]: { name: "SET_SCENE_MAP", a: { label: "scene", type: "scene" }, b: { label: "map", type: "number" } },
  [Opcode.SET_EVENT_SEQ]: { name: "SET_EVENT_SEQ", a: { label: "front", type: "number" }, b: { label: "back", type: "number" }, c: { label: "state", type: "number" } },
  [Opcode.FADE_TO_SCENE]: { name: "FADE_TO_SCENE", a: { label: "mode", type: "number" }, b: { label: "field", type: "number" } },
  [Opcode.ENEMY_DIVISION]: { name: "ENEMY_DIVISION", a: { label: "count", type: "number" }, b: { label: "jump", type: "script" } },
  [Opcode.BRANCH_REVIVE_FAIL]: { name: "BRANCH_REVIVE_FAIL", a: { label: "solo", type: "boolean" }, b: { label: "jump", type: "script" } },
  [Opcode.ENEMY_SUMMON]: { name: "ENEMY_SUMMON", a: { label: "object", type: "item" }, b: { label: "qty", type: "number" }, c: { label: "fail_jump", type: "script" } },
  [Opcode.ENEMY_TRANSFORM]: { name: "ENEMY_TRANSFORM", a: { label: "target", type: "number" } },
  [Opcode.EXIT_GAME]: { name: "EXIT_GAME" },
  [Opcode.UPDATE_PLAYER]: { name: "UPDATE_PLAYER" },
  [Opcode.RANDOM_MULTI_JUMP]: { name: "RANDOM_MULTI_JUMP", a: { label: "branches", type: "number" } },
  [Opcode.PLAY_CD_TRACK]: { name: "PLAY_CD_TRACK", a: { label: "track", type: "number" }, b: { label: "music", type: "music" } },
  [Opcode.SCROLL_IMAGE]: { name: "SCROLL_IMAGE", a: { label: "field", type: "number" }, c: { label: "speed", type: "number" } },
  [Opcode.FADE_IMAGE]: { name: "FADE_IMAGE", a: { label: "field", type: "number" }, b: { label: "event", type: "event" }, c: { label: "speed", type: "number" } },
  [Opcode.SET_BG_CURRENT]: { name: "SET_BG_CURRENT" },
  [Opcode.ITEM_DESC]: { name: "ITEM_DESC" },
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

    if (op === Opcode.STOP_EXECUTION || op === Opcode.JUMP || op === Opcode.STOP_AND_CHANGE) {
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
    if (p.type === "word" || p.type === "item" || p.type === "magic") {
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
