import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, ChevronDown, X, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CsvImportDialog } from "@/components/community/csv-import-dialog";
import { SheetsImportButton, SheetsImportDialog } from "@/components/community/sheets-import-dialog";
import {
  type ChildRecord,
  type CommunityStore,
  type CommunityTab,
  type GuardianRecord,
  type PartnerRecord,
  type VolunteerRecord,
  appendRecordsForTab,
  filterRecords,
  formatChildRow,
  formatGuardianRow,
  formatPartnerRow,
  formatVolunteerRow,
  loadCommunityStore,
  saveCommunityStore,
} from "@/lib/community";
import { loadIntegrations } from "@/lib/integrations-config";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — Flower Children World" },
      { name: "description", content: "The village directory: children, guardians, volunteers, and partners." },
    ],
  }),
  component: CommunityPage,
});

type TabKey = CommunityTab;

type TabConfig = {
  key: TabKey;
  label: string;
  addLabel: string;
  searchPlaceholder: string;
  columns: string[];
  emptyState: string;
};

const TABS: TabConfig[] = [
  {
    key: "children",
    label: "Children",
    addLabel: "Add child",
    searchPlaceholder: "Search children...",
    columns: ["Name", "Program", "Status", "DOB", "Actions"],
    emptyState: "No children added yet. Start building the village.",
  },
  {
    key: "guardians",
    label: "Guardians",
    addLabel: "Add guardian",
    searchPlaceholder: "Search guardians...",
    columns: ["Name", "Email", "Phone", "Linked Children", "Actions"],
    emptyState: "No guardians added yet.",
  },
  {
    key: "volunteers",
    label: "Volunteers",
    addLabel: "Add volunteer",
    searchPlaceholder: "Search volunteers...",
    columns: ["Name", "Email", "Phone", "Skills", "Status", "Actions"],
    emptyState: "No volunteers yet. Share your /join link to get started.",
  },
  {
    key: "partners",
    label: "Partners",
    addLabel: "Add partner",
    searchPlaceholder: "Search partners...",
    columns: ["Name", "Organization", "Email", "Partnership Type", "Status", "Actions"],
    emptyState: "No partners yet. Share your /partner link to grow the network.",
  },
];

