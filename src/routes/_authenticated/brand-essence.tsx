import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/brand-essence")({
  head: () => ({
    meta: [
      { title: "Brand Essence — Flower Children World" },
      { name: "description", content: "Logos, colors, typography, templates, copy, and core documents." },
    ],
  }),
  component: BrandEssencePage,
});

type Category = "all" | "logos" | "colors" | "typography" | "templates" | "copy" | "documents";

const TABS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "logos", label: "Logos" },
  { key: "colors", label: "Colors" },
  { key: "typography", label: "Typography" },
  { key: "templates", label: "Templates" },
  { key: "copy", label: "Copy" },
  { key: "documents", label: "Documents" },
];

const COLORS = [
  { hex: "#FCFCFC", name: "White", usage: "Backgrounds" },
  { hex: "#020202", name: "Black", usage: "Primary text" },
  { hex: "#59341E", name: "Brown", usage: "Earth · warmth" },
  { hex: "#3AB819", name: "Green", usage: "Nature · growth" },
  { hex: "#15AAD2", name: "Blue", usage: "Sky · calm" },
  { hex: "#776BD9", name: "Purple", usage: "Creativity" },
  { hex: "#EFB003", name: "Yellow", usage: "Joy · warmth" },
  { hex: "#D9580D", name: "Orange", usage: "Energy" },
  { hex: "#C53D3D", name: "Red", usage: "Passion" },
];

const CALM = [
  { letter: "C", word: "Community" },
  { letter: "A", word: "Arts" },
  { letter: "L", word: "Life Skills" },
  { letter: "M", word: "Mindfulness" },
];

function BrandEssencePage() {
  const [tab, setTab] = useState<Category>("all");
  const active = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <span className="font-label text-[11px] text-foreground/50">Brand Essence</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">Everything that makes us, us.</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Logos, colors, typography, templates, copy, and core documents — one source of truth.
          </p>
        </header>

        {/* Tabs + upload */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 sm:mx-0 overflow-x-auto">
            <div className="flex gap-2 px-4 sm:px-0 min-w-max">
              {TABS.map((t) => {
                const isActive = t.key === tab;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-light transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-foreground/70 hover:bg-black/5",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            style={{ background: "#3AB819" }}
          >
            <Upload className="h-4 w-4" />
            Upload asset
          </button>
        </div>

        {/* Asset grid empty state */}
        <section className="rounded-3xl border border-black/5 bg-white px-6 py-16 text-center mb-8">
          <p className="text-sm text-foreground/50">
            Nothing here yet — upload your first {active.key === "all" ? "asset" : active.label.toLowerCase()} and build the vault.
          </p>
        </section>

        {/* Reference cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Color Palette */}
          <ReferenceCard title="Color Palette">
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map((c) => (
                <div key={c.hex} className="flex flex-col">
                  <div
                    className="aspect-square w-full rounded-xl border border-black/5"
                    style={{ background: c.hex }}
                  />
                  <p className="mt-2 text-xs font-normal">{c.name}</p>
                  <p className="text-[10px] font-light uppercase tracking-wider text-foreground/40">{c.hex}</p>
                  <p className="text-[11px] font-light text-foreground/60 leading-snug">{c.usage}</p>
                </div>
              ))}
            </div>
          </ReferenceCard>

          {/* Typography */}
          <ReferenceCard title="Typography">
            <div className="space-y-5">
              <div>
                <p className="text-2xl font-normal leading-tight">Nohemi Regular</p>
                <p className="mt-1 text-xs font-light text-foreground/60">Headers</p>
              </div>
              <div>
                <p className="text-2xl font-light leading-tight">Nohemi Light</p>
                <p className="mt-1 text-xs font-light text-foreground/60">Body</p>
              </div>
              <div>
                <p className="font-label text-xl text-foreground">Adigiana Toybox</p>
                <p className="mt-1 text-xs font-light text-foreground/60">Labels + playful accents</p>
              </div>
            </div>
          </ReferenceCard>

          {/* Mission + CALM */}
          <ReferenceCard title="Mission">
            <p className="text-sm font-light leading-relaxed text-foreground/80">
              Children are the seeds of the future. Rooted in values of love and creative freedom, we empower the
              flower children to become the greatest versions of themselves.
            </p>
            <div className="mt-6">
              <span className="font-label text-[11px] text-foreground/50">C.A.L.M.</span>
              <ul className="mt-3 space-y-2">
                {CALM.map((c) => (
                  <li key={c.letter} className="flex items-baseline gap-3">
                    <span
                      className="text-lg font-normal"
                      style={{ color: "#3AB819" }}
                    >
                      {c.letter}
                    </span>
                    <span className="text-sm font-light text-foreground/80">{c.word}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ReferenceCard>
        </div>
      </div>
    </AppShell>
  );
}

function ReferenceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <h2 className="text-lg font-normal mb-5">{title}</h2>
      {children}
    </section>
  );
}
