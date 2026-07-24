import {
  DEFAULT_MEMBER_PAGES,
  loadLegacyMemberPageAccess,
  normalizePages,
  notifyPageAccessChanged,
  type PageKey,
} from "@/lib/page-access";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Admin" | "Member";
  status: "Active" | "Pending";
  pages: PageKey[];
};

const STORAGE_KEY = "fcw-team-members";

function normalizeMember(raw: Partial<TeamMember> & { id?: string }, fallbackPages: PageKey[]): TeamMember | null {
  if (!raw.id || typeof raw.email !== "string") return null;
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : raw.email.split("@")[0] || "Member",
    email: raw.email,
    phone: typeof raw.phone === "string" ? raw.phone : "",
    role: raw.role === "Admin" ? "Admin" : "Member",
    status: raw.status === "Pending" ? "Pending" : "Active",
    pages: raw.pages !== undefined ? normalizePages(raw.pages) : [...fallbackPages],
  };
}

export function loadTeamMembers(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const fallback = loadLegacyMemberPageAccess();
    return parsed
      .map((item) => normalizeMember(item as Partial<TeamMember>, fallback))
      .filter((m): m is TeamMember => m !== null);
  } catch {
    return [];
  }
}

export function saveTeamMembers(members: TeamMember[]) {
  const normalized = members.map((m) => normalizeMember(m, DEFAULT_MEMBER_PAGES)).filter((m): m is TeamMember => m !== null);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  notifyPageAccessChanged();
}

export function getMemberPagesForEmail(email: string | null | undefined): PageKey[] {
  if (!email) return [...DEFAULT_MEMBER_PAGES];
  const member = loadTeamMembers().find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (member) return [...member.pages];
  return loadLegacyMemberPageAccess();
}

export function seedTeamForUser(email: string, displayName: string, admin: boolean): TeamMember[] {
  const existing = loadTeamMembers();
  if (existing.some((m) => m.email.toLowerCase() === email.toLowerCase())) return existing;
  const seeded: TeamMember[] = [
    {
      id: crypto.randomUUID(),
      name: displayName,
      email,
      phone: "",
      role: admin ? "Admin" : "Member",
      status: "Active",
      pages: [...DEFAULT_MEMBER_PAGES],
    },
    ...existing,
  ];
  saveTeamMembers(seeded);
  return seeded;
}
