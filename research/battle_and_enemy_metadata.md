# Battle and Enemy Metadata (DATA.MKF)

This document records research into the structures used for battle encounters and enemy properties, primarily stored in `DATA.MKF`.

## File Architecture (DATA.MKF)
Defined in `src/core/assets/metadata.ts` as `DataSubfile`:

| Index | Name | Description | Entry Size |
| :--- | :--- | :--- | :--- |
| **1** | `EnemyData` | Stats and base properties for every enemy. | 70 bytes |
| **2** | `EnemyTeam` | Groupings of enemies for random encounters. | 10 bytes |

## Structure Definitions (from SDLPal)

### Enemy Team (`ENEMYTEAM`)
Used in `START_BATTLE` (opcode 0x0007). Each team consists of up to 5 enemies.

```c
typedef struct tagENEMYTEAM
{
   WORD    rgwEnemy[5]; // 1-based indices into Enemy Data
} ENEMYTEAM;
```
*   **Size:** 10 bytes (5 * 2).
*   **Index:** The `group` parameter in `START_BATTLE` is the index into this table.

### Enemy Data (`ENEMY`)
Defines the combat stats, visual properties, and AI tendencies of an enemy.

```c
typedef struct tagENEMY
{
   WORD        wIdleFrames;         // total number of frames when idle
   WORD        wMagicFrames;        // total number of frames when using magics
   WORD        wAttackFrames;       // total number of frames when doing normal attack
   WORD        wIdleAnimSpeed;      // speed of the animation when idle
   WORD        wActWaitFrames;
   WORD        wYPosOffset;
   SHORT       wAttackSound;        // sound played when this enemy uses normal attack
   SHORT       wActionSound;
   SHORT       wMagicSound;         // sound played when this enemy uses magic
   SHORT       wDeathSound;         // sound played when this enemy dies
   SHORT       wCallSound;          // sound played when entering the battle
   WORD        wHealth;             // total HP of the enemy
   WORD        wExp;                // How many EXPs we'll get for beating this enemy
   WORD        wCash;               // how many cashes we'll get for beating this enemy
   WORD        wLevel;              // this enemy's level
   WORD        wMagic;              // this enemy's magic number (index into Word.dat/MagicData)
   WORD        wMagicRate;          // chance for this enemy to use magic
   WORD        wAttackEquivItem;    // equivalence item of this enemy's normal attack
   WORD        wAttackEquivItemRate;// chance for equivalence item
   WORD        wStealItem;          // which item we'll get when stealing from this enemy
   WORD        nStealItem;          // total amount of the items which can be stolen
   SHORT       wAttackStrength;     // normal attack strength (signed, used as base offset)
   SHORT       wMagicStrength;      // magical attack strength (signed, used as base offset)
   SHORT       wDefense;            // resistance to all kinds of attacking (signed, used as base offset)
   SHORT       wDexterity;          // dexterity (signed)
   WORD        wFleeRate;           // chance for successful fleeing
   WORD        wPoisonResistance;   // resistance to poison
   WORD        wElemResistance[5];  // resistance to elemental magics (Wind, Lightning, Water, Fire, Earth)
   WORD        wPhysicalResistance; // resistance to physical attack (damage divisor)
   WORD        wDualMove;           // whether this enemy can do dual move or not
   WORD        wCollectValue;       // value for collecting this enemy for items
} ENEMY;
```
*   **Size:** 70 bytes.
*   **Negative/Signed Stats:** Attributes like `wAttackStrength`, `wMagicStrength`, `wDefense`, and `wDexterity` are stored as signed 16-bit integers (`SHORT`). These negative values are not bugs but rather offsets applied against dynamic Level-scaled base values.

## Battle Calculations

### Level-Based Stat Scaling
The actual "effective" attack and defense stats of an enemy in battle are dynamically calculated based on their `wLevel`. The signed `wAttackStrength` and `wDefense` values in `DATA.MKF` act as fine-tuning offsets to these level-scaled baselines.

```c
Effective Attack = wAttackStrength + (wLevel + 6) * 6
Effective Defense = wDefense + (wLevel + 6) * 4
```
**Example:** A Slime (ID 1) has Level 0, `wAttackStrength` = -1, and `wDefense` = -6.
*   `Effective Attack` = -1 + (0 + 6) * 6 = 35
*   `Effective Defense` = -6 + (0 + 6) * 4 = 18

### Physical Damage Formula
When a physical attack is executed (Player vs Enemy or Enemy vs Player), the base damage is calculated using the effective attack and defense stats:

```c
if (Attack > Defense) {
    Base Damage = (Attack * 2) - (Defense * 1.6) + 0.5
} else if (Attack > Defense * 0.6) {
    Base Damage = Attack - (Defense * 0.6) + 0.5
} else {
    Base Damage = 0 // Attack is too weak to penetrate armor
}
```

The resulting `Base Damage` is then modified by:
1.  **Physical Resistance:** Damage is divided by the defender's `wPhysicalResistance` (e.g., Slime has 2, halving physical damage; Half-Zombie has 1, taking full damage).
2.  **Critical Hits:** Multiplied by 3 for a critical hit (or 2 for a specific bonus for Li Xiaoyao).
3.  **Variance:** A random float or integer variance is added/multiplied to the final damage.

### Magic Damage Formula
When an enemy uses magic (`wMagic` > 0), the base damage does not scale from their physical attack. Instead:
1.  The base damage comes from the spell definition in `MagicData` (`DATA.MKF` sub 4).
2.  The enemy's `wMagicStrength` offset is added to this base spell damage.
3.  The player's elemental resistances are factored against the final sum.

## Enemy Naming and WORD.DAT

Enemy names are not stored in `DATA.MKF`. Instead, they are retrieved from `WORD.DAT` using a mapping defined in `SSS.MKF sub[2]` (Name Definitions).

- **WORD.DAT Range:** `0x18E` - `0x226` (398 - 550) are designated for enemies.
- **Mapping:** Each entry in `sub[2]` corresponds to an entry in `WORD.DAT`. For the enemy range:
  - `V1` (u16): Internal enemy index (points to `DATA.MKF sub[1]`).
  - `V3`, `V4`, `V5`: Script indices for pre-battle, post-battle, and action scripts.

Example: `WORD.DAT` index 398 ("史萊姆") has `V1=1` in `sub[2]`, which corresponds to the first entry in `EnemyData`.
