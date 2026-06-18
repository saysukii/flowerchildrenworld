import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NotesTab } from "@/components/garden/notes-tab";
import { WhiteboardTab } from "@/components/garden/whiteboard-tab";
import { ensureGardenStarterNotes } from "@/lib/api/garden.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await ensureGardenStarterNotes();
      } catch {
        // Seeding is best-effort when service role credentials are unavailable.
      }
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      setReady(true);
    })();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl text-[#020202]">
        <header className="mb-6 sm:mb-8">
          <span className="font-label text-[11px] text-foreground/50">The Garden</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">A place to think.</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Notes, ideas, and sketches — plant something.
          </p>
        </header>

        <div className="-mx-4 sm:mx-0 mb-6 overflow-x-auto">
          <div className="flex gap-2 px-4 sm:px-0 min-w-max">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-light transition-colors whitespace-nowrap",
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:bg-black/5",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {ready && userId ? (
          tab === "notes" ? (
            <NotesTab userId={userId} />
          ) : (
            <WhiteboardTab userId={userId} />
          )
        ) : null}
      </div>
    </AppShell>
  );
}
