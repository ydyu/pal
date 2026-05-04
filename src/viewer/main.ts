import "./style.css";
import * as pal from "../index.js";
import {
  Blitter,
  MemorySurface,
  Opcode,
  PaletteRenderer,
  ResourceManager,
  SceneEngine,
  collectScriptRewards,
  getSpriteBounds,
  parseScript,
  pixelToTile,
  tileToPixel,
  toSigned16,
  type ActiveObject,
  type Color,
  type DecodedParam,
  type Instruction,
  type PaletteSet,
  type RenderableSprite,
  type SaveData,
  type SceneModel,
  type SpriteDirectory,
  type SpriteType,
  type Viewport,
} from "../index.js";
import {
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  centerViewportOnPoint,
  clampViewport,
  findFirstPortraitId,
  formatRewardLabel,
  getScriptExit,
  getSceneBounds,
  resolveAnimatedObjectFrame,
  resolveInitialSceneNumber,
  type ExitInfo,
  type SceneBounds,
} from "./viewer-helpers.js";

type ViewerFileKey =
  | "MAP.MKF"
  | "GOP.MKF"
  | "MGO.MKF"
  | "PAT.MKF"
  | "SSS.MKF"
  | "M.MSG"
  | "WORD.DAT"
  | "RGM.MKF"
  | "BALL.MKF"
  | "F.MKF"
  | "ABC.MKF"
  | "DATA.MKF"
  | "SAVE.RPG";

type StatusTone = "neutral" | "success" | "warning" | "error";

interface ResourceFileSpec {
  key: Exclude<ViewerFileKey, "SAVE.RPG">;
  label: string;
  required: boolean;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewportX: number;
  startViewportY: number;
  moved: boolean;
}

interface ObjectSummary {
  slot: number;
  title: string;
  summary: string;
  rewardLabels: string[];
  exit?: ExitInfo;
}

interface TileTarget {
  tx: number;
  ty: number;
}

interface ViewerHistoryState {
  scene?: number;
  slot?: number;
  addr?: number;
  tx?: number;
  ty?: number;
}

interface ScriptDetails {
  triggerInstructions: Instruction[];
  autoInstructions: Instruction[];
  portraitId: number | null;
}

interface SceneRuntime {
  sceneNumber: number;
  model: SceneModel;
  bounds: SceneBounds;
  paletteSet: PaletteSet;
  colors: Color[];
  objectSummaries: Map<number, ObjectSummary>;
  scriptDetailsCache: Map<number, ScriptDetails>;
}

interface AppState {
  files: Partial<Record<ViewerFileKey, Uint8Array>>;
  fileNames: Partial<Record<ViewerFileKey, string>>;
  pendingFileReads: number;
  assets: ResourceManager | undefined;
  saveData: SaveData | undefined;
  runtime: SceneRuntime | undefined;
  selectedSlot: number | undefined;
  viewport: Viewport;
  drag: DragState | undefined;
  renderInvalidated: boolean;
  animationStep: number;
  initialized: boolean;
  scriptStack: number[];
  collapsedScripts: Set<number>;
}

const RESOURCE_FILE_SPECS: readonly ResourceFileSpec[] = [
  { key: "MAP.MKF", label: "MAP.MKF", required: true },
  { key: "GOP.MKF", label: "GOP.MKF", required: true },
  { key: "MGO.MKF", label: "MGO.MKF", required: true },
  { key: "PAT.MKF", label: "PAT.MKF", required: true },
  { key: "SSS.MKF", label: "SSS.MKF", required: true },
  { key: "M.MSG", label: "M.MSG", required: true },
  { key: "WORD.DAT", label: "WORD.DAT", required: true },
  { key: "RGM.MKF", label: "RGM.MKF", required: false },
  { key: "BALL.MKF", label: "BALL.MKF", required: false },
  { key: "F.MKF", label: "F.MKF", required: false },
  { key: "ABC.MKF", label: "ABC.MKF", required: false },
  { key: "DATA.MKF", label: "DATA.MKF", required: false },
];
const RESOURCE_FILE_KEYS = new Set<Exclude<ViewerFileKey, "SAVE.RPG">>(
  RESOURCE_FILE_SPECS.map((spec) => spec.key)
);
const RESOURCE_FILE_BY_NAME = new Map<string, ResourceFileSpec>(
  RESOURCE_FILE_SPECS.map((spec) => [spec.label.toUpperCase(), spec])
);

const OVERLAY_REWARD_COLOR = "#ffd54f";
const OVERLAY_REWARD_FILL = "rgba(255, 213, 79, 0.14)";
const OVERLAY_EXIT_COLOR = "#00e676";
const OVERLAY_EXIT_FILL = "rgba(0, 230, 118, 0.14)";
const OVERLAY_SELECTION_COLOR = "#63e6ff";
const OVERLAY_SELECTION_FILL = "rgba(99, 230, 255, 0.18)";
const OVERLAY_LABEL_BG = "rgba(8, 11, 18, 0.82)";
const OVERLAY_LABEL_FG = "#f6f8ff";
const OVERLAY_LABEL_SHADOW = "rgba(0, 0, 0, 0.6)";
const POINTER_DRAG_THRESHOLD = 4;
const ANIMATION_FRAME_MS = 240;
const SCRIPT_LINE_LIMIT = 512;

const fileStatusElements = new Map<string, HTMLElement>();
const fileReadTokens = new Map<string, number>();
const spriteCache = new Map<string, SpriteDirectory>();

const blitter = new Blitter();
const engine = new SceneEngine(blitter);
const paletteRenderer = new PaletteRenderer();

const state: AppState = {
  files: {},
  fileNames: {},
  pendingFileReads: 0,
  assets: undefined,
  saveData: undefined,
  runtime: undefined,
  selectedSlot: undefined,
  viewport: {
    x: 0,
    y: 0,
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  },
  drag: undefined,
  renderInvalidated: true,
  animationStep: 0,
  initialized: false,
  scriptStack: [],
  collapsedScripts: new Set(),
};

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}.`);
  }
  return element as T;
}

const dom = {
  filesTabButton: requireElement<HTMLButtonElement>("tab-files"),
  mapTabButton: requireElement<HTMLButtonElement>("tab-map-view"),
  initializeButton: requireElement<HTMLButtonElement>("initialize-button"),
  initStatus: requireElement<HTMLParagraphElement>("init-status"),
  libraryStatus: requireElement<HTMLParagraphElement>("library-status"),
  directoryInput: requireElement<HTMLInputElement>("pal-directory"),
  saveInput: requireElement<HTMLInputElement>("rpg-save"),
  sceneSelect: requireElement<HTMLSelectElement>("scene-select"),
  centerPartyButton: requireElement<HTMLButtonElement>("center-party-button"),
  viewerStatus: requireElement<HTMLParagraphElement>("viewer-status"),
  canvasShell: requireElement<HTMLDivElement>("viewer-canvas-shell"),
  canvas: requireElement<HTMLCanvasElement>("view-canvas"),
  placeholder: requireElement<HTMLDivElement>("viewer-placeholder"),
  inspectorSubtitle: requireElement<HTMLParagraphElement>("inspector-subtitle"),
  inspectorDetails: requireElement<HTMLDivElement>("inspector-details"),
  objectList: requireElement<HTMLDivElement>("scene-object-list"),
  objectListStatus: requireElement<HTMLParagraphElement>("object-list-status"),
  mobileTabs: requireElement<HTMLDivElement>("mobile-tabs"),
  mobileTabObjects: requireElement<HTMLButtonElement>("mobile-tab-objects"),
  mobileTabInspector: requireElement<HTMLButtonElement>("mobile-tab-inspector"),
  explorerSidebar: requireElement<HTMLElement>("explorer-sidebar"),
  inspectorSidebar: requireElement<HTMLElement>("inspector-sidebar"),
};

function setActiveTab(targetTabId: string): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tab-button");
  const panels = document.querySelectorAll<HTMLElement>(".tab-panel");

  buttons.forEach((button) => {
    const isActive = button.dataset.tab === targetTabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isActive = panel.id === targetTabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (targetTabId === "map-view-tab") {
    resizeCanvasToDisplaySize();
    invalidateRender();
  }
}

function setMobileTab(tab: "objects" | "inspector"): void {
  const isObjects = tab === "objects";
  dom.mobileTabObjects.classList.toggle("active", isObjects);
  dom.mobileTabInspector.classList.toggle("active", !isObjects);

  dom.explorerSidebar.classList.toggle("is-hidden-mobile", !isObjects);
  dom.inspectorSidebar.classList.toggle("is-hidden-mobile", isObjects);
}

/** Returns the element that actually scrolls the inspector (desktop: inspector-scroll; mobile: inspector-sidebar). */
function getInspectorScrollContainer(): HTMLElement {
  const scroll = dom.inspectorDetails.parentElement as HTMLElement;
  return getComputedStyle(scroll).overflow === "visible"
    ? (scroll.parentElement as HTMLElement)
    : scroll;
}

/** Returns the world point to center the initial viewport on: the scene object nearest to the geometric center, or the geometric center if no objects exist. */
function getSceneFocusPoint(model: SceneModel, bounds: SceneBounds): { x: number; y: number } {
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  let bestDist = Infinity;
  let best: { x: number; y: number } = { x: cx, y: cy };
  for (const obj of model.objects.values()) {
    const dx = obj.x - cx;
    const dy = obj.y - cy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = { x: obj.x, y: obj.y };
    }
  }
  return best;
}

function setStatus(element: HTMLElement, message: string, tone: StatusTone = "neutral"): void {
  element.textContent = message;
  if (tone === "neutral") {
    delete element.dataset.tone;
  } else {
    element.dataset.tone = tone;
  }
}

function setPlaceholder(message?: string): void {
  const visible = typeof message === "string" && message.length > 0;
  dom.placeholder.hidden = !visible;
  if (visible) {
    dom.placeholder.textContent = message;
  }
}

function invalidateRender(): void {
  state.renderInvalidated = true;
}

function formatBytes(byteLength: number): string {
  if (byteLength >= 1024 * 1024) {
    return `${(byteLength / (1024 * 1024)).toFixed(2)} MiB`;
  }
  if (byteLength >= 1024) {
    return `${(byteLength / 1024).toFixed(1)} KiB`;
  }
  return `${byteLength} B`;
}

function formatSceneNumber(sceneNumber: number): string {
  return String(sceneNumber).padStart(3, "0");
}

function formatMapNumber(mapNumber: number): string {
  return String(mapNumber).padStart(3, "0");
}

function formatHex(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

function initTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".tab-button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      const targetTabId = button.dataset.tab;
      if (targetTabId) {
        setActiveTab(targetTabId);
      }
    });
  });
}

function initFileInputs(): void {
  for (const inputId of ["pal-directory", "rpg-save"]) {
    const status = document.querySelector<HTMLElement>(`[data-file-status="${inputId}"]`);
    if (!status) {
      throw new Error(`Missing file status element for #${inputId}.`);
    }
    fileStatusElements.set(inputId, status);
  }

  setStatus(fileStatusElements.get("pal-directory")!, "No directory selected");
  setStatus(fileStatusElements.get("rpg-save")!, "No file selected");

  dom.directoryInput.addEventListener("change", () => {
    void handleDirectoryChange(dom.directoryInput);
  });
  dom.saveInput.addEventListener("change", () => {
    void handleSaveFileChange(dom.saveInput);
  });
}

