import { ByteReader, toSigned16 } from "../binary.js";
/**
 * Common PAL script opcodes.
 */
export var Opcode;
(function (Opcode) {
    Opcode[Opcode["STOP_EXECUTION"] = 0] = "STOP_EXECUTION";
    Opcode[Opcode["STOP_AND_ADVANCE"] = 1] = "STOP_AND_ADVANCE";
    Opcode[Opcode["STOP_AND_CHANGE"] = 2] = "STOP_AND_CHANGE";
    Opcode[Opcode["JUMP"] = 3] = "JUMP";
    Opcode[Opcode["CALL_SCRIPT"] = 4] = "CALL_SCRIPT";
    Opcode[Opcode["CLEAR_SCREEN"] = 5] = "CLEAR_SCREEN";
    Opcode[Opcode["RANDOM_JUMP"] = 6] = "RANDOM_JUMP";
    Opcode[Opcode["START_BATTLE"] = 7] = "START_BATTLE";
    Opcode[Opcode["CONTINUE_NEXT"] = 8] = "CONTINUE_NEXT";
    Opcode[Opcode["WAIT_STOP_MOVE"] = 9] = "WAIT_STOP_MOVE";
    Opcode[Opcode["CHOICE_DIALOGUE"] = 10] = "CHOICE_DIALOGUE";
    Opcode[Opcode["WALK_WEST"] = 11] = "WALK_WEST";
    Opcode[Opcode["WALK_NORTH"] = 12] = "WALK_NORTH";
    Opcode[Opcode["WALK_EAST"] = 13] = "WALK_EAST";
    Opcode[Opcode["WALK_SOUTH"] = 14] = "WALK_SOUTH";
    Opcode[Opcode["SET_DIRECTION"] = 15] = "SET_DIRECTION";
    Opcode[Opcode["WALK_TO_TILE"] = 16] = "WALK_TO_TILE";
    Opcode[Opcode["WALK_TO_TILE_SLOW"] = 17] = "WALK_TO_TILE_SLOW";
    Opcode[Opcode["MOVE_EVENT_REL"] = 18] = "MOVE_EVENT_REL";
    Opcode[Opcode["SET_EVENT_POS"] = 19] = "SET_EVENT_POS";
    Opcode[Opcode["SET_EVENT_IMAGE"] = 20] = "SET_EVENT_IMAGE";
    Opcode[Opcode["SET_EVENT_ANIM"] = 22] = "SET_EVENT_ANIM";
    Opcode[Opcode["SET_TRIGGER_SCRIPT"] = 37] = "SET_TRIGGER_SCRIPT";
    Opcode[Opcode["SET_PLAYER_IMAGE"] = 49] = "SET_PLAYER_IMAGE";
    Opcode[Opcode["TELEPORT_OUT"] = 56] = "TELEPORT_OUT";
    Opcode[Opcode["TEXT_CENTER_NARRATOR"] = 59] = "TEXT_CENTER_NARRATOR";
    Opcode[Opcode["TEXT_UPPER_DIALOGUE"] = 60] = "TEXT_UPPER_DIALOGUE";
    Opcode[Opcode["TEXT_LOWER_DIALOGUE"] = 61] = "TEXT_LOWER_DIALOGUE";
    Opcode[Opcode["TEXT_CENTER_WINDOW"] = 62] = "TEXT_CENTER_WINDOW";
    Opcode[Opcode["SET_TRIGGER_MODE"] = 64] = "SET_TRIGGER_MODE";
    Opcode[Opcode["PLAY_MUSIC"] = 67] = "PLAY_MUSIC";
    Opcode[Opcode["SET_PARTY_POS"] = 70] = "SET_PARTY_POS";
    Opcode[Opcode["PLAY_SOUND"] = 71] = "PLAY_SOUND";
    Opcode[Opcode["SET_EVENT_STATE"] = 73] = "SET_EVENT_STATE";
    Opcode[Opcode["ADD_CASH"] = 30] = "ADD_CASH";
    Opcode[Opcode["ADD_ITEM"] = 31] = "ADD_ITEM";
    Opcode[Opcode["REMOVE_ITEM"] = 32] = "REMOVE_ITEM";
    Opcode[Opcode["SCREEN_FADE_RED"] = 79] = "SCREEN_FADE_RED";
    Opcode[Opcode["FADE_OUT"] = 80] = "FADE_OUT";
    Opcode[Opcode["FADE_IN"] = 81] = "FADE_IN";
    Opcode[Opcode["VANISH"] = 82] = "VANISH";
    Opcode[Opcode["USE_DAY_PALETTE"] = 83] = "USE_DAY_PALETTE";
    Opcode[Opcode["USE_NIGHT_PALETTE"] = 84] = "USE_NIGHT_PALETTE";
    Opcode[Opcode["LEARN_MAGIC"] = 85] = "LEARN_MAGIC";
    Opcode[Opcode["CHANGE_SCENE"] = 89] = "CHANGE_SCENE";
    Opcode[Opcode["MOVE_EVENT_REL_MULTI"] = 108] = "MOVE_EVENT_REL_MULTI";
    Opcode[Opcode["TOGGLE_PALETTE_MODE"] = 128] = "TOGGLE_PALETTE_MODE";
    Opcode[Opcode["WAIT"] = 133] = "WAIT";
    Opcode[Opcode["OBJ_IDLE_WALK"] = 135] = "OBJ_IDLE_WALK";
    Opcode[Opcode["SET_PALETTE_INDEX"] = 139] = "SET_PALETTE_INDEX";
    Opcode[Opcode["COLOR_FADE"] = 140] = "COLOR_FADE";
    Opcode[Opcode["CLEAR_TEXT"] = 142] = "CLEAR_TEXT";
    Opcode[Opcode["SHOW_DIALOGUE"] = 65535] = "SHOW_DIALOGUE";
})(Opcode || (Opcode = {}));
/**
 * The single source of truth for PAL script opcodes and their parameters.
 */
