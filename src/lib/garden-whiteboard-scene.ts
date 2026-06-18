import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

export const WHITEBOARD_STROKE_WIDTHS = [1, 2, 4] as const;
export type WhiteboardStrokeWidth = (typeof WHITEBOARD_STROKE_WIDTHS)[number];

type WhiteboardStyleUpdate = {
  currentItemStrokeColor?: string;
  currentItemBackgroundColor?: string;
  currentItemStrokeWidth?: number;
  currentItemOpacity?: number;
};

type SceneElement = Record<string, unknown>;

type ApplyWhiteboardStyleOptions = {
  /** Skip history while dragging the color picker. */
  live?: boolean;
};

function getSelectedElementIds(appState: Record<string, unknown>): Set<string> {
  const selected = appState.selectedElementIds;
  if (selected instanceof Set) {
    return new Set([...selected].map(String));
  }
  if (selected && typeof selected === "object") {
    return new Set(
      Object.entries(selected as Record<string, unknown>)
        .filter(([, value]) => value)
        .map(([id]) => id),
    );
  }
  return new Set();
}

function elementHasStrokeColor(type: unknown): boolean {
  if (typeof type !== "string") return false;
  return !["image", "frame", "magicframe", "embeddable"].includes(type);
}

function elementHasStrokeWidth(el: SceneElement): boolean {
  return typeof el.strokeWidth === "number";
}

export function applyWhiteboardStyle(
  api: ExcalidrawApi,
  update: WhiteboardStyleUpdate,
  options: ApplyWhiteboardStyleOptions = {},
) {
  const appState = api.getAppState();
  const selectedIds = getSelectedElementIds(appState);
  const elements = [...api.getSceneElements()] as SceneElement[];

  const sceneUpdate: {
    appState?: Record<string, unknown>;
    elements?: SceneElement[];
    captureUpdate?: (typeof CaptureUpdateAction)[keyof typeof CaptureUpdateAction];
  } = {
    appState: update,
    captureUpdate: options.live
      ? CaptureUpdateAction.NEVER
      : CaptureUpdateAction.IMMEDIATELY,
  };

  if (selectedIds.size === 0) {
    api.updateScene(sceneUpdate);
    return;
  }

  sceneUpdate.elements = elements.map((el) => {
    if (!selectedIds.has(String(el.id))) return el;

    const patch: Record<string, unknown> = {};
    if (
      update.currentItemStrokeColor !== undefined &&
      elementHasStrokeColor(el.type)
    ) {
      patch.strokeColor = update.currentItemStrokeColor;
    }
    if (update.currentItemBackgroundColor !== undefined) {
      patch.backgroundColor = update.currentItemBackgroundColor;
    }
    if (
      update.currentItemStrokeWidth !== undefined &&
      elementHasStrokeWidth(el)
    ) {
      patch.strokeWidth = update.currentItemStrokeWidth;
    }
    if (update.currentItemOpacity !== undefined) {
      patch.opacity = update.currentItemOpacity;
    }

    if (Object.keys(patch).length === 0) return el;
    return newElementWith(el as never, patch as never);
  });

  api.updateScene(sceneUpdate);
}

export function readWhiteboardStrokeColor(
  appState: Record<string, unknown>,
  elements: readonly unknown[],
  fallback = "#1e1e1e",
): string {
  const selectedIds = getSelectedElementIds(appState);
  if (selectedIds.size > 0) {
    const selected = (elements as SceneElement[]).filter((el) =>
      selectedIds.has(String(el.id)),
    );
    const colors = selected
      .filter((el) => elementHasStrokeColor(el.type))
      .map((el) => el.strokeColor)
      .filter((color): color is string => typeof color === "string" && color.length > 0);
    if (colors.length > 0) return colors[0];
  }

  const current = appState.currentItemStrokeColor;
  return typeof current === "string" ? current : fallback;
}

export function readWhiteboardFillColor(
  appState: Record<string, unknown>,
  elements: readonly unknown[],
  fallback = "#ffc9c9",
): string {
  const selectedIds = getSelectedElementIds(appState);
  if (selectedIds.size > 0) {
    const selected = (elements as SceneElement[]).filter((el) =>
      selectedIds.has(String(el.id)),
    );
    const colors = selected
      .map((el) => el.backgroundColor)
      .filter((color): color is string => typeof color === "string" && color.length > 0);
    if (colors.length > 0) return colors[0];
  }

  const current = appState.currentItemBackgroundColor;
  return typeof current === "string" ? current : fallback;
}

export function readWhiteboardStrokeWidth(
  appState: Record<string, unknown>,
  elements: readonly unknown[],
): WhiteboardStrokeWidth {
  const selectedIds = getSelectedElementIds(appState);
  if (selectedIds.size > 0) {
    const selected = (elements as SceneElement[]).filter((el) =>
      selectedIds.has(String(el.id)),
    );
    const widths = selected
      .map((el) => el.strokeWidth)
      .filter((w): w is number => typeof w === "number");
    if (widths.length > 0) {
      const first = widths[0];
      return widths.every((w) => w === first)
        ? (first as WhiteboardStrokeWidth)
        : (first as WhiteboardStrokeWidth);
    }
  }

  const current = appState.currentItemStrokeWidth;
  if (typeof current === "number") {
    return current as WhiteboardStrokeWidth;
  }
  return 2;
}

export function readWhiteboardOpacity(
  appState: Record<string, unknown>,
  elements: readonly unknown[],
): number {
  const selectedIds = getSelectedElementIds(appState);
  if (selectedIds.size > 0) {
    const selected = (elements as SceneElement[]).filter((el) =>
      selectedIds.has(String(el.id)),
    );
    const opacities = selected
      .map((el) => el.opacity)
      .filter((o): o is number => typeof o === "number");
    if (opacities.length > 0) {
      return opacities[0];
    }
  }

  const current = appState.currentItemOpacity;
  return typeof current === "number" ? current : 100;
}
