/**
 * Internal subfile indices within SSS.MKF.
 */
export var SssSubfile;
(function (SssSubfile) {
    /** Master templates for all pickable objects and NPCs. */
    SssSubfile[SssSubfile["EventObjectTemplate"] = 0] = "EventObjectTemplate";
    /** 300 records defining map/script/object ownership for each scene. */
    SssSubfile[SssSubfile["SceneTable"] = 1] = "SceneTable";
    /** Attributes and script indices for items, skills, and enemies. */
    SssSubfile[SssSubfile["NameDefinition"] = 2] = "NameDefinition";
    /** u32 offsets into M.MSG. */
    SssSubfile[SssSubfile["MessageOffsets"] = 3] = "MessageOffsets";
    /** The global script instruction table (8-byte records). */
    SssSubfile[SssSubfile["ScriptTable"] = 4] = "ScriptTable";
})(SssSubfile || (SssSubfile = {}));
/**
 * Internal subfile indices within DATA.MKF.
 */
export var DataSubfile;
(function (DataSubfile) {
    /** Lists of items sold in each store. */
    DataSubfile[DataSubfile["StoreItems"] = 0] = "StoreItems";
    /** Stats and base properties for every enemy. */
    DataSubfile[DataSubfile["EnemyData"] = 1] = "EnemyData";
    /** Groupings of enemies for random encounters. */
    DataSubfile[DataSubfile["EnemyTeam"] = 2] = "EnemyTeam";
    /** Initial stats and equipment for the 6 playable characters. */
    DataSubfile[DataSubfile["PlayerStartingData"] = 3] = "PlayerStartingData";
    /** Combat spell properties and damage values. */
    DataSubfile[DataSubfile["MagicData"] = 4] = "MagicData";
    /** Battlefield background and environmental effects. */
    DataSubfile[DataSubfile["BattleFieldData"] = 5] = "BattleFieldData";
    /** Defines which level each character learns specific spells. */
    DataSubfile[DataSubfile["LevelUpMagic"] = 6] = "LevelUpMagic";
    /** Experience points required for each level. */
    DataSubfile[DataSubfile["ExpTable"] = 14] = "ExpTable";
})(DataSubfile || (DataSubfile = {}));
//# sourceMappingURL=metadata.js.map