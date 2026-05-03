/**
 * An in-memory implementation of the Surface interface.
 */
export class MemorySurface {
    width;
    height;
    buffer;
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buffer = new Uint8Array(width * height);
    }
    setPixel(x, y, colorIndex) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.buffer[y * this.width + x] = colorIndex;
        }
    }
    getPixel(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.buffer[y * this.width + x];
        }
        return 0;
    }
    clear(colorIndex = 0) {
        this.buffer.fill(colorIndex);
    }
    getPixels() {
        return this.buffer;
    }
}
//# sourceMappingURL=surface.js.map