function clearResourceFiles(): void {
  for (const spec of RESOURCE_FILE_SPECS) {
    delete state.files[spec.key];
    delete state.fileNames[spec.key];
  }
}

async function handleDirectoryChange(input: HTMLInputElement): Promise<void> {
  const inputId = input.id;
  const token = (fileReadTokens.get(inputId) ?? 0) + 1;
  fileReadTokens.set(inputId, token);

  const status = fileStatusElements.get(inputId);
  if (!status) {
    throw new Error(`Missing file status tracker for ${inputId}.`);
  }

  const files = Array.from(input.files ?? []);
  if (files.length === 0) {
    clearResourceFiles();
    setStatus(status, "No directory selected");
    onFileSelectionChanged();
    return;
  }

  state.pendingFileReads += 1;
  setStatus(status, `Scanning ${files.length} files...`);
  refreshInitializeButton();

  try {
    const matchedFiles = new Map<Exclude<ViewerFileKey, "SAVE.RPG">, File>();
    let directoryName = "";

    for (const file of files) {
      const relativePath = "webkitRelativePath" in file ? file.webkitRelativePath : "";
      if (!directoryName && relativePath.includes("/")) {
        directoryName = relativePath.split("/")[0] ?? "";
      }

      const fileName = relativePath.split("/").pop() ?? file.name;
      const spec = RESOURCE_FILE_BY_NAME.get(fileName.toUpperCase());
      if (spec && !matchedFiles.has(spec.key)) {
        matchedFiles.set(spec.key, file);
      }
    }

    const loadedEntries = await Promise.all(
      Array.from(matchedFiles.entries()).map(async ([key, file]) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return { key, file, bytes };
      })
    );

    if (fileReadTokens.get(inputId) !== token) {
      return;
    }

    clearResourceFiles();
    for (const entry of loadedEntries) {
      state.files[entry.key] = entry.bytes;
      state.fileNames[entry.key] = entry.file.name;
    }

    const missing = getMissingRequiredFiles();
    const foundLabels = loadedEntries.map((entry) => entry.file.name).sort().join(", ");
    const prefix = directoryName || files[0]?.name || "directory";
    if (missing.length > 0) {
      setStatus(
        status,
        `${prefix}: loaded ${loadedEntries.length} PAL files; missing ${missing.join(", ")}.`,
        "warning"
      );
    } else {
      setStatus(
        status,
        `${prefix}: loaded ${loadedEntries.length} PAL files${foundLabels ? ` (${foundLabels})` : ""}.`,
        "success"
      );
    }
    onFileSelectionChanged();
  } catch (error) {
    clearResourceFiles();
    const message = error instanceof Error ? error.message : String(error);
    setStatus(status, `Failed to read PAL directory: ${message}`, "error");
    setStatus(dom.initStatus, `Failed to read PAL directory: ${message}`, "error");
  } finally {
    state.pendingFileReads -= 1;
    refreshInitializeButton();
  }
}

async function handleSaveFileChange(input: HTMLInputElement): Promise<void> {
  const inputId = input.id;
  const token = (fileReadTokens.get(inputId) ?? 0) + 1;
  fileReadTokens.set(inputId, token);

  const status = fileStatusElements.get(inputId);
  if (!status) {
    throw new Error(`Missing file status tracker for ${inputId}.`);
  }

  const file = input.files?.[0];
  if (!file) {
    delete state.files["SAVE.RPG"];
    delete state.fileNames["SAVE.RPG"];
    setStatus(status, "No file selected");
    onFileSelectionChanged();
    return;
  }

  state.pendingFileReads += 1;
  setStatus(status, `Reading ${file.name}...`);
  refreshInitializeButton();

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (fileReadTokens.get(inputId) !== token) {
      return;
    }

    state.files["SAVE.RPG"] = bytes;
    state.fileNames["SAVE.RPG"] = file.name;
    setStatus(status, `${file.name} (${formatBytes(bytes.length)})`, "success");
    onFileSelectionChanged();
  } catch (error) {
    delete state.files["SAVE.RPG"];
    delete state.fileNames["SAVE.RPG"];
    const message = error instanceof Error ? error.message : String(error);
    setStatus(status, `Failed to read ${file.name}: ${message}`, "error");
    setStatus(dom.initStatus, `Failed to read save file: ${message}`, "error");
  } finally {
    state.pendingFileReads -= 1;
    refreshInitializeButton();
  }
}

function onFileSelectionChanged(): void {
  if (state.initialized) {
    setStatus(dom.initStatus, "File selection changed. Reinitialize the viewer to apply updates.", "warning");
  } else if (getMissingRequiredFiles().length === 0) {
    setStatus(dom.initStatus, "PAL directory is ready. Initialize the viewer to continue.", "success");
  } else {
    setStatus(dom.initStatus, `PAL directory is missing: ${getMissingRequiredFiles().join(", ")}`, "warning");
  }
  refreshInitializeButton();
}

function initLibraryStatus(): void {
  const exportCount = Object.keys(pal).length;
  setStatus(dom.libraryStatus, `Loaded ${exportCount} exports from src/index.ts for the viewer.`, "success");
}

function getMissingRequiredFiles(): string[] {
  return RESOURCE_FILE_SPECS.filter((spec) => spec.required && !state.files[spec.key]).map((spec) => spec.label);
}

function refreshInitializeButton(): void {
  const ready = state.pendingFileReads === 0 && getMissingRequiredFiles().length === 0;
  dom.initializeButton.disabled = !ready;
  dom.initializeButton.textContent = state.initialized ? "Reinitialize Viewer" : "Initialize Viewer";
}

function getCanvasContext(): CanvasRenderingContext2D {
  const context = dom.canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas rendering is not available in this browser.");
  }
  return context;
}

function resizeCanvasToDisplaySize(): boolean {
  const width = Math.max(1, Math.floor(dom.canvas.clientWidth));
  const height = Math.max(1, Math.floor(dom.canvas.clientHeight));

  if (dom.canvas.width === width && dom.canvas.height === height) {
    return false;
  }

  dom.canvas.width = width;
  dom.canvas.height = height;
  state.viewport = {
    ...state.viewport,
    width,
    height,
  };

  if (state.runtime) {
    state.viewport = clampViewport(state.viewport, state.runtime.bounds);
  }

  return true;
}

function getResourceFiles(): Record<string, Uint8Array> {
  const resourceFiles: Record<string, Uint8Array> = {};

  for (const key of RESOURCE_FILE_KEYS) {
    const bytes = state.files[key];
    if (bytes) {
      resourceFiles[key] = bytes;
    }
  }

  return resourceFiles;
}

