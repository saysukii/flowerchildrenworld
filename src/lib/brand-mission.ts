const STORAGE_KEY = "fcw-brand-mission";

export const DEFAULT_MISSION =
  "Children are the seeds of the future. Rooted in values of love and creative freedom, we empower the flower children to become the greatest versions of themselves.";

export function loadBrandMission(): string {
  if (typeof window === "undefined") return DEFAULT_MISSION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MISSION;
    const trimmed = raw.trim();
    return trimmed || DEFAULT_MISSION;
  } catch {
    return DEFAULT_MISSION;
  }
}

export function saveBrandMission(mission: string) {
  localStorage.setItem(STORAGE_KEY, mission.trim());
}
