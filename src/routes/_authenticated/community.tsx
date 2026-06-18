import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ChevronDown, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — Flower Children World" },
      { name: "description", content: "The village directory: children, guardians, volunteers, and partners." },
    ],
  }),
  component: CommunityPage,
});

type TabKey = "children" | "guardians" | "volunteers" | "partners";

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
  const active = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);

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

          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            style={{ background: "#3AB819" }}
          >
            <Plus className="h-4 w-4" />
            {active.addLabel}
          </button>
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
                <tr>
                  <td colSpan={active.columns.length} className="px-5 py-16 text-center text-sm text-foreground/50">
                    {active.emptyState}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {addOpen && (
        <AddRecordDrawer tab={active} onClose={() => setAddOpen(false)} />
      )}
    </AppShell>
  );
}

function AddRecordDrawer({ tab, onClose }: { tab: TabConfig; onClose: () => void }) {
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

        <form
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {tab.key === "children" && <ChildrenFields />}
          {tab.key === "guardians" && <GuardianFields />}
          {tab.key === "volunteers" && <VolunteerFields />}
          {tab.key === "partners" && <PartnerFields />}
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
            onClick={onClose}
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

function ChildrenFields() {
  return (
    <>
      <Field label="Full name"><input className={inputCls} /></Field>
      <Field label="Date of birth"><input type="date" className={inputCls} /></Field>
      <Field label="Program">
        <select className={inputCls}>
          <option>Full-Time</option>
          <option>Drop-In</option>
          <option>Event</option>
        </select>
      </Field>
      <Field label="Status">
        <select className={inputCls}>
          <option>Active</option>
          <option>Inactive</option>
          <option>Archived</option>
        </select>
      </Field>
      <Field label="Enrollment date"><input type="date" className={inputCls} /></Field>
      <Field label="Guardian link">
        <select className={inputCls}>
          <option value="">— Select guardian —</option>
        </select>
      </Field>
      <Field label="Notes"><textarea rows={3} className={inputCls} /></Field>
    </>
  );
}

function GuardianFields() {
  return (
    <>
      <Field label="Guardian name"><input className={inputCls} /></Field>
      <Field label="Email"><input type="email" className={inputCls} /></Field>
      <Field label="Phone"><input type="tel" className={inputCls} /></Field>
      <Field label="Emergency contact name"><input className={inputCls} /></Field>
      <Field label="Emergency contact phone"><input type="tel" className={inputCls} /></Field>
      <Field label="Linked children">
        <select multiple className={inputCls + " h-28"}>
          <option disabled>No children yet</option>
        </select>
      </Field>
    </>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function VolunteerFields() {
  return (
    <>
      <Field label="Full name"><input className={inputCls} /></Field>
      <Field label="Email"><input type="email" className={inputCls} /></Field>
      <Field label="Phone"><input type="tel" className={inputCls} /></Field>
      <Field label="Skills / interests"><textarea rows={3} className={inputCls} /></Field>
      <div>
        <span className="mb-1.5 block text-xs font-light text-foreground/60">Availability</span>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label key={d} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-light cursor-pointer hover:bg-black/5">
              <input type="checkbox" className="h-3.5 w-3.5 accent-[#3AB819]" />
              {d}
            </label>
          ))}
        </div>
      </div>
      <Field label="Status">
        <select className={inputCls}>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </Field>
      <Field label="Source">
        <select className={inputCls}>
          <option>Website form</option>
          <option>Referral</option>
          <option>FCW event</option>
        </select>
      </Field>
    </>
  );
}

function PartnerFields() {
  return (
    <>
      <Field label="Organization name"><input className={inputCls} /></Field>
      <Field label="Contact name"><input className={inputCls} /></Field>
      <Field label="Email"><input type="email" className={inputCls} /></Field>
      <Field label="Phone"><input type="tel" className={inputCls} /></Field>
      <Field label="Partnership type">
        <select className={inputCls}>
          <option>Corporate</option>
          <option>Community</option>
          <option>Media</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label="Notes"><textarea rows={3} className={inputCls} /></Field>
      <Field label="Status">
        <select className={inputCls}>
          <option>Active</option>
          <option>Prospect</option>
          <option>Inactive</option>
        </select>
      </Field>
    </>
  );
}