function getCachedSprite(type: SpriteType, id: number): SpriteDirectory {
  const cacheKey = `${type}:${id}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (!state.assets) {
    throw new Error("Viewer assets are not initialized.");
  }

  const directory = state.assets.getSprite(type, id);
  spriteCache.set(cacheKey, directory);
  return directory;
}

function getPartySpriteMap(saveData?: SaveData): Map<number, number> {
  const map = new Map<number, number>();
  if (!saveData) {
    return map;
  }

  for (const role of saveData.playerRoles) {
    map.set(role.roleId, role.spriteNum);
  }
  return map;
}

function buildRenderList(model: SceneModel, animationStep: number): RenderableSprite[] {
  const sprites: RenderableSprite[] = [];
  const partySpriteMap = getPartySpriteMap(state.saveData);

  for (const member of model.party) {
    const spriteNum = partySpriteMap.get(member.roleId) ?? 2;
    const directory = getCachedSprite("world", spriteNum);
    sprites.push({
      directory,
      frameIndex: member.frame,
      x: member.x,
      y: member.y,
      sLayer: 0,
      sortOffsetY: (state.saveData?.wLayer ?? 0) + 10,
      layerOffset: (state.saveData?.wLayer ?? 0) + 6,
      anchorTile: pixelToTile(member.x, member.y),
    });
  }

  for (const object of model.objects.values()) {
    if (object.state === 0 || object.data.spriteNum <= 0) {
      continue;
    }

    const directory = getCachedSprite("world", object.data.spriteNum);
    sprites.push({
      directory,
      frameIndex: resolveAnimatedObjectFrame(
        object.direction,
        object.currentFrame,
        object.data.nSpriteFrames,
        animationStep,
        object.data.nSpriteFramesAuto
      ),
      x: object.x,
      y: object.y,
      sLayer: object.data.sLayer,
      sortOffsetY: object.data.sLayer * 8 + 9,
      layerOffset: object.data.sLayer * 8 + 2,
      anchorTile: pixelToTile(object.x, object.y),
    });
  }

  return sprites;
}

function buildObjectSummaries(model: SceneModel, assets: ResourceManager): Map<number, ObjectSummary> {
  const summaries = new Map<number, ObjectSummary>();
  const scriptChunk = assets.getScriptChunk();

  for (const object of model.objects.values()) {
    const summary = assets.getScriptSummary(object.data.triggerScript).trim();
    const rewardLabels = collectScriptRewards(scriptChunk, object.data.triggerScript, assets).map(formatRewardLabel);

    const instructions = parseScript(scriptChunk, object.data.triggerScript, 20);
    const exit = getScriptExit(instructions) || undefined;

    const title = summary || rewardLabels[0] || (exit ? `Exit to Scene ${exit.sceneId}` : `Object ${object.data.slot}`);
    const objectSummary: ObjectSummary = {
      slot: object.data.slot,
      title,
      summary,
      rewardLabels,
    };
    if (exit) {
      objectSummary.exit = exit;
    }
    summaries.set(object.data.slot, objectSummary);
  }

  return summaries;
}

function getScriptDetails(object: ActiveObject): ScriptDetails {
  if (!state.runtime || !state.assets) {
    throw new Error("No scene is loaded.");
  }

  const cached = state.runtime.scriptDetailsCache.get(object.data.slot);
  if (cached) {
    return cached;
  }

  const triggerInstructions = parseScript(state.assets.getScriptChunk(), object.data.triggerScript, SCRIPT_LINE_LIMIT);
  const autoInstructions = object.data.autoScript !== 0 && object.data.autoScript !== object.data.triggerScript
    ? parseScript(state.assets.getScriptChunk(), object.data.autoScript, SCRIPT_LINE_LIMIT)
    : [];

  const details: ScriptDetails = {
    triggerInstructions,
    autoInstructions,
    portraitId: findFirstPortraitId([...triggerInstructions, ...autoInstructions]),
  };

  state.runtime.scriptDetailsCache.set(object.data.slot, details);
  return details;
}


function describeSceneSource(sceneNumber: number): string {
  if (state.saveData && state.saveData.numScene === sceneNumber) {
    return `Loaded from save scene ${formatSceneNumber(sceneNumber)}.`;
  }

  if (state.saveData) {
    return `Save scene is ${formatSceneNumber(state.saveData.numScene)}; browsing another scene.`;
  }

  return "Loaded directly from the archive set.";
}

function updateViewerStatus(tone: StatusTone = "neutral"): void {
  if (!state.runtime) {
    setStatus(dom.viewerStatus, "Viewer not initialized.", tone);
    return;
  }

  const { sceneNumber, model } = state.runtime;
  const mapNumber = model.scene.mapNum;
  const objectCount = model.objects.size;
  const partySuffix = model.party.length > 0 ? ` · party ${model.party.length}` : "";
  setStatus(
    dom.viewerStatus,
    `Scene ${formatSceneNumber(sceneNumber)} / Map ${formatMapNumber(mapNumber)} · ${objectCount} objects${partySuffix}`,
    tone
  );
}

function populateSceneSelect(sceneCount: number, preferredScene?: number): void {
  dom.sceneSelect.replaceChildren();

  for (let sceneNumber = 1; sceneNumber <= sceneCount; sceneNumber++) {
    const option = document.createElement("option");
    option.value = String(sceneNumber);
    option.textContent = `Scene ${formatSceneNumber(sceneNumber)}`;
    if (preferredScene === sceneNumber) {
      option.textContent += " · save";
    }
    dom.sceneSelect.append(option);
  }

  dom.sceneSelect.disabled = false;
}

function getInitialViewport(
  sceneNumber: number,
  _model: SceneModel,
  bounds: SceneBounds,
  targetTile?: TileTarget
): Viewport {
  if (targetTile) {
    return getViewportForTileTarget(targetTile, bounds);
  }

  if (state.saveData && state.saveData.numScene === sceneNumber) {
    return {
      x: state.saveData.viewportX,
      y: state.saveData.viewportY,
      width: state.viewport.width,
      height: state.viewport.height,
    };
  }

  const focus = getSceneFocusPoint(_model, bounds);
  return {
    x: Math.floor(focus.x - state.viewport.width / 2),
    y: Math.floor(focus.y - state.viewport.height / 2),
    width: state.viewport.width,
    height: state.viewport.height,
  };
}

function getCurrentSaveViewport(): Viewport | null {
  if (!state.runtime || !state.saveData || state.saveData.numScene !== state.runtime.sceneNumber) {
    return null;
  }

  return {
    x: state.saveData.viewportX,
    y: state.saveData.viewportY,
    width: state.viewport.width,
    height: state.viewport.height,
  };
}

function parseHashInteger(hashParams: URLSearchParams, key: string): number | undefined {
  const raw = hashParams.get(key);
  if (raw === null) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

function resolveTileTarget(tx?: number, ty?: number): TileTarget | undefined {
  if (tx === undefined || ty === undefined) {
    return undefined;
  }
  return { tx, ty };
}

function getViewportCenterTile(viewport: Viewport): TileTarget {
  const centerX = viewport.x + Math.floor(viewport.width / 2);
  const centerY = viewport.y + Math.floor(viewport.height / 2);
  const tile = pixelToTile(centerX, centerY);
  return { tx: tile.x, ty: tile.y };
}

function createHistoryState(
  scene: number,
  slot?: number,
  addr?: number,
  targetTile?: TileTarget
): ViewerHistoryState {
  const historyState: ViewerHistoryState = { scene };
  if (slot !== undefined) {
    historyState.slot = slot;
  }
  if (addr !== undefined) {
    historyState.addr = addr;
  }
  if (targetTile) {
    historyState.tx = targetTile.tx;
    historyState.ty = targetTile.ty;
  }
  return historyState;
}

function buildHistoryHash(historyState: ViewerHistoryState): string {
  if (historyState.scene === undefined) {
    return window.location.hash || "";
  }

  const params = new URLSearchParams();
  params.set("scene", String(historyState.scene));
  if (historyState.slot !== undefined) {
    params.set("slot", String(historyState.slot));
  }
  if (historyState.tx !== undefined && historyState.ty !== undefined) {
    params.set("tx", String(historyState.tx));
    params.set("ty", String(historyState.ty));
  }
  if (historyState.addr !== undefined) {
    params.set("addr", String(historyState.addr));
  }

  return `#${params.toString()}`;
}

function replaceHistoryState(historyState: ViewerHistoryState): void {
  history.replaceState(historyState, "", buildHistoryHash(historyState));
}

function pushHistoryState(historyState: ViewerHistoryState): void {
  history.pushState(historyState, "", buildHistoryHash(historyState));
}

function readHashHistoryState(sceneCount?: number): ViewerHistoryState {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const sceneRaw = parseHashInteger(hashParams, "scene");
  const scene = sceneRaw !== undefined && sceneRaw >= 1 && (sceneCount === undefined || sceneRaw <= sceneCount)
    ? sceneRaw
    : undefined;
  const slot = scene !== undefined ? parseHashInteger(hashParams, "slot") : undefined;
  const tx = parseHashInteger(hashParams, "tx");
  const ty = parseHashInteger(hashParams, "ty");
  const addr = parseHashInteger(hashParams, "addr");
  const historyState: ViewerHistoryState = {};

  if (scene !== undefined) {
    historyState.scene = scene;
  }
  if (slot !== undefined) {
    historyState.slot = slot;
  }
  if (tx !== undefined && ty !== undefined) {
    historyState.tx = tx;
    historyState.ty = ty;
  }
  if (addr !== undefined) {
    historyState.addr = addr;
  }

  return historyState;
}

function mergeHistoryState(hashState: ViewerHistoryState, fallback?: ViewerHistoryState | null): ViewerHistoryState {
  const scene = hashState.scene ?? fallback?.scene;
  const slot = hashState.slot ?? fallback?.slot;
  const addr = hashState.addr ?? fallback?.addr;
  const tx = hashState.tx ?? fallback?.tx;
  const ty = hashState.ty ?? fallback?.ty;
  const historyState: ViewerHistoryState = {};

  if (scene !== undefined) {
    historyState.scene = scene;
  }
  if (slot !== undefined) {
    historyState.slot = slot;
  }
  if (addr !== undefined) {
    historyState.addr = addr;
  }
  if (tx !== undefined && ty !== undefined) {
    historyState.tx = tx;
    historyState.ty = ty;
  }

  return historyState;
}

