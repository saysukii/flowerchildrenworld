import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NoteFormatToolbar } from "@/components/garden/note-format-toolbar";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/garden/rich-text-editor";
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
import {
  GARDEN_GREEN,
  GARDEN_NOTE_CARD_COLORS,
  GARDEN_TAGS,
  ensureNoteHtml,
  formatNoteDateTime,
  type GardenNote,
  type GardenTag,
} from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NoteEditorPanelProps = {
  note: GardenNote | null;
  userId: string;
  onClose: () => void;
  onSaved: (note: GardenNote) => void;
  onDeleted?: () => void;
};

export function NoteEditorPanel({ note, userId, onClose, onSaved, onDeleted }: NoteEditorPanelProps) {
  const isNew = !note;
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tag, setTag] = useState<GardenTag>((note?.tag as GardenTag) ?? "General");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(note?.updated_at ?? null);
  const dirtyRef = useRef(false);
  const noteIdRef = useRef(note?.id);

  useEffect(() => {
    noteIdRef.current = note?.id;
    setTitle(note?.title ?? "");
    setBody(ensureNoteHtml(note?.body ?? ""));
    setTag((note?.tag as GardenTag) ?? "General");
    setLastUpdatedAt(note?.updated_at ?? null);
    dirtyRef.current = false;
  }, [note]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const save = useCallback(async () => {
    const trimmedTitle = title.trim() || "Untitled";
    setSaving(true);

    if (noteIdRef.current) {
      const { data, error } = await supabase
        .from("garden_notes")
        .update({ title: trimmedTitle, body, tag })
        .eq("id", noteIdRef.current)
        .eq("created_by", userId)
        .select()
        .single();

      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      dirtyRef.current = false;
      setLastUpdatedAt(data.updated_at);
      onSaved(data as GardenNote);
      toast.success("Note saved.");
      return;
    }

    const { data, error } = await supabase
      .from("garden_notes")
      .insert({
        title: trimmedTitle,
        body,
        tag,
        created_by: userId,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    noteIdRef.current = data.id;
    dirtyRef.current = false;
    setLastUpdatedAt(data.updated_at);
    onSaved(data as GardenNote);
    toast.success("Note saved.");
  }, [body, onSaved, tag, title, userId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (dirtyRef.current && !saving) void save();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [save, saving]);

  const confirmDelete = useCallback(async () => {
    if (!noteIdRef.current) return;
    setDeleting(true);
    const { error } = await supabase
      .from("garden_notes")
      .delete()
      .eq("id", noteIdRef.current)
      .eq("created_by", userId);

    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setDeleteOpen(false);
    toast.success("Note deleted.");
    onDeleted?.();
    onClose();
  }, [onClose, onDeleted, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 flex h-[100dvh] w-full max-h-[100dvh] flex-col overflow-hidden rounded-t-3xl bg-[#FCFCFC] shadow-2xl sm:h-auto sm:max-h-[min(92vh,900px)] sm:max-w-2xl sm:rounded-3xl md:max-w-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3 sm:px-6">
          <p className="text-xs font-light text-foreground/50">
            {lastUpdatedAt ? formatNoteDateTime(lastUpdatedAt) : "New note"}
          </p>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-black/5 px-4 py-2 sm:px-6">
          <NoteFormatToolbar editorRef={editorRef} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <label htmlFor="note-title" className="sr-only">
            Title
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Untitled"
            className="mb-4 w-full border-0 bg-transparent text-xl font-normal leading-tight placeholder:text-foreground/30 focus:outline-none sm:mb-5 sm:text-2xl md:text-3xl"
          />

          <div className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:mb-6 sm:px-0">
            {GARDEN_TAGS.map((t) => (
              <TagChip
                key={t}
                tag={t}
                active={tag === t}
                onSelect={() => {
                  setTag(t);
                  markDirty();
                }}
              />
            ))}
          </div>

          <RichTextEditor
            ref={editorRef}
            value={body}
            onChange={(html) => {
              setBody(html);
              markDirty();
            }}
            placeholder="Start writing…"
            variant="document"
            hideToolbar
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          <div className="inline-flex items-center text-sm font-light leading-none">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground/60 hover:text-foreground"
            >
              Close
            </button>
            {!isNew ? (
              <>
                <span
                  className="mx-2 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/25"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="text-[#C53D3D]/80 hover:text-[#C53D3D]"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: GARDEN_GREEN }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </button>
        </footer>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{title.trim() || "Untitled"}&rdquo; will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-[#C53D3D] text-white hover:bg-[#C53D3D]/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TagChip({
  tag,
  active,
  onSelect,
}: {
  tag: GardenTag;
  active: boolean;
  onSelect: () => void;
}) {
  const colors = GARDEN_NOTE_CARD_COLORS[tag];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-light transition-[opacity,box-shadow]",
        active ? "opacity-100" : "opacity-80",
      )}
      style={{
        background: colors.bg,
        color: colors.text,
        boxShadow: active ? `inset 0 0 0 2px ${colors.accent}` : undefined,
      }}
    >
      {tag}
    </button>
  );
}
