import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageLabel } from "@/components/page-label";
import { SheetsImportButton, SheetsImportDialog } from "@/components/community/sheets-import-dialog";
import {
  FILTER_CONTROL_CLASS,
  FILTER_INPUT_CLASS,
  COMMUNITY_PRIMARY_BUTTON_CLASS,
} from "@/components/community/filter-control-styles";
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
  saveChildWithGuardian,
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

function MobileRecordCard({
  title,
  lines,
}: {
  title: string;
  lines: { label: string; value: string }[];
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-sm font-normal">{title}</p>
      <dl className="mt-2 space-y-1">
        {lines.map((line) => (
          <div key={line.label} className="flex gap-2 text-xs font-light">
            <dt className="w-20 shrink-0 text-foreground/45">{line.label}</dt>
            <dd className="text-foreground/70">{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CommunityPage() {
  const [tab, setTab] = useState<TabKey>("children");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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

  function handleSaveChild(
    child: Omit<ChildRecord, "id">,
    guardian:
      | { mode: "existing"; guardianId: string }
      | { mode: "new"; guardian: Omit<GuardianRecord, "id" | "linkedChildren"> }
      | null,
  ) {
    const childRecord: ChildRecord = { id: crypto.randomUUID(), ...child };

    if (!guardian) {
      persist(appendRecordsForTab(store, "children", [childRecord]));
      return;
    }

    if (guardian.mode === "existing") {
      const existing = store.guardians.find((g) => g.id === guardian.guardianId);
      if (!existing) {
        persist(appendRecordsForTab(store, "children", [childRecord]));
        return;
      }
      persist(saveChildWithGuardian(store, childRecord, existing, false));
      return;
    }

    const newGuardian: GuardianRecord = {
      id: crypto.randomUUID(),
      ...guardian.guardian,
      linkedChildren: "",
    };
    persist(saveChildWithGuardian(store, childRecord, newGuardian, true));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <PageLabel>Community</PageLabel>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">The village directory</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Children, guardians, volunteers, and partners — one tidy home.
          </p>
        </header>

        {/* Search, actions, and tabs */}
        <div className="mb-5 flex flex-col gap-3">
          <div
            className={`relative overflow-hidden pl-9 pr-3 focus-within:border-foreground/30 ${FILTER_CONTROL_CLASS}`}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={active.searchPlaceholder}
              className={FILTER_INPUT_CLASS}
            />
          </div>

          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <div className="flex min-w-max items-center gap-2 px-4 sm:w-full sm:min-w-0 sm:px-0">
              <div className="flex gap-2">
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

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <SheetsImportButton
                  onClick={() => setSheetsImportOpen(true)}
                  iconOnly
                />

                <button
                  onClick={() => setAddOpen(true)}
                  aria-label={active.addLabel}
                  className={`${COMMUNITY_PRIMARY_BUTTON_CLASS} !w-[42px] !px-0 shrink-0`}
                  style={{ background: "#3AB819" }}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Records */}
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-white">
          <div className="md:hidden divide-y divide-black/5">
            {!ready ? (
              <p className="px-4 py-16 text-center text-sm text-foreground/50">Loading…</p>
            ) : tab === "children" && filteredChildren.length > 0 ? (
              filteredChildren.map((child) => {
                const row = formatChildRow(child);
                return (
                  <MobileRecordCard
                    key={child.id}
                    title={row.name}
                    lines={[
                      { label: "Program", value: row.program },
                      { label: "Status", value: row.status },
                      { label: "DOB", value: row.dob || "—" },
                    ]}
                  />
                );
              })
            ) : tab === "guardians" && filteredGuardians.length > 0 ? (
              filteredGuardians.map((guardian) => {
                const row = formatGuardianRow(guardian);
                return (
                  <MobileRecordCard
                    key={guardian.id}
                    title={row.name}
                    lines={[
                      { label: "Email", value: row.email || "—" },
                      { label: "Phone", value: row.phone || "—" },
                      { label: "Children", value: row.linkedChildren || "—" },
                    ]}
                  />
                );
              })
            ) : tab === "volunteers" && filteredVolunteers.length > 0 ? (
              filteredVolunteers.map((volunteer) => {
                const row = formatVolunteerRow(volunteer);
                return (
                  <MobileRecordCard
                    key={volunteer.id}
                    title={row.name}
                    lines={[
                      { label: "Email", value: row.email || "—" },
                      { label: "Phone", value: row.phone || "—" },
                      { label: "Skills", value: row.skills || "—" },
                      { label: "Status", value: row.status },
                    ]}
                  />
                );
              })
            ) : tab === "partners" && filteredPartners.length > 0 ? (
              filteredPartners.map((partner) => {
                const row = formatPartnerRow(partner);
                return (
                  <MobileRecordCard
                    key={partner.id}
                    title={row.name}
                    lines={[
                      { label: "Organization", value: row.organization },
                      { label: "Email", value: row.email || "—" },
                      { label: "Type", value: row.partnershipType },
                      { label: "Status", value: row.status },
                    ]}
                  />
                );
              })
            ) : (
              <p className="px-4 py-16 text-center text-sm text-foreground/50">{active.emptyState}</p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
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

      <SheetsImportDialog
        tab={tab}
        tabLabel={active.label}
        open={sheetsImportOpen}
        onOpenChange={setSheetsImportOpen}
        onImport={handleImport}
        defaultSpreadsheetId={defaultSpreadsheetId}
      />

      {addOpen && (
        <AddRecordDrawer
          tab={active}
          guardians={store.guardians}
          onClose={() => setAddOpen(false)}
          onSave={handleSaveRecord}
          onSaveChild={handleSaveChild}
        />
      )}
    </AppShell>
  );
}

function AddRecordDrawer({
  tab,
  guardians,
  onClose,
  onSave,
  onSaveChild,
}: {
  tab: TabConfig;
  guardians: GuardianRecord[];
  onClose: () => void;
  onSave: (record: ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord) => void;
  onSaveChild: (
    child: Omit<ChildRecord, "id">,
    guardian:
      | { mode: "existing"; guardianId: string }
      | { mode: "new"; guardian: Omit<GuardianRecord, "id" | "linkedChildren"> }
      | null,
  ) => void;
}) {
  const [childForm, setChildForm] = useState({
    fullName: "",
    dateOfBirth: "",
    program: "Full-Time",
    status: "Active",
    enrollmentDate: "",
    guardianId: "",
    guardianLink: "",
    notes: "",
  });
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">(
    guardians.length > 0 ? "existing" : "new",
  );
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [newGuardianForm, setNewGuardianForm] = useState({
    guardianName: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
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

      const child = {
        ...childForm,
        fullName: childForm.fullName.trim(),
        guardianId: "",
        guardianLink: "",
      };

      if (guardianMode === "existing" && selectedGuardianId) {
        onSaveChild(child, { mode: "existing", guardianId: selectedGuardianId });
      } else if (guardianMode === "new" && newGuardianForm.guardianName.trim()) {
        onSaveChild(child, {
          mode: "new",
          guardian: {
            guardianName: newGuardianForm.guardianName.trim(),
            email: newGuardianForm.email.trim(),
            phone: newGuardianForm.phone.trim(),
            emergencyContactName: newGuardianForm.emergencyContactName.trim(),
            emergencyContactPhone: newGuardianForm.emergencyContactPhone.trim(),
          },
        });
      } else {
        onSaveChild(child, null);
      }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative flex max-h-[100dvh] w-full flex-col rounded-t-3xl bg-background shadow-xl sm:ml-auto sm:h-full sm:max-w-md sm:rounded-none">
        <header className="flex items-center justify-between border-b border-black/5 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-normal">{tab.addLabel}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-2 text-foreground/60 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form id="community-add-form" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" onSubmit={handleSubmit}>
          {tab.key === "children" && (
            <>
              <ChildrenFields values={childForm} onChange={setChildForm} />
              <GuardianPicker
                guardians={guardians}
                mode={guardianMode}
                onModeChange={setGuardianMode}
                selectedGuardianId={selectedGuardianId}
                onSelectGuardian={setSelectedGuardianId}
                newGuardian={newGuardianForm}
                onNewGuardianChange={setNewGuardianForm}
              />
            </>
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

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-black/5 bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
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
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none md:py-2 md:text-sm";

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

function GuardianPicker({
  guardians,
  mode,
  onModeChange,
  selectedGuardianId,
  onSelectGuardian,
  newGuardian,
  onNewGuardianChange,
}: {
  guardians: GuardianRecord[];
  mode: "existing" | "new";
  onModeChange: (mode: "existing" | "new") => void;
  selectedGuardianId: string;
  onSelectGuardian: (id: string) => void;
  newGuardian: Omit<GuardianRecord, "id" | "linkedChildren">;
  onNewGuardianChange: (next: Omit<GuardianRecord, "id" | "linkedChildren">) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-black/5 bg-[#FCFCFC] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-light text-foreground/60">Guardian</span>
        <div className="flex gap-1 rounded-full bg-white p-1 border border-black/5">
          <button
            type="button"
            onClick={() => onModeChange("existing")}
            disabled={guardians.length === 0}
            className={[
              "rounded-full px-3 py-1 text-xs font-light transition-colors",
              mode === "existing" ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
              guardians.length === 0 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Select existing
          </button>
          <button
            type="button"
            onClick={() => onModeChange("new")}
            className={[
              "rounded-full px-3 py-1 text-xs font-light transition-colors",
              mode === "new" ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
            ].join(" ")}
          >
            Create new
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        guardians.length === 0 ? (
          <p className="text-sm font-light text-foreground/50">
            No guardians yet — switch to Create new.
          </p>
        ) : (
          <select
            className={inputCls}
            value={selectedGuardianId}
            onChange={(e) => onSelectGuardian(e.target.value)}
          >
            <option value="">Choose a guardian…</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.guardianName}
                {guardian.email ? ` · ${guardian.email}` : ""}
              </option>
            ))}
          </select>
        )
      ) : (
        <div className="space-y-3">
          <Field label="Guardian name">
            <input
              className={inputCls}
              value={newGuardian.guardianName}
              onChange={(e) => onNewGuardianChange({ ...newGuardian, guardianName: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={newGuardian.email}
              onChange={(e) => onNewGuardianChange({ ...newGuardian, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              className={inputCls}
              value={newGuardian.phone}
              onChange={(e) => onNewGuardianChange({ ...newGuardian, phone: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
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
