import { isDevMock, MOCK_COMMUNITY_STORE } from "@/lib/dev-mock-data";

export type CommunityTab = "children" | "guardians" | "volunteers" | "partners";

export type ChildRecord = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  program: string;
  status: string;
  enrollmentDate: string;
  guardianId: string;
  guardianLink: string;
  notes: string;
  /** Calendar day the record was added, YYYY-MM-DD. */
  addedAt?: string;
};

export type GuardianRecord = {
  id: string;
  guardianName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  linkedChildren: string;
  status: string;
  addedAt?: string;
};

export type VolunteerRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string;
  availability: string;
  status: string;
  source: string;
  addedAt?: string;
};

export type PartnerRecord = {
  id: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone: string;
  partnershipType: string;
  notes: string;
  status: string;
  addedAt?: string;
};

export type CommunityStore = {
  children: ChildRecord[];
  guardians: GuardianRecord[];
  volunteers: VolunteerRecord[];
  partners: PartnerRecord[];
};

export type CsvFieldDef = {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
};

const STORAGE_KEY = "fcw-community";
export const COMMUNITY_UPDATED_EVENT = "fcw-community-updated";

const EMPTY_STORE: CommunityStore = {
  children: [],
  guardians: [],
  volunteers: [],
  partners: [],
};

export const COMMUNITY_CSV_FIELDS: Record<CommunityTab, CsvFieldDef[]> = {
  children: [
    { key: "fullName", label: "Full name", aliases: ["name", "child name", "full name"], required: true },
    { key: "dateOfBirth", label: "Date of birth", aliases: ["dob", "date of birth", "birthday", "birth date"] },
    { key: "program", label: "Program", aliases: ["program type"] },
    { key: "status", label: "Status", aliases: [] },
    { key: "enrollmentDate", label: "Enrollment date", aliases: ["enrolled", "enrollment", "enroll date"] },
    { key: "guardianLink", label: "Guardian", aliases: ["guardian", "guardian link", "linked guardian", "parent"] },
    { key: "notes", label: "Notes", aliases: ["note", "comments"] },
  ],
  guardians: [
    { key: "guardianName", label: "Guardian name", aliases: ["name", "full name", "parent name"], required: true },
    { key: "email", label: "Email", aliases: ["e-mail", "email address"] },
    { key: "phone", label: "Phone", aliases: ["phone number", "mobile", "cell"] },
    {
      key: "emergencyContactName",
      label: "Emergency contact name",
      aliases: ["emergency contact", "emergency name"],
    },
    {
      key: "emergencyContactPhone",
      label: "Emergency contact phone",
      aliases: ["emergency phone", "emergency number"],
    },
    {
      key: "linkedChildren",
      label: "Linked children",
      aliases: ["children", "linked child", "child names"],
    },
    { key: "status", label: "Status", aliases: [] },
  ],
  volunteers: [
    { key: "fullName", label: "Full name", aliases: ["name", "volunteer name"], required: true },
    { key: "email", label: "Email", aliases: ["e-mail", "email address"] },
    { key: "phone", label: "Phone", aliases: ["phone number", "mobile", "cell"] },
    { key: "skills", label: "Skills / interests", aliases: ["skills", "interests", "skills/interests"] },
    { key: "availability", label: "Availability", aliases: ["days", "available days"] },
    { key: "status", label: "Status", aliases: [] },
    { key: "source", label: "Source", aliases: ["referral source", "how they found us"] },
  ],
  partners: [
    { key: "organizationName", label: "Organization name", aliases: ["organization", "org", "company"], required: true },
    { key: "contactName", label: "Contact name", aliases: ["name", "contact", "primary contact"] },
    { key: "email", label: "Email", aliases: ["e-mail", "email address"] },
    { key: "phone", label: "Phone", aliases: ["phone number", "mobile"] },
    {
      key: "partnershipType",
      label: "Partnership type",
      aliases: ["type", "partnership", "partner type"],
    },
    { key: "notes", label: "Notes", aliases: ["note", "comments"] },
    { key: "status", label: "Status", aliases: [] },
  ],
};

