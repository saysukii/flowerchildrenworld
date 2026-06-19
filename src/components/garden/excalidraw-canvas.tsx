import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { FileText, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { WhiteboardColorToolbarPortal } from "@/components/garden/whiteboard-color-toolbar-portal";
import { WhiteboardMobileToolbarPortal, hasWhiteboardSelection } from "@/components/garden/whiteboard-mobile-toolbar-portal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  onReset: () => Promise<void>;
  onMenuOpenChange?: (open: boolean) => void;
  isMobile?: boolean;
};

export function ExcalidrawCanvas({
  initialScene,
  onChange,
  onSave,
  onExportToNote,
  onReset,
  onMenuOpenChange,
  isMobile = false,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuOpenRef = useRef(false);
  const selectionKeyRef = useRef("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
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
        "[&_.excalidraw--mobile_.mobile-misc-tools-container]:hidden",
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
      <WhiteboardColorToolbarPortal
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
        touchFriendly={isMobile}
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

          const appStateRecord = appState as unknown as Record<string, unknown>;

          if (isMobile) {
            const selected = appStateRecord.selectedElementIds;
            const selectionKey =
              selected instanceof Set
                ? [...selected].join(",")
                : selected && typeof selected === "object"
                  ? Object.entries(selected as Record<string, unknown>)
                      .filter(([, active]) => active)
                      .map(([id]) => id)
                      .join(",")
                  : "";
            const hasSelection = hasWhiteboardSelection(appStateRecord);
            if (
              hasSelection &&
              selectionKey !== selectionKeyRef.current &&
              appState.openMenu === "shape"
            ) {
              apiRef.current?.updateScene({ appState: { openMenu: null } });
            }
            selectionKeyRef.current = selectionKey;
          }

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
          <MainMenu.Item
            onSelect={() => setResetOpen(true)}
            icon={<Trash2 className="h-4 w-4" strokeWidth={1.75} />}
          >
            Reset canvas
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Reset canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the entire whiteboard. Your drawings will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={(e) => {
                e.preventDefault();
                setResetting(true);
                void onReset().finally(() => {
                  setResetting(false);
                  setResetOpen(false);
                });
              }}
              className="bg-[#C53D3D] text-white hover:bg-[#C53D3D]/90"
            >
              Reset canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
