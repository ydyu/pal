/**
 * Returns true if the given rectangle intersects with the viewport.
 */
export function isRectVisible(rect, viewport) {
    return (rect.x < viewport.x + viewport.width &&
        rect.x + rect.width > viewport.x &&
        rect.y < viewport.y + viewport.height &&
        rect.y + rect.height > viewport.y);
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
export function getSpriteBounds(x, y, sLayer, frameWidth, frameHeight, sortOffsetY, layerOffset) {
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
//# sourceMappingURL=bounds.js.map