function parseCommunityStore(parsed: Partial<CommunityStore>): CommunityStore {
  return {
    children: Array.isArray(parsed.children)
      ? parsed.children.map((child) => ({
          ...child,
          guardianId: child.guardianId ?? "",
        }))
      : [],
    guardians: Array.isArray(parsed.guardians)
      ? parsed.guardians.map((guardian) => ({
          ...guardian,
          status: guardian.status || "Active",
        }))
      : [],
    volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : [],
    partners: Array.isArray(parsed.partners) ? parsed.partners : [],
  };
}

/** The directory saved in this browser. Null when this browser has not saved one. */
export function readPersistedCommunity(): CommunityStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseCommunityStore(JSON.parse(raw) as Partial<CommunityStore>);
  } catch {
    return null;
  }
}

export function adoptCommunityStore(store: CommunityStore) {
  writeCommunityLocal(parseCommunityStore(store));
}

export function loadCommunityStore(): CommunityStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  const store = readPersistedCommunity();
  if (!store) return isDevMock ? MOCK_COMMUNITY_STORE : EMPTY_STORE;
  if (isDevMock && isCommunityStoreEmpty(store)) return MOCK_COMMUNITY_STORE;
  return store;
}

function isCommunityStoreEmpty(store: CommunityStore) {
  return (
    store.children.length === 0 &&
    store.guardians.length === 0 &&
    store.volunteers.length === 0 &&
    store.partners.length === 0
  );
}

function writeCommunityLocal(store: CommunityStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COMMUNITY_UPDATED_EVENT));
  }
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]) {
  const map = new Map(local.map((item) => [item.id, item]));
  for (const item of remote) {
    map.set(item.id, { ...map.get(item.id), ...item });
  }
  return [...map.values()];
}

export function saveCommunityStore(store: CommunityStore) {
  writeCommunityLocal(store);
  if (typeof window === "undefined") return;
  void import("@/lib/workspace-sync")
    .then(({ publishWorkspaceDocument }) => publishWorkspaceDocument("community", store))
    .catch(() => undefined);
  void import("@/lib/api/google.functions")
    .then(({ pushCommunityDirectory }) => pushCommunityDirectory({ data: { store } }))
    .catch(() => undefined);
}

export async function refreshCommunityFromDrive() {
  if (typeof window === "undefined") return null;
  try {
    const { pullCommunityDirectory } = await import("@/lib/api/google.functions");
    const remote = await pullCommunityDirectory();
    if (!remote) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    const remoteEmpty =
      (remote.children?.length ?? 0) === 0 &&
      (remote.guardians?.length ?? 0) === 0 &&
      (remote.volunteers?.length ?? 0) === 0 &&
      (remote.partners?.length ?? 0) === 0;
    if (!raw && remoteEmpty) return null;
    const local = raw ? (JSON.parse(raw) as CommunityStore) : EMPTY_STORE;
    const merged: CommunityStore = {
      children: mergeById((remote.children ?? []) as ChildRecord[], local.children ?? []),
      guardians: mergeById((remote.guardians ?? []) as GuardianRecord[], local.guardians ?? []),
      volunteers: mergeById((remote.volunteers ?? []) as VolunteerRecord[], local.volunteers ?? []),
      partners: mergeById((remote.partners ?? []) as PartnerRecord[], local.partners ?? []),
    };
    writeCommunityLocal(merged);
    void import("@/lib/workspace-sync")
      .then(({ publishWorkspaceDocument }) => publishWorkspaceDocument("community", merged))
      .catch(() => undefined);
    return merged;
  } catch {
    return null;
  }
}

