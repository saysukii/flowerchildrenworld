import { Loader2, Pin, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NoteEditorPanel } from "@/components/garden/note-editor-panel";
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
  GARDEN_TAG_COLORS,
  GARDEN_TAGS,
  type GardenNote,
  type GardenTag,
  formatNoteDate,
  notePreviewLines,
  sortGardenNotes,
  stripHtml,
} from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NotesTabProps = {
  userId: string;
};

type TagFilter = "All" | GardenTag;

export function NotesTab({ userId }: NotesTabProps) {
  const [notes, setNotes] = useState<GardenNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<TagFilter>("All");
  const [editorNote, setEditorNote] = useState<GardenNote | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<GardenNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("garden_notes")
      .select("*")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setNotes(sortGardenNotes((data ?? []) as GardenNote[]));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortGardenNotes(
      notes.filter((note) => {
        if (tagFilter !== "All" && note.tag !== tagFilter) return false;
        if (!q) return true;
        const haystack = `${note.title} ${stripHtml(note.body)}`.toLowerCase();
        return haystack.includes(q);
      }),
    );
  }, [notes, query, tagFilter]);

  async function togglePin(note: GardenNote, e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase
      .from("garden_notes")
      .update({ pinned: !note.pinned })
      .eq("id", note.id)
      .eq("created_by", userId);

    if (error) return toast.error(error.message);
    setNotes((prev) =>
      sortGardenNotes(
        prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)),
      ),
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("garden_notes")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("created_by", userId);

    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Note deleted.");
  }

  function handleSaved(saved: GardenNote) {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === saved.id);
      if (exists) return sortGardenNotes(prev.map((n) => (n.id === saved.id ? saved : n)));
      return sortGardenNotes([saved, ...prev]);
    });
    setEditorNote((current) => (current === undefined ? undefined : saved));
  }

  const tagFilters: TagFilter[] = ["All", ...GARDEN_TAGS];

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes..."
            className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditorNote(null)}
          className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          style={{ background: GARDEN_GREEN }}
        >
          <Plus className="h-4 w-4" />
          New note
        </button>
      </div>

      <div className="-mx-4 sm:mx-0 mb-6 overflow-x-auto">
        <div className="flex gap-2 px-4 sm:px-0 min-w-max">
          {tagFilters.map((t) => {
            const active = tagFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-light transition-colors whitespace-nowrap",
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:bg-black/5",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white px-6 py-16 text-center">
          <p className="text-sm text-foreground/50">Nothing planted yet. Start with a thought.</p>
          <button
            type="button"
            onClick={() => setEditorNote(null)}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            style={{ background: GARDEN_GREEN }}
          >
            <Plus className="h-4 w-4" />
            New note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => setEditorNote(note)}
              onPin={(e) => void togglePin(note, e)}
              onDelete={(e) => {
                e.stopPropagation();
                setDeleteTarget(note);
              }}
            />
          ))}
        </div>
      )}

      {editorNote !== undefined && (
        <NoteEditorPanel
          note={editorNote}
          userId={userId}
          onClose={() => setEditorNote(undefined)}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title || "Untitled"}&rdquo; will be removed permanently.
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
    </>
  );
}

function NoteCard({
  note,
  onOpen,
  onPin,
  onDelete,
}: {
  note: GardenNote;
  onOpen: () => void;
  onPin: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const preview = notePreviewLines(note.body);
  const tagColor = GARDEN_TAG_COLORS[note.tag as GardenTag] ?? GARDEN_TAG_COLORS.General;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex cursor-pointer flex-col rounded-2xl border border-black/5 bg-white p-5 text-left transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-base font-normal leading-tight">
          {note.title.trim() || "Untitled"}
        </h3>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onPin}
            className={cn(
              "rounded-md p-1.5 transition-colors hover:bg-black/5",
              note.pinned ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/50",
            )}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
          >
            <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-foreground/30 transition-colors hover:bg-black/5 hover:text-foreground/60"
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {preview && (
        <p className="mb-4 line-clamp-2 text-sm font-light leading-relaxed text-foreground/60 whitespace-pre-line">
          {preview}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-light text-white"
          style={{ background: tagColor }}
        >
          {note.tag}
        </span>
        <span className="text-xs font-light text-foreground/40">
          {formatNoteDate(note.updated_at)}
        </span>
      </div>
    </div>
  );
}
