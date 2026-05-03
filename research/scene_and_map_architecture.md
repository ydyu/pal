# Scene & Map Architecture

## Terminology
* **wNumScene** (`numScene`): The current scene number, 1-indexed. Stored in the save header at `0x0008` (see [Save Format & Player Profiles](save_format_and_profiles.md)).
* **wMapNum** (`mapNum`): The engine map ID, indexing into `MAP.MKF`.
* **Scene**: A logical grouping of objects and map data. Multiple scenes can share the same `wMapNum` (e.g., black-void-separated indoor rooms).

## The Scene Table (`SSS.MKF sub[1]`)
Contains 300 8-byte `SCENE` records determining object ownership and transitions.
* `+0x00` (`u16`): `wMapNum` (`mapNum`)
* `+0x02` (`u16`): `wScriptOnEnter` (`scriptOnEnter`)
* `+0x04` (`u16`): `wScriptOnTeleport` (`scriptOnTeleport`)
* `+0x06` (`u16`): `wEventObjectIndex` (`eventObjectIndex`)

**Object Partitioning:** The global `EventObject` table is partitioned by scene. Scene `K` (1-indexed) metadata is defined in `SCENE` record `K-1`. Using 1-based logical slot numbering, scene 1 owns `[1 .. S[1].eventObjectIndex - 1]`, and each later scene owns `[S[K-1].eventObjectIndex .. S[K].eventObjectIndex - 1]`. See [EventObjects and Pickup Mechanics](event_objects_and_pickups.md) for more details.

*Mapping Example:*
* **Scene 1**: Metadata in `S[0]`. Slots `[1 .. 31]`
* **Scene 2**: Metadata in `S[1]`. Slots `[32 .. 43]`
* **Scene 3**: Metadata in `S[2]`. Slots `[44 .. 75]`
* **Scene 4**: Metadata in `S[3]`. Slots `[76 .. 114]`

*Verification:* In Scene 4 (Outdoors, Map 1), the range is `[76 .. 114]`. This correctly includes **Xiaohu (logical slot 76)** in the outdoors scene rather than Scene 3.

## Map Coordinate System
World coordinates are stored as pixels. Map rendering uses an isometric stagger.
* **Map Size & Data Structure**: Maps are 128 rows x 64 columns. Each coordinate `(x, y)` has 2 staggered tiles (`h=0` and `h=1`). The total decompressed map data is exactly 65,536 bytes (128 * 64 * 2 * 4 bytes).
* **Tile Data Format (4 bytes)**:
  - `byte 0`: Lower tile index (bits 0-7)
  - `byte 1`: Bits 0-3: Lower tile height; Bits 4-7: Lower tile index (bit 8)
  - `byte 2`: Upper tile index (bits 0-7)
  - `byte 3`: Bits 0-3: Upper tile height; Bits 4-7: Upper tile index (bit 8)
* **Rendering Traversal Order**: For correct isometric rendering, map chunks must be iterated back-to-front based on depth. The iteration order is `y` (0 to 127), then `h` (0 to 1), then `x` (0 to 63). The memory offset for a specific tile is `((y * 64 + x) * 2 + h) * 4` bytes.
* **Math (Top-Left Blitting):** `px = x*32 + h*16 - 16`, `py = y*16 + h*8 - 8`. This is the top-left corner used for blitting.
* **Math (Logical/Center):** `px = x*32 + h*16`, `py = y*16 + h*8`. This is the logical coordinate used in `src/core/coords.ts` and for `EventObject` positioning.
* **Inverting to Tile:** 
  * `h = 1 if (px % 32) == 16 else 0`
  * `x = (px - h * 16) // 32`
  * `y = (py - h * 8) // 16`
* **Flat Grid (Orthogonal):**
  * `flat_x` (`fx`) = `x + y + h`
  * `flat_y` (`fy`) = `y - x`
* **Player Coordinates:** Party leader world coord = `viewportX/Y` (save offset 0x02/0x04) + `PARTY[0]` on-screen offset (`x` at +0x02, `y` at +0x04 relative to party struct).

## Palette & Day/Night Cycle
* **Palette Storage (`PAT.MKF`)**: Each sub-file contains 256-color palettes (768 bytes each, 3 bytes per color in 6-bit RGB format). 
* **Day/Night Modes**: Some sub-files in `PAT.MKF` are 1536 bytes, containing two palettes. The first 768 bytes are for Day mode, and the second 768 bytes are for Night mode.
* **Save State**: The day/night state is stored in the save header at `0x000A` (`paletteOffset`).
    * `0` = Day
    * `0x180` = Night (saved by SDLPAL; any non-zero value is treated as night during load).
* **Palette Index**: The current palette number (`wNumPalette`) is NOT stored in the save header. It is set by scripts (opcode `0x008B`). Default is `0`.

## Unresolved: Slot-to-Map Global Mapping
There is no direct mapping beyond `slot -> scene -> map`. Indoor scenes perceived as different "rooms" often share a single engine-level `mapNum` clustered inside one `MAP.MKF` entry. 

Slot partitioning within a shared map is handled via coordinate clustering at runtime. Because slots have fixed coordinates and the player's movement is restricted by walkable regions (flood-fill) on the map, interacted slots are automatically constrained by the "room" the player is currently in. This makes unreachable slots (e.g., a chest in a separate indoor room on the same map) possible but logically inaccessible.
