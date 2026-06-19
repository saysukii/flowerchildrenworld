import { Loader2, Plus, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  GARDEN_TAGS,
  type GardenNote,
  type GardenTag,
  formatNoteCardDate,
  noteCardColors,
  notePreviewLines,
  sortGardenNotes,
  stripHtml,
} from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NotesTabProps = {
  userId: string;
  query: string;
  refreshKey?: number;
  savedNote?: GardenNote | null;
  onOpenNote: (note: GardenNote | null) => void;
};

type TagFilter = "All" | GardenTag;

export function NotesTab({ userId, query, refreshKey = 0, savedNote, onOpenNote }: NotesTabProps) {
  const [notes, setNotes] = useState<GardenNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<TagFilter>("All");

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
  }, [loadNotes, refreshKey]);

  useEffect(() => {
    if (!savedNote) return;
    setNotes((prev) => {
      const next = prev.some((n) => n.id === savedNote.id)
        ? prev.map((n) => (n.id === savedNote.id ? savedNote : n))
        : [savedNote, ...prev];
      return sortGardenNotes(next);
    });
  }, [savedNote]);

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
    const { data, error } = await supabase
      .from("garden_notes")
      .update({ pinned: !note.pinned })
      .eq("id", note.id)
      .eq("created_by", userId)
      .select()
      .single();

    if (error) return toast.error(error.message);
    setNotes((prev) =>
      sortGardenNotes(prev.map((n) => (n.id === note.id ? (data as GardenNote) : n))),
    );
  }

  const tagFilters: TagFilter[] = ["All", ...GARDEN_TAGS];

  return (
    <>
      <div className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:mb-6 sm:px-0">
        {tagFilters.map((t) => {
          const active = tagFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(t)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-light transition-colors whitespace-nowrap",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-black/[0.03] px-6 py-20 text-center">
          <p className="text-sm font-light text-foreground/50">Nothing planted yet. Start with a thought.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3 sm:gap-4">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => onOpenNote(note)}
              onPin={(e) => void togglePin(note, e)}
            />
          ))}
        </div>
      )}

      {!loading ? (
        <button
          type="button"
          onClick={() => onOpenNote(null)}
          className="fixed bottom-6 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-transform hover:scale-105 sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
          aria-label="New note"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      ) : null}
    </>
  );
}

function NoteCard({
  note,
  onOpen,
  onPin,
}: {
  note: GardenNote;
  onOpen: () => void;
  onPin: (e: React.MouseEvent) => void;
}) {
  const colors = noteCardColors(note.tag as GardenTag);
  const title = note.title.trim() || "Untitled";
  const subtitle = notePreviewLines(note.body, 2);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group relative flex min-h-[148px] cursor-pointer flex-col rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md sm:min-h-[160px] sm:rounded-3xl sm:p-5"
      style={{ background: colors.bg, color: colors.text }}
    >
      <div className="min-h-0 flex-1">
        <h3 className="line-clamp-3 text-sm font-normal leading-snug sm:line-clamp-4 sm:text-base md:text-lg">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-2 line-clamp-2 text-[11px] font-light leading-relaxed opacity-70 sm:text-xs">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <time className="text-[10px] font-light opacity-60 sm:text-[11px]">
          {formatNoteCardDate(note)}
        </time>
        <button
          type="button"
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          onClick={(e) => {
            e.stopPropagation();
            onPin(e);
          }}
          className="shrink-0 p-0.5 text-white/75 transition-opacity hover:text-white"
        >
          <Star
            className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4",
              note.pinned ? "fill-white text-white" : "fill-none",
            )}
          />
        </button>
      </div>
    </article>
  );
}