export const OPCODE_DEFINITIONS = {
    [Opcode.STOP_EXECUTION]: { name: "STOP_EXECUTION" },
    [Opcode.STOP_AND_ADVANCE]: { name: "STOP_AND_ADVANCE" },
    [Opcode.STOP_AND_CHANGE]: { name: "STOP_AND_CHANGE", a: { label: "next", type: "script" }, b: { label: "loops", type: "number" } },
    [Opcode.JUMP]: { name: "JUMP", a: { label: "target", type: "script" }, b: { label: "loops", type: "number" } },
    [Opcode.CALL_SCRIPT]: { name: "CALL_SCRIPT", a: { label: "script", type: "script" }, b: { label: "event", type: "event" } },
    [Opcode.CLEAR_SCREEN]: { name: "CLEAR_SCREEN", b: { label: "delay", type: "number" }, c: { label: "update_gestures", type: "boolean" } },
    [Opcode.RANDOM_JUMP]: { name: "RANDOM_JUMP", a: { label: "rate", type: "number" }, b: { label: "target", type: "script" } },
    [Opcode.START_BATTLE]: { name: "START_BATTLE", a: { label: "group", type: "battleGroup" }, b: { label: "lost_jump", type: "script" }, c: { label: "flee_jump", type: "script" } },
    [Opcode.CONTINUE_NEXT]: { name: "CONTINUE_NEXT" },
    [Opcode.WAIT_STOP_MOVE]: { name: "WAIT_STOP_MOVE", a: { label: "frames", type: "number" }, c: { label: "update_gestures", type: "boolean" } },
    [Opcode.CHOICE_DIALOGUE]: { name: "CHOICE_DIALOGUE", a: { label: "target", type: "script" } },
    [Opcode.WALK_WEST]: { name: "WALK_WEST" },
    [Opcode.WALK_NORTH]: { name: "WALK_NORTH" },
    [Opcode.WALK_EAST]: { name: "WALK_EAST" },
    [Opcode.WALK_SOUTH]: { name: "WALK_SOUTH" },
    [Opcode.SET_DIRECTION]: { name: "SET_DIRECTION", a: { label: "dir", type: "number" }, b: { label: "frame", type: "worldFrame" } },
    [Opcode.WALK_TO_TILE]: { name: "WALK_TO_TILE", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
    [Opcode.WALK_TO_TILE_SLOW]: { name: "WALK_TO_TILE_SLOW", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
    [Opcode.MOVE_EVENT_REL]: { name: "MOVE_EVENT_REL", a: { label: "event", type: "event" }, b: { label: "dx", type: "number" }, c: { label: "dy", type: "number" } },
    [Opcode.SET_EVENT_POS]: { name: "SET_EVENT_POS", a: { label: "event", type: "event" }, b: { label: "x", type: "number" }, c: { label: "y", type: "number" } },
    [Opcode.SET_EVENT_IMAGE]: { name: "SET_EVENT_IMAGE", a: { label: "frame", type: "worldFrame" } },
    [Opcode.SET_EVENT_ANIM]: { name: "SET_EVENT_ANIM", a: { label: "event", type: "event" }, b: { label: "direction", type: "number" }, c: { label: "frame", type: "worldFrame" } },
    [Opcode.SET_TRIGGER_SCRIPT]: { name: "SET_TRIGGER_SCRIPT", a: { label: "event", type: "event" }, b: { label: "script", type: "script" } },
    [Opcode.SET_PLAYER_IMAGE]: { name: "SET_PLAYER_IMAGE", a: { label: "img", type: "battleSprite" } },
    [Opcode.TELEPORT_OUT]: { name: "TELEPORT_OUT", a: { label: "failure_jump", type: "script" } },
    [Opcode.TEXT_CENTER_NARRATOR]: { name: "TEXT_CENTER_NARRATOR", a: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
    [Opcode.TEXT_UPPER_DIALOGUE]: { name: "TEXT_UPPER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
    [Opcode.TEXT_LOWER_DIALOGUE]: { name: "TEXT_LOWER_DIALOGUE", a: { label: "portrait", type: "portrait" }, b: { label: "color", type: "number" }, c: { label: "anim", type: "boolean" } },
    [Opcode.TEXT_CENTER_WINDOW]: { name: "TEXT_CENTER_WINDOW", a: { label: "color", type: "number" } },
    [Opcode.SET_TRIGGER_MODE]: { name: "SET_TRIGGER_MODE", a: { label: "event", type: "event" }, b: { label: "mode", type: "number" } },
    [Opcode.PLAY_MUSIC]: { name: "PLAY_MUSIC", a: { label: "music", type: "music" }, b: { label: "loop", type: "number" } },
    [Opcode.SET_PARTY_POS]: { name: "SET_PARTY_POS", a: { label: "x", type: "number" }, b: { label: "y", type: "number" }, c: { label: "half", type: "boolean" } },
    [Opcode.PLAY_SOUND]: { name: "PLAY_SOUND", a: { label: "sound", type: "sound" } },
    [Opcode.SET_EVENT_STATE]: { name: "SET_EVENT_STATE", a: { label: "event", type: "event" }, b: { label: "state", type: "number" } },
    [Opcode.ADD_CASH]: { name: "ADD_CASH", a: { label: "amount", type: "signed" }, b: { label: "failure_jump", type: "script" } },
    [Opcode.ADD_ITEM]: { name: "ADD_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" } },
    [Opcode.REMOVE_ITEM]: { name: "REMOVE_ITEM", a: { label: "item", type: "item" }, b: { label: "qty", type: "signed" }, c: { label: "failure_jump", type: "script" } },
    [Opcode.FADE_OUT]: { name: "FADE_OUT", a: { label: "fast", type: "boolean" } },
    [Opcode.FADE_IN]: { name: "FADE_IN", a: { label: "fast", type: "boolean" } },
    [Opcode.SCREEN_FADE_RED]: { name: "SCREEN_FADE_RED" },
    [Opcode.VANISH]: { name: "VANISH", a: { label: "frames", type: "number" } },
    [Opcode.USE_DAY_PALETTE]: { name: "USE_DAY_PALETTE" },
    [Opcode.USE_NIGHT_PALETTE]: { name: "USE_NIGHT_PALETTE" },
    [Opcode.LEARN_MAGIC]: { name: "LEARN_MAGIC", a: { label: "magic", type: "magic" }, b: { label: "player", type: "number" } },
    [Opcode.CHANGE_SCENE]: { name: "CHANGE_SCENE", a: { label: "scene", type: "scene" } },
    [Opcode.MOVE_EVENT_REL_MULTI]: { name: "MOVE_EVENT_REL_MULTI", a: { label: "event", type: "event" }, b: { label: "dx", type: "signed" }, c: { label: "dy", type: "signed" } },
    [Opcode.TOGGLE_PALETTE_MODE]: { name: "TOGGLE_PALETTE_MODE", a: { label: "skip_update", type: "boolean" } },
    [Opcode.WAIT]: { name: "WAIT", a: { label: "delay", type: "number" } },
    [Opcode.OBJ_IDLE_WALK]: { name: "OBJ_IDLE_WALK" },
    [Opcode.SET_PALETTE_INDEX]: { name: "SET_PALETTE_INDEX", a: { label: "index", type: "number" } },
    [Opcode.COLOR_FADE]: { name: "COLOR_FADE", a: { label: "color", type: "number" }, b: { label: "delay", type: "number" }, c: { label: "from", type: "boolean" } },
    [Opcode.CLEAR_TEXT]: { name: "CLEAR_TEXT" },
    [Opcode.SHOW_DIALOGUE]: { name: "SHOW_DIALOGUE", a: { label: "index", type: "dialogue" } },
};
/**
 * Parses a script starting at a specific instruction index.
 * Continues reading instructions until a STOP opcode is encountered or a limit is reached.
 *
 * @param source The full SSS.MKF subfile [4] (script operation table).
 * @param startIndex The 0-based index to start reading from.
 * @param context Optional context to resolve item names and dialogues during parsing.
 * @param limit Maximum number of instructions to read.
 * @returns An array of Instructions.
 */
export function parseScript(source, startIndex, limit = 256) {
    const reader = new ByteReader(source, "scripts");
    const totalInstructions = Math.floor(reader.length / 8);
    const script = [];
    for (let i = 0; i < limit; i++) {
        const idx = startIndex + i;
        if (idx < 0 || idx >= totalInstructions)
            break;
        const offset = idx * 8;
        const op = reader.readUint16LE(offset);
        const a = reader.readUint16LE(offset + 2);
        const b = reader.readUint16LE(offset + 4);
        const c = reader.readUint16LE(offset + 6);
        const def = OPCODE_DEFINITIONS[op] || { name: `UNKNOWN_0x${op.toString(16).toUpperCase()}` };
        const params = [];
        const rawVals = [a, b, c];
        const pDefs = [def.a, def.b, def.c];
        for (let j = 0; j < 3; j++) {
            const pDef = pDefs[j];
            if (!pDef)
                continue;
            const val = rawVals[j];
            const param = { label: pDef.label, type: pDef.type, raw: val };
            params.push(param);
        }
        script.push({
            index: idx,
            op,
            name: def.name,
            params
        });
        if (op === Opcode.STOP_EXECUTION || op === Opcode.JUMP) {
            break;
        }
    }
    return script;
}
export function collectScriptRewards(source, startIndex, context, options = {}) {
    const reader = new ByteReader(source, "scripts");
    const totalInstructions = Math.floor(reader.length / 8);
    const instructionLimit = options.instructionLimit ?? 100;
    const maxCallDepth = options.maxCallDepth ?? 2;
    const rewards = [];
    const callStack = new Set();
    let instructionsRead = 0;
    const visit = (entryIndex, depth) => {
        if (depth > maxCallDepth || entryIndex < 0 || entryIndex >= totalInstructions || callStack.has(entryIndex)) {
            return;
        }
        callStack.add(entryIndex);
        const visitedEntries = new Set();
        let currentIndex = entryIndex;
        while (currentIndex >= 0 && currentIndex < totalInstructions && instructionsRead < instructionLimit) {
            if (visitedEntries.has(currentIndex)) {
                break;
            }
            visitedEntries.add(currentIndex);
            instructionsRead++;
            const offset = currentIndex * 8;
            const op = reader.readUint16LE(offset);
            const a = reader.readUint16LE(offset + 2);
            const b = reader.readUint16LE(offset + 4);
            switch (op) {
                case Opcode.STOP_EXECUTION:
                    currentIndex = -1;
                    break;
                case Opcode.STOP_AND_ADVANCE:
                    currentIndex++;
                    break;
                case Opcode.STOP_AND_CHANGE:
                    currentIndex = -1;
                    break;
                case Opcode.CALL_SCRIPT:
                    visit(a, depth + 1);
                    currentIndex++;
                    break;
                case Opcode.ADD_CASH:
                    rewards.push({
                        kind: "cash",
                        amount: toSigned16(a),
                    });
                    currentIndex++;
                    break;
                case Opcode.ADD_ITEM:
                    rewards.push({
                        kind: "item",
                        itemId: a,
                        quantity: toSigned16(b) === 0 ? 1 : toSigned16(b),
                        name: context.getWord(a),
                    });
                    currentIndex++;
                    break;
                default:
                    currentIndex++;
                    break;
            }
        }
        callStack.delete(entryIndex);
    };
    visit(startIndex, 0);
    return rewards;
}
/**
 * Formats a decoded instruction into a human-readable string.
 */
export function formatInstruction(inst, context) {
    const parts = inst.params.map(p => {
        if (p.type === "dialogue") {
            const text = context?.getDialogue(p.raw);
            return text !== undefined ? `'${text.replace(/\n/g, "\\n")}'` : `'<msg ${p.raw}>'`;
        }
        if (p.type === "word" || p.type === "item") {
            const text = context?.getWord(p.raw);
            return text !== undefined ? `${p.label}=${text} (${p.raw})` : `${p.label}=${p.raw}`;
        }
        if (p.type === "script") {
            return `${p.label}=0x${p.raw.toString(16).padStart(4, "0").toUpperCase()}`;
        }
        if (p.type === "signed") {
            return `${p.label}=${toSigned16(p.raw)}`;
        }
        return `${p.label}=${p.raw}`;
    });
    return `  ${inst.name.padEnd(18)} ${parts.join(" ")}`.trimEnd();
}
/**
 * Heuristically identifies a descriptive label for a script (e.g., character name or item).
 */
export function getScriptSummary(source, startIndex, context) {
    if (startIndex === undefined)
        return "";
    const insts = parseScript(source, startIndex, 10);
    for (const inst of insts) {
        if (inst.op === Opcode.SHOW_DIALOGUE) {
            const param = inst.params.find(p => p.type === "dialogue");
            if (param)
                return context.getDialogue(param.raw).split("\n")[0]?.substring(0, 20) ?? "";
        }
        if (inst.op === Opcode.ADD_ITEM) {
            const param = inst.params.find(p => p.type === "item");
            if (param)
                return `[ITEM] ${context.getWord(param.raw)}`;
        }
    }
    return "";
}
//# sourceMappingURL=scripts.js.map