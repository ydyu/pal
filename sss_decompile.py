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

GAME_DIR = Path("/data/data/com.termux/files/home/dev/palgame")
DEFAULT_SSS = GAME_DIR / "SSS.MKF"
DEFAULT_MSG = GAME_DIR / "M.MSG"

# Opcode table.  Suffixes: no suffix = confirmed, ? = guess/unverified.
OPCODE_NAMES: dict[int, str] = {
    # --- control flow ---
    0x0000: "STOP_EXECUTION",
    0x0001: "STOP_AND_ADVANCE",
    0x0002: "STOP_AND_CHANGE",
    0x0003: "JUMP",
    0x0004: "CALL_SCRIPT",
    0x0006: "RANDOM_JUMP",
    0x0008: "CONTINUE_NEXT",
    0x000A: "CHOICE_DIALOGUE",
    # --- movement / object state ---
    0x000B: "WALK_WEST",
    0x000C: "WALK_NORTH",
    0x000D: "WALK_EAST",
    0x000E: "WALK_SOUTH",
    0x000F: "SET_DIRECTION",
    0x0010: "WALK_TO_TILE",
    0x0011: "WALK_TO_TILE_SLOW",
    0x0013: "SET_EVENT_POS",
    0x0014: "SET_EVENT_IMAGE",
    0x0016: "SET_EVENT_ANIM",
    0x0025: "SET_TRIGGER_SCRIPT",
    0x0031: "SET_PLAYER_IMAGE",
    0x0038: "TELEPORT_OUT",
    0x0040: "SET_TRIGGER_MODE",
    0x0046: "SET_PARTY_POS",
    0x0049: "SET_EVENT_STATE",
    0x0059: "CHANGE_SCENE",
    0x006C: "MOVE_EVENT_REL_MULTI",
    # --- UI / text ---
    0x0005: "CLEAR_SCREEN",
    0x0009: "WAIT_STOP_MOVE",
    0x003B: "TEXT_CENTER_NARRATOR",
    0x003C: "TEXT_UPPER_DIALOGUE",
    0x003D: "TEXT_LOWER_DIALOGUE",
    0x003E: "TEXT_CENTER_WINDOW",
    0x008E: "CLEAR_TEXT",
    0xFFFF: "SHOW_DIALOGUE",
    # --- rewards / effects ---
    0x0007: "START_BATTLE",
    0x001E: "ADD_CASH",
    0x001F: "ADD_ITEM",
    0x0020: "REMOVE_ITEM",
    0x0043: "PLAY_MUSIC",
    0x0047: "PLAY_SOUND",
    0x004F: "SCREEN_FADE_RED",
    0x0050: "FADE_OUT",
    0x0051: "FADE_IN",
    0x0052: "VANISH",
    0x0055: "LEARN_MAGIC",
    0x0085: "WAIT",
}


def opcode_name(op: int) -> str:
    return OPCODE_NAMES.get(op, "")


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


def fmt_op(idx: int, op: int, a: int, b: int, c: int, msgs: list[str] | None) -> str:
    name = opcode_name(op)
    head = (
        f"  [{idx:5d} | 0x{idx:04X}]  op=0x{op:04X} {name:<20s}"
        f" a=0x{a:04X} b=0x{b:04X} c=0x{c:04X}"
    )
    text = text_payload(op, a, msgs)
    if text is not None:
        return f"{head}  TEXT: {text!r}"
    if op == 0x001F:
        return f"{head}  → item {a}"
    if op == 0x001E:
        return f"{head}  → cash +{a}"
    if op == 0x0047:
        return f"{head}  → sound {a}"
    if op == 0x0059:
        return f"{head}  → scene {a}"
    return head


def fmt_op_simple(op: int, a: int, b: int, c: int, msgs: list[str] | None) -> str | None:
    if op == 0x0000:
        return None
    if op == 0x003B:
        return f"  TEXT_CENTER_NARRATOR color={a}"
    if op == 0x003C:
        return f"  TEXT_UPPER_DIALOGUE portrait={a} color={b} anim={bool(c)}"
    if op == 0x003D:
        return f"  TEXT_LOWER_DIALOGUE portrait={a} color={b} anim={bool(c)}"
    if op == 0x003E:
        return f"  TEXT_CENTER_WINDOW color={a}"
    text = text_payload(op, a, msgs)
    if text is not None:
        return f"  {opcode_name(op):<18s} {text!r}"
    if 0x000B <= op <= 0x000E:
        return f"  {opcode_name(op)}"
    if op == 0x0002:
        return f"  STOP_AND_CHANGE next={a} loops={b}"
    if op == 0x0003:
        return f"  JUMP          target={a} loops={b}"
    if op == 0x0004:
        return f"  CALL_SCRIPT   script={a} event={b}"
    if op == 0x0005:
        return f"  CLEAR_SCREEN  mode={a} delay={b}"
    if op == 0x001F:
        return f"  ADD_ITEM      item={a} qty={b or 1}"
    if op == 0x001E:
        return f"  ADD_CASH      +{a}"
    if op == 0x0007:
        return f"  START_BATTLE  group={a} lost_jump=0x{b:04X}"
    if op == 0x0047:
        return f"  PLAY_SOUND    sound={a}"
    if op == 0x0059:
        return f"  CHANGE_SCENE  scene={a}"
    if op == 0x0046:
        return f"  SET_PARTY_POS x={a} y={b} half={bool(c)}"
    if op == 0x0049:
        return f"  SET_EVENT_STATE event={a} state={b}"
    if op == 0x0025:
        return f"  SET_TRIGGER_SCRIPT event={a} script={b}"
    if op == 0x0040:
        return f"  SET_TRIGGER_MODE event={a} mode={b}"
    if op == 0x0038:
        return f"  TELEPORT_OUT  failure_jump={a}"
    if op == 0x000F:
        parts = []
        if a != 0xFFFF:
            parts.append(f"dir={a}")
        if b != 0xFFFF:
            parts.append(f"frame={b}")
        return f"  SET_DIRECTION {' '.join(parts)}".rstrip()
    if op == 0x0010 or op == 0x0011:
        return f"  {opcode_name(op):<18s}x={a} y={b} half={bool(c)}"
    if op == 0x0013:
        return f"  SET_EVENT_POS event={a} x={b} y={c}"
    if op == 0x0014:
        return f"  SET_EVENT_IMAGE img={a}"
    if op == 0x0050:
        return f"  FADE_OUT      fast={bool(a)}"
    if op == 0x0051:
        return f"  FADE_IN       fast={bool(a)}"
    if op == 0x006C:
        return f"  MOVE_EVENT_REL_MULTI event={a} dx={b} dy={c}"
    name = opcode_name(op)
    args = []
    if a: args.append(f"a=0x{a:04X}")
    if b: args.append(f"b=0x{b:04X}")
    if c: args.append(f"c=0x{c:04X}")
    suffix = (" " + " ".join(args)) if args else ""
    if name:
        return f"  {name:<14s}{suffix}"
    return f"  op=0x{op:04X}    {suffix.strip()}"


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
        if stop_on_end and op == 0x0000:
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
