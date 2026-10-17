import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, MoreHorizontal, Plus, Search } from "lucide-react";
import { Reveal } from "@/components/motion";
import { PageLabel } from "@/components/page-label";
import { SheetsImportButton, SheetsImportDialog } from "@/components/community/sheets-import-dialog";
import { WASH_BUTTON_CLASS } from "@/lib/wash-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateMenus } from "@/components/community/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_INPUT_CLASS } from "@/components/community/filter-control-styles";
import { formatUsPhone } from "@/lib/phone";
import {
  type ChildRecord,
  type CommunityStore,
  type CommunityTab,
  type GuardianRecord,
  type PartnerRecord,
  type VolunteerRecord,
  appendRecordsForTab,
  COMMUNITY_UPDATED_EVENT,
  deleteCommunityRecord,
  filterRecords,
  formatChildRow,
  formatDob,
  formatGuardianRow,
  formatPartnerRow,
  formatVolunteerRow,
  loadCommunityStore,
  replaceRecord,
  todayAddedAt,
  toDateInputValue,
  saveChildWithGuardian,
  saveCommunityStore,
  saveEditedChild,
  updateGuardianRecord,
} from "@/lib/community";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { loadIntegrations } from "@/lib/integrations-config";
import { isAdmin } from "@/lib/user-role";

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
    columns: ["Status", "Name", "Program", "DOB", "Actions"],
    emptyState: "No children added yet. Start building the village.",
  },
  {
    key: "guardians",
    label: "Guardians",
    addLabel: "Add guardian",
    searchPlaceholder: "Search guardians...",
    columns: ["Status", "Name", "Email", "Phone", "Linked Children", "Actions"],
    emptyState: "No guardians added yet.",
  },
  {
    key: "volunteers",
    label: "Volunteers",
    addLabel: "Add volunteer",
    searchPlaceholder: "Search volunteers...",
    columns: ["Status", "Name", "Email", "Phone", "Skills", "Actions"],
    emptyState: "No volunteers yet. Share your /join link to get started.",
  },
  {
    key: "partners",
    label: "Partners",
    addLabel: "Add partner",
    searchPlaceholder: "Search partners...",
    columns: ["Status", "Name", "Organization", "Email", "Partnership Type", "Actions"],
    emptyState: "No partners yet. Share your /partner link to grow the network.",
  },
];

type CommunityRecord = ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord;

function recordLabel(record: CommunityRecord) {
  if ("fullName" in record && "dateOfBirth" in record) return record.fullName;
  if ("guardianName" in record) return record.guardianName;
  if ("fullName" in record) return record.fullName;
  return record.organizationName;
}

