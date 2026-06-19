import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CanvasErrorBoundary } from "@/components/garden/canvas-error-boundary";
import { WhiteboardExportDialog } from "@/components/garden/whiteboard-export-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  EMPTY_WHITEBOARD_SCENE,
  sanitizeWhiteboardScene,
  whiteboardHasContent,
  type GardenWhiteboardScene,
  type GardenNote,
} from "@/lib/garden";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ExcalidrawCanvas = lazy(() =>
  import("@/components/garden/excalidraw-canvas").then((m) => ({
    default: m.ExcalidrawCanvas,
  })),
);

const WHITEBOARD_ID = "shared";

type WhiteboardTabProps = {
  userId: string;
  onNewNoteCreated?: (note: GardenNote) => void;
};

export function WhiteboardTab({ userId, onNewNoteCreated }: WhiteboardTabProps) {
  const isMobile = useIsMobile();
  const [initialScene, setInitialScene] = useState<GardenWhiteboardScene | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasContent, setHasContent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const exportApiRef = useRef<ExcalidrawApi | null>(null);
  const sceneRef = useRef<GardenWhiteboardScene>({});
  const saveInFlight = useRef(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("garden_whiteboard")
        .select("scene_data")
        .eq("id", WHITEBOARD_ID)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        setInitialScene({});
        setLoading(false);
        return;
      }

      const scene = sanitizeWhiteboardScene((data?.scene_data as GardenWhiteboardScene) ?? {});
      sceneRef.current = scene;
      setHasContent(whiteboardHasContent(scene));
      setInitialScene(scene);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = prev;
    };
  }, [isMobile]);

  const saveScene = useCallback(
    async (showToast = false, sceneOverride?: GardenWhiteboardScene) => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      const payload = sanitizeWhiteboardScene(sceneOverride ?? sceneRef.current);
      const { error } = await supabase
        .from("garden_whiteboard")
        .upsert({
          id: WHITEBOARD_ID,
          scene_data: payload as never,
          updated_by: userId,
        });

      saveInFlight.current = false;
      if (error) {
        toast.error(error.message);
        return;
      }
      if (showToast) toast.success("Whiteboard saved.");
    },
    [userId],
  );

  useEffect(() => {
    if (loading) return;
    const interval = window.setInterval(() => {
      void saveScene();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loading, saveScene]);

  const handleChange = useCallback(
    (scene: GardenWhiteboardScene) => {
      const sanitized = sanitizeWhiteboardScene(scene);
      const hadContent = whiteboardHasContent(sceneRef.current);
      sceneRef.current = sanitized;
      const nowHasContent = whiteboardHasContent(sanitized);
      setHasContent(nowHasContent);
      if (hadContent && !nowHasContent) {
        void saveScene(false, sanitized);
      }
    },
    [saveScene],
  );

  const handleReset = useCallback(async () => {
    sceneRef.current = EMPTY_WHITEBOARD_SCENE;
    setInitialScene(EMPTY_WHITEBOARD_SCENE);
    setHasContent(false);
    setCanvasKey((key) => key + 1);
    await saveScene(false, EMPTY_WHITEBOARD_SCENE);
    toast.success("Whiteboard reset.");
  }, [saveScene]);

  const handleSave = useCallback(async () => {
    await saveScene(true);
  }, [saveScene]);

  const handleExportToNote = useCallback(async (api: ExcalidrawApi) => {
    const elements = api.getSceneElements();
    if (!elements.length) {
      toast.error("Nothing on the canvas to export yet.");
      return;
    }

    exportApiRef.current = api;
    setExportDialogOpen(true);
  }, []);

  const containerClass = cn(
    "relative overflow-hidden bg-white touch-manipulation overscroll-contain",
    isMobile
      ? "-mx-4 h-[calc(100dvh-14rem)] min-h-[360px] border-y border-black/5 sm:mx-0"
      : "h-[min(70vh,720px)] rounded-2xl border border-black/5",
  );

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white",
          isMobile
            ? "-mx-4 h-[calc(100dvh-14rem)] min-h-[360px] border-y border-black/5"
            : "h-[min(70vh,720px)] rounded-2xl border border-black/5",
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!hasContent && !menuOpen && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm font-light text-foreground/25">
          Sketch it out. No rules here.
        </p>
      )}
      <CanvasErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
            </div>
          }
        >
          <ExcalidrawCanvas
            key={canvasKey}
            initialScene={initialScene ?? EMPTY_WHITEBOARD_SCENE}
            onChange={handleChange}
            onSave={handleSave}
            onExportToNote={handleExportToNote}
            onReset={handleReset}
            onMenuOpenChange={setMenuOpen}
            isMobile={isMobile}
          />
        </Suspense>
      </CanvasErrorBoundary>
      <WhiteboardExportDialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) exportApiRef.current = null;
        }}
        userId={userId}
        api={exportApiRef.current}
        onNewNoteCreated={onNewNoteCreated}
      />
    </div>
  );
}
