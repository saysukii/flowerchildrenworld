import { useCallback, useEffect, useMemo, useState } from "react";
import { Import, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { FILTER_CONTROL_CLASS } from "@/components/community/filter-control-styles";
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
  type GoogleSpreadsheet,
  sheetValuesToCsv,
} from "@/lib/google";
import { loadIntegrations, saveIntegrations } from "@/lib/integrations-config";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CommunityRecord = ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord;

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
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseCommunityCsv> | null>(null);

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
    if (error || !data.session?.provider_token) {
      throw new Error("Google access is not enabled. Connect Google in Settings first.");
    }
    return data.session.provider_token;
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
        toast.error("No tabs found in that spreadsheet.");
        return;
      }
      setTabs(sheetTabs);
      setSheetTab(sheetTabs[0] ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load spreadsheet tabs.");
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
          toast.error(error instanceof Error ? error.message : "Could not load your spreadsheets.");
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
      toast.error("Choose a spreadsheet and tab first.");
      return;
    }

    setImporting(true);
    setPreview(null);
    try {
      const token = await getAccessToken();
      const values = await fetchSpreadsheetValues(
        selectedId,
        `'${sheetTab.replace(/'/g, "''")}'`,
        token,
      );
      if (values.length === 0) {
        toast.error("That tab is empty.");
        return;
      }
      const csv = sheetValuesToCsv(values);
      const result = parseCommunityCsv(tab, csv);
      setPreview(result);
      if (result.errors.length > 0) toast.error(result.errors[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that sheet.");
    } finally {
      setImporting(false);
    }
  }

  function handleImport() {
    if (!preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    const records = rowsToRecords(tab, preview.rows);
    if (records.length === 0) {
      toast.error("No valid rows found to import.");
      return;
    }
    onImport(records);
    toast.success(`Imported ${records.length} ${tabLabel.toLowerCase()} record${records.length === 1 ? "" : "s"}.`);
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
      <DialogContent className="sm:max-w-lg">
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
              <select
                id="sheet-tab"
                value={sheetTab}
                onChange={(e) => {
                  setSheetTab(e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-light focus:border-foreground/30 focus:outline-none"
              >
                {tabs.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {preview && (
            <div className="space-y-3 rounded-2xl border border-black/5 bg-[#FCFCFC] px-4 py-4 text-sm">
              <p className="font-normal">
                {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} ready to import
              </p>
              {preview.unmappedHeaders.length > 0 && (
                <p className="text-foreground/60">
                  Unmapped columns (skipped): {preview.unmappedHeaders.join(", ")}
                </p>
              )}
              {preview.errors.length > 0 && (
                <p className="text-[#C53D3D]">{preview.errors.join(" ")}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview ? (
            <Button
              type="button"
              disabled={preview.errors.length > 0 || preview.rows.length === 0}
              onClick={handleImport}
              className="text-white hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              Import
            </Button>
          ) : (
            <Button
              type="button"
              disabled={importing || !selectedId || !sheetTab || loadingTabs}
              onClick={() => void handlePreview()}
              className="text-white hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              {importing ? <Loader2 className="size-4 animate-spin" /> : "Preview import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      className={`inline-flex min-w-0 justify-center gap-2 text-foreground/80 transition-colors hover:bg-black/5 ${FILTER_CONTROL_CLASS} ${iconOnly ? "!w-[42px] !px-0" : "px-4"} ${className ?? ""}`}
    >
      <Import className="h-4 w-4 shrink-0" />
      {!iconOnly && <span className="truncate">Import from Sheets</span>}
    </button>
  );
}
