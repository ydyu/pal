# SSS.MKF Structure & Scripting Engine Reference

## File Architecture (SSS.MKF)
The `SSS.MKF` file is the central "database" for the game's logic and data. It contains 5 primary subfiles (plus an optional sentinel) indexed by a `u32` offset table at the start of the file.

Defined in `src/core/assets/metadata.ts` as `SssSubfile`:

| Index | Name | Description | Entry Size |
| :--- | :--- | :--- | :--- |
| **0** | `EventObjectTemplate` | Master Template for NPCs, items, and triggers. See [EventObjects and Pickup Mechanics](event_objects_and_pickups.md). | 32 bytes |
| **1** | `SceneTable` | Defines map, scripts, and event ranges for each scene. See [Scene & Map Architecture](scene_and_map_architecture.md). | 8 bytes |
| **2** | `NameDefinition` | Attributes and scripts for Items, Skills, and Enemies. See [WORD.DAT and Name Definitions](word_dat_and_names.md). | 12-14 bytes |
| **3** | `MessageOffsets` | `u32` offsets into `M.MSG` for text strings. | 4 bytes |
| **4** | `ScriptTable` | Global script instruction table. | 8 bytes |

## Text and Messaging (sub[3] & M.MSG)
* `M.MSG` is a flat, un-delimited Big5 text blob.
* Message string `N` spans from `offset[N]` to `offset[N+1]` based on the offsets in `MessageOffsets`.
* In-message control tokens:
  * `''`: Red text
  * `""`: Yellow text
  * `--`: Cyan text
  * `~N`: Auto-pause for N frames/time
  * `$N`: Text speed (larger = slower)
  * `(`: Sweat drop emoji
  * `)`: Heart emoji

## Scripting Engine (sub[4])
Scripts consist of 8-byte structures: `{opcode u16, a u16, b u16, c u16}` (Little Endian). All event triggers and item/skill properties index into this table (offset = index * 8).

Implementation: `src/core/assets/scripts.ts`

### Script Opcodes
Status: ✅ = Implemented/Defined in `src/`, ❌ = Missing from `src/`.

