import { Trash2, Upload } from "lucide-react";
import {
  DEFAULT_BRAND_LOGOS,
  downloadBrandAsset,
  downloadDefaultLogo,
  filterBrandAssets,
  isImageAsset,
  removeBrandAsset,
  type BrandAsset,
  type DefaultBrandLogo,
} from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type LogosCardProps = {
  assets: BrandAsset[];
  admin: boolean;
  onUpload: () => void;
  onAssetsChange: (assets: BrandAsset[]) => void;
};

const tileCls = cn(
  "group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white p-4 transition-colors",
  "hover:border-black/10 hover:bg-[#FCFCFC]",
);

function DefaultLogoTile({ logo }: { logo: DefaultBrandLogo }) {
  return (
    <button
      type="button"
      onClick={() => downloadDefaultLogo(logo)}
      aria-label={`Download ${logo.name}`}
      className={tileCls}
    >
      <img
        src={logo.url}
        alt={logo.name}
        className="max-h-full max-w-full object-contain"
      />
    </button>
  );
}

function UploadedLogoTile({
  asset,
  admin,
  onDelete,
}: {
  asset: BrandAsset;
  admin: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={cn(tileCls, "p-0")}>
      <button
        type="button"
        onClick={() => downloadBrandAsset(asset)}
        aria-label={`Download ${asset.name}`}
        className="flex h-full w-full items-center justify-center p-4"
      >
        {isImageAsset(asset) ? (
          <img
            src={asset.dataUrl}
            alt={asset.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-2 text-center text-xs font-light text-foreground/60">{asset.name}</span>
        )}
      </button>

      {admin ? (
        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          aria-label={`Delete ${asset.name}`}
          className={cn(
            "absolute right-2 top-2 inline-flex items-center justify-center rounded-full border border-black/10 bg-white/95 p-1.5 text-foreground/50 shadow-sm transition-all",
            "hover:border-red-200 hover:bg-red-50 hover:text-red-600",
            "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          )}
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}

export function LogosCard({ assets, admin, onUpload, onAssetsChange }: LogosCardProps) {
  const uploadedLogos = filterBrandAssets(assets, "logos");

  function handleDelete(id: string) {
    removeBrandAsset(id);
    onAssetsChange(assets.filter((asset) => asset.id !== id));
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-normal">Logo Suite</h2>
        {admin ? (
          <button
            type="button"
            onClick={onUpload}
            aria-label="Upload logo"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3AB819] transition-colors hover:bg-black/5"
          >
            <Upload className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {DEFAULT_BRAND_LOGOS.map((logo) => (
          <DefaultLogoTile key={logo.id} logo={logo} />
        ))}
        {uploadedLogos.map((asset) => (
          <UploadedLogoTile
            key={asset.id}
            asset={asset}
            admin={admin}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  );
}
