/** Pages an admin can grant to team members. Admins always see every page. */

export type PageKey =
  | "dashboard"
  | "community"
  | "brand-essence"
  | "garden"
  | "analytics"
  | "messages"
  | "forms"
  | "routine-pulse";

export type ControllablePage = {
  key: PageKey;
  label: string;
  path: string;
  /** Shown in the main sidebar nav when allowed. */
  inNav: boolean;
};

export const CONTROLLABLE_PAGES: ControllablePage[] = [
  { key: "dashboard", label: "Home", path: "/dashboard", inNav: true },
  { key: "messages", label: "Messages", path: "/messages", inNav: true },
  { key: "community", label: "Community", path: "/community", inNav: true },
  { key: "brand-essence", label: "Brand Essence", path: "/brand-essence", inNav: true },
  { key: "garden", label: "The Garden", path: "/garden", inNav: true },
  { key: "analytics", label: "Analytics", path: "/analytics", inNav: true },
  { key: "forms", label: "Forms", path: "/forms", inNav: false },
  { key: "routine-pulse", label: "Routine Pulse", path: "/routine-pulse", inNav: false },
];

/** Pages every member gets unless an admin removes them. */
export const DEFAULT_MEMBER_PAGES: PageKey[] = [
  "dashboard",
  "messages",
  "community",
  "garden",
];

const STORAGE_KEY = "fcw-member-page-access";
const CHANGED_EVENT = "fcw-page-access-changed";

export function loadMemberPageAccess(): PageKey[] {
  if (typeof window === "undefined") return [...DEFAULT_MEMBER_PAGES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_MEMBER_PAGES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_MEMBER_PAGES];
    const allowed = new Set(CONTROLLABLE_PAGES.map((p) => p.key));
    const keys = parsed.filter((k): k is PageKey => typeof k === "string" && allowed.has(k as PageKey));
    // Home is always available so members aren't locked out of the app.
    if (!keys.includes("dashboard")) keys.unshift("dashboard");
    return keys;
  } catch {
    return [...DEFAULT_MEMBER_PAGES];
  }
}

export function saveMemberPageAccess(pages: PageKey[]) {
  const allowed = new Set(CONTROLLABLE_PAGES.map((p) => p.key));
  const next = pages.filter((k) => allowed.has(k));
  if (!next.includes("dashboard")) next.unshift("dashboard");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function onPageAccessChanged(listener: () => void) {
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function canAccessPage(page: PageKey, admin: boolean, memberPages: PageKey[] = loadMemberPageAccess()) {
  if (admin) return true;
  return memberPages.includes(page);
}

export function pageKeyFromPath(pathname: string): PageKey | null {
  const match = CONTROLLABLE_PAGES.find(
    (p) => pathname === p.path || pathname.startsWith(`${p.path}/`),
  );
  return match?.key ?? null;
}

export function firstAllowedPath(admin: boolean, memberPages: PageKey[] = loadMemberPageAccess()) {
  if (admin) return "/dashboard";
  const first = CONTROLLABLE_PAGES.find((p) => memberPages.includes(p.key));
  return first?.path ?? "/dashboard";
}
