# Research Log & Future Goals

## Open Questions
1. **Unknown Opcodes**: Identify `0x1223`, `0x0110`, `0x01EC` found in NPC scripts. *Note: Likely misreads of opcode + parameters, or script indices. `0x10` is WALK_TO_TILE, `0x12` is MOVE_EVENT_REL. See [SSS & Scripting](sss_and_scripting.md) for known opcodes.*

## Resolved Questions
1. **Leading Byte Definitions**: The first 2 bytes (`+0x00`) of `EventObject` entries represent the **Accumulated Trigger Time** (`TM` field in Chinese documentation), used as a **Vanish Timer** (`sVanishTime`) for temporary object removal (e.g., monster respawn). See [EventObjects and Pickup Mechanics](event_objects_and_pickups.md).
2. **Object Table Scope**: The global object table bounds are defined by the size of `SSS.MKF` subfile [0] (`EventObjectTemplate`). All slot IDs are 1-based, where logical slot `N` corresponds to index `N` in the template (index 0 is a null sentinel).
3. **Palette Logic**: Confirmed `wPaletteOffset` in the save header (`0x000A`) toggles between Day (`0`) and Night (`0x180`). See [Save Format & Player Profiles](save_format_and_profiles.md).

## Future Tooling / Next Steps
1. **Object Table Census**: ~~Count real object table entries in `1-1.RPG` by filtering on `+0x12 ∈ {1, 4, 5}` to pin the true slot count and cross-reference with `DATA.MKF` subfiles.~~ [COMPLETED] True slot count is derived from `SSS.MKF` sub[0].
2. **Global Item Map**: Enumerate every `op=0x001F` in `sub[4]` to build a global `(script_idx → item_id)` dictionary. 
3. **Save Data Expansion**: Gather saves on clearly distinct maps (e.g., an outdoor map far from starting region) to observe how `map_id` changes per slot, if at all.
4. **Room-Level Filtering**: ~~Implement `YJ_1` decompression to extract walkable-tile layers from `MAP.MKF`.~~ [COMPLETED]
