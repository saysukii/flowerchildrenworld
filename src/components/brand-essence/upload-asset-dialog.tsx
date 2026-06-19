import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, HardDrive, Loader2, Search, Upload } from "lucide-react";
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
  appendBrandAsset,
  blobToDataUrl,
  type BrandAsset,
  type BrandAssetCategory,
  fileToDataUrl,
} from "@/lib/brand-assets";
import { downloadDriveFile, fetchDriveAssets, type GoogleDriveFile } from "@/lib/google";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES: { key: BrandAssetCategory; label: string }[] = [
  { key: "logos", label: "Logos" },
  { key: "templates", label: "Templates" },
  { key: "copy", label: "Copy" },
  { key: "documents", label: "Documents" },
  { key: "colors", label: "Colors" },
  { key: "typography", label: "Typography" },
];

type UploadAssetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory: BrandAssetCategory;
  onUploaded: (asset: BrandAsset) => void;
};

type UploadMode = "computer" | "drive";

function formatModifiedTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function UploadAssetDialog({
  open,
  onOpenChange,
  defaultCategory,
  onUploaded,
}: UploadAssetDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>("computer");
  const [category, setCategory] = useState<BrandAssetCategory>(defaultCategory);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState("");

  useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

  const filteredDriveFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return driveFiles;
    return driveFiles.filter((file) => file.name.toLowerCase().includes(q));
  }, [driveFiles, query]);

  const selectedDriveFile = useMemo(
    () => driveFiles.find((file) => file.id === selectedDriveId) ?? null,
    [driveFiles, selectedDriveId],
  );

  function reset() {
    setMode("computer");
    setQuery("");
    setDriveFiles([]);
    setSelectedDriveId("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.provider_token) {
      throw new Error("Google Drive access is not enabled. Connect Google in Settings first.");
    }
    return data.session.provider_token;
  }

  async function loadDriveFiles() {
    setLoadingDrive(true);
    try {
      const token = await getAccessToken();
      const files = await fetchDriveAssets(token);
      setDriveFiles(files);
      setSelectedDriveId(files[0]?.id ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Google Drive files.");
      setDriveFiles([]);
      setSelectedDriveId("");
    } finally {
      setLoadingDrive(false);
    }
  }

  useEffect(() => {
    if (!open || mode !== "drive") return;
    void loadDriveFiles();
  }, [open, mode]);

  async function saveAsset(partial: Omit<BrandAsset, "id" | "addedAt" | "category">) {
    const asset: BrandAsset = {
      id: crypto.randomUUID(),
      category,
      addedAt: new Date().toISOString(),
      ...partial,
    };
    appendBrandAsset(asset);
    onUploaded(asset);
    toast.success(`Added ${asset.name}.`);
    onOpenChange(false);
    reset();
  }

  async function handleLocalFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveAsset({
        name: file.name,
        source: "local",
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDriveImport() {
    if (!selectedDriveFile) {
      toast.error("Choose a file from Google Drive.");
      return;
    }
    setUploading(true);
    try {
      const token = await getAccessToken();
      const blob = await downloadDriveFile(selectedDriveFile, token);
      const dataUrl = await blobToDataUrl(blob);
      const mimeType = selectedDriveFile.mimeType.startsWith("application/vnd.google-apps.")
        ? "application/pdf"
        : blob.type || selectedDriveFile.mimeType;

      await saveAsset({
        name: selectedDriveFile.name,
        source: "drive",
        mimeType,
        dataUrl,
        driveFileId: selectedDriveFile.id,
        webViewLink: selectedDriveFile.webViewLink,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import from Drive.");
    } finally {
      setUploading(false);
    }
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
          <DialogTitle className="font-normal">Upload asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="asset-category">Category</Label>
            <div className="relative">
              <select
                id="asset-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BrandAssetCategory)}
                className="w-full appearance-none rounded-md border border-black/10 bg-white py-2 pl-3 pr-10 text-sm font-light focus:border-foreground/30 focus:outline-none"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex gap-1 rounded-full bg-[#FCFCFC] p-1 border border-black/5">
            <button
              type="button"
              onClick={() => setMode("computer")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-light transition-colors",
                mode === "computer" ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              From Device
            </button>
            <button
              type="button"
              onClick={() => setMode("drive")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-light transition-colors",
                mode === "drive" ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
              )}
            >
              <HardDrive className="h-3.5 w-3.5" />
              From Google Drive
            </button>
          </div>

          {mode === "computer" ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf,.svg,.png,.jpg,.jpeg,.webp,.gif,.otf,.ttf,.woff,.woff2"
                className="hidden"
                onChange={(e) => void handleLocalFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="mx-auto h-5 w-5 text-foreground/40" />
              <p className="mt-2 text-sm font-light text-foreground/70">
                Images, PDFs, fonts — up to 1.5 MB
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-full"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : "Choose file"}
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  placeholder="Search Drive files..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  disabled={loadingDrive}
                />
              </div>

              <div className="max-h-52 overflow-y-auto rounded-2xl border border-black/5 bg-[#FCFCFC]">
                {loadingDrive ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-foreground/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading your Drive files…
                  </div>
                ) : filteredDriveFiles.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-foreground/50">
                    {driveFiles.length === 0
                      ? "No compatible files found in Drive."
                      : "No files match your search."}
                  </p>
                ) : (
                  <ul className="divide-y divide-black/5">
                    {filteredDriveFiles.map((file) => {
                      const active = file.id === selectedDriveId;
                      return (
                        <li key={file.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDriveId(file.id)}
                            className={cn(
                              "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white",
                              active && "bg-white",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-light text-foreground">{file.name}</p>
                              <p className="text-xs text-foreground/45">
                                Updated {formatModifiedTime(file.modifiedTime)}
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
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "drive" ? (
            <Button
              type="button"
              disabled={uploading || !selectedDriveFile}
              onClick={() => void handleDriveImport()}
              className="text-white hover:opacity-90"
              style={{ background: "#3AB819" }}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : "Import from Drive"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
