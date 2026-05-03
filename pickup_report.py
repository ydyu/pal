#!/usr/bin/env python3
"""
Report uncollected pickable items in a PAL DOS .RPG save.

Usage:
  python3 pickup_report.py SAVE.RPG              # uncollected items, current scene, with plot
  python3 pickup_report.py SAVE.RPG --all        # include already-picked items
  python3 pickup_report.py SAVE.RPG --map        # all scenes sharing current wMapNum
  python3 pickup_report.py SAVE.RPG --scene 4    # specific scene (1-indexed)
  python3 pickup_report.py SAVE.RPG --script     # also dump each item's script
  python3 pickup_report.py SAVE.RPG --no-plot    # suppress the ASCII map

Monitoring while playing:
  watch -n 30 'cat SAVE.RPG > /tmp/s.rpg && python3 pickup_report.py /tmp/s.rpg'

Model (see research.md; cross-checked against SDLPAL source):
  - save.wNumScene at offset 0x0008 (u16 LE) = current scene, 1-indexed.
  - SSS.MKF sub[1] = 300 × SCENE{wMapNum, wScriptOnEnter, wScriptOnTeleport,
    wEventObjectIndex}. Using 1-based logical slot numbers, scene 1 owns slots
    1..31 and later scenes use the boundaries
    [wEventObjectIndex[K] .. wEventObjectIndex[K+1] - 1].
  - Save rgEventObject[] starts at 0x3260 (stride 0x20, SDLPAL EVENTOBJECT).
    Fields we read (offset relative to our entry base 0x325C, which is 4 B
    before the real struct — historical; kept for byte-for-byte parity with
    earlier notes):
      +0x06 u16 x, +0x08 u16 y          → SDLPAL x, y (world pixels)
      +0x0C u16 wTriggerScript          → script index into SSS.MKF sub[4]
      +0x10 u16 sState                  → 0=Hidden (picked/opened door),
                                          1=Normal, 2=Blocker
      +0x12 u16 wTriggerMode            → 1=SearchNear, 2=SearchNormal,
                                          3=SearchFar, 4..8=Touch*
  - Coord system (map.h PAL_XYH_TO_POS): pixel = (tile_x*32 + h*16,
    tile_y*16 + h*8). h∈{0,1} is the isometric half-row stagger. We display
    tile coords as (tx,ty)h{H} since pixel values obscure adjacency.
  - Pickable-and-still-there iff sState==Normal and wTriggerMode∈Search*
    (SearchNear/Normal/Far = 1/2/3). Walk the script to find op 0x001F
    (ADD_ITEM) or 0x001E (ADD_CASH); the last SHOW_DIALOGUE before the reward op
    is the confirmation message (falls back to last SHOW_DIALOGUE after for quest
    givers where the item precedes the dialogue). A trigger script that is only
    SET_EVENT_STATE (script idx 0x0014) indicates a door rather than a pickup.
  - Exit detection: if a trigger script contains op 0x0059 (CHANGE_SCENE,
    arg0: target_scene), the event is labelled "exit\u2192N" and plotted as '>'.
    Applies to both Search* and Touch* modes; Touch* exits are promoted
    from scenery dots to named events.

"""
from __future__ import annotations

import argparse
import struct
import unicodedata
from pathlib import Path

import sss_decompile as sss

GAME_DIR = Path("/data/data/com.termux/files/home/dev/palgame")
EVTBL_BASE = 0x325C
EVTBL_STRIDE = 0x20
SAVE_SCENE_OFF    = 0x0008
SAVE_VIEWPORT_OFF = 0x0002   # u16 wViewportX, u16 wViewportY
SAVE_PARTY0_OFF   = 0x002C   # PARTY[0]: u16 role, s16 x, s16 y, u16 frame, u16 imgoff

OP_END           = 0x0000
OP_START_BATTLE  = 0x0007
OP_ADD_CASH      = 0x001E
OP_ADD_ITEM      = 0x001F
OP_SHOW_DIALOGUE = 0xFFFF
OP_CHANGE_SCENE  = 0x0059

