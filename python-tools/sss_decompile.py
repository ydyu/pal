#!/usr/bin/env python3
"""
PAL DOS SSS.MKF script decompiler and simple editor.

Usage additions:
  --set IDX OP A B C   overwrite script entry at index IDX inside sub[4] (scripts), values accept 0x.. or decimal
  (creates a .bak of the original SSS.MKF before writing)

Other functions unchanged.
"""
from __future__ import annotations

import argparse
import struct
from pathlib import Path
import shutil

GAME_DIR = Path(__file__).resolve().parent.parent.parent / "palgame"
DEFAULT_SSS = GAME_DIR / "SSS.MKF"
DEFAULT_MSG = GAME_DIR / "M.MSG"
DEFAULT_WORD = GAME_DIR / "WORD.DAT"

class Opcode:
    STOP_EXECUTION = 0x0000
    STOP_AND_ADVANCE = 0x0001
    STOP_AND_CHANGE = 0x0002
    JUMP = 0x0003
    CALL_SCRIPT = 0x0004
    CLEAR_SCREEN = 0x0005
    RANDOM_JUMP = 0x0006
    START_BATTLE = 0x0007
    CONTINUE_NEXT = 0x0008
    WAIT_STOP_MOVE = 0x0009
    CHOICE_DIALOGUE = 0x000A
    WALK_WEST = 0x000B
    WALK_NORTH = 0x000C
    WALK_EAST = 0x000D
    WALK_SOUTH = 0x000E
    SET_DIRECTION = 0x000F
    WALK_TO_TILE = 0x0010
    WALK_TO_TILE_SLOW = 0x0011
    MOVE_EVENT_REL = 0x0012
    SET_EVENT_POS = 0x0013
    SET_EVENT_IMAGE = 0x0014
    SET_PLAYER_DIR = 0x0015
    SET_EVENT_ANIM = 0x0016
    ADD_EQUIP_ATTR = 0x0017
    EQUIP_ITEM = 0x0018
    ADD_ATTR = 0x0019
    SET_ATTR = 0x001A
    RESTORE_HP = 0x001B
    RESTORE_MP = 0x001C
    RESTORE_HP_MP = 0x001D
    ADD_CASH = 0x001E
    ADD_ITEM = 0x001F
    REMOVE_ITEM = 0x0020
    DAMAGE_ENEMY = 0x0021
    REVIVE_PARTY = 0x0022
    UNEQUIP_ITEM = 0x0023
    SET_AUTOSCRIPT = 0x0024
    SET_TRIGGER_SCRIPT = 0x0025
    OPEN_SHOP = 0x0026
    OPEN_PAWNSHOP = 0x0027
    POISON_ENEMY = 0x0028
    POISON_PARTY = 0x0029
    CURE_ENEMY = 0x002A
    CURE_PARTY = 0x002B
    CURE_PARTY_LEVEL = 0x002C
    SET_PARTY_STATUS = 0x002D
    SET_ENEMY_STATUS = 0x002E
    CURE_PARTY_STATUS = 0x002F
    BUFF_ATTR = 0x0030
    SET_PLAYER_IMAGE = 0x0031
    BRANCH_BATTLE = 0x0032
    POUCH_COLLECT = 0x0033
    COLLECT_ENEMIES = 0x0034
    SHAKE_SCREEN = 0x0035
    SET_ANIMATION = 0x0036
    PLAY_ANIMATION = 0x0037
    TELEPORT_OUT = 0x0038
    DRAIN_ENEMY_HP = 0x0039
    FLEE_BATTLE = 0x003A
    TEXT_CENTER_NARRATOR = 0x003B
    TEXT_UPPER_DIALOGUE = 0x003C
    TEXT_LOWER_DIALOGUE = 0x003D
    TEXT_CENTER_WINDOW = 0x003E
    SHIP_TO_TILE_SLOW = 0x003F
    SET_TRIGGER_MODE = 0x0040
    MAGIC_INVALID = 0x0041
    PARTY_USE_MAGIC = 0x0042
    PLAY_MUSIC = 0x0043
    SHIP_TO_TILE = 0x0044
    SET_BATTLE_MUSIC = 0x0045
    SET_PARTY_POS = 0x0046
    PLAY_SOUND = 0x0047
    SET_EVENT_STATE = 0x0049
    SET_BATTLEFIELD = 0x004A
    NULLIFY_EVENT = 0x004B
    CHASE_PLAYER = 0x004C
    WAIT_KEY = 0x004D
    RELOAD_SAVE = 0x004E
    SCREEN_FADE_RED = 0x004F
    FADE_OUT = 0x0050
    FADE_IN = 0x0051
    VANISH = 0x0052
    USE_DAY_PALETTE = 0x0053
    USE_NIGHT_PALETTE = 0x0054
    LEARN_MAGIC = 0x0055
    FORGET_MAGIC = 0x0056
    MP_TO_DAMAGE = 0x0057
    BRANCH_ITEM = 0x0058
    CHANGE_SCENE = 0x0059
    HALVE_PARTY_HP = 0x005A
    HALVE_ENEMY_HP = 0x005B
    PARTY_INVIS = 0x005C
    BRANCH_PARTY_POISON = 0x005D
    BRANCH_ENEMY_POISON = 0x005E
    PARTY_DIE = 0x005F
    ENEMY_DIE = 0x0060
    BRANCH_PARTY_POISONED = 0x0061
    STOP_CHASE = 0x0062
    DOUBLE_CHASE = 0x0063
    CHECK_ENEMY_HP = 0x0064
    SET_PARTY_IMAGE = 0x0065
    THROW_WEAPON = 0x0066
    SET_ENEMY_MAGIC = 0x0067
    BRANCH_TARGET_PARTY = 0x0068
    ENEMY_FLEE = 0x0069
    STEAL = 0x006A
    BLOW_AWAY_ENEMY = 0x006B
    MOVE_EVENT_REL_MULTI = 0x006C
    SET_SCENE_SCRIPT = 0x006D
    MOVE_PLAYER_MULTI = 0x006E
    SYNC_EVENT_STATE = 0x006F
    PLAYER_WALK_TO = 0x0070
    SCREEN_JIGGLE = 0x0071
    SET_EVENT_MGO = 0x0072
    GOLD_FADE = 0x0073
    BRANCH_PARTY_INJURED = 0x0074
    ADJUST_PARTY = 0x0075
    SHOW_IMAGE = 0x0076
    STOP_MUSIC = 0x0077
    RETURN_TO_MAP = 0x0078
    BRANCH_PARTY_HAS = 0x0079
    PLAYER_WALK_FAST = 0x007A
    PLAYER_WALK_RUN = 0x007B
    OBJ_WALK_FAST = 0x007C
    MOVE_EVENT_REL_2 = 0x007D
    SET_EVENT_LAYER = 0x007E
    MOVE_VIEW = 0x007F
    TOGGLE_PALETTE_MODE = 0x0080
    BRANCH_OBJ_VIEW = 0x0081
    OBJ_RUN_TO = 0x0082
    BRANCH_OBJ_DIST = 0x0083
    PLACE_EVENT = 0x0084
    WAIT = 0x0085
    BRANCH_EQUIP_QTY = 0x0086
    OBJ_IDLE_WALK = 0x0087
    CASH_TO_DAMAGE = 0x0088
    END_BATTLE = 0x0089
    AUTO_BATTLE = 0x008A
    SET_PALETTE_INDEX = 0x008B
    COLOR_FADE = 0x008C
    LEVEL_UP = 0x008D
    CLEAR_TEXT = 0x008E
    HALVE_CASH = 0x008F
    SET_ENEMY_SCRIPT = 0x0090
    BRANCH_SOLO_ENEMY = 0x0091
    AWAKEN_POSE = 0x0092
    FADE_IN_OUT = 0x0093
    BRANCH_EVENT_STATE = 0x0094
    BRANCH_IN_SCENE = 0x0095
    LINGER_FLY = 0x0096
    SHIP_TO_TILE_FAST = 0x0097
    FOLLOW_EVENT = 0x0098
    SET_SCENE_MAP = 0x0099
    SET_EVENT_SEQ = 0x009A
    FADE_TO_SCENE = 0x009B
    ENEMY_DIVISION = 0x009C
    BRANCH_REVIVE_FAIL = 0x009D
    ENEMY_SUMMON = 0x009E
    ENEMY_TRANSFORM = 0x009F
    EXIT_GAME = 0x00A0
    UPDATE_PLAYER = 0x00A1
    RANDOM_MULTI_JUMP = 0x00A2
    PLAY_CD_TRACK = 0x00A3
    SCROLL_IMAGE = 0x00A4
    FADE_IMAGE = 0x00A5
    SET_BG_CURRENT = 0x00A6
    ITEM_DESC = 0x00A7
    SHOW_DIALOGUE = 0xFFFF


