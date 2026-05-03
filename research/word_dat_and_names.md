# WORD.DAT and Name Definitions (SSS.MKF sub[2])

The `WORD.DAT` file contains fixed-length (10-byte) strings used for names and options throughout the game. These names are further defined by attributes in `SSS.MKF sub[2]` (`SssSubfile.NameDefinition`), which contain sprite indices, prices, and script pointers for each entry. See [SSS & Scripting](sss_and_scripting.md) for the MKF structure.

## Implementation Details
- **WORD.DAT Parsing**: Implemented in `src/core/assets/text.ts` as `parseWordDat`. It reads 10-byte records and decodes them using Big5 (`decodeBig5`).
- **Access**: Provided by `ResourceManager.getWord(index)` in `src/core/resource-manager.ts`.
- **Attributes**: Defined as `SssSubfile.NameDefinition` in `src/core/assets/metadata.ts`.

## Name Categories and Ranges

| Category | Range (Hex) | Range (Dec) | Description |
| :--- | :--- | :--- | :--- |
| **System** | `0x00` - `0x17`, `0x19` - `0x23`, `0x2A` - `0x3C` | 0-23, 25-35, 42-60 | Menu options, system strings, etc. No attributes in sub[2]. |
| **Roles** | `0x24` - `0x29` | 36-41 | The 6 playable characters (Li, Zhao, Lin, Wu, Anu, Gai). |
| **Items** | `0x3D` - `0x126` | 61-294 | Inventory items (consumables, equipment, quest items). |
| **Skills** | `0x18`, `0x127` - `0x18D` | 24, 295-397 | Combat skills and magic. |
| **Enemies** | `0x18E` - `0x226` | 398-550 | Enemy names. |
| **Poisons** | `0x227` - `0x234` | 551-564 | Status effects and poison types. |

## Name Definition Attributes (sub[2])
Each entry in `sub[2]` is 12 bytes (DOS/95) or 14 bytes (98/Win). The 14-byte version (often called "Script-augmented") adds a `V7` (u16) parameter, typically used for description scripts.

### Item Attributes (`0x3D` - `0x126`)
* `V1` (u16): Sprite index in `BALL.MKF`.
* `V2` (u16): Price.
* `V3` (u16): Script index for "Use".
* `V4` (u16): Script index for "Equip".
* `V5` (u16): Script index for "Throw".
* `V6` (u16): Bitmask for usability and equipment compatibility.
  * `0x0001`: Useable
  * `0x0002`: Equippable
  * `0x0004`: Throwable
  * `0x0008`: Consumed on use
  * `0x0010`: No target selection needed
  * `0x0020`: Sellable
  * `0x0040` - `0x0800`: Equipment flags for roles 0-5.

### Skill Attributes (`0x127` - `0x18D`)
* `V1` (u16): Internal magic index (refers to `DATA.MKF` sub[4]).
* `V3` (u16): Post-cast script.
* `V4` (u16): Pre-cast script.
* `V6` (u16): Bitmask.
  * `0x0001`: Useable in map
  * `0x0002`: Useable in battle
  * `0x0008`: Targets enemies
  * `0x0010`: No target selection needed

### Enemy Attributes (`0x18E` - `0x226`)
* `V1` (u16): Internal enemy index (refers to `DATA.MKF` sub[1] and `ABC.MKF`).
* `V2` (u16): Magic resistance (0-10; 10 = immune).
* `V3` (u16): Pre-battle script (every round start).
* `V4` (u16): Post-battle script (on victory).
* `V5` (u16): Battle action script (during attack).

### Poison Attributes (`0x227` - `0x234`)
* `V1` (u16): Toxicity level (0-3 usually, 99 for unique items like Gourd).
* `V2` (u16): Color parameter (affects screen palette when poisoned).
* `V3` (u16): Player poison script (triggered per step/turn).
* `V5` (u16): Enemy poison script.