# SDLPAL OBJECTSTATE / TRIGGERMODE — see sdlpal-src/global.h:75-93.
STATE_HIDDEN = 0
STATE_NORMAL = 1
STATE_AUTO   = 2
STATE_STOP   = 3
TRIGGER_SEARCH_NEAR   = 1
TRIGGER_SEARCH_NORMAL = 2
TRIGGER_SEARCH_FAR    = 3
SEARCH_TRIGGERS = {TRIGGER_SEARCH_NEAR, TRIGGER_SEARCH_NORMAL, TRIGGER_SEARCH_FAR}
TOUCH_TRIGGERS  = {4, 5, 6, 7, 8}  # Touch* — NPCs, cutscenes, quest givers

# Known standalone trigger scripts that aren't pickups.
NAMED_SCRIPTS = {
    0x0014: "door",   # just SET_EVENT_STATE + END — opens the door tile
}

PLOT_WIDTH  = 60
PLOT_HEIGHT = 20

MARKER_UNCOLLECTED = 'o'
MARKER_PICKED      = 'X'
MARKER_CASH        = '$'
MARKER_QUEST       = '&'
MARKER_MONSTER     = 'm'
MARKER_EXIT        = '>'
MARKER_WARP        = '^'
MARKER_EVENT       = 'e'
MARKER_OTHER       = '.'
MARKER_PLAYER      = '@'

# When multiple events land in the same cell, keep the highest-priority marker.
PRIORITY = {MARKER_PLAYER: 5, MARKER_UNCOLLECTED: 4, MARKER_CASH: 3,
            MARKER_QUEST: 3, MARKER_MONSTER: 2.5, MARKER_EXIT: 2,
            MARKER_WARP: 2, MARKER_EVENT: 2, MARKER_PICKED: 1, MARKER_OTHER: 0}


def ljust_cjk(s: str, width: int) -> str:
    """Left-justify s in a field of display-columns `width`, counting CJK as 2."""
    used = sum(2 if unicodedata.east_asian_width(c) in ('W', 'F') else 1 for c in s)
    return s + ' ' * max(0, width - used)


