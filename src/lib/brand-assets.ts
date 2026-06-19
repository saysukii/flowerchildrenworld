export type BrandAssetCategory =
  | "logos"
  | "colors"
  | "typography"
  | "templates"
  | "copy"
  | "documents";

export type BrandAsset = {
  id: string;
  name: string;
  category: BrandAssetCategory;
  source: "local" | "drive" | "built-in";
  mimeType: string;
  addedAt: string;
  dataUrl: string;
  driveFileId?: string;
  webViewLink?: string;
};

export type DefaultBrandLogo = {
  id: string;
  name: string;
  description: string;
  url: string;
  downloadName: string;
};

export const DEFAULT_BRAND_LOGOS: DefaultBrandLogo[] = [
  {
    id: "logo-green",
    name: "Full Logo — Green",
    description: "Primary wordmark with green type",
    url: "/brand/fcw-logo-green.png",
    downloadName: "fcw-logo-green.png",
  },
  {
    id: "logo-black",
    name: "Full Logo — Black",
    description: "Wordmark for light backgrounds",
    url: "/brand/fcw-logo-black.png",
    downloadName: "fcw-logo-black.png",
  },
  {
    id: "flower-brown",
    name: "Flower Mark — Brown Center",
    description: "Icon variation with brown center",
    url: "/brand/fcw-flower-mark-brown.png",
    downloadName: "fcw-flower-mark-brown.png",
  },
  {
    id: "flower-white",
    name: "Flower Mark — White Center",
    description: "Icon variation with white center",
    url: "/brand/fcw-flower-mark-white.png",
    downloadName: "fcw-flower-mark-white.png",
  },
];

const STORAGE_KEY = "fcw-brand-assets";
const MAX_BYTES = 1_500_000;

function loadStoredBrandAssets(): BrandAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrandAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadBrandAssets(): BrandAsset[] {
  return loadStoredBrandAssets();
}

export function saveBrandAssets(assets: BrandAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

export function appendBrandAsset(asset: BrandAsset) {
  const assets = loadStoredBrandAssets();
  saveBrandAssets([asset, ...assets]);
}

export function removeBrandAsset(id: string) {
  const assets = loadStoredBrandAssets().filter((asset) => asset.id !== id);
  saveBrandAssets(assets);
}

export function isBuiltInAsset(asset: BrandAsset) {
  return asset.source === "built-in";
}

export function downloadBrandAsset(asset: BrandAsset) {
  const anchor = document.createElement("a");
  anchor.href = asset.dataUrl;
  anchor.download = asset.name;
  anchor.click();
}

export function downloadDefaultLogo(logo: DefaultBrandLogo) {
  const anchor = document.createElement("a");
  anchor.href = logo.url;
  anchor.download = logo.downloadName;
  anchor.click();
}

export function formatFileType(mimeType: string) {
  if (mimeType.startsWith("image/")) return mimeType.replace("image/", "").toUpperCase();
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("font")) return "Font";
  const parts = mimeType.split("/");
  return (parts[1] ?? mimeType).toUpperCase();
}

export function filterBrandAssets(assets: BrandAsset[], category: BrandAssetCategory | "all") {
  if (category === "all") return assets;
  return assets.filter((asset) => asset.category === category);
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Files must be under 1.5 MB for now.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export async function blobToDataUrl(blob: Blob, maxBytes = MAX_BYTES): Promise<string> {
  if (blob.size > maxBytes) {
    throw new Error("That file is too large to import (max 1.5 MB).");
  }
  return fileToDataUrl(new File([blob], "asset", { type: blob.type || "application/octet-stream" }));
}

export function isImageAsset(asset: BrandAsset) {
  return asset.mimeType.startsWith("image/");
}

export function isPdfAsset(asset: BrandAsset) {
  return asset.mimeType === "application/pdf";
}
