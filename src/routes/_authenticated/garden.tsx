import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageLabel } from "@/components/page-label";
import { NoteEditorPanel } from "@/components/garden/note-editor-panel";
import { NotesTab } from "@/components/garden/notes-tab";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GardenNote } from "@/lib/garden";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const WhiteboardTab = lazy(() =>
  import("@/components/garden/whiteboard-tab").then((m) => ({ default: m.WhiteboardTab })),
);

export const Route = createFileRoute("/_authenticated/garden")({
  head: () => ({
    meta: [
      { title: "The Garden — Flower Children World" },
      { name: "description", content: "Notes, ideas, and sketches — plant something." },
    ],
  }),
  component: GardenPage,
});

type GardenTab = "notes" | "whiteboard";

const TABS: { key: GardenTab; label: string }[] = [
  { key: "notes", label: "Notes" },
  { key: "whiteboard", label: "Whiteboard" },
];

function GardenPage() {
  const [tab, setTab] = useState<GardenTab>("notes");
  const isMobile = useIsMobile();
  const isWhiteboardMobile = isMobile && tab === "whiteboard";
  const [noteQuery, setNoteQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [editingNote, setEditingNote] = useState<GardenNote | null | undefined>(undefined);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [lastSavedNote, setLastSavedNote] = useState<GardenNote | null>(null);

  const handleNewNoteFromWhiteboard = useCallback((note: GardenNote) => {
    setTab("notes");
    setEditingNote(note);
    setNotesRefreshKey((k) => k + 1);
  }, []);

  const handleNoteSaved = useCallback((saved: GardenNote) => {
    setEditingNote(saved);
    setLastSavedNote(saved);
    setNotesRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      setReady(true);
    })();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl text-[#020202]">
        <header className={cn("mb-5 sm:mb-8", isWhiteboardMobile && "mb-3")}>
          <PageLabel>The Garden</PageLabel>
          <h1 className="mt-1.5 text-xl font-normal leading-tight sm:mt-2 sm:text-2xl md:text-3xl">
            A place to think.
          </h1>
          <p className="mt-1.5 text-sm text-foreground/60 sm:mt-2">
            Notes, ideas, and sketches — plant something.
          </p>
        </header>

        <div
          className={cn(
            "mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4",
            isWhiteboardMobile && "mb-3",
          )}
        >
          <div className="flex gap-5 overflow-x-auto border-b border-black/5 pb-0 sm:min-w-0 sm:flex-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative shrink-0 pb-2.5 text-sm transition-colors whitespace-nowrap",
                    active
                      ? "font-normal text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-foreground"
                      : "font-light text-foreground/45 hover:text-foreground/70",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {tab === "notes" ? (
            <div className="relative w-full shrink-0 sm:w-auto sm:min-w-[280px] sm:max-w-[400px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
              <input
                type="search"
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                placeholder="Search notes"
                className="h-10 w-full rounded-full border-0 bg-black/[0.04] pl-9 pr-3 text-sm font-light placeholder:text-foreground/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black/10"
              />
            </div>
          ) : null}
        </div>

        {ready && userId ? (
          tab === "notes" ? (
            <NotesTab
              userId={userId}
              query={noteQuery}
              refreshKey={notesRefreshKey}
              savedNote={lastSavedNote}
              onOpenNote={setEditingNote}
            />
          ) : (
            <Suspense
              fallback={
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
              }
            >
              <WhiteboardTab userId={userId} onNewNoteCreated={handleNewNoteFromWhiteboard} />
            </Suspense>
          )
        ) : null}

        {ready && userId && editingNote !== undefined ? (
          <NoteEditorPanel
            note={editingNote}
            userId={userId}
            onClose={() => setEditingNote(undefined)}
            onSaved={handleNoteSaved}
            onDeleted={() => setNotesRefreshKey((k) => k + 1)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
