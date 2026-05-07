import { ByteReader } from "../binary.js";

export interface ItemFlags {
  usable: boolean;
  equippable: boolean;
  throwable: boolean;
  consuming: boolean;
  applyToAll: boolean;
  sellable: boolean;
  equippableByRole: boolean[]; // 6 roles
}

export interface Item {
  /** The WORD.DAT index (Global Object ID). */
  id: number;
  /** The item's display name from WORD.DAT. */
  name: string;
  /** Sprite index in BALL.MKF. */
  spriteId: number;
  /** Selling/Buying price. */
  price: number;
  /** Script index for "Use" trigger. */
  scriptOnUse: number;
  /** Script index for "Equip" trigger. */
  scriptOnEquip: number;
  /** Script index for "Throw" trigger. */
  scriptOnThrow: number;
  /** Script index for item description (optional, Win version). */
  scriptDesc?: number;
  /** Decoded bitmask flags. */
  flags: ItemFlags;
}

/**
 * Parses the NameDefinition subfile (SSS.MKF[2]) into a list of items.
 * 
 * @param chunk The raw NameDefinition chunk.
 * @param getWord Callback to get the item's name by its WORD.DAT ID.
 * @returns A dense array of items where indices 61-294 contain item data.
 */
export function parseItemTable(
  chunk: Uint8Array,
  getWord: (id: number) => string
): (Item | undefined)[] {
  const reader = new ByteReader(chunk, "NameDefinition");
  const items: (Item | undefined)[] = new Array(295).fill(undefined);

  // Detect record size: 12 bytes (DOS) or 14 bytes (Windows)
  const recordSize = chunk.length % 14 === 0 ? 14 : 12;

  // We loop from 61 to 294 (inclusive) which are the known item IDs.
  for (let id = 61; id <= 294; id++) {
    const offset = id * recordSize;
    if (offset + recordSize > chunk.length) break;

    const spriteId = reader.readUint16LE(offset + 0);
    const price = reader.readUint16LE(offset + 2);
    const scriptOnUse = reader.readUint16LE(offset + 4);
    const scriptOnEquip = reader.readUint16LE(offset + 6);
    const scriptOnThrow = reader.readUint16LE(offset + 8);

    let scriptDesc: number | undefined;
    let flagsRaw: number;

    if (recordSize === 14) {
      scriptDesc = reader.readUint16LE(offset + 10);
      flagsRaw = reader.readUint16LE(offset + 12);
    } else {
      flagsRaw = reader.readUint16LE(offset + 10);
    }

    const item: Item = {
      id,
      name: getWord(id),
      spriteId,
      price,
      scriptOnUse,
      scriptOnEquip,
      scriptOnThrow,
      flags: parseItemFlags(flagsRaw),
    };

    if (scriptDesc !== undefined) {
      item.scriptDesc = scriptDesc;
    }

    items[id] = item;
  }

  return items;
}

function parseItemFlags(flags: number): ItemFlags {
  return {
    usable: !!(flags & 0x0001),
    equippable: !!(flags & 0x0002),
    throwable: !!(flags & 0x0004),
    consuming: !!(flags & 0x0008),
    applyToAll: !!(flags & 0x0010),
    sellable: !!(flags & 0x0020),
    equippableByRole: [
      !!(flags & 0x0040),
      !!(flags & 0x0080),
      !!(flags & 0x0100),
      !!(flags & 0x0200),
      !!(flags & 0x0400),
      !!(flags & 0x0800),
    ],
  };
}
