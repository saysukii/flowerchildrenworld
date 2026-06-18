import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GardenWhiteboardScene } from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";

const ExcalidrawCanvas = lazy(() =>
  import("@/components/garden/excalidraw-canvas").then((m) => ({ default: m.ExcalidrawCanvas })),
);

const WHITEBOARD_ID = "shared";

type WhiteboardTabProps = {
  userId: string;
};

export function WhiteboardTab({ userId }: WhiteboardTabProps) {
  const isMobile = useIsMobile();
  const [initialScene, setInitialScene] = useState<GardenWhiteboardScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasContent, setHasContent] = useState(false);
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

      const scene = (data?.scene_data as GardenWhiteboardScene) ?? {};
      sceneRef.current = scene;
      setHasContent(Array.isArray(scene.elements) && scene.elements.length > 0);
      setInitialScene(scene);
      setLoading(false);
    })();
  }, []);

  const saveScene = useCallback(async () => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    const { error } = await supabase
      .from("garden_whiteboard")
      .upsert({
        id: WHITEBOARD_ID,
        scene_data: sceneRef.current as Record<string, unknown>,
        updated_by: userId,
      });

    saveInFlight.current = false;
    if (error) toast.error(error.message);
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    const interval = window.setInterval(() => {
      void saveScene();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loading, saveScene]);

  const handleChange = useCallback((scene: GardenWhiteboardScene) => {
    sceneRef.current = scene;
    setHasContent(Array.isArray(scene.elements) && scene.elements.length > 0);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-2xl border border-black/5 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white px-6 py-16 text-center">
        <p className="text-sm font-light text-foreground/60">
          The whiteboard is best viewed on desktop — grab a bigger screen to sketch freely.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[min(70vh,720px)] overflow-hidden rounded-2xl border border-black/5 bg-white">
      {!hasContent && (
        <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm font-light text-foreground/25">
          Sketch it out. No rules here.
        </p>
      )}
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        }
      >
        <ExcalidrawCanvas initialScene={initialScene ?? {}} onChange={handleChange} />
      </Suspense>
    </div>
  );
}
