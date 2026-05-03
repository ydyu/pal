import { type Surface } from "./surface.js";
import { type Blitter } from "./blitter.js";
import { type PalMap, type MapTile } from "../map.js";
import { type RleFrame, type SpriteDirectory } from "../codecs/rle.js";
import {
  type Viewport,
  isRectVisible,
  getSpriteBounds,
  type SpriteBounds,
} from "./bounds.js";

/**
 * Represents a sprite to be rendered within the scene.
 */
export interface RenderableSprite {
  /** The sprite's pixel graphics. */
  directory: SpriteDirectory;
  /** Frame index within the directory. */
  frameIndex: number;
  /** World X pixel coordinate. */
  x: number;
  /** World Y pixel coordinate. */
  y: number;
  /** PAL event-object logical layer. */
  sLayer: number;
  /** Optional exact sort offset; defaults to PAL event-object math. */
  sortOffsetY?: number;
  /** Optional exact layer offset; defaults to PAL event-object math. */
  layerOffset?: number;
  /** 
   * The sprite's "anchor" tile (used for depth sorting).
   * If not provided, it will be calculated from the pixel coordinates.
   */
  anchorTile?: { x: number; y: number; h: number };
}

interface SortableDrawItem {
  /** Bounding box in world coordinates. */
  bounds: SpriteBounds;
  frame: RleFrame;
  order: number;
}

/**
 * Coordinates the high-level rendering of a map and its sprites.
 * Implements SDLPAL's 2-phase rendering:
 * Phase 1 (Background): Render all lower tiles, then all upper tiles.
 * Phase 2 (Sorted Sprites/Blockers): Collect sprites and blocker tiles, sort by world Y, render.
 */
export class SceneEngine {
  constructor(private blitter: Blitter) {}

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
  public render(
    surface: Surface,
    map: PalMap,
    sprites: RenderableSprite[],
    viewport: Viewport
  ): void {
    this.renderBackgroundPhase(surface, map, viewport);
    this.renderSpritesPhase(surface, map, sprites, viewport);
  }

  /**
   * Phase 1: Background Rendering
   * Draws all lower tiles, then all upper tiles in (y, h, x) order.
   * No sprites are rendered in this phase.
   */
  private renderBackgroundPhase(
    surface: Surface,
    map: PalMap,
    viewport: Viewport
  ): void {
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
      if (tile.upperIdx < 0) continue; // Skip if no upper tile

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
  private renderSpritesPhase(
    surface: Surface,
    map: PalMap,
    sprites: RenderableSprite[],
    viewport: Viewport
  ): void {
    const tileIndex = this.indexTiles(map.tiles);
    const seenBlockers = new Set<string>();
    const toSort: SortableDrawItem[] = [];
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

  private createSpriteItem(
    sprite: RenderableSprite
  ): SortableDrawItem | null {
    const frame = this.blitter.getFrame(sprite.directory, sprite.frameIndex);
    if (!frame) {
      return null;
    }

    return {
      bounds: getSpriteBounds(
        sprite.x,
        sprite.y,
        sprite.sLayer,
        frame.width,
        frame.height,
        sprite.sortOffsetY,
        sprite.layerOffset
      ),
      frame,
      order: -1,
    };
  }

  private collectBlockerTiles(
    sprite: SortableDrawItem,
    map: PalMap,
    tileIndex: Map<string, MapTile>,
    seenBlockers: Set<string>,
    toSort: SortableDrawItem[],
    nextOrder: () => number
  ): void {
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

  private tryAddCoverTile(
    dx: number,
    dy: number,
    dh: number,
    layer: 0 | 1,
    spriteBaseY: number,
    map: PalMap,
    tileIndex: Map<string, MapTile>,
    seenBlockers: Set<string>,
    toSort: SortableDrawItem[],
    nextOrder: () => number
  ): void {
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

  private resolveCoverTilePoint(
    x: number,
    y: number,
    sh: 0 | 1,
    index: number
  ): { dx: number; dy: number; dh: 0 | 1 } {
    switch (index) {
      case 0:
        return { dx: x, dy: y, dh: sh };
      case 1:
        return { dx: x - 1, dy: y, dh: sh };
      case 2:
        return {
          dx: sh ? x : x - 1,
          dy: sh ? y + 1 : y,
          dh: (1 - sh) as 0 | 1,
        };
      case 3:
        return { dx: x + 1, dy: y, dh: sh };
      default:
        return {
          dx: sh ? x + 1 : x,
          dy: sh ? y + 1 : y,
          dh: (1 - sh) as 0 | 1,
        };
    }
  }

  private indexTiles(tiles: MapTile[]): Map<string, MapTile> {
    const index = new Map<string, MapTile>();
    for (const tile of tiles) {
      index.set(this.tileKey(tile.x, tile.y, tile.h), tile);
    }
    return index;
  }

  private tileKey(x: number, y: number, h: number): string {
    return `${x}:${y}:${h}`;
  }
}
