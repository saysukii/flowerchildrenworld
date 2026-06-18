import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useMemo } from "react";
import type { GardenWhiteboardScene } from "@/lib/garden";

type ExcalidrawCanvasProps = {
  initialScene: GardenWhiteboardScene;
  onChange: (scene: GardenWhiteboardScene) => void;
};

export function ExcalidrawCanvas({ initialScene, onChange }: ExcalidrawCanvasProps) {
  const initialData = useMemo(
    () => ({
      elements: initialScene.elements ?? [],
      appState: initialScene.appState,
      files: initialScene.files,
    }),
    [initialScene],
  );

  return (
    <div className="h-full w-full [&_.excalidraw]:h-full">
      <Excalidraw
        initialData={initialData}
        onChange={(elements, appState, files) => {
          onChange({
            elements: elements as unknown[],
            appState: appState as Record<string, unknown>,
            files: files as Record<string, unknown>,
          });
        }}
      />
    </div>
  );
}
