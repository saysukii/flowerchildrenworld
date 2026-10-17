import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Import, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CommunityTab,
  formatChildRow,
  formatGuardianRow,
  formatPartnerRow,
  formatVolunteerRow,
  parseCommunityCsv,
  rowsToRecords,
  type ChildRecord,
  type GuardianRecord,
  type PartnerRecord,
  type VolunteerRecord,
} from "@/lib/community";
import {
  fetchSpreadsheetTabs,
  fetchSpreadsheetValues,
  fetchUserSpreadsheets,
  readGoogleAccessToken,
  type GoogleSpreadsheet,
  sheetValuesToCsv,
} from "@/lib/google";
import { loadIntegrations, saveIntegrations } from "@/lib/integrations-config";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CommunityRecord = ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord;

type ImportPreview = {
  records: CommunityRecord[];
  unmappedHeaders: string[];
  skipped: number;
};

const PREVIEW_COLUMNS: Record<CommunityTab, string[]> = {
  children: ["Status", "Name", "Program", "DOB"],
  guardians: ["Status", "Name", "Email", "Phone", "Linked Children"],
  volunteers: ["Status", "Name", "Email", "Phone", "Skills"],
  partners: ["Status", "Name", "Organization", "Email", "Partnership Type"],
};

const TYPE_DOT: Record<string, string> = {
  "Full-Time": "bg-[#3AB819]",
  "Drop-In": "bg-[#E0B15A]",
  Event: "bg-[#6E93B8]",
  Community: "bg-[#3AB819]",
  Corporate: "bg-[#020202]",
  Media: "bg-[#D4896A]",
  Other: "bg-foreground/35",
};

function friendlySheetError(message: string) {
  const text = message.trim();
  const lower = text.toLowerCase();
  if (lower.includes("connect google") || lower.includes("google access is not enabled")) {
    return "Connect Google in Settings, then try again.";
  }
  if (lower.includes("sheets.googleapis.com") || (lower.includes("sheets") && lower.includes("disabled"))) {
    return "Google Sheets is turned off for this project.";
  }
  if (lower.includes("drive.googleapis.com") || (lower.includes("drive api") && (lower.includes("disabled") || lower.includes("has not been used")))) {
    return "Google Drive is turned off for this project.";
  }
  if (lower.includes("insufficient") || lower.includes("permission denied")) {
    return "Reconnect Google in Settings so this sheet can be read.";
  }
  if (text.length > 160) return "That sheet could not be previewed.";
  return text;
}

function toastSheetError(message: string) {
  toast.error(friendlySheetError(message));
}

function readyLabel(count: number, tabLabel: string) {
  const plural = tabLabel.toLowerCase();
  const singular = plural === "children" ? "child" : plural.endsWith("s") ? plural.slice(0, -1) : plural;
  return `${count} ${count === 1 ? singular : plural} ready to import`;
}

type SheetsImportDialogProps = {
  tab: CommunityTab;
  tabLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (records: CommunityRecord[]) => void;
  defaultSpreadsheetId?: string;
};

function formatModifiedTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SheetsImportDialog({
  tab,
  tabLabel,
  open,
  onOpenChange,
  onImport,
  defaultSpreadsheetId = "",
}: SheetsImportDialogProps) {
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheet[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(defaultSpreadsheetId);
  const [sheetTab, setSheetTab] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const filteredSpreadsheets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spreadsheets;
    return spreadsheets.filter((sheet) => sheet.name.toLowerCase().includes(q));
  }, [spreadsheets, query]);

  const selectedSpreadsheet = useMemo(
    () => spreadsheets.find((sheet) => sheet.id === selectedId) ?? null,
    [spreadsheets, selectedId],
  );

  function reset() {
    setQuery("");
    setSelectedId("");
    setSheetTab("");
    setTabs([]);
    setPreview(null);
    setSpreadsheets([]);
  }

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    const token = readGoogleAccessToken(error ? null : data.session?.provider_token);
    if (!token) {
      throw new Error("Google access is not enabled. Connect Google in Settings first.");
    }
    return token;
  }

  const loadTabsForSpreadsheet = useCallback(async (spreadsheetId: string) => {
    setLoadingTabs(true);
    setPreview(null);
    setTabs([]);
    setSheetTab("");
    try {
      const token = await getAccessToken();
      const sheetTabs = await fetchSpreadsheetTabs(spreadsheetId, token);
      if (sheetTabs.length === 0) {
        toastSheetError("No tabs found in that spreadsheet.");
        return;
      }
      setTabs(sheetTabs);
      setSheetTab(sheetTabs[0] ?? "");
    } catch (error) {
      toastSheetError(error instanceof Error ? error.message : "Could not load spreadsheet tabs.");
    } finally {
      setLoadingTabs(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setLoadingSpreadsheets(true);
      setPreview(null);
      try {
        const token = await getAccessToken();
        const files = await fetchUserSpreadsheets(token);
        if (cancelled) return;
        setSpreadsheets(files);

        const preferredId =
          defaultSpreadsheetId && files.some((file) => file.id === defaultSpreadsheetId)
            ? defaultSpreadsheetId
            : files[0]?.id ?? "";
        setSelectedId(preferredId);
        if (preferredId) void loadTabsForSpreadsheet(preferredId);
      } catch (error) {
        if (!cancelled) {
          toastSheetError(error instanceof Error ? error.message : "Could not load your spreadsheets.");
        }
      } finally {
        if (!cancelled) setLoadingSpreadsheets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, defaultSpreadsheetId, loadTabsForSpreadsheet]);

  function selectSpreadsheet(spreadsheetId: string) {
    setSelectedId(spreadsheetId);
    setPreview(null);

    const integrations = loadIntegrations();
    saveIntegrations({
      ...integrations,
      google: { ...integrations.google, spreadsheetId },
    });

    void loadTabsForSpreadsheet(spreadsheetId);
  }

  async function handlePreview() {
    if (!selectedId || !sheetTab) {
      toastSheetError("Choose a spreadsheet and tab first.");
      return;
    }

    setPreviewing(true);
    setPreview(null);
    try {
      const token = await getAccessToken();
      const values = await fetchSpreadsheetValues(
        selectedId,
        `'${sheetTab.replace(/'/g, "''")}'`,
        token,
      );
      if (values.length === 0) {
        toastSheetError("That tab is empty.");
        return;
      }
      const csv = sheetValuesToCsv(values);
      const result = parseCommunityCsv(tab, csv);
      if (result.errors.length > 0) {
        toastSheetError(result.errors[0] ?? "That sheet could not be previewed.");
        return;
      }
      const records = rowsToRecords(tab, result.rows);
      if (records.length === 0) {
        toastSheetError(`No ${tabLabel.toLowerCase()} in that tab could be imported.`);
        return;
      }
      setPreview({
        records,
        unmappedHeaders: result.unmappedHeaders,
        skipped: result.rows.length - records.length,
      });
    } catch (error) {
      toastSheetError(error instanceof Error ? error.message : "Could not read that sheet.");
    } finally {
      setPreviewing(false);
    }
  }

  function handleImport() {
    if (!preview || preview.records.length === 0) return;
    onImport(preview.records);
    toast.success(`Imported ${preview.records.length} ${tabLabel.toLowerCase()} record${preview.records.length === 1 ? "" : "s"}.`);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(event) => {
          if (preview) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (preview) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (preview) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (preview) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-normal">Import from Google Sheets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-foreground/60 leading-relaxed">
            Pick a spreadsheet from your Google account. Column headers should match the portal
            fields — same as CSV import.
          </p>

          <div className="space-y-2">
            <Label htmlFor="sheet-search">Your spreadsheets</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                id="sheet-search"
                placeholder="Search spreadsheets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                disabled={loadingSpreadsheets}
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-2xl border border-black/5 bg-[#FCFCFC]">
            {loadingSpreadsheets ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-foreground/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your spreadsheets…
              </div>
            ) : filteredSpreadsheets.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-foreground/50">
                {spreadsheets.length === 0
                  ? "No spreadsheets found in your Google account."
                  : "No spreadsheets match your search."}
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {filteredSpreadsheets.map((sheet) => {
                  const active = sheet.id === selectedId;
                  return (
                    <li key={sheet.id}>
                      <button
                        type="button"
                        onClick={() => selectSpreadsheet(sheet.id)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white",
                          active && "bg-white",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-light text-foreground">{sheet.name}</p>
                          <p className="text-xs text-foreground/45">
                            Updated {formatModifiedTime(sheet.modifiedTime)}
                          </p>
                        </div>
                        {active ? (
                          <span
                            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-light"
                            style={{ background: "rgba(58,184,25,0.12)", color: "#3AB819" }}
                          >
                            Selected
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedSpreadsheet && (
            <p className="text-xs text-foreground/50">
              Selected: <span className="text-foreground/70">{selectedSpreadsheet.name}</span>
            </p>
          )}

          {loadingTabs ? (
            <div className="flex items-center gap-2 text-sm text-foreground/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tabs…
            </div>
          ) : tabs.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="sheet-tab">Sheet tab</Label>
              <div className="relative">
                <select
                  id="sheet-tab"
                  value={sheetTab}
                  onChange={(e) => {
                    setSheetTab(e.target.value);
                    setPreview(null);
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-black/10 bg-white pl-4 pr-12 text-sm font-light focus:border-foreground/30 focus:outline-none"
                >
                  {tabs.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={previewing || !selectedId || !sheetTab || loadingTabs}
            onClick={() => void handlePreview()}
            className="text-white hover:opacity-90"
            style={{ background: "#3AB819" }}
          >
            {previewing ? <Loader2 className="size-4 animate-spin" /> : "Preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <Dialog open={Boolean(preview)} onOpenChange={(next) => { if (!next) setPreview(null); }}>
        <DialogContent overlayClassName="z-[70]" className="z-[70] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-normal">Preview</DialogTitle>
          </DialogHeader>
          {preview ? <ImportPreviewTable tab={tab} tabLabel={tabLabel} preview={preview} /> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={!preview || preview.records.length === 0}
              onClick={handleImport}
              className="text-white hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function StatusPill({ value }: { value: string }) {
  const active = value === "Active";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-normal",
        active ? "bg-[#3AB819]/15 text-[#1f6b12]" : "bg-black/[0.05] text-foreground/55",
      )}
    >
      {value || "—"}
    </span>
  );
}

function TypeDot({ value }: { value: string }) {
  if (!value) return <span className="text-foreground/40">—</span>;
  return (
    <span className="inline-flex items-center gap-2 font-light text-foreground/70">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_DOT[value] ?? "bg-foreground/35")} />
      {value}
    </span>
  );
}

function previewCells(tab: CommunityTab, record: CommunityRecord) {
  if (tab === "children" && "dateOfBirth" in record) {
    const row = formatChildRow(record);
    return {
      status: row.status,
      cells: [
        row.name,
        <TypeDot key="program" value={row.program} />,
        row.dob || "—",
      ],
    };
  }
  if (tab === "guardians" && "guardianName" in record) {
    const row = formatGuardianRow(record);
    return {
      status: row.status,
      cells: [row.name, row.email || "—", row.phone || "—", row.linkedChildren || "—"],
    };
  }
  if (tab === "volunteers" && "skills" in record) {
    const row = formatVolunteerRow(record);
    return {
      status: row.status,
      cells: [row.name, row.email || "—", row.phone || "—", row.skills || "—"],
    };
  }
  if (tab === "partners" && "organizationName" in record) {
    const row = formatPartnerRow(record);
    return {
      status: row.status,
      cells: [
        row.name,
        row.organization || "—",
        row.email || "—",
        <TypeDot key="type" value={row.partnershipType} />,
      ],
    };
  }
  return { status: "", cells: [] as ReactNode[] };
}

function ImportPreviewTable({
  tab,
  tabLabel,
  preview,
}: {
  tab: CommunityTab;
  tabLabel: string;
  preview: ImportPreview;
}) {
  const columns = PREVIEW_COLUMNS[tab];
  const count = preview.records.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-[#FCFCFC]">
      <div className="border-b border-black/5 px-4 py-3">
        <p className="text-sm font-normal">{readyLabel(count, tabLabel)}</p>
      </div>
      <div className="max-h-[min(50dvh,420px)] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-[11px] font-normal text-foreground/40">
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-2.5 font-normal">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.records.map((record) => {
              const row = previewCells(tab, record);
              return (
                <tr key={record.id} className="border-b border-black/5 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StatusPill value={row.status} />
                  </td>
                  {row.cells.map((cell, index) => (
                    <td
                      key={columns[index + 1] ?? index}
                      className={cn(
                        "max-w-[12rem] truncate whitespace-nowrap px-4 py-2.5",
                        index === 0 ? "font-normal text-foreground" : "font-light text-foreground/70",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {preview.unmappedHeaders.length > 0 || preview.skipped > 0 ? (
        <div className="space-y-1 border-t border-black/5 px-4 py-3 text-xs text-foreground/50">
          {preview.skipped > 0 ? (
            <p>
              {preview.skipped} row{preview.skipped === 1 ? "" : "s"} left out because a name was missing.
            </p>
          ) : null}
          {preview.unmappedHeaders.length > 0 ? (
            <p>Columns left out: {preview.unmappedHeaders.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SheetsImportButton({
  onClick,
  className,
  iconOnly = false,
}: {
  onClick: () => void;
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Import from Sheets"
      className={`moss-card inline-flex shrink-0 items-center justify-center text-foreground transition-colors hover:bg-white/70 ${iconOnly ? "h-[42px] w-[42px] rounded-full" : "h-9 min-w-0 rounded-full px-4 text-sm font-normal"} ${className ?? ""}`}
    >
      <Import className="h-4 w-4 shrink-0" />
      {!iconOnly && <span className="truncate">Import from Sheets</span>}
    </button>
  );
}
