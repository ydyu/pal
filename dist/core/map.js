import { readUint32LE } from "./binary.js";
/**
 * Iterates over map tiles in rendering order (y -> h -> x).
 * Each map is 128 rows x 64 columns, with 2 staggered tiles per slot.
 */
export function* iterateMapTiles(mapData) {
    if (mapData.length !== 128 * 64 * 2 * 4) {
        throw new Error("Invalid map data length.");
    }
    for (let y = 0; y < 128; y++) {
        for (let h = 0; h < 2; h++) {
            for (let x = 0; x < 64; x++) {
                const tileOffset = ((y * 64 + x) * 2) + h;
                const dword = readUint32LE(mapData, tileOffset * 4);
                const lowerIdx = (dword & 0xff) | ((dword >> 4) & 0x100);
                const upperIdx = (((dword >> 16) & 0xff) | ((dword >> 20) & 0x100)) - 1;
                const lowerHeight = (dword >> 8) & 0x0f;
                const upperHeight = (dword >> 24) & 0x0f;
                yield {
                    x, y, h,
                    px: x * 32 + h * 16 - 16,
                    py: y * 16 + h * 8 - 8,
                    lowerIdx,
                    upperIdx,
                    lowerHeight,
                    upperHeight
                };
            }
        }
    }
}
//# sourceMappingURL=map.js.map