function getViewportForTileTarget(targetTile: TileTarget, bounds: SceneBounds): Viewport {
  const { px, py } = tileToPixel(targetTile.tx, targetTile.ty, 0);
  return clampViewport({
    x: Math.floor(px - state.viewport.width / 2),
    y: Math.floor(py - state.viewport.height / 2),
    width: state.viewport.width,
    height: state.viewport.height,
  }, bounds);
}

function applyTileViewport(targetTile: TileTarget): void {
  if (!state.runtime) {
    return;
  }
  state.viewport = getViewportForTileTarget(targetTile, state.runtime.bounds);
  invalidateRender();
}

function restoreHistoryState(historyState: ViewerHistoryState): void {
  if (!state.assets || historyState.scene === undefined) {
    return;
  }

  const targetTile = resolveTileTarget(historyState.tx, historyState.ty);
  dom.sceneSelect.value = String(historyState.scene);
  loadScene(historyState.scene, true, historyState.slot === undefined ? targetTile : undefined);

  if (historyState.slot !== undefined) {
    selectObject(historyState.slot, true);
  }
  if (targetTile && historyState.slot !== undefined) {
    applyTileViewport(targetTile);
  }
  if (historyState.addr !== undefined) {
    requestAnimationFrame(() => { scrollInstructionIntoView(historyState.addr!); });
  }
}

function loadScene(sceneNumber: number, recenter: boolean, targetTile?: TileTarget): void {
  if (!state.assets) {
    throw new Error("Viewer assets are not initialized.");
  }

  const model = state.assets.loadSceneModel(sceneNumber);
  if (state.saveData) {
    model.applyState(state.saveData, sceneNumber);
    model.resolveAutoFrames(state.assets);
  }

  const paletteSet = state.assets.getPalette(0);
  const colors = state.saveData?.paletteOffset && paletteSet.night ? paletteSet.night : paletteSet.day;
  const bounds = getSceneBounds(model.map, buildRenderList(model, state.animationStep), blitter);

  state.runtime = {
    sceneNumber,
    model,
    bounds,
    paletteSet,
    colors,
    objectSummaries: buildObjectSummaries(model, state.assets),
    scriptDetailsCache: new Map<number, ScriptDetails>(),
  };
  state.selectedSlot = undefined;

  resizeCanvasToDisplaySize();
  state.viewport = recenter
    ? getInitialViewport(sceneNumber, model, bounds, targetTile)
    : clampViewport(state.viewport, bounds);

  dom.centerPartyButton.disabled = false;
  updateViewerStatus("success");
  setPlaceholder();
  renderInspector();
  renderObjectList();
  invalidateRender();
}

async function initializeViewer(): Promise<void> {
  const missing = getMissingRequiredFiles();
  if (missing.length > 0) {
    setStatus(dom.initStatus, `Missing required files: ${missing.join(", ")}`, "error");
    setActiveTab("files-tab");
    return;
  }

  setStatus(dom.initStatus, "Initializing viewer...", "warning");
  dom.initializeButton.disabled = true;

  try {
    spriteCache.clear();
    blitter.clearCache();
    const assets = new ResourceManager(getResourceFiles());
    const saveBytes = state.files["SAVE.RPG"];
    const saveData = saveBytes ? assets.parseSave(saveBytes) : undefined;

    const sceneCount = assets.getSceneCount();
    const hashState = readHashHistoryState(sceneCount);
    const initialScene = hashState.scene ?? resolveInitialSceneNumber(sceneCount, saveData?.numScene);
    const initialState = createHistoryState(
      initialScene,
      hashState.slot,
      hashState.addr,
      resolveTileTarget(hashState.tx, hashState.ty)
    );

    state.assets = assets;
    state.saveData = saveData;
    state.initialized = true;
    dom.mapTabButton.disabled = false;

    populateSceneSelect(assets.getSceneCount(), saveData?.numScene);
    dom.sceneSelect.value = String(initialScene);
    setActiveTab("map-view-tab");
    restoreHistoryState(initialState);
    replaceHistoryState(initialState);

    const saveMessage = saveData
      ? ` Save file ${state.fileNames["SAVE.RPG"] ?? "SAVE.RPG"} opened at scene ${formatSceneNumber(initialScene)}.`
      : "";
    setStatus(dom.initStatus, `Viewer initialized.${saveMessage}`, "success");
    renderInspector();
  } catch (error) {
    state.runtime = undefined;
    state.assets = undefined;
    state.saveData = undefined;
    state.selectedSlot = undefined;
    state.initialized = false;
    dom.mapTabButton.disabled = true;
    dom.sceneSelect.disabled = true;
    dom.centerPartyButton.disabled = true;
    const message = error instanceof Error ? error.message : String(error);
    setStatus(dom.initStatus, `Initialization failed: ${message}`, "error");
    setStatus(dom.viewerStatus, `Viewer initialization failed: ${message}`, "error");
    setPlaceholder(message);
    setActiveTab("files-tab");
    renderInspector();
    renderObjectList();
  } finally {
    refreshInitializeButton();
  }
}

function buildInfoSection(title: string): HTMLElement {
  const section = document.createElement("section");
  section.className = "inspector-section";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);

  return section;
}

function buildInfoGrid(rows: Array<[string, string]>): HTMLDivElement {
  const wrapper = document.createElement("div");

  const list = document.createElement("dl");
  list.className = "info-grid";

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "info-row";

    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;

    row.append(dt, dd);
    list.append(row);
  }

  wrapper.append(list);
  return wrapper;
}

function buildBadge(text: string, tone?: "reward" | "hidden" | "visible" | "exit"): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = text;
  if (tone) {
    badge.dataset.tone = tone;
  }
  return badge;
}

function buildExitBadge(exit: ExitInfo): HTMLButtonElement {
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "badge badge--button";
  badge.dataset.tone = "exit";

  let text = `Exit → ${exit.sceneId}`;
  if (exit.x !== undefined && exit.y !== undefined) {
    text += ` @(${exit.x},${exit.y})`;
  }
  badge.textContent = text;
  badge.addEventListener("click", () => {
    navigateScene(exit.sceneId, undefined, true, undefined, resolveTileTarget(exit.x, exit.y));
  });

  return badge;
}

function buildBadgeRow(labels: string[], hidden: boolean, exit?: ExitInfo): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "badge-row";
  for (const label of labels) {
    row.append(buildBadge(label, "reward"));
  }
  if (exit) {
    row.append(buildExitBadge(exit));
  }
  if (hidden) {
    row.append(buildBadge("Hidden / inactive", "hidden"));
  }
  return row;
}

function findSceneForSlot(slot: number): number | undefined {
  if (!state.assets) return undefined;
  const count = state.assets.getSceneCount();
  for (let s = 1; s <= count; s++) {
    const [lo, hi] = state.assets.getSceneEventSlotRange(s);
    if (slot >= lo && slot <= hi) return s;
  }
  return undefined;
}

function syncCurrentStateToHistory(fromAddr?: number): void {
  const scene = state.runtime?.sceneNumber;
  if (!scene) return;
  const slot = state.selectedSlot;
  const current = history.state as ViewerHistoryState | null;
  const targetTile = getViewportCenterTile(state.viewport);
  const nextState = createHistoryState(scene, slot, fromAddr, targetTile);
  if (
    current?.scene !== nextState.scene
    || current?.slot !== nextState.slot
    || current?.addr !== nextState.addr
    || current?.tx !== nextState.tx
    || current?.ty !== nextState.ty
  ) {
    replaceHistoryState(nextState);
  }
}

function navigateScene(
  scene: number,
  slot?: number,
  pushHistory = true,
  fromAddr?: number,
  targetTile?: TileTarget
): void {
  if (!state.assets) return;
  if (pushHistory) syncCurrentStateToHistory(fromAddr);
  dom.sceneSelect.value = String(scene);
  loadScene(scene, true, slot === undefined ? targetTile : undefined);
  if (slot !== undefined) {
    selectObject(slot, true);
  }
  if (targetTile && slot !== undefined) {
    applyTileViewport(targetTile);
  }
  if (pushHistory) {
    pushHistoryState(createHistoryState(scene, slot, undefined, targetTile));
  }
}

function navigateToTile(targetTile: TileTarget, pushHistory = true, fromAddr?: number): void {
  if (!state.runtime) {
    return;
  }
  if (pushHistory) {
    syncCurrentStateToHistory(fromAddr);
  }

  applyTileViewport(targetTile);

  if (pushHistory) {
    pushHistoryState(createHistoryState(state.runtime.sceneNumber, state.selectedSlot, undefined, targetTile));
  }
}

function navigateObject(slot: number, pushHistory = true, fromAddr?: number, targetTile?: TileTarget): void {
  if (!state.assets) return;
  if (pushHistory) syncCurrentStateToHistory(fromAddr);

  const ownerScene = findSceneForSlot(slot);
  if (ownerScene === undefined) return;

  if (ownerScene !== state.runtime?.sceneNumber) {
    dom.sceneSelect.value = String(ownerScene);
    loadScene(ownerScene, true);
  }

  if (!state.runtime?.model.objects.has(slot)) return;
  selectObject(slot, true);
  if (targetTile) {
    applyTileViewport(targetTile);
  }

  if (pushHistory && state.runtime) {
    pushHistoryState(createHistoryState(state.runtime.sceneNumber, slot, undefined, targetTile));
  }
}

