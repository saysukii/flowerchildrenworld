export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member";
  status: "Active" | "Pending";
};

const STORAGE_KEY = "fcw-team-members";

export function loadTeamMembers(): TeamMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamMember[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeamMembers(members: TeamMember[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

export function seedTeamForUser(email: string, displayName: string, admin: boolean): TeamMember[] {
  const existing = loadTeamMembers();
  if (existing.some((m) => m.email.toLowerCase() === email.toLowerCase())) return existing;
  const seeded = [
    {
      id: crypto.randomUUID(),
      name: displayName,
      email,
      role: admin ? ("Admin" as const) : ("Member" as const),
      status: "Active" as const,
    },
    ...existing,
  ];
  saveTeamMembers(seeded);
  return seeded;
}
