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
export function tileToPixel(x: number, y: number, h: number): { px: number; py: number } {
  return {
    px: x * 32 + h * 16,
    py: y * 16 + h * 8,
  };
}

/**
 * Converts world pixel coordinates back to tile coordinates.
 * Standard mathematical inversion of the coordinate system.
 */
export function pixelToTile(px: number, py: number): { x: number; y: number; h: number } {
  const h = (px % 32) === 16 ? 1 : 0;
  const x = Math.floor((px - h * 16) / 32);
  const y = Math.floor((py - h * 8) / 16);
  return { x, y, h };
}

/**
 * Converts tile coordinates to a flat grid (orthogonal).
 * Useful for calculating distances or finding neighboring tiles.
 */
export function tileToFlat(x: number, y: number, h: number): { fx: number; fy: number } {
  return {
    fx: x + y + h,
    fy: y - x,
  };
}

/**
 * Calculates the Manhattan distance between two tile positions on the flat grid.
 */
export function getTileDistance(
  x1: number, y1: number, h1: number,
  x2: number, y2: number, h2: number
): number {
  const p1 = tileToFlat(x1, y1, h1);
  const p2 = tileToFlat(x2, y2, h2);
  return Math.abs(p1.fx - p2.fx) + Math.abs(p1.fy - p2.fy);
}
