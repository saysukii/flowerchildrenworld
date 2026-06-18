export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Ritual = {
  id: string;
  day: DayKey;
  prompt: string;
  active: boolean;
};

export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const STORAGE_KEY = "fcw-routine-pulse";

export const DEFAULT_RITUALS: Ritual[] = [
  { id: "mon", day: "mon", prompt: "Plan the week — review programming + outreach goals", active: true },
  { id: "tue", day: "tue", prompt: "Post flyers + share community updates", active: true },
  { id: "wed", day: "wed", prompt: "Check volunteer signups, confirm Saturday crew", active: true },
  { id: "thu", day: "thu", prompt: "Send partner follow-ups + thank-yous", active: true },
  { id: "fri", day: "fri", prompt: "Prep materials + supplies for weekend events", active: true },
  { id: "sat", day: "sat", prompt: "Run program — be present with the children", active: true },
  { id: "sun", day: "sun", prompt: "Rest, reflect, and journal the week", active: true },
];

export function loadRituals(): Ritual[] {
  if (typeof window === "undefined") return DEFAULT_RITUALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RITUALS;
    const parsed = JSON.parse(raw) as Ritual[];
    return Array.isArray(parsed) ? parsed : DEFAULT_RITUALS;
  } catch {
    return DEFAULT_RITUALS;
  }
}

export function saveRituals(rituals: Ritual[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rituals));
}

export function ritualForDay(rituals: Ritual[], day: DayKey) {
  return rituals.find((r) => r.day === day);
}
