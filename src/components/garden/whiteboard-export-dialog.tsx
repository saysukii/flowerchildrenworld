import { FilePlus2, Loader2, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type GardenNote,
  formatNoteDateLong,
  sortGardenNotes,
} from "@/lib/garden";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NEW_NOTE = "new";

type WhiteboardExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  api: ExcalidrawApi | null;
  onNewNoteCreated?: (note: GardenNote) => void;
};

function appendExportToNoteBody(existing: string, exportHtml: string) {
  const base = existing.trim();
  return base ? `${base}\n${exportHtml}` : exportHtml;
}

function defaultExportTitle() {
  return `Whiteboard — ${new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function WhiteboardExportDialog({
  open,
  onOpenChange,
  userId,
  api,
  onNewNoteCreated,
}: WhiteboardExportDialogProps) {
  const [notes, setNotes] = useState<GardenNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selection, setSelection] = useState<string>(NEW_NOTE);
  const [exporting, setExporting] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("garden_notes")
      .select("*")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false });

    setLoadingNotes(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes(sortGardenNotes((data ?? []) as GardenNote[]));
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    setSelection(NEW_NOTE);
    void loadNotes();
  }, [open, loadNotes]);

  async function handleExport() {
    if (!api) return;
    setExporting(true);

    try {
      const { whiteboardSceneToNoteBody } = await import("@/lib/garden-whiteboard-export");
      const exportBody = await whiteboardSceneToNoteBody(api);

      if (selection === NEW_NOTE) {
        const { data, error } = await supabase
          .from("garden_notes")
          .insert({
            title: defaultExportTitle(),
            body: exportBody,
            tag: "General",
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Exported — keep editing in the note.");
        onNewNoteCreated?.(data as GardenNote);
      } else {
        const note = notes.find((n) => n.id === selection);
        if (!note) {
          toast.error("That note could not be found.");
          return;
        }

        const { error } = await supabase
          .from("garden_notes")
          .update({ body: appendExportToNoteBody(note.body, exportBody) })
          .eq("id", note.id)
          .eq("created_by", userId);

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success(`Added to "${note.title.trim() || "Untitled"}".`);
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export to note.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] max-w-md overflow-hidden sm:rounded-2xl",
          "max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-[-50%] max-sm:translate-y-0",
          "max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="font-normal">Export to note</DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setSelection(NEW_NOTE)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              selection === NEW_NOTE
                ? "border-foreground bg-foreground/[0.04]"
                : "border-black/8 hover:bg-black/[0.02]",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <FilePlus2 className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-normal">Create new note</span>
              <span className="block text-xs font-light text-foreground/55">
                {defaultExportTitle()}
              </span>
            </span>
          </button>

          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
            </div>
          ) : notes.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm font-light text-foreground/50">
              No other notes yet — a new one will be created.
            </p>
          ) : (
            <>
              <p className="px-1 pt-2 text-sm font-light text-muted-foreground">
                Or add to an existing note
              </p>
              {notes.map((note) => {
                const active = selection === note.id;
                const title = note.title.trim() || "Untitled";
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelection(note.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-foreground bg-foreground/[0.04]"
                        : "border-black/8 hover:bg-black/[0.02]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-normal">{title}</span>
                        {note.pinned ? (
                          <Star className="h-3 w-3 shrink-0 fill-current text-foreground/50" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs font-light text-foreground/55">
                        {formatNoteDateLong(note.updated_at)} · {note.tag}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
            className="font-light"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || !api}
            className="font-light"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
