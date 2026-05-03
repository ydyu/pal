/**
 * Represents a rectangular area in 2D space.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Defines a visible window into the world.
 */
export interface Viewport extends Rect {}

/**
 * Returns true if the given rectangle intersects with the viewport.
 */
export function isRectVisible(rect: Rect, viewport: Viewport): boolean {
  return (
    rect.x < viewport.x + viewport.width &&
    rect.x + rect.width > viewport.x &&
    rect.y < viewport.y + viewport.height &&
    rect.y + rect.height > viewport.y
  );
}

/**
 * Extended bounds for a sprite, including PAL-specific sorting and offset metadata.
 */
export interface SpriteBounds extends Rect {
  /** The world Y coordinate used for depth sorting. */
  sortY: number;
  /** The PAL-specific layer offset applied to drawing. */
  layerOffset: number;
}

/**
 * Calculates the world-space bounding box and rendering metadata for a sprite.
 * 
 * @param x World X pixel coordinate of the sprite.
 * @param y World Y pixel coordinate of the sprite.
 * @param sLayer PAL event-object logical layer.
 * @param frameWidth Width of the sprite frame.
 * @param frameHeight Height of the sprite frame.
 * @param sortOffsetY Optional override for sort offset.
 * @param layerOffset Optional override for layer offset.
 * @returns Bounding box and sorting metadata in world coordinates.
 */
export function getSpriteBounds(
  x: number,
  y: number,
  sLayer: number,
  frameWidth: number,
  frameHeight: number,
  sortOffsetY?: number,
  layerOffset?: number
): SpriteBounds {
  const finalSortOffsetY = sortOffsetY ?? sLayer * 8 + 9;
  const finalLayerOffset = layerOffset ?? sLayer * 8 + 2;

  const sortY = y + finalSortOffsetY;
  const drawX = x - Math.trunc(frameWidth / 2);
  const drawY = sortY - frameHeight - finalLayerOffset;

  return {
    x: drawX,
    y: drawY,
    width: frameWidth,
    height: frameHeight,
    sortY,
    layerOffset: finalLayerOffset,
  };
}