/** Display a stored date as MM/DD/YY. */
export function formatDob(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1].slice(2)}`;

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (slash) {
    const year = slash[3].length === 2 ? slash[3] : slash[3].slice(-2);
    return `${slash[1].padStart(2, "0")}/${slash[2].padStart(2, "0")}/${year}`;
  }

  return trimmed;
}

/** Value for an `<input type="date">`. */
export function toDateInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (!slash) return "";
  const yearNum = Number(slash[3].length === 2 ? (Number(slash[3]) <= 30 ? `20${slash[3]}` : `19${slash[3]}`) : slash[3]);
  if (!Number.isFinite(yearNum)) return "";
  return `${String(yearNum).padStart(4, "0")}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
}

/** Whole years from a stored date of birth. Empty or invalid dates return null. */
export function ageFromDob(value: string, today = new Date()): number | null {
  const iso = toDateInputValue(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function getRecordsForTab(store: CommunityStore, tab: CommunityTab) {
  return store[tab];
}

export function appendRecordsForTab(
  store: CommunityStore,
  tab: CommunityTab,
  records: CommunityStore[CommunityTab],
): CommunityStore {
  if (tab === "children") {
    return { ...store, children: [...store.children, ...(records as ChildRecord[])] };
  }
  if (tab === "guardians") {
    return { ...store, guardians: [...store.guardians, ...(records as GuardianRecord[])] };
  }
  if (tab === "volunteers") {
    return { ...store, volunteers: [...store.volunteers, ...(records as VolunteerRecord[])] };
  }
  return { ...store, partners: [...store.partners, ...(records as PartnerRecord[])] };
}

function normalizeHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveFieldKey(tab: CommunityTab, header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const field of COMMUNITY_CSV_FIELDS[tab]) {
    if (normalizeHeader(field.label) === normalized) return field.key;
    if (field.aliases.some((alias) => normalizeHeader(alias) === normalized)) return field.key;
  }
  return null;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  return rows;
}

export type CsvParseResult = {
  headers: string[];
  mappedHeaders: Record<string, string>;
  unmappedHeaders: string[];
  rows: Record<string, string>[];
  errors: string[];
};

export function parseCommunityCsv(tab: CommunityTab, text: string): CsvParseResult {
  const errors: string[] = [];
  const table = parseCsvRows(text);
  if (table.length === 0) {
    return { headers: [], mappedHeaders: {}, unmappedHeaders: [], rows: [], errors: ["CSV file is empty."] };
  }

  const headers = table[0]!;
  const mappedHeaders: Record<string, string> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const key = resolveFieldKey(tab, header);
    if (key) mappedHeaders[header] = key;
    else if (header.trim()) unmappedHeaders.push(header);
  }

  const required = COMMUNITY_CSV_FIELDS[tab].filter((f) => f.required).map((f) => f.key);
  const mappedKeys = new Set(Object.values(mappedHeaders));
  for (const key of required) {
    if (!mappedKeys.has(key)) {
      const field = COMMUNITY_CSV_FIELDS[tab].find((f) => f.key === key);
      errors.push(`Missing required column: ${field?.label ?? key}`);
    }
  }

  const rows: Record<string, string>[] = [];
  for (const line of table.slice(1)) {
    if (line.every((value) => !value.trim())) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = mappedHeaders[header];
      if (key) record[key] = line[index]?.trim() ?? "";
    });
    rows.push(record);
  }

  return { headers, mappedHeaders, unmappedHeaders, rows, errors };
}

function createId() {
  return crypto.randomUUID();
}

