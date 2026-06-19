import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageLabel } from "@/components/page-label";
import { UploadAssetDialog } from "@/components/brand-essence/upload-asset-dialog";
import { ColorPaletteCard } from "@/components/brand-essence/color-palette-card";
import { MissionCard } from "@/components/brand-essence/mission-card";
import { TypographyCard } from "@/components/brand-essence/typography-card";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/user-role";
import {
  filterBrandAssets,
  isImageAsset,
  isPdfAsset,
  loadBrandAssets,
  type BrandAsset,
  type BrandAssetCategory,
} from "@/lib/brand-assets";

export const Route = createFileRoute("/_authenticated/brand-essence")({
  head: () => ({
    meta: [
      { title: "Brand Essence — Flower Children World" },
      { name: "description", content: "Logos, colors, typography, templates, copy, and core documents." },
    ],
  }),
  component: BrandEssencePage,
});

type Category = "all" | BrandAssetCategory;

const TABS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "logos", label: "Logos" },
  { key: "colors", label: "Colors" },
  { key: "typography", label: "Typography" },
  { key: "templates", label: "Templates" },
  { key: "copy", label: "Copy" },
  { key: "documents", label: "Documents" },
];

function BrandEssencePage() {
  const [tab, setTab] = useState<Category>("all");
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const active = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const visibleAssets = useMemo(() => filterBrandAssets(assets, tab), [assets, tab]);
  const uploadCategory: BrandAssetCategory = tab === "all" ? "logos" : tab;

  useEffect(() => {
    setAssets(loadBrandAssets());
    void supabase.auth.getUser().then(({ data }) => setAdmin(isAdmin(data.user)));
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 sm:mb-8">
          <PageLabel>Brand Essence</PageLabel>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">Everything that makes us, us.</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Logos, colors, typography, templates, copy, and core documents — one source of truth.
          </p>
        </header>

        <div className="-mx-4 mb-5 overflow-x-auto sm:mx-0">
          <div className="flex min-w-max items-center gap-2 px-4 sm:w-full sm:min-w-0 sm:px-0">
            {admin ? (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                aria-label="Upload asset"
                className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[#3AB819] transition-colors hover:bg-black/5"
              >
                <Upload className="h-4 w-4" />
              </button>
            ) : null}

            <div className="flex gap-2">
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
        </div>

        <section className="rounded-3xl border border-black/5 bg-white px-6 py-8 mb-8">
          {visibleAssets.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground/50">
              {admin
                ? `Nothing here yet — upload your first ${active.key === "all" ? "asset" : active.label.toLowerCase()} and build the vault.`
                : `No ${active.key === "all" ? "assets" : active.label.toLowerCase()} yet.`}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
              {visibleAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <ColorPaletteCard admin={admin} />
          <TypographyCard />
          <MissionCard admin={admin} />
        </div>
      </div>

      {admin ? (
        <UploadAssetDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          defaultCategory={uploadCategory}
          onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
        />
      ) : null}
    </AppShell>
  );
}

function AssetCard({ asset }: { asset: BrandAsset }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-black/5 bg-[#FCFCFC]">
      <div className="flex aspect-[4/3] items-center justify-center bg-white p-4">
        {isImageAsset(asset) ? (
          <img src={asset.dataUrl} alt={asset.name} className="max-h-full max-w-full object-contain" />
        ) : isPdfAsset(asset) ? (
          <div className="text-center">
            <p className="text-sm font-normal">PDF</p>
            <p className="mt-1 text-xs text-foreground/50">Preview in vault</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-normal">File</p>
            <p className="mt-1 text-xs text-foreground/50">{asset.mimeType}</p>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="truncate text-sm font-light">{asset.name}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-label text-[10px] text-foreground/50">{asset.category}</span>
          <span className="text-[10px] text-foreground/40">
            {asset.source === "drive" ? "Google Drive" : "Uploaded"}
          </span>
        </div>
      </div>
    </article>
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
