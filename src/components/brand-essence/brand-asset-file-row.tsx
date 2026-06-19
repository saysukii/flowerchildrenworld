import { Download, File, Trash2 } from "lucide-react";
import {
  downloadBrandAsset,
  formatFileType,
  isBuiltInAsset,
  type BrandAsset,
} from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type BrandAssetFileRowProps = {
  asset: BrandAsset;
  admin?: boolean;
  onDelete?: (id: string) => void;
};

export function BrandAssetFileRow({ asset, admin, onDelete }: BrandAssetFileRowProps) {
  const canDelete = admin && !isBuiltInAsset(asset) && onDelete;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-colors",
        "hover:border-black/5 hover:bg-[#FCFCFC]",
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/8 bg-white text-foreground/45"
      >
        <File className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-light">{asset.name}</p>
        <p className="mt-0.5 text-xs font-light text-foreground/50">
          {formatFileType(asset.mimeType)}
          {asset.source === "drive" ? " · Google Drive" : asset.source === "built-in" ? " · Brand file" : " · Uploaded"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => downloadBrandAsset(asset)}
          aria-label={`Download ${asset.name}`}
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-black/10 p-2 text-foreground/50 transition-all",
            "hover:text-foreground hover:border-black/15",
            canDelete ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          )}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            aria-label={`Delete ${asset.name}`}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-black/10 p-2 text-foreground/50 transition-all",
              "hover:border-red-200 hover:bg-red-50 hover:text-red-600",
              "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
