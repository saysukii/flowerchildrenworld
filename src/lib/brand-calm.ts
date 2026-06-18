export type CalmItem = {
  letter: string;
  word: string;
};

const STORAGE_KEY = "fcw-brand-calm";

export const DEFAULT_CALM: CalmItem[] = [
  { letter: "C", word: "Community" },
  { letter: "A", word: "Arts" },
  { letter: "L", word: "Life Skills" },
  { letter: "M", word: "Mindfulness" },
];

function normalizeItem(item: CalmItem, fallback: CalmItem): CalmItem {
  return {
    letter: (item.letter || fallback.letter).trim().slice(0, 1).toUpperCase() || fallback.letter,
    word: (item.word || fallback.word).trim() || fallback.word,
  };
}

export function loadBrandCalm(): CalmItem[] {
  if (typeof window === "undefined") return DEFAULT_CALM;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CALM;
    const parsed = JSON.parse(raw) as CalmItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CALM;
    return DEFAULT_CALM.map((fallback, index) =>
      normalizeItem(parsed[index] ?? fallback, fallback),
    );
  } catch {
    return DEFAULT_CALM;
  }
}

export function saveBrandCalm(calm: CalmItem[]) {
  const next = DEFAULT_CALM.map((fallback, index) =>
    normalizeItem(calm[index] ?? fallback, fallback),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
