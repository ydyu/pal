# pal-tools

A toolkit for reading, editing, and rendering assets and save files from the classic Chinese Paladin 95 (仙劍奇俠傳 DOS) game.

The project features a comprehensive modular TypeScript library for game data extraction and rendering, alongside a suite of Python-based utilities for save file editing and state analysis.

## Core Features (TypeScript Library)

The TypeScript library (`src/`) provides a robust foundation for reading game archives and rendering scenes:
- **Archive & Byte Operations**: MKF archive parsing (`mkf.ts`), YJ_1 decompression (`yj1.ts`), and binary/RLE reading.
- **Assets & Data Models**: Strongly-typed parsing for game assets including scenes, event objects, scripts, palettes, text/messages, and map data.
- **Rendering Engine**: A canvas-based scene engine (`scene-engine.ts`) supporting palette rendering, GOP sprite blitting, and map tile composition.
- **Resource Management**: Unified `resource-manager.ts` for efficient game asset loading and caching.

## Data Export CLI (`pal-export`)

The toolkit includes a command-line interface for exporting game assets and inspecting save files. It is implemented in `tests/export.ts` and can be invoked via the `./export_view.sh` wrapper.

```bash
# Export map 1 to GIF
./export_view.sh map 1

# Export a player battle sprite
./export_view.sh sprite playerBattle 0 0

# Decompile script 0x18C0
./export_view.sh script 0x18C0

# View scene 10 details (event objects, NPCs)
./export_view.sh scene 10

# Inspect a save file
./export_view.sh save 1.RPG

# Create a scene snapshot from a save file
./export_view.sh snapshot 1.RPG

# Show enemy team composition
./export_view.sh battle 10

# Show detailed enemy stats
./export_view.sh enemy 398
```

The `./export_view.sh` wrapper automatically detects the generated GIF, attempts to open it using an environment-appropriate viewer (prioritizing `ristretto` on X11, or `termux-open`/`xdg-open`/`open`), and prompts the user for interactive deletion of the file after viewing.

### Primary Commands
- `map [id]` — Export a map background to GIF.
- `sprite [type] [id] [frame]` — Export various sprite types (world, item, playerBattle, enemyBattle, effect, portrait). If `[frame]` is omitted for world/battle sprites, it exports an animated GIF.
- `script [id]` — Export script disassembly to text.
- `scene [id]` — Show metadata and event object details for a scene.
- `save [file] [scene]` — Display status and inventory from a `.RPG` save file; `[scene]` is optional (omitting it defaults to the save's current scene).
- `snapshot [file]` — Export a full-scene GIF based on the current save state, including a viewport indicator. Supports `--items` to highlight rewards and `--scene [id]` to render a different scene with the save's state.
- `battle [group]` — Show enemy group composition: object IDs, names, and sprite indices. Use `--all` to list all teams.
- `enemy <id>` — Show complete enemy stats (HP, Level, ATK, DEF, resistances, loot) by `WORD.DAT` index.

## Usage & Development (TypeScript)

The project requires Node.js. It is built as an ES Module (`"type": "module"`).

```bash
# Install dependencies
npm install

# Perform a full type-check (library + viewer)
npm run build

# Build the browser-based application (production bundle)
npm run build:viewer

# Run the test suite (uses vitest)
npm test
```

Test coverage lives in `tests/`. The live-data assertions use the standard Termux PAL data path by default (`/data/data/com.termux/files/home/dev/palgame/`) and can be redirected using the `PAL_GAME_DIR` environment variable:
```bash
PAL_GAME_DIR=/path/to/palgame npm test
```

## Browser Viewer

The repository also includes a self-contained browser viewer build:

```bash
npm run build:viewer
```

Open `dist/index.html`, then load:
- required: a PAL data directory containing `MAP.MKF`, `GOP.MKF`, `MGO.MKF`, `PAT.MKF`, `SSS.MKF`, `M.MSG`, and `WORD.DAT`
- optional: `.RPG` to open the save's current scene and apply save state; `RGM.MKF` is auto-detected from the same directory for portrait previews if present

## Python Analysis & Editing Utilities

The Python scripts provide direct manipulation and read-only analysis of save files (`SAVE.RPG`):

### Save Editors
- `item_editor.py` — Edit inventory (item IDs, quantities).
  ```bash
  python3 item_editor.py --list-all-items            # List all valid item names/codes
  python3 item_editor.py 1.RPG --list                # List current inventory
  ```
- `profile_editor.py` — Edit cash, per-role stats, resistances, and save counter.
  ```bash
  python3 profile_editor.py SAVE.RPG                 # Print cash + save counter
  python3 profile_editor.py SAVE.RPG 500             # Set cash (0..999999)
  python3 profile_editor.py SAVE.RPG --saves 10      # Set save counter
  python3 profile_editor.py SAVE.RPG --field hp --role 0 --set 9999
  ```

### Analysis Tools
- `pickup_report.py` — List uncollected pickable items in the current scene, with an ASCII proximity plot.
  ```bash
  python3 pickup_report.py 1.RPG --raw               # Dump all scene objects unfiltered
  ```
- `watch_pickups.sh` — Wrapper to live-monitor `pickup_report.py` while playing.
- `sss_decompile.py` — Disassembler and low-level editor for the `SSS.MKF sub[4]` script table.
  ```bash
  python3 sss_decompile.py --disasm 0x18C0           # Decompile script at index
  python3 sss_decompile.py --msg-index 10            # Look up a message string by ID
  python3 sss_decompile.py --simple --disasm 0x18C0  # Compact opcode-only output
  python3 sss_decompile.py --set 0x18C0 0x00 1 0 0   # Overwrite script at index
  ```

## Research & Documentation
The `research/` directory documents reverse-engineered game data layouts, save offsets, event object tables, and confirmed script opcodes. These notes have been cross-checked against the SDLPAL source.

## Disclaimer
Use save editors at your own risk. Back up your save files before making modifications.
