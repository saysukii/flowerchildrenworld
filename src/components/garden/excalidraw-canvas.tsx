import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { FileText, Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { WhiteboardMobileColorPortal } from "@/components/garden/whiteboard-mobile-color-portal";
import {
  hasWhiteboardSelection,
  WhiteboardMobileToolbarPortal,
} from "@/components/garden/whiteboard-mobile-toolbar-portal";
import { WhiteboardColorToolbar } from "@/components/garden/whiteboard-color-toolbar";
import { sanitizeWhiteboardScene, type GardenWhiteboardScene } from "@/lib/garden";
import {
  readWhiteboardFillColor,
  readWhiteboardOpacity,
  readWhiteboardStrokeColor,
  readWhiteboardStrokeWidth,
  type WhiteboardStrokeWidth,
} from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";
import { cn } from "@/lib/utils";

type ExcalidrawCanvasProps = {
  initialScene: GardenWhiteboardScene;
  onChange: (scene: GardenWhiteboardScene) => void;
  onSave: () => Promise<void>;
  onExportToNote: (api: ExcalidrawApi) => Promise<void>;
  onMenuOpenChange?: (open: boolean) => void;
  isMobile?: boolean;
};

export function ExcalidrawCanvas({
  initialScene,
  onChange,
  onSave,
  onExportToNote,
  onMenuOpenChange,
  isMobile = false,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuOpenRef = useRef(false);
  const hadSelectionRef = useRef(false);
  const [strokeColor, setStrokeColor] = useState("#1e1e1e");
  const [fillColor, setFillColor] = useState("#ffc9c9");
  const [strokeWidth, setStrokeWidth] = useState<WhiteboardStrokeWidth>(2);
  const [opacity, setOpacity] = useState(100);

  const initialData = useMemo(
    () => sanitizeWhiteboardScene(initialScene),
    [initialScene],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overscroll-contain touch-manipulation",
        "[&_.excalidraw]:h-full [&_.color-picker-container]:hidden",
        "[&_.App-mobile-menu_.panelColumn]:gap-1",
        "[&_.App-mobile-menu_h3]:mb-1 [&_.App-mobile-menu_h3]:text-xs [&_.App-mobile-menu_h3]:font-normal",
        isMobile && [
          "[&_.App-bottom-bar]:pb-[max(0.25rem,env(safe-area-inset-bottom))]",
          "[&_.excalidraw--mobile_.ToolIcon_type_button]:min-h-11 [&_.excalidraw--mobile_.ToolIcon_type_button]:min-w-11",
          "[&_.excalidraw--mobile_.ToolIcon__icon]:h-6 [&_.excalidraw--mobile_.ToolIcon__icon]:w-6",
          "[&_.App-mobile-menu]:max-h-[min(55dvh,420px)] [&_.App-mobile-menu]:overflow-y-auto",
          "[&_.App-mobile-menu]:pb-[env(safe-area-inset-bottom,0px)]",
        ],
      )}
    >
      <div className="pointer-events-none absolute bottom-3 left-3 z-[60] max-sm:hidden sm:bottom-auto sm:left-auto sm:right-3 sm:top-3">
        <WhiteboardColorToolbar
          apiRef={apiRef}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
          onStrokeColorChange={setStrokeColor}
          onFillColorChange={setFillColor}
          onStrokeWidthChange={setStrokeWidth}
          onOpacityChange={setOpacity}
        />
      </div>
      <WhiteboardMobileColorPortal
        containerRef={containerRef}
        apiRef={apiRef}
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        onStrokeColorChange={setStrokeColor}
        onFillColorChange={setFillColor}
        onStrokeWidthChange={setStrokeWidth}
        onOpacityChange={setOpacity}
      />
      <WhiteboardMobileToolbarPortal containerRef={containerRef} />
      <Excalidraw
        aiEnabled={false}
        onChange={(elements, appState, files) => {
          const menuOpen = appState.openMenu === "canvas";
          if (menuOpen !== menuOpenRef.current) {
            menuOpenRef.current = menuOpen;
            onMenuOpenChange?.(menuOpen);
          }
          setStrokeColor(readWhiteboardStrokeColor(appState, elements));
          setFillColor(readWhiteboardFillColor(appState, elements));
          setStrokeWidth(readWhiteboardStrokeWidth(appState, elements));
          setOpacity(readWhiteboardOpacity(appState, elements));

          const hasSelection = hasWhiteboardSelection(
            appState as unknown as Record<string, unknown>,
          );
          if (
            isMobile &&
            hasSelection &&
            !hadSelectionRef.current &&
            appState.openMenu !== "shape"
          ) {
            apiRef.current?.updateScene({ appState: { openMenu: "shape" } });
          }
          hadSelectionRef.current = hasSelection;

          onChange({
            elements: elements as unknown[],
            appState: appState as unknown as Record<string, unknown>,
            files: files as unknown as Record<string, unknown>,
          });
        }}
        initialData={initialData as never}
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveToActiveFile: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.Item
            onSelect={() => {
              void onSave();
            }}
            icon={<Save className="h-4 w-4" strokeWidth={1.75} />}
          >
            Save whiteboard
          </MainMenu.Item>
          <MainMenu.Item
            onSelect={() => {
              const api = apiRef.current;
              if (api) void onExportToNote(api);
            }}
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          >
            Export to note
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