function isPositionJumpInstruction(inst: Instruction): boolean {
  return inst.op === Opcode.SET_PARTY_POS
    || inst.op === Opcode.SET_EVENT_POS
    || inst.op === Opcode.WALK_TO_TILE
    || inst.op === Opcode.WALK_TO_TILE_SLOW;
}

function getInstructionTargetTile(inst: Instruction): TileTarget | undefined {
  const x = inst.params.find((param) => param.label === "x" && param.type === "number")?.raw;
  const y = inst.params.find((param) => param.label === "y" && param.type === "number")?.raw;
  return resolveTileTarget(x, y);
}

function formatPositionJumpText(inst: Instruction): string {
  return inst.params
    .filter((param) => param.label === "x" || param.label === "y" || param.label === "half")
    .map((param) => `${param.label}=${param.raw}`)
    .join(" ");
}

function resolveInstructionTargetSlot(inst: Instruction): number | undefined {
  if (inst.op !== Opcode.SET_EVENT_POS) {
    return undefined;
  }

  const eventParam = inst.params.find((param) => param.type === "event");
  if (!eventParam || eventParam.raw === 0 || eventParam.raw === 0xFFFF) {
    return undefined;
  }
  return eventParam.raw - 1;
}

function buildInstructionParamElements(inst: Instruction): HTMLElement[] {
  if (!isPositionJumpInstruction(inst)) {
    return inst.params.map((param) => buildParamElement(param, inst.index));
  }

  const targetTile = getInstructionTargetTile(inst);
  if (!targetTile) {
    return inst.params.map((param) => buildParamElement(param, inst.index));
  }

  const elements: HTMLElement[] = [];
  if (inst.op === Opcode.SET_EVENT_POS) {
    const eventParam = inst.params.find((param) => param.type === "event");
    if (eventParam) {
      elements.push(buildParamElement(eventParam, inst.index));
    }
  }

  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "script-param script-param--position";
  jump.textContent = formatPositionJumpText(inst);
  jump.addEventListener("click", () => {
    const targetSlot = resolveInstructionTargetSlot(inst);
    if (targetSlot !== undefined) {
      navigateObject(targetSlot, true, inst.index, targetTile);
      return;
    }
    navigateToTile(targetTile, true, inst.index);
  });
  elements.push(jump);

  return elements;
}

function buildParamElement(p: DecodedParam, instIndex?: number): HTMLElement {
  const isScript = p.type === "script";
  const el = document.createElement(isScript ? "button" : "span");
  el.className = isScript ? "script-param script-param--script" : "script-param";

  if (isScript) {
    (el as HTMLButtonElement).type = "button";
    (el as HTMLButtonElement).dataset.scriptIndex = String(p.raw);
    el.textContent = `${p.label}=0x${p.raw.toString(16).padStart(4, "0").toUpperCase()}`;
    el.addEventListener("click", () => {
      const targetIdx = p.raw;
      if (!state.scriptStack.includes(targetIdx)) {
        state.scriptStack.push(targetIdx);
        state.collapsedScripts.delete(targetIdx);
        const scrollContainer = getInspectorScrollContainer();
        const savedScrollTop = scrollContainer.scrollTop;
        renderInspector();
        scrollContainer.scrollTop = savedScrollTop;
      }
      scrollScriptBlockIntoView(targetIdx);
    });
  } else if (p.type === "dialogue") {
    el.textContent = `${p.label}=0x${p.raw.toString(16).padStart(4, "0").toUpperCase()}`;
  } else if (p.type === "word") {
    const text = state.assets?.getWord(p.raw);
    el.textContent = text ? `${p.label}=${text}(${p.raw})` : `${p.label}=${p.raw}`;
  } else if (p.type === "scene") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "script-param script-param--scene";
    btn.textContent = `${p.label}=${p.raw}`;
    btn.addEventListener("click", () => { navigateScene(p.raw, undefined, true, instIndex); });
    return btn;
  } else if (p.type === "event") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "script-param script-param--event";
    const isSelf = p.raw === 0 || p.raw === 0xFFFF;
    btn.textContent = isSelf ? `${p.label}=self` : `${p.label}=${p.raw - 1}`;
    // 0 and 0xFFFF mean "use current/self event" — no navigation target.
    // Event params are 1 higher than the actual 1-based slot number (actualSlot = event_param - 1).
    btn.addEventListener("click", () => {
      if (isSelf) return;
      navigateObject(p.raw - 1, true, instIndex);
    });
    return btn;
  } else if (p.type === "signed") {
    el.textContent = `${p.label}=${toSigned16(p.raw)}`;
  } else {
    el.textContent = `${p.label}=${p.raw}`;
  }

  return el;
}

function buildScriptSection(
  title: string,
  scriptIndex: number,
  instructions: Instruction[],
  isCollapsed?: boolean,
  onToggleCollapse?: () => void,
  onClose?: () => void,
  onPin?: () => void,
  contextSpriteNum?: number
): HTMLElement {
  const section = buildInfoSection(title);
  section.dataset.scriptIndex = String(scriptIndex);

  const heading = section.querySelector("h3")!;
  const header = document.createElement("div");
  header.className = "script-section-header";
  heading.replaceWith(header);

  const titleWrap = document.createElement("div");
  titleWrap.className = "script-section-title-wrap";
  titleWrap.append(heading);
  header.append(titleWrap);

  if (onToggleCollapse) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "script-toggle-btn";
    toggleBtn.textContent = isCollapsed ? "▶" : "▼";
    toggleBtn.addEventListener("click", onToggleCollapse);
    titleWrap.prepend(toggleBtn);
  }

  const actions = document.createElement("div");
  actions.className = "script-section-actions";
  header.append(actions);

  if (onPin) {
    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "script-action-btn";
    pinBtn.setAttribute("aria-label", "Pin to stack");
    pinBtn.title = "Pin to stack";
    pinBtn.textContent = "📌";
    pinBtn.addEventListener("click", onPin);
    actions.append(pinBtn);
  }

  if (onClose) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "script-action-btn script-action-btn--close";
    closeBtn.setAttribute("aria-label", "Remove from stack");
    closeBtn.title = "Remove from stack";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", onClose);
    actions.append(closeBtn);
  }

  if (!isCollapsed) {
    const subtitle = document.createElement("p");
    subtitle.className = "status-line";
    subtitle.textContent = `Script ${formatHex(scriptIndex)} (${scriptIndex})`;
    section.append(subtitle);

    const grid = document.createElement("div");
    grid.className = "script-grid";

    if (instructions.length === 0) {
      const empty = document.createElement("span");
      empty.className = "script-empty";
      empty.textContent = "(no decoded instructions)";
      grid.append(empty);
    } else {
      for (const inst of instructions) {
        const addr = document.createElement("span");
        addr.className = "script-addr";
        addr.dataset.addr = String(inst.index);
        addr.textContent = formatHex(inst.index);

        const op = document.createElement("span");
        op.className = "script-op";
        op.textContent = inst.name;

        const params = document.createElement("span");
        params.className = "script-params";
        for (const paramElement of buildInstructionParamElements(inst)) {
          params.append(paramElement);
        }

        const gutter = buildSemanticGutter(inst, contextSpriteNum);
        grid.append(addr, op, params, gutter);
      }
    }

    section.append(grid);
  } else {
    const preview = extractScriptPreview(instructions);
    if (preview) {
      const previewEl = document.createElement("p");
      previewEl.className = "script-collapsed-preview";
      previewEl.textContent = preview;
      section.append(previewEl);
    }
  }

  return section;
}

function renderPortraitPreview(parent: HTMLElement, portraitId: number): void {
  const section = buildInfoSection("Dialogue Portrait");
  const wrap = document.createElement("div");
  wrap.className = "portrait-preview";

  const label = document.createElement("p");
  label.className = "status-line";
  label.textContent = `Portrait ${portraitId}`;
  wrap.append(label);

  if (!state.files["RGM.MKF"] || !state.runtime) {
    const hint = document.createElement("p");
    hint.className = "status-line";
    hint.textContent = "Load RGM.MKF to preview dialogue portraits here.";
    wrap.append(hint);
    section.append(wrap);
    parent.append(section);
    return;
  }

  try {
    const directory = getCachedSprite("portrait", portraitId);
    const frame = blitter.getFrame(directory, 0, `portrait:${portraitId}`);
    if (!frame) {
      throw new Error(`Portrait ${portraitId} could not be decoded.`);
    }

    const surface = new MemorySurface(frame.width, frame.height);
    blitter.drawPixels(surface, frame, 0, 0);
    const rgba = paletteRenderer.toRgba(surface, state.runtime.colors);
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create portrait preview context.");
    }
    context.putImageData(new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0);
    wrap.append(canvas);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = document.createElement("p");
    hint.className = "status-line";
    hint.textContent = message;
    wrap.append(hint);
  }

  section.append(wrap);
  parent.append(section);
}

