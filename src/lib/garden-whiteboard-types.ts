/** Minimal Excalidraw API surface used by Garden whiteboard helpers. */
export type ExcalidrawApi = {
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
  updateScene: (scene: {
    appState?: Record<string, unknown>;
    elements?: unknown[];
    captureUpdate?: number;
  }) => void;
  setActiveTool?: (tool: { type: string }) => void;
};
