import { ByteReader } from "../binary.js";
const BIG5_DECODER = new TextDecoder("big5");
/**
 * Decodes a Big5-encoded buffer into a string, stripping null bytes and whitespace.
 */
export function decodeBig5(bytes) {
    return BIG5_DECODER.decode(bytes).replace(/\0/g, "").trim();
}
/**
 * Parses fixed-length 10-byte strings from WORD.DAT.
 * @param source The raw bytes of WORD.DAT.
 * @returns An array of strings.
 */
export function parseWordDat(source) {
    const reader = new ByteReader(source, "WORD.DAT");
    const count = Math.floor(reader.length / 10);
    const words = new Array(count);
    for (let i = 0; i < count; i++) {
        const bytes = reader.subarray(i * 10, (i + 1) * 10);
        words[i] = decodeBig5(bytes);
    }
    return words;
}
/**
 * Parses dialogue strings from M.MSG using the offset table from SSS.MKF subfile [3].
 * @param offsetTable The raw bytes of SSS.MKF subfile [3] (u32 LE offsets).
 * @param messageData The raw bytes of M.MSG.
 * @returns An array of decoded strings.
 */
export function parseMessages(offsetTable, messageData) {
    const tableReader = new ByteReader(offsetTable, "M.MSG offsets");
    const msgReader = new ByteReader(messageData, "M.MSG");
    const count = Math.floor(tableReader.length / 4);
    const messages = new Array(count);
    for (let i = 0; i < count; i++) {
        const start = tableReader.readUint32LE(i * 4);
        const end = i + 1 < count
            ? tableReader.readUint32LE((i + 1) * 4)
            : msgReader.length;
        if (start >= msgReader.length) {
            messages[i] = "";
            continue;
        }
        const bytes = msgReader.subarray(start, Math.min(end, msgReader.length));
        messages[i] = decodeBig5(bytes);
    }
    return messages;
}
//# sourceMappingURL=text.js.map