# The single source of truth for PAL script opcodes and their parameters.
# Ported from src/core/assets/scripts.ts
OPCODE_DEFINITIONS: dict[int, dict] = {
    Opcode.STOP_EXECUTION: {"name": "STOP_EXECUTION"},
    Opcode.STOP_AND_ADVANCE: {"name": "STOP_AND_ADVANCE"},
    Opcode.STOP_AND_CHANGE: {"name": "STOP_AND_CHANGE", "a": {"label": "next", "type": "script"}, "b": {"label": "loops", "type": "number"}},
    Opcode.JUMP: {"name": "JUMP", "a": {"label": "target", "type": "script"}, "b": {"label": "loops", "type": "number"}},
    Opcode.CALL_SCRIPT: {"name": "CALL_SCRIPT", "a": {"label": "script", "type": "script"}, "b": {"label": "event", "type": "event"}},
    Opcode.CLEAR_SCREEN: {"name": "CLEAR_SCREEN", "b": {"label": "delay", "type": "number"}, "c": {"label": "update_gestures", "type": "boolean"}},
    Opcode.RANDOM_JUMP: {"name": "RANDOM_JUMP", "a": {"label": "rate", "type": "number"}, "b": {"label": "target", "type": "script"}},
    Opcode.START_BATTLE: {"name": "START_BATTLE", "a": {"label": "group", "type": "battleGroup"}, "b": {"label": "lost_jump", "type": "script"}, "c": {"label": "flee_jump", "type": "script"}},
    Opcode.CONTINUE_NEXT: {"name": "CONTINUE_NEXT"},
    Opcode.WAIT_STOP_MOVE: {"name": "WAIT_STOP_MOVE", "a": {"label": "frames", "type": "number"}, "c": {"label": "update_gestures", "type": "boolean"}},
    Opcode.CHOICE_DIALOGUE: {"name": "CHOICE_DIALOGUE", "a": {"label": "target", "type": "script"}},
    Opcode.WALK_WEST: {"name": "WALK_WEST"},
    Opcode.WALK_NORTH: {"name": "WALK_NORTH"},
    Opcode.WALK_EAST: {"name": "WALK_EAST"},
    Opcode.WALK_SOUTH: {"name": "WALK_SOUTH"},
    Opcode.SET_DIRECTION: {"name": "SET_DIRECTION", "a": {"label": "dir", "type": "direction"}, "b": {"label": "frame", "type": "worldFrame"}},
    Opcode.WALK_TO_TILE: {"name": "WALK_TO_TILE", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.WALK_TO_TILE_SLOW: {"name": "WALK_TO_TILE_SLOW", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.MOVE_EVENT_REL: {"name": "MOVE_EVENT_REL", "a": {"label": "event", "type": "event"}, "b": {"label": "dx", "type": "number"}, "c": {"label": "dy", "type": "number"}},
    Opcode.SET_EVENT_POS: {"name": "SET_EVENT_POS", "a": {"label": "event", "type": "event"}, "b": {"label": "x", "type": "number"}, "c": {"label": "y", "type": "number"}},
    Opcode.SET_EVENT_IMAGE: {"name": "SET_EVENT_IMAGE", "a": {"label": "frame", "type": "worldFrame"}},
    Opcode.SET_PLAYER_DIR: {"name": "SET_PLAYER_DIR", "a": {"label": "dir", "type": "direction"}, "b": {"label": "frame", "type": "worldFrame"}, "c": {"label": "player", "type": "number"}},
    Opcode.SET_EVENT_ANIM: {"name": "SET_EVENT_ANIM", "a": {"label": "event", "type": "event"}, "b": {"label": "dir", "type": "direction"}, "c": {"label": "frame", "type": "worldFrame"}},
    Opcode.ADD_EQUIP_ATTR: {"name": "ADD_EQUIP_ATTR", "a": {"label": "pos", "type": "pos"}, "b": {"label": "attr", "type": "attr"}, "c": {"label": "value", "type": "signed"}},
    Opcode.EQUIP_ITEM: {"name": "EQUIP_ITEM", "a": {"label": "pos", "type": "pos"}, "b": {"label": "item", "type": "item"}},
    Opcode.ADD_ATTR: {"name": "ADD_ATTR", "a": {"label": "attr", "type": "attr"}, "b": {"label": "value", "type": "signed"}, "c": {"label": "player", "type": "number"}},
    Opcode.SET_ATTR: {"name": "SET_ATTR", "a": {"label": "attr", "type": "attr"}, "b": {"label": "value", "type": "signed"}, "c": {"label": "player", "type": "number"}},
    Opcode.RESTORE_HP: {"name": "RESTORE_HP", "a": {"label": "all", "type": "boolean"}, "b": {"label": "value", "type": "signed"}},
    Opcode.RESTORE_MP: {"name": "RESTORE_MP", "a": {"label": "all", "type": "boolean"}, "b": {"label": "value", "type": "signed"}},
    Opcode.RESTORE_HP_MP: {"name": "RESTORE_HP_MP", "a": {"label": "all", "type": "boolean"}, "b": {"label": "value", "type": "signed"}},
    Opcode.ADD_CASH: {"name": "ADD_CASH", "a": {"label": "amount", "type": "signed"}, "b": {"label": "failure_jump", "type": "script"}},
    Opcode.ADD_ITEM: {"name": "ADD_ITEM", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "signed"}},
    Opcode.REMOVE_ITEM: {"name": "REMOVE_ITEM", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "signed"}, "c": {"label": "failure_jump", "type": "script"}},
    Opcode.DAMAGE_ENEMY: {"name": "DAMAGE_ENEMY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "value", "type": "number"}},
    Opcode.REVIVE_PARTY: {"name": "REVIVE_PARTY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "hp_pct", "type": "number"}},
    Opcode.UNEQUIP_ITEM: {"name": "UNEQUIP_ITEM", "a": {"label": "player", "type": "number"}, "b": {"label": "pos", "type": "pos"}},
    Opcode.SET_AUTOSCRIPT: {"name": "SET_AUTOSCRIPT", "a": {"label": "event", "type": "event"}, "b": {"label": "script", "type": "script"}},
    Opcode.SET_TRIGGER_SCRIPT: {"name": "SET_TRIGGER_SCRIPT", "a": {"label": "event", "type": "event"}, "b": {"label": "script", "type": "script"}},
    Opcode.OPEN_SHOP: {"name": "OPEN_SHOP", "a": {"label": "shop", "type": "shop"}},
    Opcode.OPEN_PAWNSHOP: {"name": "OPEN_PAWNSHOP"},
    Opcode.POISON_ENEMY: {"name": "POISON_ENEMY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "poison", "type": "item"}},
    Opcode.POISON_PARTY: {"name": "POISON_PARTY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "poison", "type": "item"}},
    Opcode.CURE_ENEMY: {"name": "CURE_ENEMY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "poison", "type": "item"}},
    Opcode.CURE_PARTY: {"name": "CURE_PARTY", "a": {"label": "all", "type": "boolean"}, "b": {"label": "poison", "type": "item"}},
    Opcode.CURE_PARTY_LEVEL: {"name": "CURE_PARTY_LEVEL", "a": {"label": "all", "type": "boolean"}, "b": {"label": "max_level", "type": "number"}},
    Opcode.SET_PARTY_STATUS: {"name": "SET_PARTY_STATUS", "a": {"label": "status", "type": "status"}, "b": {"label": "turns", "type": "number"}},
    Opcode.SET_ENEMY_STATUS: {"name": "SET_ENEMY_STATUS", "a": {"label": "status", "type": "status"}, "b": {"label": "turns", "type": "number"}, "c": {"label": "fail_jump", "type": "script"}},
    Opcode.CURE_PARTY_STATUS: {"name": "CURE_PARTY_STATUS", "a": {"label": "status", "type": "status"}},
    Opcode.BUFF_ATTR: {"name": "BUFF_ATTR", "a": {"label": "attr", "type": "attr"}, "b": {"label": "pct", "type": "number"}, "c": {"label": "player", "type": "number"}},
    Opcode.SET_PLAYER_IMAGE: {"name": "SET_PLAYER_IMAGE", "a": {"label": "img", "type": "battleSprite"}},
    Opcode.BRANCH_BATTLE: {"name": "BRANCH_BATTLE", "a": {"label": "battle", "type": "script"}, "b": {"label": "normal", "type": "script"}},
    Opcode.POUCH_COLLECT: {"name": "POUCH_COLLECT", "a": {"label": "fail_jump", "type": "script"}},
    Opcode.COLLECT_ENEMIES: {"name": "COLLECT_ENEMIES", "a": {"label": "jump", "type": "script"}},
    Opcode.SHAKE_SCREEN: {"name": "SHAKE_SCREEN", "a": {"label": "count", "type": "number"}, "b": {"label": "magnitude", "type": "number"}},
    Opcode.SET_ANIMATION: {"name": "SET_ANIMATION", "a": {"label": "rng_idx", "type": "number"}},
    Opcode.PLAY_ANIMATION: {"name": "PLAY_ANIMATION", "a": {"label": "start", "type": "number"}, "b": {"label": "end", "type": "number"}, "c": {"label": "speed", "type": "number"}},
    Opcode.TELEPORT_OUT: {"name": "TELEPORT_OUT", "a": {"label": "failure_jump", "type": "script"}},
    Opcode.DRAIN_ENEMY_HP: {"name": "DRAIN_ENEMY_HP", "a": {"label": "amount", "type": "number"}},
    Opcode.FLEE_BATTLE: {"name": "FLEE_BATTLE", "a": {"label": "fail_jump", "type": "script"}},
    Opcode.TEXT_CENTER_NARRATOR: {"name": "TEXT_CENTER_NARRATOR", "a": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_UPPER_DIALOGUE: {"name": "TEXT_UPPER_DIALOGUE", "a": {"label": "portrait", "type": "portrait"}, "b": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_LOWER_DIALOGUE: {"name": "TEXT_LOWER_DIALOGUE", "a": {"label": "portrait", "type": "portrait"}, "b": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_CENTER_WINDOW: {"name": "TEXT_CENTER_WINDOW", "a": {"label": "color", "type": "number"}},
    Opcode.SHIP_TO_TILE_SLOW: {"name": "SHIP_TO_TILE_SLOW", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.SET_TRIGGER_MODE: {"name": "SET_TRIGGER_MODE", "a": {"label": "event", "type": "event"}, "b": {"label": "mode", "type": "number"}},
    Opcode.MAGIC_INVALID: {"name": "MAGIC_INVALID", "a": {"label": "magic", "type": "magic"}, "b": {"label": "target", "type": "number"}, "c": {"label": "player", "type": "number"}},
    Opcode.PARTY_USE_MAGIC: {"name": "PARTY_USE_MAGIC", "a": {"label": "magic", "type": "magic"}, "b": {"label": "target", "type": "number"}, "c": {"label": "player", "type": "number"}},
    Opcode.PLAY_MUSIC: {"name": "PLAY_MUSIC", "a": {"label": "music", "type": "music"}, "b": {"label": "loop", "type": "number"}},
    Opcode.SHIP_TO_TILE: {"name": "SHIP_TO_TILE", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.SET_BATTLE_MUSIC: {"name": "SET_BATTLE_MUSIC", "a": {"label": "music", "type": "music"}},
    Opcode.SET_PARTY_POS: {"name": "SET_PARTY_POS", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.PLAY_SOUND: {"name": "PLAY_SOUND", "a": {"label": "sound", "type": "sound"}},
    Opcode.SET_EVENT_STATE: {"name": "SET_EVENT_STATE", "a": {"label": "event", "type": "event"}, "b": {"label": "state", "type": "number"}},
    Opcode.SET_BATTLEFIELD: {"name": "SET_BATTLEFIELD", "a": {"label": "field_id", "type": "number"}},
    Opcode.NULLIFY_EVENT: {"name": "NULLIFY_EVENT"},
    Opcode.CHASE_PLAYER: {"name": "CHASE_PLAYER", "a": {"label": "range", "type": "number"}, "b": {"label": "speed", "type": "number"}, "c": {"label": "search", "type": "boolean"}},
    Opcode.WAIT_KEY: {"name": "WAIT_KEY"},
    Opcode.RELOAD_SAVE: {"name": "RELOAD_SAVE"},
    Opcode.SCREEN_FADE_RED: {"name": "SCREEN_FADE_RED"},
    Opcode.FADE_OUT: {"name": "FADE_OUT", "a": {"label": "fast", "type": "boolean"}},
    Opcode.FADE_IN: {"name": "FADE_IN", "a": {"label": "fast", "type": "boolean"}},
    Opcode.VANISH: {"name": "VANISH", "a": {"label": "frames", "type": "number"}},
    Opcode.USE_DAY_PALETTE: {"name": "USE_DAY_PALETTE"},
    Opcode.USE_NIGHT_PALETTE: {"name": "USE_NIGHT_PALETTE"},
    Opcode.LEARN_MAGIC: {"name": "LEARN_MAGIC", "a": {"label": "magic", "type": "magic"}, "b": {"label": "player", "type": "number"}},
    Opcode.FORGET_MAGIC: {"name": "FORGET_MAGIC", "a": {"label": "magic", "type": "magic"}, "b": {"label": "player", "type": "number"}},
    Opcode.MP_TO_DAMAGE: {"name": "MP_TO_DAMAGE", "a": {"label": "magic", "type": "magic"}, "b": {"label": "multiplier", "type": "number"}},
    Opcode.BRANCH_ITEM: {"name": "BRANCH_ITEM", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "number"}, "c": {"label": "fail_jump", "type": "script"}},
    Opcode.CHANGE_SCENE: {"name": "CHANGE_SCENE", "a": {"label": "scene", "type": "scene"}},
    Opcode.HALVE_PARTY_HP: {"name": "HALVE_PARTY_HP"},
    Opcode.HALVE_ENEMY_HP: {"name": "HALVE_ENEMY_HP", "a": {"label": "limit", "type": "number"}},
    Opcode.PARTY_INVIS: {"name": "PARTY_INVIS", "a": {"label": "turns", "type": "number"}},
    Opcode.BRANCH_PARTY_POISON: {"name": "BRANCH_PARTY_POISON", "a": {"label": "poison", "type": "item"}, "b": {"label": "fail_jump", "type": "script"}},
    Opcode.BRANCH_ENEMY_POISON: {"name": "BRANCH_ENEMY_POISON", "a": {"label": "poison", "type": "item"}, "b": {"label": "fail_jump", "type": "script"}},
    Opcode.PARTY_DIE: {"name": "PARTY_DIE"},
    Opcode.ENEMY_DIE: {"name": "ENEMY_DIE"},
    Opcode.BRANCH_PARTY_POISONED: {"name": "BRANCH_PARTY_POISONED", "a": {"label": "fail_jump", "type": "script"}},
    Opcode.STOP_CHASE: {"name": "STOP_CHASE", "a": {"label": "duration", "type": "number"}},
    Opcode.DOUBLE_CHASE: {"name": "DOUBLE_CHASE", "a": {"label": "duration", "type": "number"}},
    Opcode.CHECK_ENEMY_HP: {"name": "CHECK_ENEMY_HP", "a": {"label": "threshold", "type": "number"}, "b": {"label": "jump", "type": "script"}},
    Opcode.SET_PARTY_IMAGE: {"name": "SET_PARTY_IMAGE", "a": {"label": "player", "type": "number"}, "b": {"label": "img", "type": "worldSprite"}, "c": {"label": "now", "type": "boolean"}},
    Opcode.THROW_WEAPON: {"name": "THROW_WEAPON", "a": {"label": "magic", "type": "magic"}, "b": {"label": "damage", "type": "number"}},
    Opcode.SET_ENEMY_MAGIC: {"name": "SET_ENEMY_MAGIC", "a": {"label": "magic", "type": "magic"}, "b": {"label": "freq", "type": "number"}},
    Opcode.BRANCH_TARGET_PARTY: {"name": "BRANCH_TARGET_PARTY", "a": {"label": "jump", "type": "script"}},
    Opcode.ENEMY_FLEE: {"name": "ENEMY_FLEE", "a": {"label": "success_100", "type": "boolean"}},
    Opcode.STEAL: {"name": "STEAL", "a": {"label": "rate", "type": "number"}},
    Opcode.BLOW_AWAY_ENEMY: {"name": "BLOW_AWAY_ENEMY", "a": {"label": "qty", "type": "number"}},
    Opcode.MOVE_EVENT_REL_MULTI: {"name": "MOVE_EVENT_REL_MULTI", "a": {"label": "event", "type": "event"}, "b": {"label": "dx", "type": "signed"}, "c": {"label": "dy", "type": "signed"}},
    Opcode.SET_SCENE_SCRIPT: {"name": "SET_SCENE_SCRIPT", "a": {"label": "scene", "type": "scene"}, "b": {"label": "enter", "type": "script"}, "c": {"label": "exit", "type": "script"}},
    Opcode.MOVE_PLAYER_MULTI: {"name": "MOVE_PLAYER_MULTI", "a": {"label": "dx", "type": "signed"}, "b": {"label": "dy", "type": "signed"}, "c": {"label": "layer", "type": "number"}},
    Opcode.SYNC_EVENT_STATE: {"name": "SYNC_EVENT_STATE", "a": {"label": "event", "type": "event"}, "b": {"label": "state", "type": "number"}},
    Opcode.PLAYER_WALK_TO: {"name": "PLAYER_WALK_TO", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.SCREEN_JIGGLE: {"name": "SCREEN_JIGGLE", "a": {"label": "layer", "type": "number"}, "b": {"label": "step", "type": "number"}},
    Opcode.SET_EVENT_MGO: {"name": "SET_EVENT_MGO", "a": {"label": "event", "type": "event"}, "b": {"label": "mgo", "type": "number"}, "c": {"label": "rebuild", "type": "boolean"}},
    Opcode.GOLD_FADE: {"name": "GOLD_FADE", "a": {"label": "step", "type": "number"}},
    Opcode.BRANCH_PARTY_INJURED: {"name": "BRANCH_PARTY_INJURED", "a": {"label": "jump", "type": "script"}},
    Opcode.ADJUST_PARTY: {"name": "ADJUST_PARTY", "a": {"label": "p1", "type": "number"}, "b": {"label": "p2", "type": "number"}, "c": {"label": "p3", "type": "number"}},
    Opcode.SHOW_IMAGE: {"name": "SHOW_IMAGE", "a": {"label": "field", "type": "number"}, "b": {"label": "delay", "type": "number"}},
    Opcode.STOP_MUSIC: {"name": "STOP_MUSIC", "a": {"label": "fade", "type": "number"}},
    Opcode.RETURN_TO_MAP: {"name": "RETURN_TO_MAP"},
    Opcode.BRANCH_PARTY_HAS: {"name": "BRANCH_PARTY_HAS", "a": {"label": "player", "type": "word"}, "b": {"label": "jump", "type": "script"}},
    Opcode.PLAYER_WALK_FAST: {"name": "PLAYER_WALK_FAST", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.PLAYER_WALK_RUN: {"name": "PLAYER_WALK_RUN", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.OBJ_WALK_FAST: {"name": "OBJ_WALK_FAST", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.MOVE_EVENT_REL_2: {"name": "MOVE_EVENT_REL_2", "a": {"label": "event", "type": "event"}, "b": {"label": "dx", "type": "signed"}, "c": {"label": "dy", "type": "signed"}},
    Opcode.SET_EVENT_LAYER: {"name": "SET_EVENT_LAYER", "a": {"label": "event", "type": "event"}, "b": {"label": "layer", "type": "number"}},
    Opcode.MOVE_VIEW: {"name": "MOVE_VIEW", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "count", "type": "number"}},
    Opcode.TOGGLE_PALETTE_MODE: {"name": "TOGGLE_PALETTE_MODE", "a": {"label": "skip_update", "type": "boolean"}},
    Opcode.BRANCH_OBJ_VIEW: {"name": "BRANCH_OBJ_VIEW", "a": {"label": "event", "type": "event"}, "c": {"label": "jump", "type": "script"}},
    Opcode.OBJ_RUN_TO: {"name": "OBJ_RUN_TO", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.BRANCH_OBJ_DIST: {"name": "BRANCH_OBJ_DIST", "a": {"label": "event", "type": "event"}, "b": {"label": "dist", "type": "number"}, "c": {"label": "jump", "type": "script"}},
    Opcode.PLACE_EVENT: {"name": "PLACE_EVENT", "a": {"label": "event", "type": "event"}, "b": {"label": "mode", "type": "number"}, "c": {"label": "fail_jump", "type": "script"}},
    Opcode.WAIT: {"name": "WAIT", "a": {"label": "delay", "type": "number"}},
    Opcode.BRANCH_EQUIP_QTY: {"name": "BRANCH_EQUIP_QTY", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "number"}, "c": {"label": "jump", "type": "script"}},
    Opcode.OBJ_IDLE_WALK: {"name": "OBJ_IDLE_WALK"},
    Opcode.CASH_TO_DAMAGE: {"name": "CASH_TO_DAMAGE", "a": {"label": "magic", "type": "magic"}},
    Opcode.END_BATTLE: {"name": "END_BATTLE", "a": {"label": "result", "type": "number"}},
    Opcode.AUTO_BATTLE: {"name": "AUTO_BATTLE"},
    Opcode.SET_PALETTE_INDEX: {"name": "SET_PALETTE_INDEX", "a": {"label": "index", "type": "number"}},
    Opcode.COLOR_FADE: {"name": "COLOR_FADE", "a": {"label": "color", "type": "number"}, "b": {"label": "delay", "type": "number"}, "c": {"label": "from", "type": "boolean"}},
    Opcode.LEVEL_UP: {"name": "LEVEL_UP", "a": {"label": "amount", "type": "number"}},
    Opcode.CLEAR_TEXT: {"name": "CLEAR_TEXT"},
    Opcode.HALVE_CASH: {"name": "HALVE_CASH"},
    Opcode.SET_ENEMY_SCRIPT: {"name": "SET_ENEMY_SCRIPT", "a": {"label": "event", "type": "event"}, "b": {"label": "script", "type": "script"}, "c": {"label": "type", "type": "number"}},
    Opcode.BRANCH_SOLO_ENEMY: {"name": "BRANCH_SOLO_ENEMY", "a": {"label": "jump", "type": "script"}},
    Opcode.AWAKEN_POSE: {"name": "AWAKEN_POSE", "a": {"label": "player", "type": "number"}},
    Opcode.FADE_IN_OUT: {"name": "FADE_IN_OUT", "a": {"label": "speed", "type": "signed"}},
    Opcode.BRANCH_EVENT_STATE: {"name": "BRANCH_EVENT_STATE", "a": {"label": "event", "type": "event"}, "b": {"label": "state", "type": "number"}, "c": {"label": "jump", "type": "script"}},
    Opcode.BRANCH_IN_SCENE: {"name": "BRANCH_IN_SCENE", "a": {"label": "scene", "type": "scene"}, "b": {"label": "jump", "type": "script"}},
    Opcode.LINGER_FLY: {"name": "LINGER_FLY"},
    Opcode.SHIP_TO_TILE_FAST: {"name": "SHIP_TO_TILE_FAST", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.FOLLOW_EVENT: {"name": "FOLLOW_EVENT", "a": {"label": "p1", "type": "number"}, "b": {"label": "p2", "type": "number"}, "c": {"label": "p3", "type": "number"}},
    Opcode.SET_SCENE_MAP: {"name": "SET_SCENE_MAP", "a": {"label": "scene", "type": "scene"}, "b": {"label": "map", "type": "number"}},
    Opcode.SET_EVENT_SEQ: {"name": "SET_EVENT_SEQ", "a": {"label": "front", "type": "number"}, "b": {"label": "back", "type": "number"}, "c": {"label": "state", "type": "number"}},
    Opcode.FADE_TO_SCENE: {"name": "FADE_TO_SCENE", "a": {"label": "mode", "type": "number"}, "b": {"label": "field", "type": "number"}},
    Opcode.ENEMY_DIVISION: {"name": "ENEMY_DIVISION", "a": {"label": "count", "type": "number"}, "b": {"label": "jump", "type": "script"}},
    Opcode.BRANCH_REVIVE_FAIL: {"name": "BRANCH_REVIVE_FAIL", "a": {"label": "solo", "type": "boolean"}, "b": {"label": "jump", "type": "script"}},
    Opcode.ENEMY_SUMMON: {"name": "ENEMY_SUMMON", "a": {"label": "object", "type": "item"}, "b": {"label": "qty", "type": "number"}, "c": {"label": "fail_jump", "type": "script"}},
    Opcode.ENEMY_TRANSFORM: {"name": "ENEMY_TRANSFORM", "a": {"label": "target", "type": "number"}},
    Opcode.EXIT_GAME: {"name": "EXIT_GAME"},
    Opcode.UPDATE_PLAYER: {"name": "UPDATE_PLAYER"},
    Opcode.RANDOM_MULTI_JUMP: {"name": "RANDOM_MULTI_JUMP", "a": {"label": "branches", "type": "number"}},
    Opcode.PLAY_CD_TRACK: {"name": "PLAY_CD_TRACK", "a": {"label": "track", "type": "number"}, "b": {"label": "music", "type": "music"}},
    Opcode.SCROLL_IMAGE: {"name": "SCROLL_IMAGE", "a": {"label": "field", "type": "number"}, "c": {"label": "speed", "type": "number"}},
    Opcode.FADE_IMAGE: {"name": "FADE_IMAGE", "a": {"label": "field", "type": "number"}, "b": {"label": "event", "type": "event"}, "c": {"label": "speed", "type": "number"}},
    Opcode.SET_BG_CURRENT: {"name": "SET_BG_CURRENT"},
    Opcode.ITEM_DESC: {"name": "ITEM_DESC"},
    Opcode.SHOW_DIALOGUE: {"name": "SHOW_DIALOGUE", "a": {"label": "index", "type": "dialogue"}},
}


def to_signed16(val: int) -> int:
    return val if val < 0x8000 else val - 0x10000


def opcode_name(op: int) -> str:
    return OPCODE_DEFINITIONS.get(op, {}).get("name", "")


def text_payload(op: int, a: int, msgs: list[str] | None) -> str | None:
    if msgs is None or op != 0xFFFF:
        return None
    if 0 <= a < len(msgs):
        return msgs[a]
    return None


def read_mkf(path: Path) -> tuple[list[bytes], bytes, list[int]]:
    """Return (subs, full_buffer, offsets_list).
    subs: list of bytes for each subfile
    full_buffer: raw bytes of file
    offsets_list: list of u32 offsets read from header
    """
    buf = path.read_bytes()
    if len(buf) < 4:
        raise SystemExit("SSS.MKF too small")
    first = struct.unpack_from("<I", buf, 0)[0]
    n = first // 4
    # be robust if file smaller
    max_offs = min(n, (len(buf) // 4) - 1)
    offs = list(struct.unpack_from(f"<{max_offs}I", buf, 0))
    subs: list[bytes] = []
    for i, o in enumerate(offs):
        end = offs[i + 1] if i + 1 < len(offs) else len(buf)
        subs.append(buf[o:end])
    return subs, buf, offs


def load_messages(sss_subs: list[bytes], msg_path: Path) -> list[str]:
    s3 = sss_subs[3]
    msg_buf = msg_path.read_bytes()
    n = len(s3) // 4
    offs = struct.unpack(f"<{n}I", s3)
    msgs: list[str] = []
    for i in range(n):
        start = offs[i]
        end = offs[i + 1] if i + 1 < n else len(msg_buf)
        msgs.append(msg_buf[start:end].decode("big5", errors="replace"))
    return msgs


def load_words(path: Path) -> list[str]:
    """Load fixed-length 10-byte strings from WORD.DAT."""
    if not path.exists():
        return []
    buf = path.read_bytes()
    n = len(buf) // 10
    words: list[str] = []
    for i in range(n):
        segment = buf[i * 10 : (i + 1) * 10]
        # Decode and strip nulls/whitespace
        text = segment.decode("big5", errors="replace").split("\x00")[0].strip()
        words.append(text)
    return words


def format_param(label: str, ptype: str, val: int, msgs: list[str] | None) -> str:
    if ptype == "dialogue":
        if msgs and 0 <= val < len(msgs):
            text = msgs[val].replace("\n", "\\n")
            return f"'{text}'"
        return f"'<msg {val}>'"
    if ptype == "script":
        return f"{label}=0x{val:04X}"
    if ptype == "signed":
        return f"{label}={to_signed16(val)}"
    if ptype == "boolean":
        return f"{label}={bool(val)}"
    # Semantic labels even if we can't resolve names yet
    if ptype in ("item", "magic", "word", "scene", "sound", "music", "battleGroup", "status", "attr", "player", "pos", "shop"):
        return f"{label}={val}"
    return f"{label}={val}"


def fmt_op(
    idx: int,
    op: int,
    a: int,
    b: int,
    c: int,
    msgs: list[str] | None,
    words: list[str] | None,
) -> str:
    name = opcode_name(op)
    head = (
        f"  [{idx:5d} | 0x{idx:04X}]  op=0x{op:04X} {name:<20s}"
        f" a=0x{a:04X} b=0x{b:04X} c=0x{c:04X}"
    )
    text = text_payload(op, a, msgs)
    if text is not None:
        return f"{head}  TEXT: {text!r}"

    d = OPCODE_DEFINITIONS.get(op)
    name_hint = None
    if d and words:
        for key, val in [("a", a), ("b", b), ("c", c)]:
            p = d.get(key)
            if p and p["type"] in ("item", "magic", "word"):
                if 0 <= val < len(words):
                    name_hint = words[val]
                    break

    if d:
        hints = []
        for key, val in [("a", a), ("b", b), ("c", c)]:
            p = d.get(key)
            if p:
                if p["type"] == "item": hints.append(f"item {val}")
                elif p["type"] == "magic": hints.append(f"magic {val}")
                elif p["type"] == "signed": hints.append(f"{p['label']} {to_signed16(val)}")
                elif p["type"] == "scene": hints.append(f"scene {val}")
                elif p["type"] == "battleGroup": hints.append(f"group {val}")
                elif p["type"] == "status": hints.append(f"status {val}")
                elif p["type"] == "attr": hints.append(f"attr {val}")
                elif p["type"] == "player": hints.append(f"player {val}")
                elif p["type"] == "shop": hints.append(f"shop {val}")
                elif p["type"] == "script": hints.append(f"jump 0x{val:04X}")
        
        res = head
        if name_hint:
            res += f"  NAME: {name_hint!r}"
        if hints:
            res += f"  → {' '.join(hints)}"
        return res
    return head


def fmt_op_simple(op: int, a: int, b: int, c: int, msgs: list[str] | None) -> str | None:
    d = OPCODE_DEFINITIONS.get(op)
    if not d:
        return f"  op=0x{op:04X} a=0x{a:04X} b=0x{b:04X} c=0x{c:04X}"

    if op == 0x0000:  # STOP_EXECUTION
        return None

    name = d["name"]
    parts = []
    for key, val in [("a", a), ("b", b), ("c", c)]:
        p = d.get(key)
        if p:
            if op == 0x000F and val == 0xFFFF:
                continue
            parts.append(format_param(p["label"], p["type"], val, msgs))

    return f"  {name:<18s} {' '.join(parts)}".strip()


def disasm(
    scripts: bytes,
    idx: int,
    limit: int = 64,
    stop_on_end: bool = True,
    msgs: list[str] | None = None,
    words: list[str] | None = None,
    simple: bool = False,
) -> None:
    total = len(scripts) // 8
    if idx < 0 or idx >= total:
        raise SystemExit(f"index out of range: 0x{idx:X} (max 0x{total:X})")
    print(f"--- script @ 0x{idx:04X} ({idx}) ---")
    for k in range(limit):
        i = idx + k
        if i >= total:
            break
        op, a, b, c = struct.unpack_from("<4H", scripts, i * 8)
        if simple:
            line = fmt_op_simple(op, a, b, c, msgs)
            if line is not None:
                print(line)
        else:
            print(fmt_op(i, op, a, b, c, msgs, words))
        if stop_on_end and op in (Opcode.STOP_EXECUTION, Opcode.STOP_AND_CHANGE, Opcode.JUMP):
            break


def count_opcode(
    scripts: bytes, target: int, show: int, msgs: list[str] | None, words: list[str] | None
) -> None:
    total = len(scripts) // 8
    hits: list[int] = []
    for i in range(total):
        op = struct.unpack_from("<H", scripts, i * 8)[0]
        if op == target:
            hits.append(i)
    print(f"op 0x{target:04X} appears {len(hits)} times")
    for idx in hits[:show]:
        op, a, b, c = struct.unpack_from("<4H", scripts, idx * 8)
        print(fmt_op(idx, op, a, b, c, msgs, words))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sss", type=Path, default=DEFAULT_SSS)
    ap.add_argument("--msg", type=Path, default=DEFAULT_MSG)
    ap.add_argument("--word", type=Path, default=DEFAULT_WORD)
    ap.add_argument("--info", action="store_true")
    ap.add_argument("--disasm", type=lambda x: int(x, 0))
    ap.add_argument("--limit", type=int, default=64)
    ap.add_argument("--no-stop", action="store_true")
    ap.add_argument("--count", type=lambda x: int(x, 0))
    ap.add_argument("--show", type=int, default=0)
    ap.add_argument("--msg-index", type=lambda x: int(x, 0),
                    help="print M.MSG record by index")
    ap.add_argument("--no-text", action="store_true",
                    help="disable SHOW_TEXT annotations")
    ap.add_argument("--simple", action="store_true",
                    help="compact output: opcode + meaningful params only, "
                         "no hex/unused args, trailing END omitted")
    ap.add_argument("--set", nargs=5, metavar=("IDX","OP","A","B","C"),
                    help="overwrite script entry at index IDX inside sub[4] (scripts)",
                    type=lambda x: int(x,0))
    args = ap.parse_args()

    subs, buf, offs = read_mkf(args.sss)
    msgs = None if args.no_text else load_messages(subs, args.msg)
    words = None if args.no_text else load_words(args.word)

    if args.info:
        for i, s in enumerate(subs):
            print(f"sub[{i}]  size={len(s):7d}  0x{len(s):06X}")
        if msgs is not None:
            print(f"M.MSG   records={len(msgs)}  total={sum(len(m.encode('big5','replace')) for m in msgs)}")
        if words is not None:
            print(f"WORD.DAT records={len(words)}")
        return

    scripts = subs[4]

    # handle write/patch first
    if args.set is not None:
        idx, op, a, b, c = args.set
        # compute scripts area info using offsets
        if len(offs) <= 4:
            raise SystemExit("SSS.MKF does not contain sub[4]")
        scripts_off = offs[4]
        # determine scripts end: next offset > scripts_off or EOF
        scripts_end = None
        for o in offs:
            if o > scripts_off:
                scripts_end = o
                break
        if scripts_end is None:
            scripts_end = len(buf)
        scripts_len = scripts_end - scripts_off
        total = scripts_len // 8
        if idx < 0 or idx >= total:
            raise SystemExit(f"script index out of range: {idx} (0..{total-1})")
        pos = scripts_off + idx * 8
        new_bytes = struct.pack('<4H', op, a, b, c)
        # backup
        bak = args.sss.with_suffix(args.sss.suffix + '.bak')
        try:
            shutil.copyfile(args.sss, bak)
            print(f"backup created: {bak}")
        except Exception as e:
            raise SystemExit(f"failed creating backup: {e}")
        # write
        b2 = bytearray(buf)
        b2[pos:pos+8] = new_bytes
        args.sss.write_bytes(bytes(b2))
        print(f"wrote sub[4] idx={idx} at file offset 0x{pos:06X}: op=0x{op:04X} a=0x{a:04X} b=0x{b:04X} c=0x{c:04X}")
        return

    if args.msg_index is not None:
        if msgs is None:
            raise SystemExit("messages disabled; drop --no-text")
        i = args.msg_index
        if 0 <= i < len(msgs):
            print(f"msg[{i}]: {msgs[i]!r}")
        else:
            raise SystemExit(f"message index out of range: {i} (max {len(msgs)-1})")
        return

    if args.disasm is not None:
        disasm(scripts, args.disasm, limit=args.limit,
               stop_on_end=not args.no_stop, msgs=msgs, words=words, simple=args.simple)
        return

    if args.count is not None:
        count_opcode(scripts, args.count, show=args.show, msgs=msgs, words=words)
        return

    ap.print_help()


if __name__ == "__main__":
    main()