function RecordMenu({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${label}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 hover:bg-black/5 hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="moss-dialog min-w-36">
        <DropdownMenuItem className="font-normal" onSelect={onEdit}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="font-normal text-[#C53D3D] focus:text-[#C53D3D]" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const nameCell = "whitespace-nowrap px-5 py-3.5 text-sm font-normal text-foreground";
const metaCell = "whitespace-nowrap px-5 py-3.5 text-sm font-light text-foreground/50";
const statusCell = "whitespace-nowrap px-5 py-3.5 text-sm";

const TYPE_DOT: Record<string, string> = {
  "Full-Time": "bg-[#3AB819]",
  "Drop-In": "bg-[#E0B15A]",
  Event: "bg-[#6E93B8]",
  Community: "bg-[#3AB819]",
  Corporate: "bg-[#020202]",
  Media: "bg-[#D4896A]",
  Other: "bg-foreground/35",
};

function StatusMark({ value }: { value: string }) {
  const active = value === "Active";
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-normal",
        active ? "bg-[#3AB819]/15 text-[#1f6b12]" : "bg-black/[0.05] text-foreground/55",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function TypeMark({ value }: { value: string }) {
  if (!value || value === "—") return <span className="text-foreground/50">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm font-light text-foreground/70">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_DOT[value] ?? "bg-foreground/35")} />
      {value}
    </span>
  );
}

function MobileRecordCard({
  title,
  lines,
  menu,
}: {
  title: string;
  lines: { label: string; value: string }[];
  menu?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-normal text-foreground">{title}</p>
        {menu}
      </div>
      <dl className="mt-2 space-y-1">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center gap-2 text-xs font-light">
            <dt className="w-20 shrink-0 text-foreground/40">{line.label}</dt>
            <dd className="text-foreground/50">
              {line.label === "Status" ? (
                <StatusMark value={line.value} />
              ) : line.label === "Program" || line.label === "Type" ? (
                <TypeMark value={line.value} />
              ) : (
                line.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CommunityPage() {
  const [tab, setTab] = useState<TabKey>("children");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ mode: "add" } | { mode: "edit"; record: CommunityRecord } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityRecord | null>(null);
  const [admin, setAdmin] = useState(false);
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
  const columns = admin ? active.columns : active.columns.filter((column) => column !== "Actions");

  useEffect(() => {
    setStore(loadCommunityStore());
    setDefaultSpreadsheetId(loadIntegrations().google.spreadsheetId ?? "");
    setReady(true);

    void supabase.auth.getSession().then(({ data }) => {
      setAdmin(isAdmin(data.session?.user));
    });

    function refreshStore() {
      setStore(loadCommunityStore());
    }
    function onStorage(event: StorageEvent) {
      if (event.key === "fcw-community") refreshStore();
    }
    window.addEventListener(COMMUNITY_UPDATED_EVENT, refreshStore);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COMMUNITY_UPDATED_EVENT, refreshStore);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persist = useCallback((next: CommunityStore) => {
    saveCommunityStore(next);
    setStore(next);
  }, []);

  const filteredChildren = useMemo(
    () =>
      filterRecords(store.children, query, ["fullName", "program", "status", "guardianLink"]),
    [store.children, query],
  );
  const filteredGuardians = useMemo(
    () =>
      filterRecords(store.guardians, query, ["guardianName", "email", "phone", "linkedChildren", "status"]),
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

  function handleImport(records: CommunityRecord[]) {
    if (tab === "children") persist(appendRecordsForTab(store, tab, records as ChildRecord[]));
    else if (tab === "guardians") persist(appendRecordsForTab(store, tab, records as GuardianRecord[]));
    else if (tab === "volunteers") persist(appendRecordsForTab(store, tab, records as VolunteerRecord[]));
    else persist(appendRecordsForTab(store, tab, records as PartnerRecord[]));
  }

  function handleSaveRecord(record: CommunityRecord) {
    const next =
      editor?.mode === "edit" ? record : { ...record, addedAt: record.addedAt || todayAddedAt() };
    if (editor?.mode === "edit") {
      if (tab === "guardians" && "guardianName" in next) {
        persist(updateGuardianRecord(store, next));
        return;
      }
      if (tab === "volunteers" && "availability" in next) {
        persist({ ...store, volunteers: replaceRecord(store.volunteers, next) });
        return;
      }
      if (tab === "partners" && "organizationName" in next) {
        persist({ ...store, partners: replaceRecord(store.partners, next) });
        return;
      }
    }
    if (tab === "children" && "dateOfBirth" in next) persist(appendRecordsForTab(store, tab, [next]));
    else if (tab === "guardians" && "guardianName" in next) persist(appendRecordsForTab(store, tab, [next]));
    else if (tab === "volunteers" && "availability" in next) persist(appendRecordsForTab(store, tab, [next]));
    else if (tab === "partners" && "organizationName" in next) persist(appendRecordsForTab(store, tab, [next]));
  }

  function handleSaveChildEdit(
    child: ChildRecord,
    guardian:
      | { mode: "existing"; guardian: GuardianRecord }
      | { mode: "new"; guardian: GuardianRecord }
      | null,
  ) {
    persist(saveEditedChild(store, child, guardian));
  }

  function handleSaveChild(
    child: Omit<ChildRecord, "id">,
    guardian:
      | { mode: "existing"; guardianId: string }
      | { mode: "new"; guardian: Omit<GuardianRecord, "id" | "linkedChildren"> }
      | null,
  ) {
    const childRecord: ChildRecord = {
      id: crypto.randomUUID(),
      ...child,
      addedAt: todayAddedAt(),
    };

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
      addedAt: todayAddedAt(),
    };
    persist(saveChildWithGuardian(store, childRecord, newGuardian, true));
  }

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
            <div className="min-w-0">
              <PageLabel>Community</PageLabel>
              <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">The village directory</h1>
              <p className="mt-2 text-sm text-foreground/60">
                Children, guardians, volunteers, and partners — one tidy home.
              </p>
            </div>
            {admin ? (
              <div className="mt-1 flex shrink-0 items-center gap-2">
                <SheetsImportButton onClick={() => setSheetsImportOpen(true)} iconOnly />
                <button
                  type="button"
                  onClick={() => setEditor({ mode: "add" })}
                  aria-label={active.addLabel}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 ${WASH_BUTTON_CLASS}`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden min-[420px]:inline">{active.addLabel}</span>
                </button>
              </div>
            ) : null}
          </header>
        </Reveal>

        {/* Search, actions, and tabs */}
        <Reveal delayMs={60} className="mb-5 flex flex-col gap-3">
          <div className="moss-card relative flex h-10 w-full min-w-0 items-center overflow-hidden rounded-full pl-9 pr-3 focus-within:ring-1 focus-within:ring-black/10">
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
            <div className="flex min-w-max gap-2 px-4 sm:px-0">
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
        </Reveal>

        {/* Records */}
        <Reveal delayMs={100}>
        <section className="moss-card min-w-0 overflow-hidden rounded-3xl">
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
                    menu={admin ? <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: child })} onDelete={() => setDeleteTarget(child)} /> : undefined}
                    lines={[
                      { label: "Status", value: row.status },
                      { label: "Program", value: row.program },
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
                    menu={admin ? <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: guardian })} onDelete={() => setDeleteTarget(guardian)} /> : undefined}
                    lines={[
                      { label: "Status", value: row.status },
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
                    menu={admin ? <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: volunteer })} onDelete={() => setDeleteTarget(volunteer)} /> : undefined}
                    lines={[
                      { label: "Status", value: row.status },
                      { label: "Email", value: row.email || "—" },
                      { label: "Phone", value: row.phone || "—" },
                      { label: "Skills", value: row.skills || "—" },
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
                    menu={admin ? <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: partner })} onDelete={() => setDeleteTarget(partner)} /> : undefined}
                    lines={[
                      { label: "Status", value: row.status },
                      { label: "Organization", value: row.organization },
                      { label: "Email", value: row.email || "—" },
                      { label: "Type", value: row.partnershipType },
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
                <tr className="border-b border-black/5 text-[11px] font-normal text-foreground/40">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className={
                        col === "Actions"
                          ? "whitespace-nowrap px-3 py-3 text-right font-normal"
                          : "whitespace-nowrap px-5 py-3 font-normal"
                      }
                    >
                      {col === "Actions" ? <span className="sr-only">Actions</span> : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-foreground/50">
                      Loading…
                    </td>
                  </tr>
                ) : tab === "children" && filteredChildren.length > 0 ? (
                  filteredChildren.map((child) => {
                    const row = formatChildRow(child);
                    return (
                      <tr key={child.id} className="border-b border-black/5 last:border-0">
                        <td className={statusCell}>
                          <StatusMark value={row.status} />
                        </td>
                        <td className={nameCell} title={row.name}>{row.name}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                          <TypeMark value={row.program} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm font-light tabular-nums text-foreground/50">{row.dob || "—"}</td>
                        {admin ? (
                          <td className="px-3 py-2 text-right">
                            <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: child })} onDelete={() => setDeleteTarget(child)} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                ) : tab === "guardians" && filteredGuardians.length > 0 ? (
                  filteredGuardians.map((guardian) => {
                    const row = formatGuardianRow(guardian);
                    return (
                      <tr key={guardian.id} className="border-b border-black/5 last:border-0">
                        <td className={statusCell}>
                          <StatusMark value={row.status} />
                        </td>
                        <td className={nameCell} title={row.name}>{row.name}</td>
                        <td className={metaCell} title={row.email}>{row.email || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm font-light text-foreground/50">{row.phone || "—"}</td>
                        <td className={metaCell} title={row.linkedChildren}>{row.linkedChildren || "—"}</td>
                        {admin ? (
                          <td className="px-3 py-2 text-right">
                            <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: guardian })} onDelete={() => setDeleteTarget(guardian)} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                ) : tab === "volunteers" && filteredVolunteers.length > 0 ? (
                  filteredVolunteers.map((volunteer) => {
                    const row = formatVolunteerRow(volunteer);
                    return (
                      <tr key={volunteer.id} className="border-b border-black/5 last:border-0">
                        <td className={statusCell}>
                          <StatusMark value={row.status} />
                        </td>
                        <td className={nameCell} title={row.name}>{row.name}</td>
                        <td className={metaCell} title={row.email}>{row.email || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm font-light text-foreground/50">{row.phone || "—"}</td>
                        <td className={metaCell} title={row.skills}>
                          <span className="block max-w-[9rem] truncate">{row.skills || "—"}</span>
                        </td>
                        {admin ? (
                          <td className="px-3 py-2 text-right">
                            <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: volunteer })} onDelete={() => setDeleteTarget(volunteer)} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                ) : tab === "partners" && filteredPartners.length > 0 ? (
                  filteredPartners.map((partner) => {
                    const row = formatPartnerRow(partner);
                    return (
                      <tr key={partner.id} className="border-b border-black/5 last:border-0">
                        <td className={statusCell}>
                          <StatusMark value={row.status} />
                        </td>
                        <td className={nameCell} title={row.name}>{row.name}</td>
                        <td className={metaCell} title={row.organization}>{row.organization}</td>
                        <td className={metaCell} title={row.email}>{row.email || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                          <TypeMark value={row.partnershipType} />
                        </td>
                        {admin ? (
                          <td className="px-3 py-2 text-right">
                            <RecordMenu label={row.name} onEdit={() => setEditor({ mode: "edit", record: partner })} onDelete={() => setDeleteTarget(partner)} />
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-foreground/50">
                      {active.emptyState}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </Reveal>
      </div>

      <SheetsImportDialog
        tab={tab}
        tabLabel={active.label}
        open={sheetsImportOpen}
        onOpenChange={setSheetsImportOpen}
        onImport={handleImport}
        defaultSpreadsheetId={defaultSpreadsheetId}
      />

      {editor ? (
        <AddRecordDialog
          key={editor.mode === "edit" ? editor.record.id : "new"}
          tab={active}
          guardians={store.guardians}
          childrenRecords={store.children}
          initial={editor.mode === "edit" ? editor.record : null}
          onClose={() => setEditor(null)}
          onSave={handleSaveRecord}
          onSaveChild={handleSaveChild}
          onSaveChildEdit={handleSaveChildEdit}
        />
      ) : null}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Delete {deleteTarget ? recordLabel(deleteTarget) : "this record"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record from the village directory. Linked names are updated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                persist(deleteCommunityRecord(store, tab, deleteTarget.id));
                setDeleteTarget(null);
              }}
              className="bg-[#C53D3D] text-white hover:bg-[#C53D3D]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function emptyGuardianFields() {
  return {
    guardianName: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    linkedChildren: "",
    status: "Active",
  };
}

function AddRecordDialog({
  tab,
  guardians,
  childrenRecords,
  initial,
  onClose,
  onSave,
  onSaveChild,
  onSaveChildEdit,
}: {
  tab: TabConfig;
  guardians: GuardianRecord[];
  childrenRecords: ChildRecord[];
  initial: CommunityRecord | null;
  onClose: () => void;
  onSave: (record: CommunityRecord) => void;
  onSaveChild: (
    child: Omit<ChildRecord, "id">,
    guardian:
      | { mode: "existing"; guardianId: string }
      | { mode: "new"; guardian: Omit<GuardianRecord, "id" | "linkedChildren"> }
      | null,
  ) => void;
  onSaveChildEdit: (
    child: ChildRecord,
    guardian:
      | { mode: "existing"; guardian: GuardianRecord }
      | { mode: "new"; guardian: GuardianRecord }
      | null,
  ) => void;
}) {
  const initialChild = initial && "dateOfBirth" in initial ? initial : null;
  const initialGuardian = initial && "guardianName" in initial ? initial : null;
  const initialVolunteer = initial && "availability" in initial ? initial : null;
  const initialPartner = initial && "organizationName" in initial ? initial : null;
  const linkedGuardian = initialChild
    ? guardians.find((guardian) => guardian.id === initialChild.guardianId) ?? null
    : null;

  const [childForm, setChildForm] = useState({
    fullName: initialChild?.fullName ?? "",
    dateOfBirth: toDateInputValue(initialChild?.dateOfBirth ?? ""),
    program: initialChild?.program || "Full-Time",
    status: initialChild?.status || "Active",
    enrollmentDate: toDateInputValue(initialChild?.enrollmentDate ?? ""),
    guardianId: initialChild?.guardianId ?? "",
    guardianLink: initialChild?.guardianLink ?? "",
    notes: initialChild?.notes ?? "",
  });
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">(
    guardians.length > 0 ? "existing" : "new",
  );
  const [selectedGuardianId, setSelectedGuardianId] = useState(linkedGuardian?.id ?? "");
  const [newGuardianForm, setNewGuardianForm] = useState({
    guardianName: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    status: "Active",
  });
  const [connectedGuardian, setConnectedGuardian] = useState(
    linkedGuardian ?? { id: "", ...emptyGuardianFields() },
  );
  const [guardianForm, setGuardianForm] = useState(
    initialGuardian ?? emptyGuardianFields(),
  );
  const [volunteerForm, setVolunteerForm] = useState(
    initialVolunteer ?? {
      fullName: "",
      email: "",
      phone: "",
      skills: "",
      availability: "",
      status: "Active",
      source: "Website form",
    },
  );
  const [partnerForm, setPartnerForm] = useState(
    initialPartner ?? {
      organizationName: "",
      contactName: "",
      email: "",
      phone: "",
      partnershipType: "Community",
      notes: "",
      status: "Active",
    },
  );

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

      if (initialChild) {
        const creating = connectedGuardian.id === "new" || !connectedGuardian.id;
        const guardianPayload = connectedGuardian.guardianName.trim()
          ? {
              mode: creating ? ("new" as const) : ("existing" as const),
              guardian: {
                ...connectedGuardian,
                id: creating ? crypto.randomUUID() : connectedGuardian.id,
                guardianName: connectedGuardian.guardianName.trim(),
                email: connectedGuardian.email.trim(),
                phone: connectedGuardian.phone.trim(),
                emergencyContactName: connectedGuardian.emergencyContactName.trim(),
                emergencyContactPhone: connectedGuardian.emergencyContactPhone.trim(),
                addedAt: creating ? todayAddedAt() : connectedGuardian.addedAt,
              },
            }
          : null;
        onSaveChildEdit(
          { id: initialChild.id, ...child, addedAt: initialChild.addedAt },
          guardianPayload,
        );
      } else if (guardianMode === "existing" && selectedGuardianId) {
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
            status: newGuardianForm.status || "Active",
          },
        });
      } else {
        onSaveChild(child, null);
      }
    } else if (tab.key === "guardians") {
      if (!guardianForm.guardianName.trim()) return;
      onSave({ id: initialGuardian?.id ?? id, ...guardianForm, guardianName: guardianForm.guardianName.trim() });
    } else if (tab.key === "volunteers") {
      if (!volunteerForm.fullName.trim()) return;
      onSave({ id: initialVolunteer?.id ?? id, ...volunteerForm, fullName: volunteerForm.fullName.trim() });
    } else {
      if (!partnerForm.organizationName.trim()) return;
      onSave({
        id: initialPartner?.id ?? id,
        ...partnerForm,
        organizationName: partnerForm.organizationName.trim(),
      });
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className="moss-dialog flex max-w-md flex-col gap-0 overflow-hidden p-0 shadow-none"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper], [data-slot=calendar]")) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper], [data-slot=calendar]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="shrink-0 px-5 pb-3 pr-12 pt-5 text-left">
          <DialogTitle className="text-lg font-normal">
            {initial ? tab.addLabel.replace(/^Add /, "Edit ") : tab.addLabel}
          </DialogTitle>
        </DialogHeader>

        <form id="community-add-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2" onSubmit={handleSubmit}>
          {tab.key === "children" && (
            <>
              <ChildrenFields values={childForm} onChange={setChildForm} />
              {initialChild ? (
                <ConnectedGuardianEditor
                  guardians={guardians}
                  childrenRecords={childrenRecords}
                  excludeChildId={initialChild.id}
                  value={connectedGuardian}
                  onChange={setConnectedGuardian}
                />
              ) : (
                <GuardianPicker
                  guardians={guardians}
                  mode={guardianMode}
                  onModeChange={setGuardianMode}
                  selectedGuardianId={selectedGuardianId}
                  onSelectGuardian={setSelectedGuardianId}
                  newGuardian={newGuardianForm}
                  onNewGuardianChange={setNewGuardianForm}
                />
              )}
            </>
          )}
          {tab.key === "guardians" && (
            <>
              <GuardianFields values={guardianForm} onChange={setGuardianForm} />
              {initialGuardian ? (
                <LinkedChildrenSummary
                  childrenRecords={childrenRecords.filter((child) => child.guardianId === initialGuardian.id)}
                />
              ) : null}
            </>
          )}
          {tab.key === "volunteers" && (
            <VolunteerFields values={volunteerForm} onChange={setVolunteerForm} />
          )}
          {tab.key === "partners" && (
            <PartnerFields values={partnerForm} onChange={setPartnerForm} />
          )}
        </form>

        <footer className="flex shrink-0 justify-end gap-2 px-5 py-4">
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
      </DialogContent>
    </Dialog>
  );
}

function ConnectedGuardianEditor({
  guardians,
  childrenRecords,
  excludeChildId,
  value,
  onChange,
}: {
  guardians: GuardianRecord[];
  childrenRecords: ChildRecord[];
  excludeChildId?: string;
  value: GuardianRecord;
  onChange: (next: GuardianRecord) => void;
}) {
  const linked = childrenRecords.filter(
    (child) => value.id && child.guardianId === value.id && child.id !== excludeChildId,
  );

  return (
    <div className="space-y-3 rounded-2xl border border-black/5 bg-[#FCFCFC] px-4 py-4">
      <span className="block text-xs font-light text-foreground/60">Connected guardian</span>
      <AppSelect
        value={value.id}
        onChange={(e) => {
          const nextId = e.target.value;
          if (nextId === "new") {
            onChange({ id: "new", ...emptyGuardianFields() });
            return;
          }
          if (!nextId) {
            onChange({ id: "", ...emptyGuardianFields() });
            return;
          }
          const found = guardians.find((guardian) => guardian.id === nextId);
          if (found) onChange(found);
        }}
      >
        <option value="">No guardian</option>
        {guardians.map((guardian) => (
          <option key={guardian.id} value={guardian.id}>
            {guardian.guardianName}
            {guardian.email ? ` · ${guardian.email}` : ""}
          </option>
        ))}
        <option value="new">Create a new guardian</option>
      </AppSelect>
      {value.id ? (
        <div className="space-y-3">
          <Field label="Guardian name">
            <input className={inputCls} value={value.guardianName} onChange={(e) => onChange({ ...value, guardianName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <PhoneInput value={value.phone} onChange={(phone) => onChange({ ...value, phone })} />
          </Field>
          <Field label="Emergency contact name">
            <input className={inputCls} value={value.emergencyContactName} onChange={(e) => onChange({ ...value, emergencyContactName: e.target.value })} />
          </Field>
          <Field label="Emergency contact phone">
            <PhoneInput
              value={value.emergencyContactPhone}
              onChange={(emergencyContactPhone) => onChange({ ...value, emergencyContactPhone })}
            />
          </Field>
          {linked.length > 0 ? (
            <p className="text-xs font-light text-foreground/50">
              Also linked to {linked.map((child) => child.fullName).join(", ")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm font-light text-foreground/50">This child is not linked to a guardian yet.</p>
      )}
    </div>
  );
}

function LinkedChildrenSummary({ childrenRecords }: { childrenRecords: ChildRecord[] }) {
  if (childrenRecords.length === 0) {
    return <p className="text-sm font-light text-foreground/50">No children linked yet.</p>;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-black/5 bg-[#FCFCFC] px-4 py-4">
      <span className="block text-xs font-light text-foreground/60">Linked children</span>
      {childrenRecords.map((child) => (
        <div key={child.id} className="rounded-xl bg-white px-3 py-2.5">
          <p className="text-sm font-normal">{child.fullName}</p>
          <p className="mt-0.5 text-xs font-light text-foreground/55">
            {[child.program, child.status, formatDob(child.dateOfBirth)].filter(Boolean).join(" · ")}
          </p>
        </div>
      ))}
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

function AppSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputCls, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
    </div>
  );
}

function localDateToIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isoToLocalDate(value: string) {
  const iso = toDateInputValue(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function PhoneInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="(000) 000-0000"
      className={inputCls}
      value={formatUsPhone(value)}
      onChange={(e) => onChange(formatUsPhone(e.target.value))}
    />
  );
}

function DateField({
  value,
  onChange,
  birth = false,
}: {
  value: string;
  onChange: (next: string) => void;
  birth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = isoToLocalDate(value);
  const now = new Date();
  const minYear = 1920;
  const maxYear = birth ? now.getFullYear() : now.getFullYear() + 2;
  const fallback = birth ? new Date(now.getFullYear() - 6, now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const [visible, setVisible] = useState(() => new Date((selected ?? fallback).getFullYear(), (selected ?? fallback).getMonth(), 1));

  useEffect(() => {
    if (!open) return;
    const selectedDate = isoToLocalDate(value);
    const today = new Date();
    const fallbackDate = birth
      ? new Date(today.getFullYear() - 6, today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const next = selectedDate ?? fallbackDate;
    setVisible(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [open, value, birth]);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(inputCls, "flex w-full items-center justify-between text-left")}
      >
        <span className={value ? "text-foreground" : "text-foreground/40"}>{value ? formatDob(value) : "MM/DD/YY"}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-foreground/45" />
      </button>
      {open ? (
        <div className="mt-2 w-full rounded-2xl border border-black/10 p-3">
          <DateMenus
            visible={visible}
            onVisibleChange={setVisible}
            selected={selected}
            minYear={minYear}
            maxYear={maxYear}
            disableAfter={birth ? now : undefined}
            onSelect={(date) => {
              onChange(localDateToIso(date));
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

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
        <DateField
          birth
          value={values.dateOfBirth}
          onChange={(dateOfBirth) => onChange({ ...values, dateOfBirth })}
        />
      </Field>
      <Field label="Program">
        <AppSelect value={values.program} onChange={(e) => onChange({ ...values, program: e.target.value })}>
          <option>Full-Time</option>
          <option>Drop-In</option>
          <option>Event</option>
        </AppSelect>
      </Field>
      <Field label="Status">
        <AppSelect value={values.status} onChange={(e) => onChange({ ...values, status: e.target.value })}>
          <option>Active</option>
          <option>Inactive</option>
          <option>Archived</option>
        </AppSelect>
      </Field>
      <Field label="Enrollment date">
        <DateField
          value={values.enrollmentDate}
          onChange={(enrollmentDate) => onChange({ ...values, enrollmentDate })}
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
          <AppSelect value={selectedGuardianId} onChange={(e) => onSelectGuardian(e.target.value)}>
            <option value="">Choose a guardian…</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.guardianName}
                {guardian.email ? ` · ${guardian.email}` : ""}
              </option>
            ))}
          </AppSelect>
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
            <PhoneInput
              value={newGuardian.phone}
              onChange={(phone) => onNewGuardianChange({ ...newGuardian, phone })}
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
      <Field label="Status">
        <AppSelect value={values.status || "Active"} onChange={(e) => onChange({ ...values, status: e.target.value })}>
          <option>Active</option>
          <option>Inactive</option>
        </AppSelect>
      </Field>
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
        <PhoneInput value={values.phone} onChange={(phone) => onChange({ ...values, phone })} />
      </Field>
      <Field label="Emergency contact name">
        <input
          className={inputCls}
          value={values.emergencyContactName}
          onChange={(e) => onChange({ ...values, emergencyContactName: e.target.value })}
        />
      </Field>
      <Field label="Emergency contact phone">
        <PhoneInput
          value={values.emergencyContactPhone}
          onChange={(emergencyContactPhone) => onChange({ ...values, emergencyContactPhone })}
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
        <PhoneInput value={values.phone} onChange={(phone) => onChange({ ...values, phone })} />
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
        <AppSelect value={values.status} onChange={(e) => onChange({ ...values, status: e.target.value })}>
          <option>Active</option>
          <option>Inactive</option>
        </AppSelect>
      </Field>
      <Field label="Source">
        <AppSelect value={values.source} onChange={(e) => onChange({ ...values, source: e.target.value })}>
          <option>Website form</option>
          <option>Referral</option>
          <option>FCW event</option>
        </AppSelect>
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
        <PhoneInput value={values.phone} onChange={(phone) => onChange({ ...values, phone })} />
      </Field>
      <Field label="Partnership type">
        <AppSelect
          value={values.partnershipType}
          onChange={(e) => onChange({ ...values, partnershipType: e.target.value })}
        >
          <option>Corporate</option>
          <option>Community</option>
          <option>Media</option>
          <option>Other</option>
        </AppSelect>
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
        <AppSelect value={values.status} onChange={(e) => onChange({ ...values, status: e.target.value })}>
          <option>Active</option>
          <option>Prospect</option>
          <option>Inactive</option>
        </AppSelect>
      </Field>
    </>
  );
}