function CommunityPage() {
  const [tab, setTab] = useState<TabKey>("children");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sheetsImportOpen, setSheetsImportOpen] = useState(false);
  const [defaultSpreadsheetId, setDefaultSpreadsheetId] = useState("");
  const [store, setStore] = useState<CommunityStore>({
    children: [],
    guardians: [],
    volunteers: [],
    partners: [],
  });
  const [ready, setReady] = useState(false);
  const active = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);

  useEffect(() => {
    setStore(loadCommunityStore());
    setDefaultSpreadsheetId(loadIntegrations().google.spreadsheetId ?? "");
    setReady(true);
  }, []);

  const persist = useCallback((next: CommunityStore) => {
    setStore(next);
    saveCommunityStore(next);
  }, []);

  const filteredChildren = useMemo(
    () =>
      filterRecords(store.children, query, ["fullName", "program", "status", "guardianLink"]),
    [store.children, query],
  );
  const filteredGuardians = useMemo(
    () =>
      filterRecords(store.guardians, query, ["guardianName", "email", "phone", "linkedChildren"]),
    [store.guardians, query],
  );
  const filteredVolunteers = useMemo(
    () =>
      filterRecords(store.volunteers, query, ["fullName", "email", "phone", "skills", "status"]),
    [store.volunteers, query],
  );
  const filteredPartners = useMemo(
    () =>
      filterRecords(store.partners, query, [
        "organizationName",
        "contactName",
        "email",
        "partnershipType",
        "status",
      ]),
    [store.partners, query],
  );

  function handleImport(records: ChildRecord[] | GuardianRecord[] | VolunteerRecord[] | PartnerRecord[]) {
    persist(appendRecordsForTab(store, tab, records));
  }

  function handleSaveRecord(record: ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord) {
    persist(appendRecordsForTab(store, tab, [record]));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <span className="font-label text-[11px] text-foreground/50">Community</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">The village directory</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Children, guardians, volunteers, and partners — one tidy home.
          </p>
        </header>

        {/* Tabs */}
        <div className="-mx-4 sm:mx-0 mb-5 overflow-x-auto">
          <div className="flex gap-2 px-4 sm:px-0 min-w-max">
            {TABS.map((t) => {
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-light transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:bg-black/5",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls row */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={active.searchPlaceholder}
                className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-between gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-light text-foreground/80 hover:bg-black/5 sm:w-auto"
            >
              All statuses
              <ChevronDown className="h-4 w-4 text-foreground/50" />
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <SheetsImportButton onClick={() => setSheetsImportOpen(true)} />
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-light text-foreground/80 transition-colors hover:bg-black/5"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              <Plus className="h-4 w-4" />
              {active.addLabel}
            </button>
          </div>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs font-light uppercase tracking-wider text-foreground/50">
                  {active.columns.map((col) => (
                    <th key={col} className="px-5 py-3 font-light">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <tr>
                    <td colSpan={active.columns.length} className="px-5 py-16 text-center text-sm text-foreground/50">
                      Loading…
                    </td>
                  </tr>
                ) : tab === "children" && filteredChildren.length > 0 ? (
                  filteredChildren.map((child) => {
                    const row = formatChildRow(child);
                    return (
                      <tr key={child.id} className="border-b border-black/5 last:border-0">
                        <td className="px-5 py-4 font-light">{row.name}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.program}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.status}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.dob || "—"}</td>
                        <td className="px-5 py-4" />
                      </tr>
                    );
                  })
                ) : tab === "guardians" && filteredGuardians.length > 0 ? (
                  filteredGuardians.map((guardian) => {
                    const row = formatGuardianRow(guardian);
                    return (
                      <tr key={guardian.id} className="border-b border-black/5 last:border-0">
                        <td className="px-5 py-4 font-light">{row.name}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.email || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.phone || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.linkedChildren || "—"}</td>
                        <td className="px-5 py-4" />
                      </tr>
                    );
                  })
                ) : tab === "volunteers" && filteredVolunteers.length > 0 ? (
                  filteredVolunteers.map((volunteer) => {
                    const row = formatVolunteerRow(volunteer);
                    return (
                      <tr key={volunteer.id} className="border-b border-black/5 last:border-0">
                        <td className="px-5 py-4 font-light">{row.name}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.email || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.phone || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.skills || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.status}</td>
                        <td className="px-5 py-4" />
                      </tr>
                    );
                  })
                ) : tab === "partners" && filteredPartners.length > 0 ? (
                  filteredPartners.map((partner) => {
                    const row = formatPartnerRow(partner);
                    return (
                      <tr key={partner.id} className="border-b border-black/5 last:border-0">
                        <td className="px-5 py-4 font-light">{row.name}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.organization}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.email || "—"}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.partnershipType}</td>
                        <td className="px-5 py-4 font-light text-foreground/70">{row.status}</td>
                        <td className="px-5 py-4" />
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={active.columns.length} className="px-5 py-16 text-center text-sm text-foreground/50">
                      {active.emptyState}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <CsvImportDialog
        tab={tab}
        tabLabel={active.label}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />

      <SheetsImportDialog
        tab={tab}
        tabLabel={active.label}
        open={sheetsImportOpen}
        onOpenChange={setSheetsImportOpen}
        onImport={handleImport}
        defaultSpreadsheetId={defaultSpreadsheetId}
      />

      {addOpen && (
        <AddRecordDrawer tab={active} onClose={() => setAddOpen(false)} onSave={handleSaveRecord} />
      )}
    </AppShell>
  );
}

