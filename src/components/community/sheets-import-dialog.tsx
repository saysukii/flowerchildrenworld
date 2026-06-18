import { useEffect, useState } from "react";
import { Loader2, Sheet } from "lucide-react";
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
  parseSpreadsheetId,
  sheetValuesToCsv,
} from "@/lib/google";
import { supabase } from "@/integrations/supabase/client";

type CommunityRecord = ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord;

type SheetsImportDialogProps = {
  tab: CommunityTab;
  tabLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (records: CommunityRecord[]) => void;
  defaultSpreadsheetId?: string;
};

export function SheetsImportDialog({
  tab,
  tabLabel,
  open,
  onOpenChange,
  onImport,
  defaultSpreadsheetId = "",
}: SheetsImportDialogProps) {
  const [spreadsheetInput, setSpreadsheetInput] = useState(defaultSpreadsheetId);
  const [sheetTab, setSheetTab] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseCommunityCsv> | null>(null);

  useEffect(() => {
    if (open && defaultSpreadsheetId) setSpreadsheetInput(defaultSpreadsheetId);
  }, [open, defaultSpreadsheetId]);

  function reset() {
    setSheetTab("");
    setTabs([]);
    setPreview(null);
  }

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.provider_token) {
      throw new Error("Google Sheets access is not enabled. Connect Google in Settings first.");
    }
    return data.session.provider_token;
  }

  async function loadTabs() {
    const spreadsheetId = parseSpreadsheetId(spreadsheetInput);
    if (!spreadsheetId) {
      toast.error("Paste a valid Google Sheets link or spreadsheet ID.");
      return;
    }

    setLoadingTabs(true);
    setPreview(null);
    try {
      const token = await getAccessToken();
      const sheetTabs = await fetchSpreadsheetTabs(spreadsheetId, token);
      if (sheetTabs.length === 0) {
        toast.error("No tabs found in that spreadsheet.");
        setTabs([]);
        setSheetTab("");
        return;
      }
      setTabs(sheetTabs);
      setSheetTab(sheetTabs[0] ?? "");
      toast.success(`Found ${sheetTabs.length} tab${sheetTabs.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load spreadsheet.");
      setTabs([]);
      setSheetTab("");
    } finally {
      setLoadingTabs(false);
    }
  }

  async function handlePreview() {
    const spreadsheetId = parseSpreadsheetId(spreadsheetInput);
    if (!spreadsheetId || !sheetTab) {
      toast.error("Choose a spreadsheet and tab first.");
      return;
    }

    setImporting(true);
    setPreview(null);
    try {
      const token = await getAccessToken();
      const values = await fetchSpreadsheetValues(
        spreadsheetId,
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
          <DialogTitle className="font-normal">Import from Google Sheets — {tabLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-foreground/60 leading-relaxed">
            Paste your spreadsheet link. Column headers should match the portal fields — same as CSV
            import.
          </p>

          <div className="space-y-2">
            <Label htmlFor="sheet-url">Spreadsheet link</Label>
            <Input
              id="sheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={spreadsheetInput}
              onChange={(e) => {
                setSpreadsheetInput(e.target.value);
                setTabs([]);
                setSheetTab("");
                setPreview(null);
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loadingTabs || !spreadsheetInput.trim()}
            onClick={() => void loadTabs()}
            className="rounded-full"
          >
            {loadingTabs ? <Loader2 className="size-4 animate-spin" /> : "Load tabs"}
          </Button>

          {tabs.length > 0 && (
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
          )}

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
              disabled={importing || !sheetTab}
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

export function SheetsImportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-light text-foreground/80 transition-colors hover:bg-black/5"
    >
      <Sheet className="h-4 w-4" />
      Import from Sheets
    </button>
  );
}
