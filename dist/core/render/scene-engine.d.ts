import { type Surface } from "./surface.js";
import { type Blitter } from "./blitter.js";
import { type PalMap } from "../map.js";
import { type SpriteDirectory } from "../codecs/rle.js";
import { type Viewport } from "./bounds.js";
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
    anchorTile?: {
        x: number;
        y: number;
        h: number;
    };
}
/**
 * Coordinates the high-level rendering of a map and its sprites.
 * Implements SDLPAL's 2-phase rendering:
 * Phase 1 (Background): Render all lower tiles, then all upper tiles.
 * Phase 2 (Sorted Sprites/Blockers): Collect sprites and blocker tiles, sort by world Y, render.
 */
export declare class SceneEngine {
    private blitter;
    constructor(blitter: Blitter);
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
    render(surface: Surface, map: PalMap, sprites: RenderableSprite[], viewport: Viewport): void;
    /**
     * Phase 1: Background Rendering
     * Draws all lower tiles, then all upper tiles in (y, h, x) order.
     * No sprites are rendered in this phase.
     */
    private renderBackgroundPhase;
    /**
     * Phase 2: Sorted Sprites and Blocker Tiles
     * 1. Collect all sprites with sorting Y = world_y + (sLayer * 8) + 9
     * 2. Collect "blocker" tiles (height > 0) that overlap each sprite's bounding box
     * 3. Sort unified list by world Y coordinate
     * 4. Render in sorted order
     */
    private renderSpritesPhase;
    private createSpriteItem;
    private collectBlockerTiles;
    private tryAddCoverTile;
    private resolveCoverTilePoint;
    private indexTiles;
    private tileKey;
}
