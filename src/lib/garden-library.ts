import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { LibraryPersistenceAdapter } from "@excalidraw/excalidraw/data/library";
import type { BinaryFileData, DataURL, LibraryItems } from "@excalidraw/excalidraw/types";
import type { FileId } from "@excalidraw/excalidraw/element/types";

const STORAGE_KEY = "fcw-whiteboard-library";
const LOGO_FILE_ID = "fcw-logo-file" as FileId;
const FLOWER_FILE_ID = "fcw-flower-file" as FileId;

const DROPPED_IDS = new Set([
  "fcw-flower children",
  "fcw-be well",
  "fcw-the village",
  "fcw-sun",
  "fcw-flower",
]);

type LibraryElement = LibraryItems[number]["elements"][number];

const STICKERS = [
  { id: "fcw-logo", name: "logo", src: "/fcw-logo.png", fileId: LOGO_FILE_ID, max: 160 },
  { id: "fcw-flower-icon", name: "flower", src: "/fcw-flower.png", fileId: FLOWER_FILE_ID, max: 120 },
] as const;

function readStoredLibrary(): LibraryItems | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { libraryItems?: LibraryItems };
    return Array.isArray(parsed.libraryItems) ? parsed.libraryItems : [];
  } catch {
    return [];
  }
}

async function dataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { url: url as DataURL, mimeType: blob.type || "image/png" };
}

function measure(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function imageSticker(
  id: string,
  name: string,
  fileId: FileId,
  width: number,
  height: number,
): LibraryItems[number] {
  const elements = convertToExcalidrawElements(
    [{ type: "image", x: 0, y: 0, width, height, fileId }],
    { regenerateIds: true },
  ) as LibraryElement[];
  return {
    id,
    status: "unpublished",
    created: Date.UTC(2026, 0, 1),
    name,
    elements,
  };
}

export async function fcwStickerFiles(): Promise<BinaryFileData[]> {
  const created = Date.UTC(2026, 0, 1);
  const files = await Promise.all(
    STICKERS.map(async (sticker) => {
      const file = await dataUrl(sticker.src);
      return {
        id: sticker.fileId,
        mimeType: "image/png" as const,
        dataURL: file.url,
        created,
      };
    }),
  );
  return files;
}

async function officialStickers(): Promise<LibraryItems> {
  const items = await Promise.all(
    STICKERS.map(async (sticker) => {
      const size = await measure(sticker.src);
      const scale = sticker.max / Math.max(size.width, size.height);
      return imageSticker(
        sticker.id,
        sticker.name,
        sticker.fileId,
        Math.round(size.width * scale),
        Math.round(size.height * scale),
      );
    }),
  );
  return items;
}

export const fcwLibraryAdapter: LibraryPersistenceAdapter = {
  async load() {
    const stored = readStoredLibrary() ?? [];
    const kept = stored
      .filter((item) => !DROPPED_IDS.has(item.id) && item.id !== "fcw-logo" && item.id !== "fcw-flower-icon")
      .map((item) => ({ ...item, status: "unpublished" as const }));
    let official: LibraryItems = [];
    try {
      official = await officialStickers();
    } catch (error) {
      console.error(error);
    }
    const libraryItems = [...official, ...kept];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ libraryItems }));
    return { libraryItems };
  },
  async save(libraryData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryData));
  },
};