function renderTinyPreview(
  type: "portrait" | "worldFrame" | "item" | "playerBattle" | "enemyBattle",
  id: number,
  contextSpriteNum?: number,
  dir?: number
): HTMLCanvasElement | null {
  if (!state.runtime || !state.assets) return null;
  if (type === "portrait" && (id === 0 || !state.files["RGM.MKF"])) return null;
  if (type === "worldFrame" && contextSpriteNum === undefined) return null;
  if (type === "item" && !state.files["BALL.MKF"]) return null;
  if (type === "playerBattle" && !state.files["F.MKF"]) return null;
  if (type === "enemyBattle" && !state.files["ABC.MKF"]) return null;

  try {
    let directory: SpriteDirectory;
    let frameIndex: number;
    if (type === "worldFrame") {
      directory = getCachedSprite("world", contextSpriteNum!);
      if (dir !== undefined) {
        const nFramesPerDir = Math.floor(directory.numFrames / 4);
        frameIndex = dir * nFramesPerDir + id;
      } else {
        frameIndex = id;
      }
    } else if (type === "playerBattle") {
      directory = getCachedSprite("playerBattle", id);
      frameIndex = 0;
    } else if (type === "enemyBattle") {
      directory = getCachedSprite("enemyBattle", id);
      frameIndex = 0;
    } else if (type === "item") {
      directory = getCachedSprite("item", id);
      frameIndex = 0;
    } else {
      directory = getCachedSprite("portrait", id);
      frameIndex = 0;
    }
    const cacheKey = `thumb:${type}:${contextSpriteNum ?? id}:${dir ?? ""}:${frameIndex}`;
    const frame = blitter.getFrame(directory, frameIndex, cacheKey);
    if (!frame) return null;
    const surface = new MemorySurface(frame.width, frame.height);
    blitter.drawPixels(surface, frame, 0, 0);
    const rgba = paletteRenderer.toRgba(surface, state.runtime.colors);
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.className = "script-thumb";
    canvas.getContext("2d")!.putImageData(
      new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0
    );
    return canvas;
  } catch {
    return null;
  }
}

function buildSemanticGutter(inst: Instruction, contextSpriteNum?: number): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = "script-marginalia";

  const portraitParam = inst.params.find(p => p.type === "portrait");
  if (portraitParam) {
    const thumb = renderTinyPreview("portrait", portraitParam.raw);
    if (thumb) el.append(thumb);
  }

  const dialogueParam = inst.params.find(p => p.type === "dialogue");
  if (dialogueParam) {
    const text = state.assets?.getDialogue(dialogueParam.raw);
    if (text) {
      const span = document.createElement("span");
      span.className = "script-gutter-text";
      span.textContent = text;
      el.append(span);
    }
  }

  const worldFrameParam = inst.params.find(p => p.type === "worldFrame");
  if (worldFrameParam) {
    let spriteNum = contextSpriteNum;
    let dir: number | undefined;
    const eventParam = inst.params.find(p => p.type === "event");
    if (eventParam && eventParam.raw !== 0 && eventParam.raw !== 0xFFFF) {
      // Event params are 1 higher than the actual slot key (slot = raw - 1)
      const targetSprite = state.runtime?.model.objects.get(eventParam.raw - 1)?.data.spriteNum;
      if (targetSprite !== undefined) spriteNum = targetSprite;
    }
    // For SET_DIRECTION, a "dir" number param selects the facing direction
    const dirParam = inst.params.find(p => p.type === "number" && p.label === "dir");
    if (dirParam !== undefined) dir = dirParam.raw;
    const thumb = renderTinyPreview("worldFrame", worldFrameParam.raw, spriteNum, dir);
    if (thumb) el.append(thumb);
  }

  // Item: name from WORD.DAT + icon from BALL.MKF (via NameDef V1)
  const itemParam = inst.params.find(p => p.type === "item");
  if (itemParam && state.assets) {
    const name = state.assets.getWord(itemParam.raw);
    if (name) {
      const span = document.createElement("span");
      span.className = "script-gutter-text";
      span.textContent = name;
      el.append(span);
    }
    if (state.files["BALL.MKF"]) {
      try {
        const spriteIndex = state.assets.getWordAssetId(itemParam.raw);
        if (spriteIndex > 0) {
          const thumb = renderTinyPreview("item", spriteIndex);
          if (thumb) el.append(thumb);
        }
      } catch { /* ignore */ }
    }
  }

  // Magic: name from WORD.DAT (LEARN_MAGIC uses same word table as items, different index range)
  const magicParam = inst.params.find(p => p.type === "magic");
  if (magicParam && state.assets) {
    const name = state.assets.getWord(magicParam.raw);
    if (name) {
      const span = document.createElement("span");
      span.className = "script-gutter-text";
      span.textContent = name;
      el.append(span);
    }
  }

  // Player battle sprite preview (SET_PLAYER_IMAGE)
  const battleSpriteParam = inst.params.find(p => p.type === "battleSprite");
  if (battleSpriteParam && state.files["F.MKF"]) {
    const thumb = renderTinyPreview("playerBattle", battleSpriteParam.raw);
    if (thumb) el.append(thumb);
  }

  // Enemy group strip: up to 5 enemy icons + names (START_BATTLE)
  const battleGroupParam = inst.params.find(p => p.type === "battleGroup");
  if (battleGroupParam && state.assets) {
    try {
      const enemies = state.assets.getEnemyTeam(battleGroupParam.raw);
      const groupWrap = document.createElement("div");
      groupWrap.className = "script-battle-group";
      for (const enemy of enemies) {
        if (enemy.name) {
          const span = document.createElement("span");
          span.className = "script-gutter-text";
          span.textContent = enemy.name;
          groupWrap.append(span);
        }
        if (state.files["ABC.MKF"] && enemy.assetId > 0) {
          const thumb = renderTinyPreview("enemyBattle", enemy.assetId);
          if (thumb) groupWrap.append(thumb);
        }
      }
      el.append(groupWrap);
    } catch { /* ignore */ }
  }

  return el;
}