/** Calendar day a new directory record was added. */
export function todayAddedAt(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function rowsToRecords(tab: CommunityTab, rows: Record<string, string>[]) {
  switch (tab) {
    case "children":
      return rows
        .filter((row) => row.fullName?.trim())
        .map(
          (row): ChildRecord => ({
            id: createId(),
            fullName: row.fullName?.trim() ?? "",
            dateOfBirth: row.dateOfBirth?.trim() ?? "",
            program: row.program?.trim() || "Full-Time",
            status: row.status?.trim() || "Active",
            enrollmentDate: row.enrollmentDate?.trim() ?? "",
            guardianId: row.guardianId?.trim() ?? "",
            guardianLink: row.guardianLink?.trim() ?? "",
            notes: row.notes?.trim() ?? "",
            addedAt: row.enrollmentDate?.trim() || todayAddedAt(),
          }),
        );
    case "guardians":
      return rows
        .filter((row) => row.guardianName?.trim())
        .map(
          (row): GuardianRecord => ({
            id: createId(),
            guardianName: row.guardianName?.trim() ?? "",
            email: row.email?.trim() ?? "",
            phone: row.phone?.trim() ?? "",
            emergencyContactName: row.emergencyContactName?.trim() ?? "",
            emergencyContactPhone: row.emergencyContactPhone?.trim() ?? "",
            linkedChildren: row.linkedChildren?.trim() ?? "",
            status: row.status?.trim() || "Active",
            addedAt: todayAddedAt(),
          }),
        );
    case "volunteers":
      return rows
        .filter((row) => row.fullName?.trim())
        .map(
          (row): VolunteerRecord => ({
            id: createId(),
            fullName: row.fullName?.trim() ?? "",
            email: row.email?.trim() ?? "",
            phone: row.phone?.trim() ?? "",
            skills: row.skills?.trim() ?? "",
            availability: row.availability?.trim() ?? "",
            status: row.status?.trim() || "Active",
            source: row.source?.trim() || "Website form",
            addedAt: todayAddedAt(),
          }),
        );
    case "partners":
      return rows
        .filter((row) => row.organizationName?.trim())
        .map(
          (row): PartnerRecord => ({
            id: createId(),
            organizationName: row.organizationName?.trim() ?? "",
            contactName: row.contactName?.trim() ?? "",
            email: row.email?.trim() ?? "",
            phone: row.phone?.trim() ?? "",
            partnershipType: row.partnershipType?.trim() || "Community",
            notes: row.notes?.trim() ?? "",
            status: row.status?.trim() || "Active",
            addedAt: todayAddedAt(),
          }),
        );
  }
}

export function removeLinkedChild(existing: string, childName: string) {
  return existing
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name.toLowerCase() !== childName.toLowerCase())
    .join(", ");
}

export function appendLinkedChild(existing: string, childName: string) {
  const names = existing
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.some((name) => name.toLowerCase() === childName.toLowerCase())) return existing;
  return [...names, childName].join(", ");
}

export function saveChildWithGuardian(
  store: CommunityStore,
  child: ChildRecord,
  guardian: GuardianRecord,
  isNewGuardian: boolean,
): CommunityStore {
  const linkedChild: ChildRecord = {
    ...child,
    guardianId: guardian.id,
    guardianLink: guardian.guardianName,
  };

  const updatedGuardian: GuardianRecord = {
    ...guardian,
    linkedChildren: appendLinkedChild(guardian.linkedChildren, child.fullName),
  };

  const guardians = isNewGuardian
    ? [...store.guardians, updatedGuardian]
    : store.guardians.map((g) => (g.id === guardian.id ? updatedGuardian : g));

  return {
    ...store,
    children: [...store.children, linkedChild],
    guardians,
  };
}

export function formatChildRow(child: ChildRecord) {
  const age = ageFromDob(child.dateOfBirth);
  return {
    name: child.fullName,
    program: child.program,
    status: child.status,
    dob: formatDob(child.dateOfBirth),
    age: age == null ? "" : String(age),
  };
}

export function replaceRecord<T extends { id: string }>(records: T[], record: T) {
  return records.map((item) => (item.id === record.id ? record : item));
}

