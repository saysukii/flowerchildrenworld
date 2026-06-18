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
  source: "local" | "drive";
  mimeType: string;
  addedAt: string;
  dataUrl: string;
  driveFileId?: string;
  webViewLink?: string;
};

const STORAGE_KEY = "fcw-brand-assets";
const MAX_BYTES = 1_500_000;

export function loadBrandAssets(): BrandAsset[] {
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

export function saveBrandAssets(assets: BrandAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

export function appendBrandAsset(asset: BrandAsset) {
  const assets = loadBrandAssets();
  saveBrandAssets([asset, ...assets]);
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