function scrollScriptBlockIntoView(scriptIndex: number): void {
  const blocks = Array.from(
    dom.inspectorDetails.querySelectorAll<HTMLElement>(`section[data-script-index="${scriptIndex}"]`)
  );
  blocks[blocks.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollInstructionIntoView(addr: number): void {
  const el = dom.inspectorDetails.querySelector<HTMLElement>(`[data-addr="${addr}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function extractScriptPreview(instructions: Instruction[]): string | null {
  for (const inst of instructions) {
    for (const p of inst.params) {
      if (p.type === "dialogue") {
        const text = state.assets?.getDialogue(p.raw);
        if (text) return text.replace(/\n/g, " ").slice(0, 80);
      }
    }
  }
  for (const inst of instructions) {
    for (const p of inst.params) {
      if (p.type === "word") {
        const text = state.assets?.getWord(p.raw);
        if (text) return text;
      }
    }
  }
  return null;
}

function appendScriptStack(): void {
  if (!state.assets || state.scriptStack.length === 0) {
    return;
  }

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "script-stack-clear-btn";
  clearBtn.textContent = "Clear Script Stack";
  clearBtn.addEventListener("click", () => {
    state.scriptStack = [];
    state.collapsedScripts.clear();
    renderInspector();
  });
  dom.inspectorDetails.append(clearBtn);

  for (const stackIdx of state.scriptStack) {
    const stackInstructions = parseScript(state.assets.getScriptChunk(), stackIdx, SCRIPT_LINE_LIMIT);
    const isCollapsed = state.collapsedScripts.has(stackIdx);
    dom.inspectorDetails.append(
      buildScriptSection(
        `Script ${formatHex(stackIdx)}`,
        stackIdx,
        stackInstructions,
        isCollapsed,
        () => {
          const scrollContainer = getInspectorScrollContainer();
          const savedScrollTop = scrollContainer.scrollTop;
          if (state.collapsedScripts.has(stackIdx)) {
            state.collapsedScripts.delete(stackIdx);
          } else {
            state.collapsedScripts.add(stackIdx);
          }
          renderInspector();
          scrollContainer.scrollTop = savedScrollTop;
        },
        () => {
          const scrollContainer = getInspectorScrollContainer();
          const savedScrollTop = scrollContainer.scrollTop;
          state.scriptStack = state.scriptStack.filter((i) => i !== stackIdx);
          state.collapsedScripts.delete(stackIdx);
          renderInspector();
          scrollContainer.scrollTop = savedScrollTop;
        }
      )
    );
  }
}

function renderInspector(): void {
  if (!state.runtime) {
    dom.inspectorSubtitle.textContent = "Selected object details will appear here.";
    dom.inspectorDetails.textContent = "Initialize the viewer, then click an object or choose one from the scene list.";
    return;
  }

  const { model, sceneNumber, bounds } = state.runtime;
  const selected = state.selectedSlot !== undefined ? model.objects.get(state.selectedSlot) ?? null : null;

  dom.inspectorDetails.replaceChildren();

  if (!selected) {
    dom.inspectorSubtitle.textContent = `Scene ${formatSceneNumber(sceneNumber)} summary`;

    const sceneSection = buildInfoSection("Scene Overview");
    sceneSection.append(
      buildInfoGrid([
        ["Scene", `${formatSceneNumber(sceneNumber)} / map ${formatMapNumber(model.scene.mapNum)}`],
        ["Objects", String(model.objects.size)],
        ["Party in scene", String(model.party.length)],
        ["Bounds", `${bounds.minX}, ${bounds.minY} -> ${bounds.maxX}, ${bounds.maxY}`],
        ["Source", describeSceneSource(sceneNumber)],
      ])
    );
    dom.inspectorDetails.append(sceneSection);

    const makePinCallback = (idx: number) => () => {
      if (!state.scriptStack.includes(idx)) {
        state.scriptStack.push(idx);
        state.collapsedScripts.delete(idx);
        const scrollContainer = getInspectorScrollContainer();
        const savedScrollTop = scrollContainer.scrollTop;
        renderInspector();
        scrollContainer.scrollTop = savedScrollTop;
      }
      scrollScriptBlockIntoView(idx);
    };

    const enterIdx = model.scene.scriptOnEnter;
    const enterInstructions = state.assets
      ? parseScript(state.assets.getScriptChunk(), enterIdx, SCRIPT_LINE_LIMIT)
      : [];
    dom.inspectorDetails.append(
      buildScriptSection("Script on Enter", enterIdx, enterInstructions, false, undefined, undefined, makePinCallback(enterIdx))
    );

    const teleportIdx = model.scene.scriptOnTeleport;
    if (teleportIdx !== 0 && teleportIdx !== enterIdx) {
      const teleportInstructions = state.assets
        ? parseScript(state.assets.getScriptChunk(), teleportIdx, SCRIPT_LINE_LIMIT)
        : [];
      dom.inspectorDetails.append(
        buildScriptSection("Script on Teleport", teleportIdx, teleportInstructions, false, undefined, undefined, makePinCallback(teleportIdx))
      );
    }

    appendScriptStack();
    return;
  }

  const summary = state.runtime.objectSummaries.get(selected.data.slot);
  const title = summary?.title ?? `Object ${selected.data.slot}`;
  const tile = pixelToTile(selected.x, selected.y);
  const details = getScriptDetails(selected);

  dom.inspectorSubtitle.textContent = `${title} · slot ${selected.data.slot}`;

  const objectSection = buildInfoSection("Object Details");
  if (selected.data.spriteNum > 0) {
    const spriteCanvas = renderTinyPreview("worldFrame", 0, selected.data.spriteNum, 2);
    if (spriteCanvas) {
      const scale = 2;
      const scaled = document.createElement("canvas");
      scaled.width = spriteCanvas.width * scale;
      scaled.height = spriteCanvas.height * scale;
      scaled.className = "object-sprite-preview";
      const ctx = scaled.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spriteCanvas, 0, 0, scaled.width, scaled.height);
      objectSection.append(scaled);
    }
  }
  objectSection.append(
    buildInfoGrid([
      ["Position", `${selected.x}, ${selected.y}`],
      ["Tile", `${tile.x}, ${tile.y}, h=${tile.h}`],
      ["State", String(selected.state)],
      ["Trigger mode", String(selected.data.triggerMode)],
      ["Sprite", selected.data.spriteNum > 0 ? `${selected.data.spriteNum} (${selected.data.nSpriteFrames || selected.data.nSpriteFramesAuto} frames)` : "none"],
      ["Trigger script", `${formatHex(selected.data.triggerScript)} (${selected.data.triggerScript})`],
      ["Auto script", `${formatHex(selected.data.autoScript)} (${selected.data.autoScript})`],
      ["Summary", summary?.summary || "No short summary available"],
    ])
  );
  objectSection.append(buildBadgeRow(summary?.rewardLabels ?? [], selected.state === 0, summary?.exit));
  dom.inspectorDetails.append(objectSection);

  // Portrait preview moved to Semantic Gutter (4th column in script grid)

  dom.inspectorDetails.append(
    buildScriptSection("Trigger Script", selected.data.triggerScript, details.triggerInstructions, false, undefined, undefined, () => {
      const idx = selected.data.triggerScript;
      if (!state.scriptStack.includes(idx)) {
        state.scriptStack.push(idx);
        state.collapsedScripts.delete(idx);
        const scrollContainer = getInspectorScrollContainer();
        const savedScrollTop = scrollContainer.scrollTop;
        renderInspector();
        scrollContainer.scrollTop = savedScrollTop;
      }
      scrollScriptBlockIntoView(idx);
    }, selected.data.spriteNum)
  );

  if (selected.data.autoScript !== 0 && selected.data.autoScript !== selected.data.triggerScript) {
    dom.inspectorDetails.append(
      buildScriptSection("Auto Script", selected.data.autoScript, details.autoInstructions, false, undefined, undefined, () => {
        const idx = selected.data.autoScript;
        if (!state.scriptStack.includes(idx)) {
          state.scriptStack.push(idx);
          state.collapsedScripts.delete(idx);
          const scrollContainer = getInspectorScrollContainer();
          const savedScrollTop = scrollContainer.scrollTop;
          renderInspector();
          scrollContainer.scrollTop = savedScrollTop;
        }
        scrollScriptBlockIntoView(idx);
      }, selected.data.spriteNum)
    );
  }

  appendScriptStack();
}

function renderObjectList(): void {
  dom.objectList.replaceChildren();

  if (!state.runtime) {
    setStatus(dom.objectListStatus, "No scene loaded.");
    return;
  }

  const objects = Array.from(state.runtime.model.objects.values()).sort((left, right) => {
    const leftHidden = left.state === 0 ? 1 : 0;
    const rightHidden = right.state === 0 ? 1 : 0;
    return leftHidden - rightHidden || left.data.slot - right.data.slot;
  });
  const visibleCount = objects.filter((object) => object.state !== 0).length;
  setStatus(dom.objectListStatus, `${visibleCount} visible · ${objects.length - visibleCount} hidden`);

  for (const object of objects) {
    const summary = state.runtime.objectSummaries.get(object.data.slot);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "object-list__item";
    if (state.selectedSlot === object.data.slot) {
      button.classList.add("is-active");
    }
    if (object.state === 0) {
      button.classList.add("is-hidden");
    }

    const header = document.createElement("div");
    header.className = "object-list__header";

    const title = document.createElement("span");
    title.className = "object-list__title";
    title.textContent = `#${String(object.data.slot).padStart(3, "0")} ${summary?.title ?? `Object ${object.data.slot}`}`;

    const badges = document.createElement("div");
    badges.className = "badge-row object-list__badges";
    badges.append(buildBadge(object.state === 0 ? "Hidden" : "Visible", object.state === 0 ? "hidden" : "visible"));
    if (summary?.rewardLabels.length) {
      badges.append(buildBadge("Reward", "reward"));
    }
    if (summary?.exit) {
      badges.append(buildBadge("Exit", "exit"));
    }

    const tile = pixelToTile(object.x, object.y);
    const meta = document.createElement("span");
    meta.className = "object-list__meta";
    let metaText = `tile ${tile.x},${tile.y},${tile.h}`;
    if (summary?.rewardLabels.length) {
      metaText += ` · ${summary.rewardLabels[0]}`;
    } else if (summary?.exit) {
      metaText += ` · → Scene ${summary.exit.sceneId}`;
    }
    meta.textContent = metaText;

    header.append(title, badges);
    button.append(header, meta);

    // Sprite thumbnail in bottom-right corner (world sprite, south-facing frame 0)
    if (object.data.spriteNum > 0 && state.runtime && state.assets) {
      try {
        const dir = object.direction;
        const canvas = renderTinyPreview("worldFrame", 0, object.data.spriteNum, dir);
        if (canvas) {
          canvas.className = "object-list__sprite";
          button.append(canvas);
        }
      } catch { /* ignore */ }
    }

    button.addEventListener("click", () => {
      selectObject(object.data.slot, true);
    });
    dom.objectList.append(button);
    if (state.selectedSlot === object.data.slot) {
      button.scrollIntoView({ block: "nearest" });
    }
  }
}

function getObjectSpriteHit(object: ActiveObject, worldX: number, worldY: number): number | null {
  if (object.state === 0 || object.data.spriteNum <= 0) {
    return null;
  }

  const directory = getCachedSprite("world", object.data.spriteNum);
  const frameIndex = resolveAnimatedObjectFrame(
    object.direction,
    object.currentFrame,
    object.data.nSpriteFrames,
    state.animationStep,
    object.data.nSpriteFramesAuto
  );
  const frame = blitter.getFrame(directory, frameIndex, `world:${object.data.spriteNum}`);
  if (!frame) {
    return null;
  }

  const bounds = getSpriteBounds(
    object.x,
    object.y,
    object.data.sLayer,
    frame.width,
    frame.height,
    object.data.sLayer * 8 + 9,
    object.data.sLayer * 8 + 2
  );

  if (worldX < bounds.x || worldX >= bounds.x + frame.width || worldY < bounds.y || worldY >= bounds.y + frame.height) {
    return null;
  }

  const localX = Math.floor(worldX - bounds.x);
  const localY = Math.floor(worldY - bounds.y);
  const pixelIndex = localY * frame.width + localX;
  if (frame.mask[pixelIndex] === 0) {
    return null;
  }

  return Math.hypot(worldX - object.x, worldY - object.y);
}

function getAnchorProximityScore(object: ActiveObject, worldX: number, worldY: number): number | null {
  if (object.state === 0) {
    return null;
  }

  const dx = Math.abs(worldX - object.x) / 16;
  const dy = Math.abs(worldY - object.y) / 8;
  const score = dx + dy;
  return score <= 1.45 ? score : null;
}

function pickObjectAt(worldX: number, worldY: number): ActiveObject | null {
  if (!state.runtime) {
    return null;
  }

  const exactHit = state.runtime.model.hitTest(worldX, worldY);
  let bestSpriteHit: { object: ActiveObject; score: number } | null = null;
  let bestAnchorHit: { object: ActiveObject; score: number } | null = null;

  for (const object of state.runtime.model.objects.values()) {
    const spriteScore = getObjectSpriteHit(object, worldX, worldY);
    if (spriteScore !== null && (!bestSpriteHit || spriteScore < bestSpriteHit.score)) {
      bestSpriteHit = { object, score: spriteScore };
      continue;
    }

    const anchorScore = getAnchorProximityScore(object, worldX, worldY);
    if (anchorScore !== null && (!bestAnchorHit || anchorScore < bestAnchorHit.score)) {
      bestAnchorHit = { object, score: anchorScore };
    }
  }

  return bestSpriteHit?.object ?? bestAnchorHit?.object ?? exactHit;
}

function selectObject(slot: number | undefined, centerOnObject: boolean): void {
  if (!state.runtime) {
    return;
  }

  state.selectedSlot = slot;
  if (slot !== undefined) {
    if (window.innerWidth < 680 || (window.innerWidth <= 1200 && window.screen.orientation?.type.startsWith("landscape"))) {
      setMobileTab("inspector");
    }

    const object = state.runtime.model.objects.get(slot);
    if (object && centerOnObject) {
      const rect = dom.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? dom.canvas.width / rect.width : 1;
      const scaleY = rect.height > 0 ? dom.canvas.height / rect.height : 1;
      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(window.innerWidth, rect.right);
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(window.innerHeight, rect.bottom);
      const canvasCenterX = ((visibleLeft + visibleRight) / 2 - rect.left) * scaleX;
      const canvasCenterY = ((visibleTop + visibleBottom) / 2 - rect.top) * scaleY;
      state.viewport = centerViewportOnPoint(
        object.x,
        object.y,
        canvasCenterX,
        canvasCenterY,
        state.viewport.width,
        state.viewport.height,
        state.runtime.bounds
      );
      invalidateRender();
    }
  }

  renderInspector();
  renderObjectList();
  invalidateRender();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x + 32, y + 8);
  ctx.lineTo(x + 16, y + 16);
  ctx.lineTo(x, y + 8);
  ctx.closePath();
}

function drawOverlayLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  ctx.font = '12px "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 12;
  const height = 22;

  ctx.fillStyle = OVERLAY_LABEL_BG;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = OVERLAY_LABEL_FG;
  ctx.shadowColor = OVERLAY_LABEL_SHADOW;
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, x + 6, y + 15);
  ctx.shadowBlur = 0;
}