export function saveEditedChild(
  store: CommunityStore,
  child: ChildRecord,
  guardian:
    | { mode: "existing"; guardian: GuardianRecord }
    | { mode: "new"; guardian: GuardianRecord }
    | null,
): CommunityStore {
  const previous = store.children.find((item) => item.id === child.id);
  let guardians = store.guardians;

  if (previous?.guardianId && previous.guardianId !== guardian?.guardian.id) {
    guardians = guardians.map((item) =>
      item.id === previous.guardianId
        ? { ...item, linkedChildren: removeLinkedChild(item.linkedChildren, previous.fullName) }
        : item,
    );
  }

  let nextChild: ChildRecord = { ...child, guardianId: "", guardianLink: "" };

  if (guardian) {
    const current = guardian.guardian;
    let linked = current.linkedChildren;
    if (previous && previous.guardianId === current.id && previous.fullName !== child.fullName) {
      linked = removeLinkedChild(linked, previous.fullName);
    }
    linked = appendLinkedChild(linked, child.fullName);
    const updatedGuardian: GuardianRecord = { ...current, linkedChildren: linked };
    guardians =
      guardian.mode === "new"
        ? [...guardians, updatedGuardian]
        : guardians.map((item) => (item.id === updatedGuardian.id ? updatedGuardian : item));
    nextChild = {
      ...child,
      guardianId: updatedGuardian.id,
      guardianLink: updatedGuardian.guardianName,
    };
  } else if (previous?.guardianId) {
    guardians = guardians.map((item) =>
      item.id === previous.guardianId
        ? { ...item, linkedChildren: removeLinkedChild(item.linkedChildren, previous.fullName) }
        : item,
    );
  }

  return {
    ...store,
    children: store.children.some((item) => item.id === child.id)
      ? store.children.map((item) => (item.id === child.id ? nextChild : item))
      : [...store.children, nextChild],
    guardians,
  };
}

export function updateGuardianRecord(store: CommunityStore, guardian: GuardianRecord): CommunityStore {
  return {
    ...store,
    guardians: replaceRecord(store.guardians, guardian),
    children: store.children.map((child) =>
      child.guardianId === guardian.id ? { ...child, guardianLink: guardian.guardianName } : child,
    ),
  };
}

export function deleteCommunityRecords(store: CommunityStore, tab: CommunityTab, ids: string[]): CommunityStore {
  return ids.reduce((next, id) => deleteCommunityRecord(next, tab, id), store);
}

export function deleteCommunityRecord(store: CommunityStore, tab: CommunityTab, id: string): CommunityStore {
  if (tab === "children") {
    const child = store.children.find((item) => item.id === id);
    return {
      ...store,
      children: store.children.filter((item) => item.id !== id),
      guardians: child
        ? store.guardians.map((guardian) =>
            guardian.id === child.guardianId
              ? { ...guardian, linkedChildren: removeLinkedChild(guardian.linkedChildren, child.fullName) }
              : guardian,
          )
        : store.guardians,
    };
  }

  if (tab === "guardians") {
    return {
      ...store,
      guardians: store.guardians.filter((item) => item.id !== id),
      children: store.children.map((child) =>
        child.guardianId === id ? { ...child, guardianId: "", guardianLink: "" } : child,
      ),
    };
  }

  if (tab === "volunteers") {
    return { ...store, volunteers: store.volunteers.filter((item) => item.id !== id) };
  }

  return { ...store, partners: store.partners.filter((item) => item.id !== id) };
}

export function formatGuardianRow(guardian: GuardianRecord) {
  return {
    name: guardian.guardianName,
    email: guardian.email,
    phone: guardian.phone,
    linkedChildren: guardian.linkedChildren,
    status: guardian.status || "Active",
  };
}

export function formatVolunteerRow(volunteer: VolunteerRecord) {
  return {
    name: volunteer.fullName,
    email: volunteer.email,
    phone: volunteer.phone,
    skills: volunteer.skills,
    status: volunteer.status,
  };
}

export function formatPartnerRow(partner: PartnerRecord) {
  return {
    name: partner.contactName || partner.organizationName,
    organization: partner.organizationName,
    email: partner.email,
    partnershipType: partner.partnershipType,
    status: partner.status,
  };
}

export function filterRecords<T extends object>(records: T[], query: string, fields: (keyof T)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return records;
  return records.filter((record) =>
    fields.some((field) => String(record[field] ?? "").toLowerCase().includes(q)),
  );
}
