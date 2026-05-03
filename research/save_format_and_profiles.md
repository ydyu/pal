# Save Format & Player Profiles (SAVEDGAME_DOS)

## Global Save File Layout
The `SAVEDGAME_DOS` file uses Little-Endian representation. While there are 5 playable roles (Li, Zhao, Lin, Wu, Anu), indexed **0 to 4**, the save file dimensions major arrays for 6 slots (**0 to 5**) for historical or alignment reasons.

* `0x0000` (`u16`): `wSavedTimes` (Per-slot save count)
* `0x0002` (`u16`): `wViewportX`
* `0x0004` (`u16`): `wViewportY`
* `0x0006` (`u16`): `nPartyMember` (partyMemberCount)
* `0x0008` (`u16`): `wNumScene` (Current scene number, 1-indexed. See [Scene & Map Architecture](scene_and_map_architecture.md))
* `0x000A` (`u16`): `wPaletteOffset` (Day/Night state. See [Scene & Map Architecture](scene_and_map_architecture.md). `0` = Day, `0x180` = Night)
* `0x001A` (`u16`): `wLayer` (Global scene layer offset)
* `0x0028` (`u32`): `dwCash` (Cash amount. *Note: Stored wordswapped on big-endian hosts, but canonical DOS .RPG files are LE so plain LE u32 read/write is correct.*)
* `0x002C`: `PARTY` Array (5 roles x 10 bytes). Layout: `{u16 role, s16 x, s16 y, u16 frame, u16 imgoff}`
* 0x005E: TRAIL Array (5 roles x 6 bytes = 30 bytes).
* `0x007C`: `ALLEXPERIENCE` Array (8 categories x 6 slots x 8 bytes). 
  * Each element is 8 bytes: `{wExp, wReserved, wLevel, wCount}`.
  * *Editing rule:* Only edit `wExp`. The game auto-levels and syncs `wLevel` and stats after the next battle. Do not write `wLevel` directly.
* `0x01FC`: `PLAYERROLES` (Detailed below)
* `0x06C0`: `INVENTORY` (MAX_SLOTS = 256; 6-byte slots: item_id u16 LE + qty u16 LE + 2-byte tail)
* `0x3260`: `EVENT_OBJECTS` (Global Event Object Table, stride 0x20)

## Additional Save Header Fields & Caveats
Between `wNumScene` (0x0008) and `dwCash` (0x0028), the save header contains several environmental and state variables (u16 LE):
* `0x000A`: `wPaletteOffset` (SDLPAL treats any non-zero value as Night when loading, but saves exactly `0x180`. The actual palette index `wNumPalette` is NOT stored in the save header and must be set by scripts via opcode `0x008B`.)
* `0x000C`: `wPartyDirection`
* `0x000E`: `wNumMusic`
* `0x0010`: `wNumBattleMusic`
* `0x0012`: `wNumBattleField`
* `0x0014`: `wScreenWave`
* `0x0016`: `wBattleSpeed`
* `0x0018`: `wCollectValue`
* `0x001A`: `wLayer`
* `0x001C`: `wChaseRange`
* `0x001E`: `wChasespeedChangeCycles`
* `0x0020`: `nFollower`

**Format Caveat:** The layout described here applies strictly to DOS `.rpg` saves (`SAVEDGAME_DOS`). The Windows 95 version of the game (`SAVEDGAME_WIN`) has a fundamentally different layout. Any tooling should sanity-check file size against `sizeof(SAVEDGAME_DOS)` or use a known good marker before parsing.

## PLAYERROLES Structure
Located at `0x01FC`. While there are 5 playable roles (indexed 0..4), the data structure is dimensioned for 6 slots (0..5). Layout is a sequence of `PLAYERS` arrays (each `WORD[6]` = 12 bytes), interleaved with 2D arrays.

**Field Access Formula:** For an editable 1D array `A` at relative offset `A_off`, calculate: `byte_off = 0x01FC + A_off + R*2` (Width 2, little-endian, where R is the 0-based slot index 0..5).

**Editable Fields (Relative Offsets):**
* `0x48`: `rgwLevel` (read-only, auto-managed via `ALLEXPERIENCE`)
* `0x54`: `rgwMaxHP`
* `0x60`: `rgwMaxMP`
* `0x6C`: `rgwHP`
* `0x78`: `rgwMP`
* `0x84`: `rgwEquipment` (6 parts x 6 slots x 2 bytes)
* `0xCC`: `rgwAttackStrength`
* `0xD8`: `rgwMagicStrength`
* `0xE4`: `rgwDefense`
* `0xF0`: `rgwDexterity`
* `0xFC`: `rgwFleeRate`
* `0x108`: `rgwPoisonResistance`
* `0x114`: `rgwElementalResistance` (5 categories x 6 slots x 2 bytes). Order: Wind, Thunder, Water, Fire, Earth.
* `0x174`: `rgwProtector` (Protects this role when HP is low; 0..5)
* `0x180`: `rgwMagics` (32 slots x 6 slots x 2 bytes. 0-terminated list of spell IDs.)
* `0x30C`: `rgwCooperativeMagic` (Lead role's co-op spell ID)
* `0x330`: `rgwDeathSound`
* `0x33C`: `rgwAttackSound`
* `0x348`: `rgwWeaponSound`
* `0x354`: `rgwCriticalSound`
* `0x360`: `rgwMagicSound`
* `0x36C`: `rgwBlockSound`
* `0x378`: `rgwHitSound`

**Do NOT Edit:**
* `0x00`: `rgwAvatar`
* `0x0C`: `rgwSpriteNumInBattle`
* `0x18`: `rgwSpriteNum`
* `0x24`: `rgwName`
* `0x30`: `rgwAttackAll`
* `0x3C`: `rgwUnknown1`

### Player sprite mapping
- The sprite used for a party member in normal scenes is determined at load time by the role ID stored in the `PARTY` array (each party slot includes a `role` u16). The engine looks up `PLAYERROLES.rgwSpriteNum[roleId]` (at relative offset `0x18`) to obtain the MGO.MKF sprite number and loads that chunk.
- Changing a party member's role (in save data or via scripts) changes which sprite is loaded for that slot. Followers are handled via indices beyond `wMaxPartyMemberIndex` (see nFollower handling in PAL_LoadResources).

## Global Event Object Table
Located at `0x3260`. This table contains all dynamic objects in the game world (NPCS, items on ground, triggers).
* Stride: `0x20` (32 bytes)
* Format: See [EventObjects and Pickup Mechanics](event_objects_and_pickups.md) for the internal structure of each entry.
* Count: Determined by file size (extends to end of file).