function drawOverlays(ctx: CanvasRenderingContext2D): void {
  if (!state.runtime) {
    return;
  }

  const objects = state.runtime.model.objects.values();

  ctx.save();
  ctx.lineWidth = 2;
  ctx.textBaseline = "alphabetic";

  for (const object of objects) {
    const summary = state.runtime.objectSummaries.get(object.data.slot);
    if (!summary || object.state === 0) {
      continue;
    }

    const hasRewards = summary.rewardLabels.length > 0;
    const hasExit = !!summary.exit;

    if (!hasRewards && !hasExit) {
      continue;
    }

    const drawX = object.x - state.viewport.x - 16;
    const drawY = object.y - state.viewport.y - 8;
    if (drawX > dom.canvas.width || drawY > dom.canvas.height || drawX < -32 || drawY < -16) {
      continue;
    }

    if (hasRewards) {
      ctx.strokeStyle = OVERLAY_REWARD_COLOR;
      ctx.fillStyle = OVERLAY_REWARD_FILL;
      drawDiamond(ctx, drawX, drawY);
      ctx.fill();
      ctx.stroke();

      const label = summary.rewardLabels.length > 1
        ? `${summary.rewardLabels[0]} +${summary.rewardLabels.length - 1}`
        : summary.rewardLabels[0]!;
      drawOverlayLabel(ctx, drawX + 18, drawY + 18, label);
    } else if (hasExit) {
      ctx.strokeStyle = OVERLAY_EXIT_COLOR;
      ctx.fillStyle = OVERLAY_EXIT_FILL;
      drawDiamond(ctx, drawX, drawY);
      ctx.fill();
      ctx.stroke();

      const label = `→ Scene ${summary.exit!.sceneId}`;
      drawOverlayLabel(ctx, drawX + 18, drawY + 18, label);
    }
  }

  if (state.selectedSlot !== undefined) {
    const selected = state.runtime.model.objects.get(state.selectedSlot);
    const summary = selected ? state.runtime.objectSummaries.get(selected.data.slot) : undefined;
    if (selected) {
      const drawX = selected.x - state.viewport.x - 16;
      const drawY = selected.y - state.viewport.y - 8;
      ctx.strokeStyle = OVERLAY_SELECTION_COLOR;
      ctx.fillStyle = OVERLAY_SELECTION_FILL;
      drawDiamond(ctx, drawX, drawY);
      ctx.fill();
      ctx.stroke();
      drawOverlayLabel(ctx, drawX + 18, Math.max(6, drawY - 26), summary?.title ?? `Object ${selected.data.slot}`);
    }
  }

  ctx.restore();
}

function renderScene(): void {
  if (!state.runtime) {
    return;
  }

  const context = getCanvasContext();
  const resized = resizeCanvasToDisplaySize();
  if (resized) {
    invalidateRender();
  }

  if (!state.renderInvalidated) {
    return;
  }

  const surface = new MemorySurface(dom.canvas.width, dom.canvas.height);
  const sprites = buildRenderList(state.runtime.model, state.animationStep);
  engine.render(surface, state.runtime.model.map, sprites, state.viewport);

  const rgba = paletteRenderer.toRgba(surface, state.runtime.colors);
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), surface.width, surface.height), 0, 0);
  drawOverlays(context);
  state.renderInvalidated = false;
}

function getWorldPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
  const rect = dom.canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? dom.canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? dom.canvas.height / rect.height : 1;
  return {
    x: state.viewport.x + Math.floor((clientX - rect.left) * scaleX),
    y: state.viewport.y + Math.floor((clientY - rect.top) * scaleY),
  };
}

function initCanvasInteraction(): void {
  dom.canvas.addEventListener("pointerdown", (event) => {
    if (!state.runtime || event.button !== 0) {
      return;
    }

    dom.canvas.setPointerCapture(event.pointerId);
    state.drag = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewportX: state.viewport.x,
      startViewportY: state.viewport.y,
      moved: false,
    };
  });

  dom.canvas.addEventListener("pointermove", (event) => {
    if (!state.runtime || !state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = Math.round(event.clientX - state.drag.startClientX);
    const dy = Math.round(event.clientY - state.drag.startClientY);
    if (!state.drag.moved && Math.abs(dx) + Math.abs(dy) >= POINTER_DRAG_THRESHOLD) {
      state.drag.moved = true;
      dom.canvasShell.classList.add("is-dragging");
    }

    if (!state.drag.moved) {
      return;
    }

    state.viewport = clampViewport(
      {
        ...state.viewport,
        x: state.drag.startViewportX - dx,
        y: state.drag.startViewportY - dy,
      },
      state.runtime.bounds
    );
    invalidateRender();
  });

  const finishPointer = (event: PointerEvent) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }

    const drag = state.drag;
    state.drag = undefined;
    dom.canvasShell.classList.remove("is-dragging");

    if (!drag.moved && state.runtime) {
      const world = getWorldPointFromClient(event.clientX, event.clientY);
      const hit = pickObjectAt(world.x, world.y);
      selectObject(hit?.data.slot, false);
    }
  };

  dom.canvas.addEventListener("pointerup", finishPointer);
  dom.canvas.addEventListener("pointercancel", finishPointer);
}

function initControls(): void {
  dom.initializeButton.addEventListener("click", () => {
    void initializeViewer();
  });

  dom.sceneSelect.addEventListener("change", () => {
    const value = Number(dom.sceneSelect.value);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    try {
      navigateScene(value, undefined, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(dom.viewerStatus, `Failed to load scene ${value}: ${message}`, "error");
      setPlaceholder(message);
    }
  });

  window.addEventListener("popstate", (event) => {
    if (!state.initialized || !state.assets) return;
    const historyState = mergeHistoryState(
      readHashHistoryState(state.assets.getSceneCount()),
      event.state as ViewerHistoryState | null
    );
    if (historyState.scene === undefined) return;
    restoreHistoryState(historyState);
  });

  dom.centerPartyButton.addEventListener("click", () => {
    if (!state.runtime) return;
    const saveViewport = getCurrentSaveViewport();
    if (saveViewport) {
      state.viewport = saveViewport;
    } else {
      const { model, bounds } = state.runtime;
      const focus = getSceneFocusPoint(model, bounds);
      state.viewport = {
        x: Math.floor(focus.x - state.viewport.width / 2),
        y: Math.floor(focus.y - state.viewport.height / 2),
        width: state.viewport.width,
        height: state.viewport.height,
      };
    }
    invalidateRender();
  });

  dom.mobileTabObjects.addEventListener("click", () => {
    setMobileTab("objects");
  });

  dom.mobileTabInspector.addEventListener("click", () => {
    setMobileTab("inspector");
  });

  window.addEventListener("resize", () => {
    if (resizeCanvasToDisplaySize()) {
      invalidateRender();
    }
  });
}

function renderLoop(timestamp: number): void {
  const nextAnimationStep = Math.floor(timestamp / ANIMATION_FRAME_MS);
  if (nextAnimationStep !== state.animationStep) {
    state.animationStep = nextAnimationStep;
    if (state.runtime) {
      invalidateRender();
    }
  }

  if (state.runtime) {
    renderScene();
  }

  window.requestAnimationFrame(renderLoop);
}

function initApp(): void {
  initTabs();
  initFileInputs();
  initLibraryStatus();
  initCanvasInteraction();
  initControls();
  refreshInitializeButton();
  renderInspector();
  renderObjectList();
  updateViewerStatus();
  setActiveTab("files-tab");
  window.requestAnimationFrame(renderLoop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, { once: true });
} else {
  initApp();
}
