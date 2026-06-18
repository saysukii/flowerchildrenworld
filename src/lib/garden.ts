export const GARDEN_GREEN = "#3AB819";

export const GARDEN_TAGS = [
  "Programming",
  "Community",
  "Brand",
  "Fundraising",
  "General",
] as const;

export type GardenTag = (typeof GARDEN_TAGS)[number];

export const GARDEN_TAG_COLORS: Record<GardenTag, string> = {
  Programming: "#3AB819",
  Community: "#15AAD2",
  Brand: "#776BD9",
  Fundraising: "#EFB003",
  General: "#59341E",
};

export type GardenNote = {
  id: string;
  title: string;
  body: string;
  tag: GardenTag;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type GardenWhiteboardScene = {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

export function stripHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function notePreviewLines(body: string, maxLines = 2) {
  const text = stripHtml(body);
  if (!text) return "";
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  return lines.slice(0, maxLines).join("\n");
}

export function formatNoteDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function sortGardenNotes(notes: GardenNote[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
