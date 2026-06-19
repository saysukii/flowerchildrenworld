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

/** Soft card backgrounds inspired by sticky-note grids — keyed by tag */
export const GARDEN_NOTE_CARD_COLORS: Record<
  GardenTag,
  { bg: string; text: string; accent: string }
> = {
  Programming: { bg: "#D8F4A8", text: "#1E3A0A", accent: "#3AB819" },
  Community: { bg: "#B8EBFA", text: "#0A2A35", accent: "#15AAD2" },
  Brand: { bg: "#DDD4FA", text: "#2A1E45", accent: "#776BD9" },
  Fundraising: { bg: "#FAEAB8", text: "#3A2E0A", accent: "#EFB003" },
  General: { bg: "#FAD4B8", text: "#3A1E0A", accent: "#D9580D" },
};

export function noteCardColors(tag: GardenTag) {
  return GARDEN_NOTE_CARD_COLORS[tag] ?? GARDEN_NOTE_CARD_COLORS.General;
}

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

export const EMPTY_WHITEBOARD_SCENE: GardenWhiteboardScene = {
  elements: [],
  files: {},
};

function isPersistedWhiteboardElement(element: unknown) {
  if (!element || typeof element !== "object") return false;
  return (element as Record<string, unknown>).isDeleted !== true;
}

export function whiteboardHasContent(scene: GardenWhiteboardScene) {
  return sanitizeWhiteboardScene(scene).elements.length > 0;
}

/** App state fields safe to round-trip through JSON (no Maps/Sets). */
const WHITEBOARD_APP_STATE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "scrollX",
  "scrollY",
  "zoom",
] as const;

/** Strip non-serializable Excalidraw appState (e.g. collaborators Map) before save/load. */
export function sanitizeWhiteboardScene(scene: GardenWhiteboardScene): GardenWhiteboardScene {
  const safeAppState: Record<string, unknown> = {};
  if (scene.appState && typeof scene.appState === "object") {
    for (const key of WHITEBOARD_APP_STATE_KEYS) {
      if (scene.appState[key] !== undefined) {
        safeAppState[key] = scene.appState[key];
      }
    }
  }

  return {
    elements: Array.isArray(scene.elements)
      ? scene.elements.filter(isPersistedWhiteboardElement)
      : [],
    files:
      scene.files && typeof scene.files === "object" && !Array.isArray(scene.files)
        ? scene.files
        : {},
    ...(Object.keys(safeAppState).length > 0 ? { appState: safeAppState } : {}),
  };
}

export function isHtmlNoteBody(body: string) {
  return /<(?:h[1-6]|p|ul|ol|li|br|div|strong|em)\b/i.test(body);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesToListHtml(lines: string[]) {
  const items = lines.map((line) => {
    const cleaned = line.replace(/^[—\-•]\s*/, "").trim();
    return `<li>${escapeHtml(cleaned || "…")}</li>`;
  });
  return `<ul>${items.join("")}</ul>`;
}

export function plainTextToNoteHtml(text: string) {
  if (!text.trim() || isHtmlNoteBody(text)) return text;

  const blocks = text.split(/\n\n+/);
  const parts: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const [first, ...rest] = lines;
    const isSectionHeading = first.endsWith(":") && !first.startsWith("—") && !first.startsWith("-");
    const isBulletBlock = lines.every((line) => line.startsWith("—") || line.startsWith("-"));

    if (isSectionHeading) {
      parts.push(`<h2>${escapeHtml(first.replace(/:$/, ""))}</h2>`);
      if (rest.length === 0) {
        parts.push("<ul><li>…</li></ul>");
      } else if (rest.every((line) => line.startsWith("—") || line.startsWith("-"))) {
        parts.push(linesToListHtml(rest));
      } else {
        for (const line of rest) {
          if (line.startsWith("—") || line.startsWith("-")) {
            parts.push(linesToListHtml([line]));
          } else if (line.endsWith(":")) {
            parts.push(`<p><strong>${escapeHtml(line.replace(/:$/, ""))}</strong></p>`);
          } else {
            parts.push(`<p>${escapeHtml(line)}</p>`);
          }
        }
      }
      continue;
    }

    if (isBulletBlock) {
      parts.push(linesToListHtml(lines));
      continue;
    }

    parts.push(`<p>${escapeHtml(lines.join(" "))}</p>`);
  }

  return parts.join("") || `<p>${escapeHtml(text.trim())}</p>`;
}

export function ensureNoteHtml(body: string) {
  return plainTextToNoteHtml(body);
}

export function stripHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

function previewFromHtml(html: string, maxLines = 3) {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    const snippets: string[] = [];

    div.querySelectorAll("h2").forEach((heading) => {
      if (snippets.length >= maxLines) return;
      const title = heading.textContent?.trim();
      if (!title || title.toLowerCase() === "formatting options") return;

      let sibling = heading.nextElementSibling;
      while (sibling && !["UL", "OL", "P"].includes(sibling.tagName)) {
        sibling = sibling.nextElementSibling;
      }

      let detail = "";
      if (sibling?.tagName === "UL" || sibling?.tagName === "OL") {
        const firstItem = sibling.querySelector("li")?.textContent?.trim();
        if (firstItem && firstItem !== "…") detail = firstItem;
      } else if (sibling?.tagName === "P") {
        const text = sibling.textContent?.trim();
        if (text && text !== "…") detail = text;
      }

      snippets.push(detail ? `${title} · ${detail}` : title);
    });

    if (snippets.length) return snippets.slice(0, maxLines).join("\n");
  }

  const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)]
    .map((match) => match[1]?.replace(/<[^>]*>/g, "").trim())
    .filter((title) => title && title.toLowerCase() !== "formatting options");

  if (headings.length) return headings.slice(0, maxLines).join("\n");

  const text = stripHtml(html);
  if (!text) return "";
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

export function notePreviewLines(body: string, maxLines = 3) {
  if (!body.trim()) return "";
  const html = isHtmlNoteBody(body) ? body : plainTextToNoteHtml(body);
  return previewFromHtml(html, maxLines);
}

export function formatNoteDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatNoteDateLong(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatNoteDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNoteDateMMDDYYYY(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}/${d.getFullYear()}`;
}

export function noteWasRevised(note: GardenNote) {
  return new Date(note.updated_at).getTime() > new Date(note.created_at).getTime();
}

/** Card label — created date until first save, then last updated (MM/DD/YYYY). */
export function formatNoteCardDate(note: GardenNote) {
  const revised = noteWasRevised(note);
  const label = revised ? "Updated" : "Created";
  const iso = revised ? note.updated_at : note.created_at;
  return `${label} ${formatNoteDateMMDDYYYY(iso)}`;
}

/** Latest edit first (updated_at descending). */
export function sortGardenNotes(notes: GardenNote[]) {
  return [...notes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export const GARDEN_BRAND_SWATCHES = [
  "#020202",
  "#59341E",
  "#3AB819",
  "#15AAD2",
  "#776BD9",
  "#EFB003",
  "#D9580D",
  "#C53D3D",
  "#FCFCFC",
];
