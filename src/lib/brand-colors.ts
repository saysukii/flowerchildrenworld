export type BrandColor = {
  id: string;
  hex: string;
  name: string;
  usage: string;
};

const STORAGE_KEY = "fcw-brand-colors";

export const DEFAULT_BRAND_COLORS: BrandColor[] = [
  { id: "white", hex: "#FCFCFC", name: "White", usage: "Backgrounds" },
  { id: "black", hex: "#020202", name: "Black", usage: "Primary text" },
  { id: "brown", hex: "#59341E", name: "Brown", usage: "Earth · warmth" },
  { id: "green", hex: "#3AB819", name: "Green", usage: "Nature · growth" },
  { id: "blue", hex: "#15AAD2", name: "Blue", usage: "Sky · calm" },
  { id: "purple", hex: "#776BD9", name: "Purple", usage: "Creativity" },
  { id: "yellow", hex: "#EFB003", name: "Yellow", usage: "Joy · warmth" },
  { id: "orange", hex: "#D9580D", name: "Orange", usage: "Energy" },
  { id: "red", hex: "#C53D3D", name: "Red", usage: "Passion" },
];

export function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return trimmed;
}

export function loadBrandColors(): BrandColor[] {
  if (typeof window === "undefined") return DEFAULT_BRAND_COLORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_COLORS;
    const parsed = JSON.parse(raw) as BrandColor[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BRAND_COLORS;
    return parsed.map((color) => ({
      id: color.id || crypto.randomUUID(),
      hex: normalizeHex(color.hex || "#FCFCFC"),
      name: color.name || "Untitled",
      usage: color.usage || "",
    }));
  } catch {
    return DEFAULT_BRAND_COLORS;
  }
}

export function saveBrandColors(colors: BrandColor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export function createBrandColor(partial?: Partial<BrandColor>): BrandColor {
  return {
    id: crypto.randomUUID(),
    hex: partial?.hex ?? "#3AB819",
    name: partial?.name ?? "New color",
    usage: partial?.usage ?? "",
  };
}
