import { Upload } from "lucide-react";
import { BrandAssetFileRow } from "@/components/brand-essence/brand-asset-file-row";
import type { BrandAsset, BrandAssetCategory } from "@/lib/brand-assets";

type FilesCardProps = {
  title: string;
  assets: BrandAsset[];
  admin: boolean;
  emptyLabel: string;
  onUpload: () => void;
  onDelete: (id: string) => void;
};

export function FilesCard({ title, assets, admin, emptyLabel, onUpload, onDelete }: FilesCardProps) {
  return (
    <section className="mb-8 rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-normal">{title}</h2>
        {admin ? (
          <button
            type="button"
            onClick={onUpload}
            aria-label="Upload file"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3AB819] transition-colors hover:bg-black/5"
          >
            <Upload className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {assets.length === 0 ? (
        <p className="py-4 text-center text-sm text-foreground/50">{emptyLabel}</p>
      ) : (
        <div className="space-y-1">
          {assets.map((asset) => (
            <BrandAssetFileRow
              key={asset.id}
              asset={asset}
              admin={admin}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function vaultUploadCategory(tab: BrandAssetCategory | "all"): BrandAssetCategory {
  if (tab === "all") return "templates";
  return tab;
}
