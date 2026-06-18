import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/garden/rich-text-editor";
import {
  GARDEN_GREEN,
  GARDEN_TAGS,
  type GardenNote,
  type GardenTag,
} from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";

type NoteEditorPanelProps = {
  note: GardenNote | null;
  userId: string;
  onClose: () => void;
  onSaved: (note: GardenNote) => void;
};

export function NoteEditorPanel({ note, userId, onClose, onSaved }: NoteEditorPanelProps) {
  const isNew = !note;
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tag, setTag] = useState<GardenTag>((note?.tag as GardenTag) ?? "General");
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const noteIdRef = useRef(note?.id);

  useEffect(() => {
    noteIdRef.current = note?.id;
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
    setTag((note?.tag as GardenTag) ?? "General");
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
    onSaved(data as GardenNote);
    toast.success("Note saved.");
  }, [body, onSaved, tag, title, userId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (dirtyRef.current && !saving) void save();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [save, saving]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[#FCFCFC] shadow-xl">
        <header className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <h2 className="text-lg font-normal">{isNew ? "New note" : "Edit note"}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-2 text-foreground/60 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-2">
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
              className="w-full border-0 bg-transparent text-xl font-normal placeholder:text-foreground/40 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-light text-foreground/50">Tag</p>
            <div className="flex flex-wrap gap-2">
              {GARDEN_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTag(t);
                    markDirty();
                  }}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-light transition-colors",
                    tag === t
                      ? "bg-foreground text-background"
                      : "border border-black/10 bg-white text-foreground/70 hover:bg-black/5",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <RichTextEditor
            value={body}
            onChange={(html) => {
              setBody(html);
              markDirty();
            }}
            placeholder="Start writing…"
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-black/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-light text-foreground/70 hover:bg-black/5"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: GARDEN_GREEN }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save note"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
