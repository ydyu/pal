import { isRectVisible, getSpriteBounds, } from "./bounds.js";
/**
 * Coordinates the high-level rendering of a map and its sprites.
 * Implements SDLPAL's 2-phase rendering:
 * Phase 1 (Background): Render all lower tiles, then all upper tiles.
 * Phase 2 (Sorted Sprites/Blockers): Collect sprites and blocker tiles, sort by world Y, render.
 */
export class SceneEngine {
    blitter;
    constructor(blitter) {
        this.blitter = blitter;
    }
    /**
     * Renders the map and sprites to a surface using 2-phase rendering.
     *
     * Phase 1 (Background): Draws all map tiles in depth order without sprites.
     * Phase 2 (Sorted Sprites/Blockers): Collects sprites and "blocker" tiles (height > 0),
     * sorts by calculated Y coordinate, and renders in correct depth order.
     *
     * @param surface Target surface.
     * @param map The map grid and tile-set.
     * @param sprites List of sprites to draw.
     * @param viewport The visible area.
     */
    render(surface, map, sprites, viewport) {
        this.renderBackgroundPhase(surface, map, viewport);
        this.renderSpritesPhase(surface, map, sprites, viewport);
    }
    /**
     * Phase 1: Background Rendering
     * Draws all lower tiles, then all upper tiles in (y, h, x) order.
     * No sprites are rendered in this phase.
     */
    renderBackgroundPhase(surface, map, viewport) {
        // Draw all lower tiles first (Layer 0)
        for (const tile of map.tiles) {
            // Skip tiles outside viewport
            if (!isRectVisible({ x: tile.px, y: tile.py, width: 32, height: 32 }, viewport)) {
                continue;
            }
            this.blitter.drawSpriteFrame(surface, map.tileSet, tile.lowerIdx, tile.px - viewport.x, tile.py - viewport.y, `map:${map.id}`);
        }
        // Draw all upper tiles (Layer 1)
        for (const tile of map.tiles) {
            if (tile.upperIdx < 0)
                continue; // Skip if no upper tile
            // Skip tiles outside viewport
            if (!isRectVisible({ x: tile.px, y: tile.py, width: 32, height: 32 }, viewport)) {
                continue;
            }
            this.blitter.drawSpriteFrame(surface, map.tileSet, tile.upperIdx, tile.px - viewport.x, tile.py - viewport.y, `map:${map.id}`);
        }
    }
    /**
     * Phase 2: Sorted Sprites and Blocker Tiles
     * 1. Collect all sprites with sorting Y = world_y + (sLayer * 8) + 9
     * 2. Collect "blocker" tiles (height > 0) that overlap each sprite's bounding box
     * 3. Sort unified list by world Y coordinate
     * 4. Render in sorted order
     */
    renderSpritesPhase(surface, map, sprites, viewport) {
        const tileIndex = this.indexTiles(map.tiles);
        const seenBlockers = new Set();
        const toSort = [];
        let order = 0;
        for (const sprite of sprites) {
            const item = this.createSpriteItem(sprite);
            if (!item) {
                continue;
            }
            item.order = order++;
            toSort.push(item);
            this.collectBlockerTiles(item, map, tileIndex, seenBlockers, toSort, () => order++);
        }
        toSort.sort((a, b) => a.bounds.sortY - b.bounds.sortY || a.order - b.order);
        for (const item of toSort) {
            if (!isRectVisible(item.bounds, viewport)) {
                continue;
            }
            this.blitter.drawPixels(surface, item.frame, item.bounds.x - viewport.x, item.bounds.y - viewport.y);
        }
    }
    createSpriteItem(sprite) {
        const frame = this.blitter.getFrame(sprite.directory, sprite.frameIndex);
        if (!frame) {
            return null;
        }
        return {
            bounds: getSpriteBounds(sprite.x, sprite.y, sprite.sLayer, frame.width, frame.height, sprite.sortOffsetY, sprite.layerOffset),
            frame,
            order: -1,
        };
    }
    collectBlockerTiles(sprite, map, tileIndex, seenBlockers, toSort, nextOrder) {
        const sx = sprite.bounds.x + Math.trunc(sprite.frame.width / 2) - Math.trunc(sprite.bounds.layerOffset / 2);
        const sy = sprite.bounds.sortY - sprite.bounds.layerOffset;
        const sh = sx % 32 !== 0 ? 1 : 0;
        const widthHalf = Math.trunc(sprite.frame.width / 2);
        const xStart = Math.trunc((sx - widthHalf) / 32);
        const xEnd = Math.trunc((sx + widthHalf) / 32);
        const yStart = Math.trunc((sy - sprite.frame.height - 15) / 16);
        const yEnd = Math.trunc(sy / 16);
        for (let y = yStart; y <= yEnd; y++) {
            for (let x = xStart; x <= xEnd; x++) {
                for (let i = x === xStart ? 0 : 3; i < 5; i++) {
                    const { dx, dy, dh } = this.resolveCoverTilePoint(x, y, sh, i);
                    this.tryAddCoverTile(dx, dy, dh, 0, sy, map, tileIndex, seenBlockers, toSort, nextOrder);
                    this.tryAddCoverTile(dx, dy, dh, 1, sy, map, tileIndex, seenBlockers, toSort, nextOrder);
                }
            }
        }
    }
    tryAddCoverTile(dx, dy, dh, layer, spriteBaseY, map, tileIndex, seenBlockers, toSort, nextOrder) {
        const tile = tileIndex.get(this.tileKey(dx, dy, dh));
        if (!tile) {
            return;
        }
        const tileIdx = layer === 0 ? tile.lowerIdx : tile.upperIdx;
        const tileHeight = layer === 0 ? tile.lowerHeight : tile.upperHeight;
        if (tileIdx < 0 || tileHeight <= 0 || (dy + tileHeight) * 16 + dh * 8 < spriteBaseY) {
            return;
        }
        const key = `${dx}:${dy}:${dh}:${layer}`;
        if (seenBlockers.has(key)) {
            return;
        }
        const frame = this.blitter.getFrame(map.tileSet, tileIdx, `map:${map.id}`);
        if (!frame) {
            return;
        }
        seenBlockers.add(key);
        const sortY = dy * 16 + dh * 8 + 7 + layer + tileHeight * 8;
        const layerOffset = tileHeight * 8 + layer;
        const worldX = dx * 32 + dh * 16 - 16;
        const worldY = sortY - frame.height - layerOffset;
        toSort.push({
            bounds: {
                x: worldX,
                y: worldY,
                width: frame.width,
                height: frame.height,
                sortY,
                layerOffset,
            },
            frame,
            order: nextOrder(),
        });
    }
    resolveCoverTilePoint(x, y, sh, index) {
        switch (index) {
            case 0:
                return { dx: x, dy: y, dh: sh };
            case 1:
                return { dx: x - 1, dy: y, dh: sh };
            case 2:
                return {
                    dx: sh ? x : x - 1,
                    dy: sh ? y + 1 : y,
                    dh: (1 - sh),
                };
            case 3:
                return { dx: x + 1, dy: y, dh: sh };
            default:
                return {
                    dx: sh ? x + 1 : x,
                    dy: sh ? y + 1 : y,
                    dh: (1 - sh),
                };
        }
    }
    indexTiles(tiles) {
        const index = new Map();
        for (const tile of tiles) {
            index.set(this.tileKey(tile.x, tile.y, tile.h), tile);
        }
        return index;
    }
    tileKey(x, y, h) {
        return `${x}:${y}:${h}`;
    }
}
//# sourceMappingURL=scene-engine.js.map