def load_item_names(word_path: Path) -> dict[int, str]:
    try:
        raw = word_path.read_bytes()
        return {i: raw[i*10:(i+1)*10].rstrip(b'\x00').decode('big5', errors='replace').strip()
                for i in range(len(raw) // 10)}
    except Exception:
        return {}


def parse_scenes(scene_buf: bytes) -> list[tuple[int, int, int, int]]:
    """Return list of (wMapNum, wScriptOnEnter, wScriptOnTeleport, wEventObjectIndex)."""
    return [struct.unpack_from("<4H", scene_buf, i * 8)
            for i in range(len(scene_buf) // 8)]


def scene_slot_range(scenes: list, K: int, total_slots: int) -> tuple[int, int]:
    lo = 1 if K == 0 else scenes[K][3]
    hi = scenes[K + 1][3] - 1 if K + 1 < len(scenes) else total_slots
    return lo, hi


def read_entry(save: bytes, slot: int) -> dict:
    off = EVTBL_BASE + (slot - 1) * EVTBL_STRIDE
    x, y         = struct.unpack_from("<2H", save, off + 0x06)
    trig_script  = struct.unpack_from("<H",  save, off + 0x0C)[0]
    state        = struct.unpack_from("<H",  save, off + 0x10)[0]
    trig_mode    = struct.unpack_from("<H",  save, off + 0x12)[0]
    sprite_num   = struct.unpack_from("<H",  save, off + 0x14)[0]
    n_frames     = struct.unpack_from("<H",  save, off + 0x16)[0]
    return {"slot": slot, "off": off, "x": x, "y": y,
            "script": trig_script, "state": state, "mode": trig_mode,
            "sprite": sprite_num, "n_frames": n_frames}


def pixel_to_tile(px: int, py: int) -> tuple[int, int, int]:
    """Invert PAL_XYH_TO_POS(x,y,h) = (x*32+h*16, y*16+h*8). h∈{0,1}."""
    h = 1 if (px % 32) == 16 else 0
    tx = (px - h * 16) // 32
    ty = (py - h * 8) // 16
    return tx, ty, h


def pixel_to_flat(px: int, py: int) -> tuple[int, int]:
    """Isometric pixel → flat grid: east=+x, south=+y, ±1 per half-tile step.
    flat_x = tx+ty+h, flat_y = ty-tx  (h cancels in flat_y)."""
    tx, ty, h = pixel_to_tile(px, py)
    return tx + ty + h, ty - tx


def fmt_tile(px: int, py: int) -> str:
    tx, ty, h = pixel_to_tile(px, py)
    return f"({tx:3d},{ty:3d})h{h}"


def msg_name(msgs: list, msg_idx: int | None) -> str:
    """Decode a message index to a stripped string, or '?' if absent."""
    if msg_idx is not None and 0 <= msg_idx < len(msgs):
        return msgs[msg_idx].strip()
    return "?"


def walk_pickup_script(scripts: bytes, idx: int, max_ops: int = 64):
    """Walk ops starting at idx. Returns (rewards, msg_idx, ops_list).
    rewards is a list of ("item", item_id) / ("cash", signed_amount) tuples.
    msg_idx is the last SHOW_DIALOGUE before the first reward op; falls back to
    the last SHOW_DIALOGUE after if none appeared before."""
    total_ops = len(scripts) // 8
    rewards = []
    last_pre  = None
    last_post = None
    ops = []
    for k in range(max_ops):
        i = idx + k
        if i >= total_ops: break
        op, a, b, c = struct.unpack_from("<4H", scripts, i * 8)
        ops.append((i, op, a, b, c))
        if op == OP_SHOW_DIALOGUE:
            if not rewards:
                last_pre = a
            else:
                last_post = a
        if op == OP_ADD_ITEM:
            rewards.append(("item", a))
        elif op == OP_ADD_CASH:
            rewards.append(("cash", a if a < 0x8000 else a - 0x10000))
        if op == OP_END:
            break
    return rewards, (last_pre if last_pre is not None else last_post), ops


def find_exit_scene(scripts: bytes, idx: int, max_ops: int = 80) -> int | None:
    """Return target scene number if script contains OP_CHANGE_SCENE, else None."""
    total_ops = len(scripts) // 8
    for i in range(idx, min(idx + max_ops, total_ops)):
        op, a = struct.unpack_from("<2H", scripts, i * 8)
        if op == OP_CHANGE_SCENE:
            return a
        if op == OP_END:
            break
    return None


def template_state(template: bytes, slot: int) -> int:
    """Return the template sState for a save slot."""
    return struct.unpack_from("<h", template, slot * EVTBL_STRIDE + 0x0C)[0]


def is_real_picked(e: dict, rewards: list, template: bytes) -> bool:
    """True iff this hidden slot represents a real picked reward in the template."""
    return e["state"] == STATE_HIDDEN and bool(rewards) and template_state(template, e["slot"]) != 0


def classify(e: dict, rewards: list, msg_idx: int | None = None,
             cur_scene: int | None = None) -> str | None:
    """Pick a plot marker for an event, or None to suppress it from the plot."""
    if e["mode"] not in SEARCH_TRIGGERS and e["mode"] not in TOUCH_TRIGGERS:
        return MARKER_OTHER if (e["state"] != STATE_HIDDEN and e["sprite"] > 0) else None
    if e["state"] == STATE_HIDDEN:
        return None

    if rewards:
        kinds = {r[0] for r in rewards}
        # Only consider SEARCH_TRIGGERS items as quest givers when they are sprites
        # on SearchFar (mode == TRIGGER_SEARCH_FAR). SearchNear/SearchNormal with
        # sprite should remain pickable.
        is_sprite_far = (e.get("sprite", 0) > 0 and e.get("mode") == TRIGGER_SEARCH_FAR)
        if "item" in kinds:
            if e["mode"] in SEARCH_TRIGGERS:
                return MARKER_QUEST if is_sprite_far else MARKER_UNCOLLECTED
            return MARKER_QUEST
        if "cash" in kinds:
            if e["mode"] in SEARCH_TRIGGERS:
                return MARKER_QUEST if is_sprite_far else MARKER_CASH
            return MARKER_QUEST

    if e.get("exit_scene") is not None:
        return MARKER_WARP if e["exit_scene"] == cur_scene else MARKER_EXIT

    if msg_idx is not None or e["script"] in NAMED_SCRIPTS:
        return MARKER_EVENT

    # Interactive but no user-facing output: scenery dot if it has a graphic.
    return MARKER_OTHER if e["sprite"] > 0 else None


def fmt_row(e: dict, rewards: list, name: str,
            item_names: dict[int, str] | None = None, cur_scene: int | None = None) -> str:
    if rewards:
        parts = []
        for kind, val in rewards:
            if kind == "item":
                parts.append((item_names or {}).get(val) or f"item {val}")
            else:
                parts.append(f"{val:+d}\u6587")
        label = " ".join(parts)
    else:
        named = NAMED_SCRIPTS.get(e["script"])
        if e.get("exit_scene") is not None:
            if e["exit_scene"] == cur_scene:
                label = "warp"
            else:
                label = f"exit\u2192{e['exit_scene']}"
        elif named:
            label = named
        elif e.get("n_frames", 0) > 0:
            label = "NPC"
        elif e.get("sprite", 0) > 0:
            label = "obj"
        else:
            label = "scene"
    return (f"  slot {e['slot']:4d}  {fmt_tile(e['x'], e['y'])}  "
            f"{ljust_cjk(label, 8)}  script=0x{e['script']:04X}  \"{name}\"")


def build_plot(points: list[tuple[int, int, str]],
               bbox_points: list[tuple[int, int, str]] | None = None) -> list[str]:
    """points: list of (x, y, marker) to draw.
    bbox_points: points used to size the axes; if None, uses `points`.
    Split so the player marker can be drawn without dragging the bbox around
    every time they move (prevents jumpy rescaling on watch loops).
    When the player is outside the bbox, `@` clips to the edge and a ^v<>
    arrow is overlaid on the border so you can tell they're off-map."""
    if not points:
        inner = [' ' * PLOT_WIDTH for _ in range(PLOT_HEIGHT)]
        border = '+' + '-' * PLOT_WIDTH + '+'
        return [border] + ['|' + row + '|' for row in inner] + [border, '  (no events to plot)']

    anchor = bbox_points if bbox_points else points
    flat_anchor = [pixel_to_flat(p[0], p[1]) for p in anchor]
    flat_points = [(pixel_to_flat(x, y), m) for x, y, m in points]
    xs = [p[0] for p in flat_anchor]
    ys = [p[1] for p in flat_anchor]
    x_lo, x_hi = min(xs), max(xs)
    y_lo, y_hi = min(ys), max(ys)
    # Pad the bbox so edge points aren't jammed on the border.
    x_pad = max(1, (x_hi - x_lo) // 20)
    y_pad = max(1, (y_hi - y_lo) // 20)
    x_lo -= x_pad; x_hi += x_pad
    y_lo -= y_pad; y_hi += y_pad

    # Compute raw spans (may be zero) and choose plot dimensions.
    x_span_raw = x_hi - x_lo
    y_span_raw = y_hi - y_lo
    # Shrink the plot to match the range when the range is smaller than the
    # configured plot size so that single-tile movements map to single columns/rows.
    plot_w = min(PLOT_WIDTH, max(1, int(x_span_raw + 1)))
    plot_h = min(PLOT_HEIGHT, max(1, int(y_span_raw + 1)))
    # Denominators for scaling; avoid division-by-zero.
    denom_x = max(1, x_span_raw)
    denom_y = max(1, y_span_raw)

    grid = [[' '] * plot_w for _ in range(plot_h)]
    # Track whether the player clipped off each edge so we can hint direction.
    arrow_top = arrow_bottom = arrow_left = arrow_right = None
    for (x, y), m in flat_points:
        raw_col = int((x - x_lo) * (plot_w  - 1) / denom_x)
        raw_row = int((y - y_lo) * (plot_h - 1) / denom_y)
        col = max(0, min(plot_w  - 1, raw_col))
        row = max(0, min(plot_h - 1, raw_row))
        if m == MARKER_PLAYER:
            if raw_col < 0:               arrow_left   = row
            elif raw_col >= plot_w:      arrow_right  = row
            if raw_row < 0:               arrow_top    = col
            elif raw_row >= plot_h:      arrow_bottom = col
        existing = grid[row][col]
        if existing == ' ' or PRIORITY.get(m, 0) > PRIORITY.get(existing, 0):
            grid[row][col] = m

    top = list('+' + '-' * plot_w + '+')
    bot = list('+' + '-' * plot_w + '+')
    if arrow_top    is not None: top[arrow_top    + 1] = '^'
    if arrow_bottom is not None: bot[arrow_bottom + 1] = 'v'

    lines = [''.join(top)]
    for i, row in enumerate(grid):
        left  = '<' if arrow_left  == i else '|'
        right = '>' if arrow_right == i else '|'
        lines.append(left + ''.join(row) + right)
    lines.append(''.join(bot))
    lines.append(f"  flat x:{x_lo}..{x_hi}   y:{y_lo}..{y_hi}")

    # Legend: only show markers that actually appear on this plot.
    legend_defs = {
        MARKER_PLAYER: 'player',
        MARKER_UNCOLLECTED: 'uncollected',
        MARKER_PICKED: 'picked',
        MARKER_CASH: 'cash',
        MARKER_QUEST: 'quest',
        MARKER_EXIT: 'exit',
        MARKER_WARP: 'warp',
        MARKER_EVENT: 'event',
        MARKER_OTHER: 'scenery',
    }
    legend = '  markers:  '
    legend += '  '.join(f'{m} {legend_defs[m]}' for m in
                        [MARKER_PLAYER, MARKER_UNCOLLECTED, MARKER_PICKED,
                         MARKER_CASH, MARKER_QUEST, MARKER_EXIT, MARKER_WARP, MARKER_EVENT, MARKER_OTHER]
                        if any(c == m for row in grid for c in row))
    if arrow_top or arrow_bottom or arrow_left or arrow_right:
        legend += '  ^v<> off-map'
    lines.append(legend)
    return lines


def player_world_xy(save: bytes) -> tuple[int, int]:
    """Party leader world coord = viewport + party[0] on-screen offset."""
    vx, vy = struct.unpack_from("<2H", save, SAVE_VIEWPORT_OFF)
    _role, px, py = struct.unpack_from("<H2h", save, SAVE_PARTY0_OFF)
    return vx + px, vy + py


def report(save_path: Path, sss_path: Path, msg_path: Path, word_path: Path,
           show_all: bool, scope_map: bool, forced_scene: int | None,
           show_script: bool, show_plot: bool, show_quest: bool, show_raw: bool):
    save = save_path.read_bytes()
    subs = sss.read_mkf(sss_path)
    msgs = sss.load_messages(subs, msg_path)
    item_names = load_item_names(word_path)
    template  = subs[0]
    scene_buf = subs[1]
    scripts   = subs[4]
    scenes = parse_scenes(scene_buf)
    total_slots = (len(save) - EVTBL_BASE) // EVTBL_STRIDE

    cur_scene = forced_scene if forced_scene is not None else \
        struct.unpack_from("<H", save, SAVE_SCENE_OFF)[0]
    K = cur_scene - 1
    cur_map = scenes[K][0]
    
    # Identify the scene-level "edge exit" target.
    edge_exit = find_exit_scene(scripts, scenes[K][2]) if scenes[K][2] else None

    if scope_map:
        target_scenes = [i for i, s in enumerate(scenes) if s[0] == cur_map]
        scope_desc = f"scene {cur_scene} (wMapNum={cur_map}) across {len(target_scenes)} scene(s)"
    else:
        target_scenes = [K]
        scope_desc = f"scene {cur_scene} (wMapNum={cur_map})"
    
    if edge_exit and edge_exit != cur_scene:
        scope_desc += f"  (edge exit\u2192{edge_exit})"

    # Sweep target scenes, collecting events by bucket.
    uncollected = []   # list of (e, reward, name) — search triggers with reward, state=normal
    events      = []   # search triggers with no reward, state=normal (dialogues, inspectables)
    picked      = []   # hidden reward slots with a nonzero template state
    quest       = []   # Touch* slots that give items (only populated with --quest)
    plot_points = []   # (x, y, marker)
    for ks in target_scenes:
        lo, hi = scene_slot_range(scenes, ks, total_slots)
        for slot in range(lo, hi + 1):
            e = read_entry(save, slot)
            if e["x"] == 0 and e["y"] == 0:
                continue  # unused / sentinel slot
            
            # Identify any relevant script attributes.
            rewards, msg_idx, _ops = walk_pickup_script(scripts, e["script"])
            name = msg_name(msgs, msg_idx)
            e["exit_scene"] = find_exit_scene(scripts, e["script"]) if e["script"] else None
            is_door = e["script"] in NAMED_SCRIPTS

            # Plotting. Use classify to decide if/how to show it.
            # Only show picked items if they were originally lootable.
            if e["state"] == STATE_HIDDEN:
                if show_all and is_real_picked(e, rewards, template):
                    plot_points.append((e["x"], e["y"], MARKER_PICKED))
            else:
                marker = classify(e, rewards, msg_idx, ks + 1)
                if marker:
                    plot_points.append((e["x"], e["y"], marker))

            # Reporting (categorization).
            if e["state"] == STATE_HIDDEN:
                if is_real_picked(e, rewards, template):
                    picked.append((e, rewards, name))
            else:
                # Treat SearchFar (mode==TRIGGER_SEARCH_FAR) objects with a sprite as
                # quest givers; keep SearchNear/SearchNormal sprite-bearing objects pickable.
                is_sprite_far = (e.get("sprite", 0) > 0 and e.get("mode") == TRIGGER_SEARCH_FAR)
                if e["mode"] in SEARCH_TRIGGERS:
                    if rewards:
                        if is_sprite_far:
                            if show_quest:
                                quest.append((e, rewards, name))
                        else:
                            uncollected.append((e, rewards, name))
                    elif not is_door and (msg_idx is not None or e["exit_scene"] is not None):
                        if show_quest:
                            events.append((e, rewards, name))
                elif e["mode"] in TOUCH_TRIGGERS:
                    if rewards:
                        if show_quest:
                            quest.append((e, rewards, name))
                    elif msg_idx is not None or e["exit_scene"] is not None:
                        if show_quest:
                            events.append((e, rewards, name))

    player_xy = player_world_xy(save)
    # Events anchor the plot bbox; the player is drawn on top without
    # influencing the axes, so small movements don't rescale everything.
    event_points = list(plot_points)
    # Use raw pixel coordinates directly. The h-stagger is a real grid position.
    px_snap = player_xy[0]
    py_snap = player_xy[1]
    plot_points.append((px_snap, py_snap, MARKER_PLAYER))

    pfx, pfy = pixel_to_flat(*player_xy)
    def prox_key(item):
        e = item[0]
        fx, fy = pixel_to_flat(e["x"], e["y"])
        dx, dy = fx - pfx, fy - pfy
        dist = abs(dx) + abs(dy)
        if dy < 0:      dir_pri = 0  # N
        elif dy == 0 and dx > 0: dir_pri = 1  # E
        elif dy == 0:   dir_pri = 2  # W (or same spot)
        else:           dir_pri = 3  # S
        return (dist, dir_pri, fy, -fx)
    uncollected.sort(key=prox_key)
    events.sort(key=prox_key)
    quest.sort(key=prox_key)
    picked.sort(key=prox_key)

    if show_raw:
        print(f"\n-- raw scene data (scene {cur_scene}) --")
        print(f"  wMapNum: {cur_map}")
        print(f"  wScriptOnEnter:    0x{scenes[K][1]:04X}")
        print(f"  wScriptOnTeleport: 0x{scenes[K][2]:04X}")

        if show_script:
            print("\n  -- scene scripts --")
            if scenes[K][1]: sss.disasm(scripts, scenes[K][1], msgs=msgs, simple=True)
            if scenes[K][2]: sss.disasm(scripts, scenes[K][2], msgs=msgs, simple=True)

        print("\n  slot  coords       script  mode  state  sprite  label")
        raw_list = []
        lo, hi = scene_slot_range(scenes, K, total_slots)
        for slot in range(lo, hi + 1):
            e = read_entry(save, slot)
            rewards, msg_idx, _ops = walk_pickup_script(scripts, e["script"])
            e["exit_scene"] = find_exit_scene(scripts, e["script"]) if e["script"] else None
            e["label"] = msg_name(msgs, msg_idx) if msg_idx is not None else ""
            raw_list.append((e, rewards, msg_idx, e["label"]))
        
        raw_list.sort(key=prox_key)
        for e, rewards, _msg_idx, label in raw_list:
            print(f"  {e['slot']:4d}  {fmt_tile(e['x'], e['y'])}  0x{e['script']:04X}  "
                  f"{e['mode']:4d}  {e['state']:5d}  {e['sprite']:6d}  {label}")
            if show_script and e["script"]:
                sss.disasm(scripts, e["script"], msgs=msgs, simple=True)

        if show_plot:
            raw_points = [(
                e["x"], e["y"],
                MARKER_PICKED if is_real_picked(e, rewards, template)
                else (classify(e, rewards, msg_idx=msg_idx, cur_scene=cur_scene) or MARKER_OTHER)
            ) for e, rewards, msg_idx, _label in raw_list]
            raw_points_with_player = raw_points + [(px_snap, py_snap, MARKER_PLAYER)]
            print()
            for line in build_plot(raw_points_with_player, bbox_points=raw_points):
                print(line)
        return

    # Header + summary.
    print(f"{save_path.name}: {scope_desc}   "
          f"player@tile{fmt_tile(*player_xy)}")
    counts = f"uncollected: {len(uncollected)}"
    if show_quest:
        counts += f"   quest: {len(quest)}"
    if events:
        counts += f"   events: {len(events)}"
    if show_all:
        counts += f"   picked: {len(picked)}"
    print(counts)

    # Uncollected items — shrink as player collects.
    print()
    if uncollected:
        for e, reward, name in uncollected:
            print(fmt_row(e, reward, name, item_names, cur_scene))
    else:
        print("  (all items picked in this scope)")

    # Quest givers — also cleared as plot progresses.
    if show_quest and quest:
        print()
        print("-- quest givers --")
        for e, reward, name in quest:
            print(fmt_row(e, reward, name, item_names, cur_scene))

    # Plot.
    if show_plot:
        print()
        for line in build_plot(plot_points, bbox_points=event_points):
            print(line)

    # Events (inspectable objects with no reward: NPCs, props, scene triggers).
    if events:
        print()
        print("-- events --")
        for e, reward, name in events:
            print(fmt_row(e, reward, name, item_names, cur_scene))

    # Picked list (bottom, only with --all).
    if show_all and picked:
        print()
        print("-- picked --")
        for e, reward, name in picked:
            print(fmt_row(e, reward, name, item_names, cur_scene))

    # Scripts (optional, after lists so they don't clobber the summary).
    if show_script:
        print()
        shown = uncollected + events + (quest if show_quest else []) + (picked if show_all else [])
        for e, _reward, _name in shown:
            sss.disasm(scripts, e["script"], msgs=msgs, simple=True)


def main():
    ap = argparse.ArgumentParser(description="Report (un)collected items in a PAL DOS .RPG save.")
    ap.add_argument("save", type=Path, help="path to .RPG save file")
    ap.add_argument("--all", action="store_true", help="include already-picked items")
    ap.add_argument("--map", action="store_true", help="report all scenes sharing current wMapNum")
    ap.add_argument("--scene", type=int, default=None, help="override scene number (1-indexed)")
    ap.add_argument("--quest", action="store_true", help="also show Touch* NPCs/objects that give items")
    ap.add_argument("--script", action="store_true", help="dump full script disassembly for each item")
    ap.add_argument("--no-plot", action="store_true", help="suppress the ASCII proximity plot")
    ap.add_argument("--raw", action="store_true", help="dump all slots in scene, unfiltered, sorted by proximity")
    ap.add_argument("--sss",  type=Path, default=GAME_DIR / "SSS.MKF")
    ap.add_argument("--msg",  type=Path, default=GAME_DIR / "M.MSG")
    ap.add_argument("--word", type=Path, default=GAME_DIR / "WORD.DAT")
    args = ap.parse_args()

    report(args.save, args.sss, args.msg, args.word,
           show_all=args.all, scope_map=args.map,
           forced_scene=args.scene, show_script=args.script,
           show_plot=not args.no_plot, show_quest=args.quest,
           show_raw=args.raw)


if __name__ == "__main__":
    main()
