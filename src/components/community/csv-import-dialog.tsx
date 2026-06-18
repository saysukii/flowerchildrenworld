import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CommunityTab,
  COMMUNITY_CSV_FIELDS,
  downloadCsvTemplate,
  parseCommunityCsv,
  rowsToRecords,
  type ChildRecord,
  type GuardianRecord,
  type PartnerRecord,
  type VolunteerRecord,
} from "@/lib/community";

type CommunityRecord = ChildRecord | GuardianRecord | VolunteerRecord | PartnerRecord;

type CsvImportDialogProps = {
  tab: CommunityTab;
  tabLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (records: CommunityRecord[]) => void;
};

export function CsvImportDialog({ tab, tabLabel, open, onOpenChange, onImport }: CsvImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseCommunityCsv> | null>(null);
  const [fileName, setFileName] = useState("");

  function reset() {
    setPreview(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseCommunityCsv(tab, text);
      setPreview(result);
      if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      }
    } catch {
      toast.error("Could not read that file.");
      reset();
    } finally {
      setParsing(false);
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
          <DialogTitle className="font-normal">Upload CSV — {tabLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-foreground/60 leading-relaxed">
            Use the same column names as the portal fields. Headers like{" "}
            <span className="text-foreground/80">Name</span>,{" "}
            <span className="text-foreground/80">Email</span>, or{" "}
            <span className="text-foreground/80">Full name</span> map automatically.
          </p>

          <button
            type="button"
            onClick={() => downloadCsvTemplate(tab)}
            className="text-sm font-normal hover:underline"
            style={{ color: "#3AB819" }}
          >
            Download CSV template
          </button>

          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-5 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            <Upload className="mx-auto h-5 w-5 text-foreground/40" />
            <p className="mt-2 text-sm font-light text-foreground/70">
              {fileName || "Choose a .csv file"}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={parsing}
              onClick={() => inputRef.current?.click()}
            >
              {parsing ? <Loader2 className="size-4 animate-spin" /> : "Select file"}
            </Button>
          </div>

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

          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-light uppercase tracking-wider text-foreground/50">
              Expected columns
            </p>
            <p className="text-xs font-light leading-relaxed text-foreground/70">
              {COMMUNITY_CSV_FIELDS[tab].map((field) => field.label).join(" · ")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!preview || preview.errors.length > 0 || preview.rows.length === 0}
            onClick={handleImport}
            className="text-white hover:opacity-90"
            style={{ background: "#3AB819" }}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
