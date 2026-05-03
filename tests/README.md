# Tests

This directory contains the test suite for the `pal-tools` modular library. 

## Visual Verification (`export.ts`)

Because the game's data formats (YJ1 Maps, RLE Sprites) are highly compressed binary data, standard unit tests rely on "magic numbers" (e.g., verifying `pixels[14] === 197`) to prevent regressions.

To actually **verify** that the decoding logic is correct and not just stable, we use the `export.ts` command-line utility. This script decodes game assets and converts them into easily verifiable image formats using the game's native palette (`PAT.MKF`).

### Prerequisites
Ensure your dependencies are installed, particularly the image processing libraries:
```bash
npm install
```

### Usage

Run the utility using `tsx`:

```bash
npx tsx tests/export.ts <command> [options]
```

#### 1. Exporting Maps (GIF)
Renders the full map background with the game's native palette.

```bash
npx tsx tests/export.ts map 1
```
*(Omit the map ID to see the valid range of chunks in the map archive).*

#### 2. Exporting Save Snapshots (Animated GIF)
Renders the full current map for a `.RPG` save, applies the save's object state via `SceneModel`, and draws a 320x200 viewport rectangle to show what the player would see in-game.

```bash
npx tsx tests/export.ts snapshot /data/data/com.termux/files/home/dev/palgame/1.RPG
```

#### 3. Exporting Single Sprites (GIF)
Generates a pixel-perfect GIF of a single animation frame with the game's palette and transparency.

```bash
# Export frame 0 of sprite sequence 1 from GOP.MKF
npx tsx tests/export.ts sprite GOP.MKF 1 0
```
*(Omit the frame ID to see how many frames exist in that sprite sequence).*

#### 4. Exporting Animations (Animated GIF)
Composites all frames of a sprite sequence into a looping animated GIF, calculating max bounds to prevent jitter.

```bash
npx tsx tests/export.ts sprite GOP.MKF 1 --anim
```

### Future Testing Strategy

Currently, `export.ts` is used for **human sign-off** (the "Golden Master" workflow). You run the export, visually inspect the resulting image/GIF, and confirm the decoding is correct. 

Future tests will use these signed-off images in visual regression tests (e.g., via `jest-image-snapshot`) to automatically compare the output of the decoders against the known-good images.
