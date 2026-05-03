# EventObjects and Pickup Mechanics

## Global Object Table
Pickable map objects, NPCs, and scene triggers live in a global table of 32-byte entries.
- In `SSS.MKF sub[0]`: The master template table (starts at byte 0).
- In `SAVE.RPG`: The live state table (starts at offset `0x3260`).

**All Slot IDs are 1-based.**

## Unified EVENTOBJECT Layout (32 bytes)
The following offsets represent the standard layout of the 32-byte global object table entries. Field names are aligned with the TypeScript implementation in `src/core/assets/event-objects.ts`.

| Offset | Type | Field | Description |
| :--- | :--- | :--- | :--- |
| `+0x00` | `s16` | - | *Internal/Vanish Timer (unused by TS core)* |
| `+0x02` | `u16` | `x` | **X coordinate** (world pixels) |
| `+0x04` | `u16` | `y` | **Y coordinate** (world pixels) |
| `+0x06` | `s16` | `sLayer` | Map layer / z-index |
| `+0x08` | `u16` | `triggerScript` | **Main Script index** (into `SSS.MKF sub[4]`) |
| `+0x0A` | `u16` | `autoScript` | Auto Script index (runs in background) |
| `+0x0C` | `s16` | `state` | **Object State flag** |
| `+0x0E` | `u16` | `triggerMode` | **Activation Mode** (Search/Touch range) |
| `+0x10` | `u16` | `spriteNum` | **Graphic ID** (indexes `MGO.MKF`) |
| `+0x12` | `u16` | `nSpriteFrames` | Number of frames in sprite |
| `+0x14` | `u16` | `direction` | Facing direction |
| `+0x16` | `u16` | `currentFrame` | Current animation frame |
| `+0x18` | `u16` | - | *Script Idle Frame (unused by TS core)* |
| `+0x1A` | `u16` | - | *Sprite Pointer Offset (unused by TS core)* |
| `+0x1C` | `u16` | `nSpriteFramesAuto` | Runtime-resolved frame count for auto-script animation. The authored `SSS.MKF` value is `0` in practice; when `nSpriteFrames == 0`, the engine must derive this from the loaded sprite chunk's `numFrames`, then animate non-directionally as `(currentFrame + animationStep) % nSpriteFramesAuto`. |
| `+0x1E` | `u16` | - | *Auto Script Idle Frame Count (unused by TS core)* |

### State Flag (`state`)
- `0`: Hidden (Picked items, opened doors; stops scripts)
- `1`: Normal
- `2`: Normal + Auto Script active
- `3`: Normal + Auto Script stopped

### Trigger Mode (`triggerMode`)
- `1-3`: Search range (Near/Normal/Far) — manually triggered by 'Action' button.
- `4-8`: Touch range — triggered by stepping on/near the tile.

## Table Mapping & Offsets
The mapping from a 1-based Slot ID `N` to the physical byte offset depends on the source, as the Template contains a sentinel record that the Save File does not:

| Source | Slot ID `N` Maps to... | Byte Offset Calculation |
| :--- | :--- | :--- |
| **Save File** | Record `N-1` | `(N - 1) * 32` (relative to `0x3260`) |
| **Template** | Record `N` | `N * 32` (relative to byte 0) |

*Note: Record 0 in the Template (`SSS.MKF sub[0]`) is a null sentinel.*

## Historical Offset Note
The legacy tool `pickup_report.py` references a base of `0x325C` (4 bytes before the actual table start in saves). In that coordinate system, fields appear shifted by +4 bytes (e.g., `x` at `+0x06`, `y` at `+0x08`). Modern code follows the **Standard Unified Layout** starting at `0x3260` (save) or `0x0000` (SSS chunk).

## Identifying Uncollected Pickups
The logic for identifying uncollected items and cash rewards is implemented in `collectScriptRewards` (`src/core/assets/scripts.ts`):

1. **Filter entries** by the current scene's event object range (calculated via `getSceneEventSlotRange` - see [Scene & Map Architecture](scene_and_map_architecture.md)).
2. **Check `triggerMode`** ∈ {1, 2, 3} (Search Near/Normal/Far).
3. **Check `state`** == 1 (Normal/Visible).
4. **Recursively scan the script** at `triggerScript` (and any nested `CALL_SCRIPT` instructions up to a depth of 2) for reward opcodes (see [SSS & Scripting](sss_and_scripting.md)):
   - `ADD_ITEM` (0x001F)
   - `ADD_CASH` (0x001E)

## Plot-Gated Object Filtering
To accurately report pickables, distinguish between items that have been picked (`state` 1 -> 0) and items that haven't been spawned by the plot yet.
* Read the template `state` from `SSS.MKF sub[0]` at byte offset `slot * 32 + 0x0C`. (`slot` is 1-based logical scene slot number)
* If `template_state` == 0 AND `save_state` == 0: The object is hidden by plot (not a picked item).
* If `template_state` == 1 AND `save_state` == 0: The object was visible and has been picked.
* If `template_state` == 0 AND `save_state` == 1: The plot has revealed the object via script.
