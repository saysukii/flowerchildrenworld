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

const LEGACY_STORAGE_KEY = "fcw-brand-assets";
const DB_NAME = "fcw-brand-assets";
const STORE_NAME = "assets";
const MAX_BYTES = 10 * 1024 * 1024;

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open asset storage."));
  });
}

function readLegacyAssets(): BrandAsset[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrandAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readAllAssets(db: IDBDatabase): Promise<BrandAsset[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const assets = Array.isArray(request.result) ? (request.result as BrandAsset[]) : [];
      assets.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      resolve(assets);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read saved assets."));
  });
}

async function writeAllAssets(db: IDBDatabase, assets: BrandAsset[]) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const asset of assets) store.put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save that file."));
  });
}

export async function loadBrandAssets(): Promise<BrandAsset[]> {
  if (typeof window === "undefined") return [];
  const db = await openAssetDb();
  const stored = await readAllAssets(db);
  if (stored.length > 0) return stored;

  const legacy = readLegacyAssets();
  if (legacy.length === 0) return [];
  await writeAllAssets(db, legacy);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return legacy;
}

export async function replaceBrandAsset(asset: BrandAsset) {
  const db = await openAssetDb();
  const assets = await readAllAssets(db);
  const next = assets.some((item) => item.id === asset.id)
    ? assets.map((item) => (item.id === asset.id ? asset : item))
    : [asset, ...assets];
  await writeAllAssets(db, next);
}

export async function appendBrandAsset(asset: BrandAsset) {
  const db = await openAssetDb();
  const assets = await readAllAssets(db);
  await writeAllAssets(db, [asset, ...assets]);
}

export async function removeBrandAsset(id: string) {
  const db = await openAssetDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not remove that file."));
  });
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
    throw new Error("Files must be 10 MB or smaller.");
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
    throw new Error("That file is too large to import (max 10 MB).");
  }
  return fileToDataUrl(new File([blob], "asset", { type: blob.type || "application/octet-stream" }));
}

export function isImageAsset(asset: BrandAsset) {
  return asset.mimeType.startsWith("image/");
}

export function isPdfAsset(asset: BrandAsset) {
  return asset.mimeType === "application/pdf";
}