| Hex | Name | a | b | c | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `0x0000` | `STOP_EXECUTION` | - | - | - | ✅ |
| `0x0001` | `STOP_AND_ADVANCE` | - | - | - | ✅ |
| `0x0002` | `STOP_AND_CHANGE` | next | loops | - | ✅ |
| `0x0003` | `JUMP` | target | loops | - | ✅ |
| `0x0004` | `CALL_SCRIPT` | script | event | - | ✅ |
| `0x0005` | `CLEAR_SCREEN` | mode | delay | update_gestures | ✅ |
| `0x0006` | `RANDOM_JUMP` | rate | target | - | ✅ |
| `0x0007` | `START_BATTLE` | group | lost_jump | flee_jump | ✅ |
| `0x0008` | `CONTINUE_NEXT` | - | - | - | ✅ |
| `0x0009` | `WAIT_STOP_MOVE` | frames | trigger | update_gestures | ✅ |
| `0x000A` | `CHOICE_DIALOGUE` | target | - | - | ✅ |
| `0x000B` | `WALK_WEST` | - | - | - | ✅ |
| `0x000C` | `WALK_NORTH` | - | - | - | ✅ |
| `0x000D` | `WALK_EAST` | - | - | - | ✅ |
| `0x000E` | `WALK_SOUTH` | - | - | - | ✅ |
| `0x000F` | `SET_DIRECTION` | dir | frame | - | ✅ |
| `0x0010` | `WALK_TO_TILE` | x | y | half | ✅ |
| `0x0011` | `WALK_TO_TILE_SLOW` | x | y | half | ✅ |
| `0x0012` | `MOVE_EVENT_REL` | event | dx | dy | ✅ |
| `0x0013` | `SET_EVENT_POS` | event | x | y | ✅ |
| `0x0014` | `SET_EVENT_IMAGE` | frame | - | - | ✅ |
| `0x0015` | `SET_PLAYER_DIR` | dir | frame | player | ❌ |
| `0x0016` | `SET_EVENT_ANIM` | event | direction | frame | ✅ |
| `0x0017` | `ADD_EQUIP_ATTR` | pos | attr | value | ❌ |
| `0x0018` | `EQUIP_ITEM` | pos | item | - | ❌ |
| `0x0019` | `ADD_ATTR` | attr | value | player | ❌ |
| `0x001A` | `SET_ATTR` | attr | value | player | ❌ |
| `0x001B` | `RESTORE_HP` | all | value | - | ❌ |
| `0x001C` | `RESTORE_MP` | all | value | - | ❌ |
| `0x001D` | `RESTORE_HP_MP` | all | hp_val | mp_val | ❌ |
| `0x001E` | `ADD_CASH` | amount | failure_jump | - | ✅ |
| `0x001F` | `ADD_ITEM` | item | qty | - | ✅ |
| `0x0020` | `REMOVE_ITEM` | item | qty | failure_jump | ✅ |
| `0x0021` | `DAMAGE_ENEMY` | all | value | - | ❌ |
| `0x0022` | `REVIVE_PARTY` | all | hp_pct | - | ❌ |
| `0x0023` | `UNEQUIP_ITEM` | player | pos | - | ❌ |
| `0x0024` | `SET_AUTO_SCRIPT` | event | script | - | ❌ |
| `0x0025` | `SET_TRIGGER_SCRIPT` | event | script | - | ✅ |
| `0x0026` | `OPEN_SHOP` | shop | - | - | ❌ |
| `0x0027` | `OPEN_PAWNSHOP` | - | - | - | ❌ |
| `0x0028` | `POISON_ENEMY` | all | poison_id | - | ❌ |
| `0x0029` | `POISON_PARTY` | all | poison_id | - | ❌ |
| `0x002A` | `CURE_ENEMY` | all | poison_id | - | ❌ |
| `0x002B` | `CURE_PARTY` | all | poison_id | - | ❌ |
| `0x002C` | `CURE_PARTY_LEVEL` | all | max_level | - | ❌ |
| `0x002D` | `SET_PARTY_STATUS` | status | turns | - | ❌ |
| `0x002E` | `SET_ENEMY_STATUS` | status | turns | fail_jump | ❌ |
| `0x002F` | `CURE_PARTY_STATUS` | status | - | - | ❌ |
| `0x0030` | `BUFF_ATTR` | attr | pct | player | ❌ |
| `0x0031` | `SET_PLAYER_IMAGE` | img | - | - | ✅ |
| `0x0032` | `BRANCH_BATTLE` | battle_script | normal_script | - | ❌ |
| `0x0033` | `POUCH_COLLECT` | fail_jump | - | - | ❌ |
| `0x0034` | `POUCH_REFINE` | fail_jump | - | - | ❌ |
| `0x0035` | `SHAKE_SCREEN` | count | magnitude | - | ❌ |
| `0x0036` | `SET_ANIMATION` | rng_idx | - | - | ❌ |
| `0x0037` | `PLAY_ANIMATION` | start | end | speed | ❌ |
| `0x0038` | `TELEPORT_OUT` | failure_jump | - | - | ✅ |
| `0x0039` | `DRAIN_ENEMY_HP` | amount | - | - | ❌ |
| `0x003A` | `FLEE_BATTLE` | fail_jump | - | - | ❌ |
| `0x003B` | `TEXT_CENTER_NARRATOR` | color | - | anim | ✅ |
| `0x003C` | `TEXT_UPPER_DIALOGUE` | portrait | color | anim | ✅ |
| `0x003D` | `TEXT_LOWER_DIALOGUE` | portrait | color | anim | ✅ |
| `0x003E` | `TEXT_CENTER_WINDOW` | color | - | - | ✅ |
| `0x003F` | `SHIP_TO_TILE_SLOW` | x | y | half | ❌ |
| `0x0040` | `SET_TRIGGER_MODE` | event | mode | - | ✅ |
| `0x0041` | `MAGIC_INVALID` | - | - | - | ❌ |
| `0x0042` | `PARTY_USE_MAGIC` | magic_id | - | - | ❌ |
| `0x0043` | `PLAY_MUSIC` | music | loop | - | ✅ |
| `0x0044` | `SHIP_TO_TILE` | x | y | half | ❌ |
| `0x0045` | `SET_BATTLE_MUSIC` | music | - | - | ❌ |
| `0x0046` | `SET_PARTY_POS` | x | y | half | ✅ |
| `0x0047` | `PLAY_SOUND` | sound | - | - | ✅ |
| `0x0049` | `SET_EVENT_STATE` | event | state | - | ✅ |
| `0x004A` | `SET_BATTLEFIELD` | field_id | - | - | ❌ |
| `0x004B` | `EXIT_BATTLE` | delay_ms | - | - | ❌ |
| `0x004C` | `CHASE_PLAYER` | range | speed | - | ❌ |
| `0x004D` | `WAIT_KEY` | - | - | - | ❌ |
| `0x004E` | `RELOAD_SAVE` | - | - | - | ❌ |
| `0x004F` | `SCREEN_FADE_RED` | color_ctrl | - | - | ✅ |
| `0x0050` | `FADE_OUT` | fast | - | - | ✅ |
| `0x0051` | `FADE_IN` | fast | - | - | ✅ |
| `0x0052` | `VANISH` | frames | - | - | ✅ |
| `0x0053` | `USE_DAY_PALETTE` | - | - | - | ✅ |
| `0x0054` | `USE_NIGHT_PALETTE` | - | - | - | ✅ |
| `0x0055` | `LEARN_MAGIC` | magic | player | - | ✅ |
| `0x0056` | `FORGET_MAGIC` | magic | player | - | ❌ |
| `0x0057` | `MP_TO_DAMAGE` | magic_id | multiplier | - | ❌ |
| `0x0058` | `BRANCH_ITEM` | item | qty | fail_jump | ❌ |
| `0x0059` | `CHANGE_SCENE` | scene | - | - | ✅ |
| `0x005A` | `HALVE_PARTY_HP` | - | - | - | ❌ |
| `0x005B` | `HALVE_ENEMY_HP` | limit | - | - | ❌ |
| `0x005C` | `PARTY_INVIS` | turns | - | - | ❌ |
| `0x005D` | `BRANCH_PARTY_POISON` | poison_id | fail_jump | - | ❌ |
| `0x005E` | `BRANCH_ENEMY_POISON` | poison_id | fail_jump | - | ❌ |
| `0x005F` | `PARTY_DIE` | - | - | - | ❌ |
| `0x0060` | `ENEMY_DIE` | - | - | - | ❌ |
| `0x0061` | `BRANCH_PARTY_POISONED`| fail_jump | - | - | ❌ |
| `0x0062` | `STOP_CHASE` | duration | - | - | ❌ |
| `0x0063` | `DOUBLE_CHASE` | duration | - | - | ❌ |
| `0x0064` | `CHECK_ENEMY_HP` | pct | jump_if_true | - | ❌ |
| `0x0065` | `SET_PARTY_IMAGE` | player_idx | mgo_idx | immediate | ❌ |
| `0x0066` | `THROW_WEAPON` | magic_id | damage | - | ❌ |
| `0x0067` | `SET_ENEMY_MAGIC` | magic_id | freq | - | ❌ |
| `0x0068` | `BRANCH_TARGET_PARTY` | jump | - | - | ❌ |
| `0x0069` | `ENEMY_FLEE` | success_100 | - | - | ❌ |
| `0x006A` | `STEAL` | rate | - | - | ❌ |
| `0x006B` | `BLOW_AWAY_ENEMY` | qty | - | - | ❌ |
| `0x006C` | `MOVE_EVENT_REL_MULTI` | event | dx | dy | ✅ |
| `0x006D` | `SET_SCENE_SCRIPT` | scene | enter_script | exit_script | ❌ |
| `0x006E` | `MOVE_PLAYER_MULTI` | dx | dy | layer | ❌ |
| `0x006F` | `SYNC_EVENT_STATE` | src_event | state | - | ❌ |
| `0x0070` | `PLAYER_WALK_TO` | x | y | half | ❌ |
| `0x0071` | `SCREEN_JIGGLE` | layer | step | - | ❌ |
| `0x0072` | `SET_EVENT_MGO` | event | mgo_idx | rebuild | ❌ |
| `0x0073` | `GOLD_FADE` | step_time | count | - | ❌ |
| `0x0074` | `BRANCH_PARTY_INJURED` | jump | - | - | ❌ |
| `0x0075` | `ADJUST_PARTY` | p1 | p2 | p3 | ❌ |
| `0x0076` | `SHOW_IMAGE` | field_id | delay | - | ❌ |
| `0x0077` | `STOP_MUSIC` | - | - | - | ❌ |
| `0x0078` | `RETURN_TO_MAP` | - | - | - | ❌ |
| `0x0079` | `BRANCH_PARTY_HAS` | player_idx | jump | - | ❌ |
| `0x007A` | `PLAYER_WALK_FAST` | x | y | half | ❌ |
| `0x007B` | `PLAYER_WALK_RUN` | x | y | half | ❌ |
| `0x007C` | `OBJ_WALK_FAST` | x | y | half | ❌ |
| `0x007D` | `MOVE_EVENT_REL_2` | event | dx | dy | ❌ |
| `0x007E` | `SET_EVENT_LAYER` | event | layer | - | ❌ |
| `0x007F` | `MOVE_VIEW` | x | y | count | ❌ |
| `0x0080` | `TOGGLE_PALETTE_MODE` | skip_update | - | - | ✅ |
| `0x0081` | `BRANCH_OBJ_NOT_IN_VIEW`| event | dist | jump | ❌ |
| `0x0082` | `OBJ_RUN_TO` | x | y | half | ❌ |
| `0x0083` | `BRANCH_OBJ_NOT_IN_DIST`| event | dist | jump | ❌ |
| `0x0084` | `PLACE_EVENT` | event | mode | fail_jump | ❌ |
| `0x0085` | `WAIT` | delay | - | - | ✅ |
| `0x0086` | `BRANCH_EQUIP_QTY` | item | qty | jump | ❌ |
| `0x0087` | `OBJ_IDLE_WALK` | - | - | - | ❌ |

