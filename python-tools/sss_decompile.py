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
    SET_EVENT_ANIM = 0x0016
    SET_TRIGGER_SCRIPT = 0x0025
    SET_PLAYER_IMAGE = 0x0031
    TELEPORT_OUT = 0x0038
    TEXT_CENTER_NARRATOR = 0x003B
    TEXT_UPPER_DIALOGUE = 0x003C
    TEXT_LOWER_DIALOGUE = 0x003D
    TEXT_CENTER_WINDOW = 0x003E
    SET_TRIGGER_MODE = 0x0040
    PLAY_MUSIC = 0x0043
    SET_PARTY_POS = 0x0046
    PLAY_SOUND = 0x0047
    SET_EVENT_STATE = 0x0049
    ADD_CASH = 0x001E
    ADD_ITEM = 0x001F
    REMOVE_ITEM = 0x0020
    SCREEN_FADE_RED = 0x004F
    FADE_OUT = 0x0050
    FADE_IN = 0x0051
    VANISH = 0x0052
    USE_DAY_PALETTE = 0x0053
    USE_NIGHT_PALETTE = 0x0054
    LEARN_MAGIC = 0x0055
    CHANGE_SCENE = 0x0059
    MOVE_EVENT_REL_MULTI = 0x006C
    TOGGLE_PALETTE_MODE = 0x0080
    WAIT = 0x0085
    OBJ_IDLE_WALK = 0x0087
    SET_PALETTE_INDEX = 0x008B
    COLOR_FADE = 0x008C
    CLEAR_TEXT = 0x008E
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
    Opcode.SET_DIRECTION: {"name": "SET_DIRECTION", "a": {"label": "dir", "type": "number"}, "b": {"label": "frame", "type": "worldFrame"}},
    Opcode.WALK_TO_TILE: {"name": "WALK_TO_TILE", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.WALK_TO_TILE_SLOW: {"name": "WALK_TO_TILE_SLOW", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.MOVE_EVENT_REL: {"name": "MOVE_EVENT_REL", "a": {"label": "event", "type": "event"}, "b": {"label": "dx", "type": "number"}, "c": {"label": "dy", "type": "number"}},
    Opcode.SET_EVENT_POS: {"name": "SET_EVENT_POS", "a": {"label": "event", "type": "event"}, "b": {"label": "x", "type": "number"}, "c": {"label": "y", "type": "number"}},
    Opcode.SET_EVENT_IMAGE: {"name": "SET_EVENT_IMAGE", "a": {"label": "frame", "type": "worldFrame"}},
    Opcode.SET_EVENT_ANIM: {"name": "SET_EVENT_ANIM", "a": {"label": "event", "type": "event"}, "b": {"label": "direction", "type": "number"}, "c": {"label": "frame", "type": "worldFrame"}},
    Opcode.SET_TRIGGER_SCRIPT: {"name": "SET_TRIGGER_SCRIPT", "a": {"label": "event", "type": "event"}, "b": {"label": "script", "type": "script"}},
    Opcode.SET_PLAYER_IMAGE: {"name": "SET_PLAYER_IMAGE", "a": {"label": "img", "type": "battleSprite"}},
    Opcode.TELEPORT_OUT: {"name": "TELEPORT_OUT", "a": {"label": "failure_jump", "type": "script"}},
    Opcode.TEXT_CENTER_NARRATOR: {"name": "TEXT_CENTER_NARRATOR", "a": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_UPPER_DIALOGUE: {"name": "TEXT_UPPER_DIALOGUE", "a": {"label": "portrait", "type": "portrait"}, "b": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_LOWER_DIALOGUE: {"name": "TEXT_LOWER_DIALOGUE", "a": {"label": "portrait", "type": "portrait"}, "b": {"label": "color", "type": "number"}, "c": {"label": "anim", "type": "boolean"}},
    Opcode.TEXT_CENTER_WINDOW: {"name": "TEXT_CENTER_WINDOW", "a": {"label": "color", "type": "number"}},
    Opcode.SET_TRIGGER_MODE: {"name": "SET_TRIGGER_MODE", "a": {"label": "event", "type": "event"}, "b": {"label": "mode", "type": "number"}},
    Opcode.PLAY_MUSIC: {"name": "PLAY_MUSIC", "a": {"label": "music", "type": "music"}, "b": {"label": "loop", "type": "number"}},
    Opcode.SET_PARTY_POS: {"name": "SET_PARTY_POS", "a": {"label": "x", "type": "number"}, "b": {"label": "y", "type": "number"}, "c": {"label": "half", "type": "boolean"}},
    Opcode.PLAY_SOUND: {"name": "PLAY_SOUND", "a": {"label": "sound", "type": "sound"}},
    Opcode.SET_EVENT_STATE: {"name": "SET_EVENT_STATE", "a": {"label": "event", "type": "event"}, "b": {"label": "state", "type": "number"}},
    Opcode.ADD_CASH: {"name": "ADD_CASH", "a": {"label": "amount", "type": "signed"}, "b": {"label": "failure_jump", "type": "script"}},
    Opcode.ADD_ITEM: {"name": "ADD_ITEM", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "signed"}},
    Opcode.REMOVE_ITEM: {"name": "REMOVE_ITEM", "a": {"label": "item", "type": "item"}, "b": {"label": "qty", "type": "signed"}, "c": {"label": "failure_jump", "type": "script"}},
    Opcode.SCREEN_FADE_RED: {"name": "SCREEN_FADE_RED"},
    Opcode.FADE_OUT: {"name": "FADE_OUT", "a": {"label": "fast", "type": "boolean"}},
    Opcode.FADE_IN: {"name": "FADE_IN", "a": {"label": "fast", "type": "boolean"}},
    Opcode.VANISH: {"name": "VANISH", "a": {"label": "frames", "type": "number"}},
    Opcode.USE_DAY_PALETTE: {"name": "USE_DAY_PALETTE"},
    Opcode.USE_NIGHT_PALETTE: {"name": "USE_NIGHT_PALETTE"},
    Opcode.LEARN_MAGIC: {"name": "LEARN_MAGIC", "a": {"label": "magic", "type": "magic"}, "b": {"label": "player", "type": "number"}},
    Opcode.CHANGE_SCENE: {"name": "CHANGE_SCENE", "a": {"label": "scene", "type": "scene"}},
    Opcode.MOVE_EVENT_REL_MULTI: {"name": "MOVE_EVENT_REL_MULTI", "a": {"label": "event", "type": "event"}, "b": {"label": "dx", "type": "signed"}, "c": {"label": "dy", "type": "signed"}},
    Opcode.TOGGLE_PALETTE_MODE: {"name": "TOGGLE_PALETTE_MODE", "a": {"label": "skip_update", "type": "boolean"}},
    Opcode.WAIT: {"name": "WAIT", "a": {"label": "delay", "type": "number"}},
    Opcode.OBJ_IDLE_WALK: {"name": "OBJ_IDLE_WALK"},
    Opcode.SET_PALETTE_INDEX: {"name": "SET_PALETTE_INDEX", "a": {"label": "index", "type": "number"}},
    Opcode.COLOR_FADE: {"name": "COLOR_FADE", "a": {"label": "color", "type": "number"}, "b": {"label": "delay", "type": "number"}, "c": {"label": "from", "type": "boolean"}},
    Opcode.CLEAR_TEXT: {"name": "CLEAR_TEXT"},
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
    return f"{label}={val}"


def fmt_op(idx: int, op: int, a: int, b: int, c: int, msgs: list[str] | None) -> str:
    name = opcode_name(op)
    head = (
        f"  [{idx:5d} | 0x{idx:04X}]  op=0x{op:04X} {name:<20s}"
        f" a=0x{a:04X} b=0x{b:04X} c=0x{c:04X}"
    )
    text = text_payload(op, a, msgs)
    if text is not None:
        return f"{head}  TEXT: {text!r}"

    d = OPCODE_DEFINITIONS.get(op)
    if d:
        hints = []
        for key, val in [("a", a), ("b", b), ("c", c)]:
            p = d.get(key)
            if p:
                if p["type"] == "item": hints.append(f"item {val}")
                elif p["type"] == "signed": hints.append(f"{p['label']} {to_signed16(val)}")
                elif p["type"] == "scene": hints.append(f"scene {val}")
                elif p["type"] == "battleGroup": hints.append(f"group {val}")
        if hints:
            return f"{head}  → {' '.join(hints)}"
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
            print(fmt_op(i, op, a, b, c, msgs))
        if stop_on_end and op in (Opcode.STOP_EXECUTION, Opcode.STOP_AND_CHANGE, Opcode.JUMP):
            break


def count_opcode(
    scripts: bytes, target: int, show: int, msgs: list[str] | None
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
        print(fmt_op(idx, op, a, b, c, msgs))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sss", type=Path, default=DEFAULT_SSS)
    ap.add_argument("--msg", type=Path, default=DEFAULT_MSG)
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

    if args.info:
        for i, s in enumerate(subs):
            print(f"sub[{i}]  size={len(s):7d}  0x{len(s):06X}")
        if msgs is not None:
            print(f"M.MSG   records={len(msgs)}  total={sum(len(m.encode('big5','replace')) for m in msgs)}")
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
               stop_on_end=not args.no_stop, msgs=msgs, simple=args.simple)
        return

    if args.count is not None:
        count_opcode(scripts, args.count, show=args.show, msgs=msgs)
        return

    ap.print_help()


if __name__ == "__main__":
    main()