function AddRecordDrawer({
  tab,
  onClose,
  onSave,
}: {
  tab: TabConfig;
  onClose: () => void;
  onSave: (record: ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord) => void;
}) {
  const [childForm, setChildForm] = useState({
    fullName: "",
    dateOfBirth: "",
    program: "Full-Time",
    status: "Active",
    enrollmentDate: "",
    guardianLink: "",
    notes: "",
  });
  const [guardianForm, setGuardianForm] = useState({
    guardianName: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    linkedChildren: "",
  });
  const [volunteerForm, setVolunteerForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    skills: "",
    availability: "",
    status: "Active",
    source: "Website form",
  });
  const [partnerForm, setPartnerForm] = useState({
    organizationName: "",
    contactName: "",
    email: "",
    phone: "",
    partnershipType: "Community",
    notes: "",
    status: "Active",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = crypto.randomUUID();
    if (tab.key === "children") {
      if (!childForm.fullName.trim()) return;
      onSave({ id, ...childForm, fullName: childForm.fullName.trim() });
    } else if (tab.key === "guardians") {
      if (!guardianForm.guardianName.trim()) return;
      onSave({ id, ...guardianForm, guardianName: guardianForm.guardianName.trim() });
    } else if (tab.key === "volunteers") {
      if (!volunteerForm.fullName.trim()) return;
      onSave({ id, ...volunteerForm, fullName: volunteerForm.fullName.trim() });
    } else {
      if (!partnerForm.organizationName.trim()) return;
      onSave({ id, ...partnerForm, organizationName: partnerForm.organizationName.trim() });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <h2 className="text-lg font-normal">{tab.addLabel}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-2 text-foreground/60 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form id="community-add-form" className="flex-1 overflow-y-auto px-6 py-5 space-y-4" onSubmit={handleSubmit}>
          {tab.key === "children" && (
            <ChildrenFields values={childForm} onChange={setChildForm} />
          )}
          {tab.key === "guardians" && (
            <GuardianFields values={guardianForm} onChange={setGuardianForm} />
          )}
          {tab.key === "volunteers" && (
            <VolunteerFields values={volunteerForm} onChange={setVolunteerForm} />
          )}
          {tab.key === "partners" && (
            <PartnerFields values={partnerForm} onChange={setPartnerForm} />
          )}
        </form>

        <footer className="flex justify-end gap-2 border-t border-black/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-light text-foreground/70 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="community-add-form"
            className="rounded-full px-4 py-2 text-sm font-normal text-white"
            style={{ background: "#3AB819" }}
          >
            Save
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-light text-foreground/60">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none";

function ChildrenFields({
  values,
  onChange,
}: {
  values: Omit<ChildRecord, "id">;
  onChange: (next: Omit<ChildRecord, "id">) => void;
}) {
  return (
    <>
      <Field label="Full name">
        <input
          className={inputCls}
          value={values.fullName}
          onChange={(e) => onChange({ ...values, fullName: e.target.value })}
        />
      </Field>
      <Field label="Date of birth">
        <input
          type="date"
          className={inputCls}
          value={values.dateOfBirth}
          onChange={(e) => onChange({ ...values, dateOfBirth: e.target.value })}
        />
      </Field>
      <Field label="Program">
        <select
          className={inputCls}
          value={values.program}
          onChange={(e) => onChange({ ...values, program: e.target.value })}
        >
          <option>Full-Time</option>
          <option>Drop-In</option>
          <option>Event</option>
        </select>
      </Field>
      <Field label="Status">
        <select
          className={inputCls}
          value={values.status}
          onChange={(e) => onChange({ ...values, status: e.target.value })}
        >
          <option>Active</option>
          <option>Inactive</option>
          <option>Archived</option>
        </select>
      </Field>
      <Field label="Enrollment date">
        <input
          type="date"
          className={inputCls}
          value={values.enrollmentDate}
          onChange={(e) => onChange({ ...values, enrollmentDate: e.target.value })}
        />
      </Field>
      <Field label="Guardian link">
        <input
          className={inputCls}
          value={values.guardianLink}
          onChange={(e) => onChange({ ...values, guardianLink: e.target.value })}
          placeholder="Guardian name"
        />
      </Field>
      <Field label="Notes">
        <textarea
          rows={3}
          className={inputCls}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
        />
      </Field>
    </>
  );
}

function GuardianFields({
  values,
  onChange,
}: {
  values: Omit<GuardianRecord, "id">;
  onChange: (next: Omit<GuardianRecord, "id">) => void;
}) {
  return (
    <>
      <Field label="Guardian name">
        <input
          className={inputCls}
          value={values.guardianName}
          onChange={(e) => onChange({ ...values, guardianName: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className={inputCls}
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          className={inputCls}
          value={values.phone}
          onChange={(e) => onChange({ ...values, phone: e.target.value })}
        />
      </Field>
      <Field label="Emergency contact name">
        <input
          className={inputCls}
          value={values.emergencyContactName}
          onChange={(e) => onChange({ ...values, emergencyContactName: e.target.value })}
        />
      </Field>
      <Field label="Emergency contact phone">
        <input
          type="tel"
          className={inputCls}
          value={values.emergencyContactPhone}
          onChange={(e) => onChange({ ...values, emergencyContactPhone: e.target.value })}
        />
      </Field>
      <Field label="Linked children">
        <input
          className={inputCls}
          value={values.linkedChildren}
          onChange={(e) => onChange({ ...values, linkedChildren: e.target.value })}
          placeholder="Comma-separated child names"
        />
      </Field>
    </>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function VolunteerFields({
  values,
  onChange,
}: {
  values: Omit<VolunteerRecord, "id">;
  onChange: (next: Omit<VolunteerRecord, "id">) => void;
}) {
  const selectedDays = new Set(
    values.availability
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  );

  function toggleDay(day: string) {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange({ ...values, availability: DAYS.filter((d) => next.has(d)).join(", ") });
  }

  return (
    <>
      <Field label="Full name">
        <input
          className={inputCls}
          value={values.fullName}
          onChange={(e) => onChange({ ...values, fullName: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className={inputCls}
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          className={inputCls}
          value={values.phone}
          onChange={(e) => onChange({ ...values, phone: e.target.value })}
        />
      </Field>
      <Field label="Skills / interests">
        <textarea
          rows={3}
          className={inputCls}
          value={values.skills}
          onChange={(e) => onChange({ ...values, skills: e.target.value })}
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-xs font-light text-foreground/60">Availability</span>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-light cursor-pointer hover:bg-black/5"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[#3AB819]"
                checked={selectedDays.has(d)}
                onChange={() => toggleDay(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </div>
      <Field label="Status">
        <select
          className={inputCls}
          value={values.status}
          onChange={(e) => onChange({ ...values, status: e.target.value })}
        >
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </Field>
      <Field label="Source">
        <select
          className={inputCls}
          value={values.source}
          onChange={(e) => onChange({ ...values, source: e.target.value })}
        >
          <option>Website form</option>
          <option>Referral</option>
          <option>FCW event</option>
        </select>
      </Field>
    </>
  );
}

function PartnerFields({
  values,
  onChange,
}: {
  values: Omit<PartnerRecord, "id">;
  onChange: (next: Omit<PartnerRecord, "id">) => void;
}) {
  return (
    <>
      <Field label="Organization name">
        <input
          className={inputCls}
          value={values.organizationName}
          onChange={(e) => onChange({ ...values, organizationName: e.target.value })}
        />
      </Field>
      <Field label="Contact name">
        <input
          className={inputCls}
          value={values.contactName}
          onChange={(e) => onChange({ ...values, contactName: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className={inputCls}
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          className={inputCls}
          value={values.phone}
          onChange={(e) => onChange({ ...values, phone: e.target.value })}
        />
      </Field>
      <Field label="Partnership type">
        <select
          className={inputCls}
          value={values.partnershipType}
          onChange={(e) => onChange({ ...values, partnershipType: e.target.value })}
        >
          <option>Corporate</option>
          <option>Community</option>
          <option>Media</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          rows={3}
          className={inputCls}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
        />
      </Field>
      <Field label="Status">
        <select
          className={inputCls}
          value={values.status}
          onChange={(e) => onChange({ ...values, status: e.target.value })}
        >
          <option>Active</option>
          <option>Prospect</option>
          <option>Inactive</option>
        </select>
      </Field>
    </>
  );
}
