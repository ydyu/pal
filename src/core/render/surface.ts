/**
 * A platform-neutral drawing surface for 8-bit indexed color data.
 */
export interface Surface {
  readonly width: number;
  readonly height: number;

  /**
   * Sets a pixel at (x, y) to the given palette index.
   * Coordinates are relative to the top-left of the surface.
   */
  setPixel(x: number, y: number, colorIndex: number): void;

  /**
   * Retrieves the palette index at (x, y).
   */
  getPixel(x: number, y: number): number;

  /**
   * Clears the surface with the specified color index (default: 0).
   */
  clear(colorIndex?: number): void;

  /**
   * Returns the raw pixel buffer as a Uint8Array.
   */
  getPixels(): Uint8Array;
}

/**
 * An in-memory implementation of the Surface interface.
 */
export class MemorySurface implements Surface {
  private readonly buffer: Uint8Array;

  constructor(public readonly width: number, public readonly height: number) {
    this.buffer = new Uint8Array(width * height);
  }

  public setPixel(x: number, y: number, colorIndex: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.buffer[y * this.width + x] = colorIndex;
    }
  }

  public getPixel(x: number, y: number): number {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.buffer[y * this.width + x]!;
    }
    return 0;
  }

  public clear(colorIndex: number = 0): void {
    this.buffer.fill(colorIndex);
  }

  public getPixels(): Uint8Array {
    return this.buffer;
  }
}
