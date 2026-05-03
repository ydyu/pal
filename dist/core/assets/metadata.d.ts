/**
 * Internal subfile indices within SSS.MKF.
 */
export declare enum SssSubfile {
    /** Master templates for all pickable objects and NPCs. */
    EventObjectTemplate = 0,
    /** 300 records defining map/script/object ownership for each scene. */
    SceneTable = 1,
    /** Attributes and script indices for items, skills, and enemies. */
    NameDefinition = 2,
    /** u32 offsets into M.MSG. */
    MessageOffsets = 3,
    /** The global script instruction table (8-byte records). */
    ScriptTable = 4
}
/**
 * Internal subfile indices within DATA.MKF.
 */
export declare enum DataSubfile {
    /** Lists of items sold in each store. */
    StoreItems = 0,
    /** Stats and base properties for every enemy. */
    EnemyData = 1,
    /** Groupings of enemies for random encounters. */
    EnemyTeam = 2,
    /** Initial stats and equipment for the 6 playable characters. */
    PlayerStartingData = 3,
    /** Combat spell properties and damage values. */
    MagicData = 4,
    /** Battlefield background and environmental effects. */
    BattleFieldData = 5,
    /** Defines which level each character learns specific spells. */
    LevelUpMagic = 6,
    /** Experience points required for each level. */
    ExpTable = 14
}
