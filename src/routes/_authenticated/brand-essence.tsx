import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLabel } from "@/components/page-label";
import { FilesCard, vaultUploadCategory } from "@/components/brand-essence/files-card";
import { UploadAssetDialog } from "@/components/brand-essence/upload-asset-dialog";
import { ColorPaletteCard } from "@/components/brand-essence/color-palette-card";
import { LogosCard } from "@/components/brand-essence/logos-card";
import { MissionCard } from "@/components/brand-essence/mission-card";
import { TypographyCard } from "@/components/brand-essence/typography-card";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/user-role";
import {
  filterBrandAssets,
  loadBrandAssets,
  removeBrandAsset,
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

const VAULT_CATEGORIES = new Set<BrandAssetCategory>(["templates", "copy", "documents"]);

function BrandEssencePage() {
  const [tab, setTab] = useState<Category>("all");
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<BrandAssetCategory>("templates");
  const [admin, setAdmin] = useState(false);
  const active = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const vaultAssets = useMemo(() => {
    const filtered = filterBrandAssets(assets, tab === "all" ? "all" : tab);
    return filtered.filter((asset) => asset.category !== "logos");
  }, [assets, tab]);
  const showVault = tab === "all" || VAULT_CATEGORIES.has(tab as BrandAssetCategory);
  const showLogos = tab === "all" || tab === "logos";
  const showColors = tab === "all" || tab === "colors";
  const showTypography = tab === "all" || tab === "typography";
  const showMission = tab === "all";

  useEffect(() => {
    setAssets(loadBrandAssets());
    void supabase.auth.getUser().then(({ data }) => setAdmin(isAdmin(data.user)));
  }, []);

  function openVaultUpload() {
    setUploadCategory(vaultUploadCategory(tab));
    setUploadOpen(true);
  }

  function openLogoUpload() {
    setUploadCategory("logos");
    setUploadOpen(true);
  }

  function handleDelete(id: string) {
    removeBrandAsset(id);
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }

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
          <div className="flex min-w-max gap-2 px-4 sm:w-full sm:min-w-0 sm:px-0">
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

        {showVault ? (
          <FilesCard
            title={tab === "all" ? "Files" : active.label}
            assets={vaultAssets}
            admin={admin}
            emptyLabel={
              admin
                ? `Nothing here yet — upload your first ${active.key === "all" ? "file" : active.label.toLowerCase()}.`
                : `No ${active.key === "all" ? "files" : active.label.toLowerCase()} yet.`
            }
            onUpload={openVaultUpload}
            onDelete={handleDelete}
          />
        ) : null}

        <div className="flex flex-col gap-5">
          {showLogos ? (
            <LogosCard
              assets={assets}
              admin={admin}
              onUpload={openLogoUpload}
              onAssetsChange={setAssets}
            />
          ) : null}
          {showColors ? <ColorPaletteCard admin={admin} /> : null}
          {showTypography ? <TypographyCard /> : null}
          {showMission ? <MissionCard admin={admin} /> : null}
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
