/**
 * Handles PAL's staggered isometric coordinate system.
 *
 * Coordinate terminology:
 * - Tile (x, y, h): The logical grid position. h=0 is even rows, h=1 is staggered odd rows.
 * - Pixel (px, py): World-space pixel coordinates.
 * - Flat (fx, fy): An orthogonal grid transform useful for proximity and logic.
 */
/**
 * Converts tile coordinates to world pixel coordinates.
 * This follows the standard SDLPAL formula:
 * px = x * 32 + h * 16
 * py = y * 16 + h * 8
 */
export declare function tileToPixel(x: number, y: number, h: number): {
    px: number;
    py: number;
};
/**
 * Converts world pixel coordinates back to tile coordinates.
 * Standard mathematical inversion of the coordinate system.
 */
export declare function pixelToTile(px: number, py: number): {
    x: number;
    y: number;
    h: number;
};
/**
 * Converts tile coordinates to a flat grid (orthogonal).
 * Useful for calculating distances or finding neighboring tiles.
 */
export declare function tileToFlat(x: number, y: number, h: number): {
    fx: number;
    fy: number;
};
/**
 * Calculates the Manhattan distance between two tile positions on the flat grid.
 */
export declare function getTileDistance(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number): number;