### Animation-Related Opcode Notes
- **`0x0014 SET_EVENT_IMAGE`**: Sets an event object's current frame (zero-based). Corresponds to a frame within the event's currently assigned sprite ID (MGO). Forces direction to South (0) in some engine implementations.
- **`0x0016 SET_EVENT_ANIM`**: Sets an event object's direction and current frame.
  - **a (event)**: 1-based Event ID. Use `0xFFFF` for the current (triggering) event.
  - **b (direction)**: Facing direction (0=South, 1=West, 2=East, 3=North).
  - **c (frame)**: Zero-based frame number within the current sprite.
- **`0x0087 OBJ_IDLE_WALK`**: Advances an idle object's frame automatically and wraps by `nSpriteFrames` or runtime-resolved `nSpriteFramesAuto`.
| `0x0088` | `CASH_TO_DAMAGE` | magic_id | - | - | ❌ |
| `0x0089` | `END_BATTLE` | result | - | - | ❌ |
| `0x008A` | `AUTO_BATTLE` | - | - | - | ❌ |
| `0x008B` | `SET_PALETTE_INDEX` | index | - | - | ✅ |
| `0x008C` | `COLOR_FADE` | color | delay | from | ✅ |
| `0x008D` | `LEVEL_UP` | amount | - | - | ❌ |
| `0x008E` | `CLEAR_TEXT` | - | - | - | ✅ |
| `0x008F` | `HALVE_CASH` | - | - | - | ❌ |
| `0x0090` | `SET_ENEMY_SCRIPT` | enemy_id | script | type | ❌ |
| `0x0091` | `BRANCH_NOT_SOLO_ENEMY` | jump | - | - | ❌ |
| `0x0092` | `AWAKEN_POSE` | player_idx | - | - | ❌ |
| `0x0093` | `FADE_IN_OUT` | speed | - | - | ❌ |
| `0x0094` | `BRANCH_EVENT_STATE` | event | state | jump | ❌ |
| `0x0095` | `BRANCH_IN_SCENE` | scene | jump | - | ❌ |
| `0x0096` | `LINGER_FLY` | - | - | - | ❌ |
| `0x0097` | `SHIP_TO_TILE_FAST` | x | y | half | ❌ |
| `0x0098` | `FOLLOW_EVENT` | master | slave | - | ❌ |
| `0x0099` | `SET_SCENE_MAP` | scene | map_id | - | ❌ |
| `0x009A` | `SET_EVENT_SEQ` | front | back | state | ❌ |
| `0x009B` | `FADE_TO_SCENE` | mode | field_id | - | ❌ |
| `0x009C` | `BRANCH_CLONE_FAIL` | qty | jump | - | ❌ |
| `0x009D` | `BRANCH_REVIVE_FAIL` | solo | jump | - | ❌ |
| `0x009E` | `BRANCH_SUMMON_FAIL` | enemy_id | qty | jump | ❌ |
| `0x009F` | `ENEMY_TRANSFORM` | target_id | - | - | ❌ |
| `0x00A0` | `EXIT_GAME` | - | - | - | ❌ |
| `0x00A1` | `UPDATE_PLAYER` | - | - | - | ❌ |
| `0x00A2` | `RANDOM_SKIP` | count | - | - | ❌ |
| `0x00A3` | `PLAY_CD_TRACK` | track | music_id | - | ❌ |
| `0x00A4` | `SCROLL_IMAGE` | field_id | event | speed | ❌ |
| `0x00A5` | `FADE_IMAGE` | field_id | event | speed | ❌ |
| `0x00A6` | `SET_BG_CURRENT` | - | - | - | ❌ |
| `0x00A7` | `ITEM_DESC` | - | - | - | ❌ |
| `0xFFFF` | `SHOW_DIALOGUE` | index | - | - | ✅ |

