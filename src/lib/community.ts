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
};

export type GuardianRecord = {
  id: string;
  guardianName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  linkedChildren: string;
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

export function loadCommunityStore(): CommunityStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<CommunityStore>;
    return {
      children: Array.isArray(parsed.children)
        ? parsed.children.map((child) => ({
            ...child,
            guardianId: child.guardianId ?? "",
          }))
        : [],
      guardians: Array.isArray(parsed.guardians) ? parsed.guardians : [],
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : [],
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
    };
  } catch {
    return EMPTY_STORE;
  }
}

export function saveCommunityStore(store: CommunityStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRecordsForTab(store: CommunityStore, tab: CommunityTab) {
  return store[tab];
}

export function appendRecordsForTab<T extends { id: string }>(
  store: CommunityStore,
  tab: CommunityTab,
  records: T[],
): CommunityStore {
  return {
    ...store,
    [tab]: [...(store[tab] as T[]), ...records],
  };
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
          }),
        );
  }
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
  return {
    name: child.fullName,
    program: child.program,
    status: child.status,
    dob: child.dateOfBirth,
  };
}

export function formatGuardianRow(guardian: GuardianRecord) {
  return {
    name: guardian.guardianName,
    email: guardian.email,
    phone: guardian.phone,
    linkedChildren: guardian.linkedChildren,
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
