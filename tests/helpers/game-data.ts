import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const GAME_DIR = process.env.PAL_GAME_DIR ?? "/data/data/com.termux/files/home/dev/palgame";

export function hasGameFile(name: string): boolean {
  return existsSync(join(GAME_DIR, name));
}

export function readGameFile(name: string): Uint8Array {
  return readFileSync(join(GAME_DIR, name));
}