## Monster Respawn Mechanics
* **Opcode 0x0052 (VANISH)**: Sets `sVanishTime` (default 800 frames / 80 seconds if operand `a=0`). The engine decrements this timer every frame; the object is hidden and non-triggerable while `sVanishTime > 0`. This is the standard "respawn" mechanism.
* **Opcode 0x0049 (SET_EVENT_STATE)**: Directly sets state. If set to `0` (Hidden), the object is permanently removed from the map for the current session.

## Shared Victory/Loss Routines (Dream Edition v2.11)
In the Dream Edition, monsters jump to shared addresses to handle post-battle results:
* **Index 0x9CCF (Victory Path)**: Global monster cleanup.
  * *Original*: Uses `0x0052 a=0` to allow respawning.
  * *Dream v2.11*: Patched to `0x0049 a=0xFFFF b=0` to disable respawning (permanent hide).
* **Index 0x9C9B (Loss Path)**: Game Over logic.
  * Triggers `0x004F` (Fade to Red) and shows message "勝敗乃兵家常事也" (Winning or losing is common for soldiers).

## Canonical Script Shapes
**Pickup Script (Item 91):**
`0x0047 a=0x000B` (PLAY_SOUND) -> `0x003E a=0` (TEXT_CENTER_WINDOW) -> `0xFFFF a=0x0408` (SHOW_DIALOGUE msg[1032]) -> `0x001F a=0x005B` (ADD_ITEM 91) -> `0x0049 a=0xFFFF b=0` (SET_EVENT_STATE Hidden) -> `0x0000` (END)

**Dialogue-Pickup Script (Item 153):**
`0x0047 a=0x000B` -> `0x003D a=0x0003` (TEXT_LOWER_DIALOGUE portrait=3) -> `0xFFFF` (SHOW_DIALOGUE x3) -> `0x0005` (CLEAR_SCREEN) -> `0x003E a=0` (TEXT_CENTER_WINDOW) -> `0xFFFF a=0x0407` (SHOW_DIALOGUE) -> `0x001F a=0x0099` (ADD_ITEM 153) -> `0x0049 a=0xFFFF b=0` -> `0x0000`
