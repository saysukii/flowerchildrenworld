import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import { ColorWheelPicker } from "@/components/brand-essence/color-wheel-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DEFAULT_BRAND_COLORS,
  loadBrandColors,
  normalizeHex,
  saveBrandColors,
  type BrandColor,
} from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none";

function usePaletteColumns() {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      setColumns(width >= 1024 ? 5 : 3);
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

export function ColorPaletteCard({ admin }: { admin: boolean }) {
  const [colors, setColors] = useState<BrandColor[]>(DEFAULT_BRAND_COLORS);
  const [draft, setDraft] = useState<BrandColor | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setColors(loadBrandColors());
  }, []);

  const persist = useCallback((next: BrandColor[]) => {
    setColors(next);
    saveBrandColors(next);
  }, []);

  const closeEdit = useCallback(
    (save: boolean) => {
      if (!draft) return;

      if (save) {
        persist(colors.map((color) => (color.id === draft.id ? draft : color)));
      }

      setDraft(null);
    },
    [colors, draft, persist],
  );

  const selectColor = useCallback(
    (id: string) => {
      if (!admin) return;

      if (draft?.id === id) {
        closeEdit(false);
        return;
      }

      const color = colors.find((c) => c.id === id);
      if (!color) return;

      setDraft({ ...color });
    },
    [admin, closeEdit, colors, draft],
  );

  function updateDraft(patch: Partial<BrandColor>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            ...patch,
            hex: patch.hex ? normalizeHex(patch.hex) : prev.hex,
          }
        : null,
    );
  }

  function removeColor(id: string) {
    if (colors.length <= 1) return;
    persist(colors.filter((color) => color.id !== id));
    if (draft?.id === id) {
      setDraft(null);
    }
  }

  const columns = usePaletteColumns();
  const colorRows = useMemo(() => {
    const rows: BrandColor[][] = [];
    for (let i = 0; i < colors.length; i += columns) {
      rows.push(colors.slice(i, i + columns));
    }
    return rows;
  }, [colors, columns]);

  const selectedRow = useMemo(() => {
    if (!draft) return -1;
    const index = colors.findIndex((color) => color.id === draft.id);
    return index >= 0 ? Math.floor(index / columns) : -1;
  }, [colors, columns, draft]);

  return (
    <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8">
      <h2 className="mb-5 text-lg font-normal">Color Palette</h2>

      <div className="space-y-2 sm:space-y-3">
        {colorRows.map((row, rowIndex) => (
          <div key={rowIndex}>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-5 lg:gap-3">
              {row.map((color) => (
                <ColorSwatch
                  key={color.id}
                  color={color}
                  active={admin && draft?.id === color.id}
                  editable={admin}
                  onSelect={() => selectColor(color.id)}
                />
              ))}
            </div>

            {admin && draft && isMobile && selectedRow === rowIndex ? (
              <div className="mt-2 sm:mt-3">
                <ColorEditPanel
                  variant="inline"
                  draft={draft}
                  canRemove={colors.length > 1}
                  onClose={() => closeEdit(false)}
                  onDone={() => closeEdit(true)}
                  onRemove={() => removeColor(draft.id)}
                  onUpdate={updateDraft}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {admin && draft && !isMobile ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) closeEdit(false);
          }}
        >
          <DialogContent className="max-w-lg gap-0 border-black/5 bg-[#FCFCFC] p-4 sm:p-5">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-sm font-normal">Edit color</DialogTitle>
            </DialogHeader>
            <ColorEditPanel
              variant="modal"
              draft={draft}
              canRemove={colors.length > 1}
              onClose={() => closeEdit(false)}
              onDone={() => closeEdit(true)}
              onRemove={() => removeColor(draft.id)}
              onUpdate={updateDraft}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

function ColorEditPanel({
  draft,
  canRemove,
  onClose,
  onDone,
  onRemove,
  onUpdate,
  variant = "inline",
}: {
  draft: BrandColor;
  canRemove: boolean;
  onClose: () => void;
  onDone: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<BrandColor>) => void;
  variant?: "inline" | "modal";
}) {
  const content = (
    <>
      {variant === "inline" ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-normal">Edit color</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel editing"
            className="shrink-0 rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mx-auto flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="mx-auto shrink-0 sm:mx-0">
          {variant === "inline" ? (
            <div className="sm:hidden">
              <ColorWheelPicker
                variant="field"
                size="mini"
                value={draft.hex}
                onChange={(hex) => onUpdate({ hex })}
              />
            </div>
          ) : null}
          <div className={variant === "inline" ? "hidden sm:block" : "block"}>
            <ColorWheelPicker
              size="compact"
              value={draft.hex}
              onChange={(hex) => onUpdate({ hex })}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="h-10 w-10 shrink-0 rounded-xl border border-black/10 shadow-sm"
              style={{ background: draft.hex }}
              aria-hidden="true"
            />
            <input
              className={inputCls}
              value={draft.hex}
              onChange={(e) => onUpdate({ hex: e.target.value })}
              placeholder="#3AB819"
            />
          </div>

          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Color name"
          />

          <input
            className={inputCls}
            value={draft.usage}
            onChange={(e) => onUpdate({ usage: e.target.value })}
            placeholder="What it's for"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-2 text-xs font-normal text-white hover:opacity-90"
          style={{ background: "#3AB819" }}
        >
          Done
        </button>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove color"
            className="inline-flex items-center gap-1 rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/5 hover:text-[#C53D3D]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </>
  );

  if (variant === "modal") {
    return content;
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-black/5 bg-[#FCFCFC] p-4 sm:max-w-lg">
      {content}
    </div>
  );
}

function ColorSwatch({
  color,
  active,
  editable,
  onSelect,
}: {
  color: BrandColor;
  active: boolean;
  editable: boolean;
  onSelect: () => void;
}) {
  const swatch = (
    <>
      <span
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-xl border transition-colors",
          active ? "border-foreground/30 ring-2 ring-foreground/10" : "border-black/5",
          editable && !active && "hover:border-black/15",
        )}
      >
        <span className="absolute inset-0 block" style={{ background: color.hex }} />
      </span>
      <span className="mt-2">
        <span className="block text-xs font-normal">{color.name || "Untitled"}</span>
        <span className="block text-[10px] font-light uppercase tracking-wider text-foreground/40">{color.hex}</span>
        <span className="block text-[11px] font-light leading-snug text-foreground/60">{color.usage || "—"}</span>
      </span>
    </>
  );

  if (!editable) {
    return <div className="flex flex-col text-left">{swatch}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex cursor-pointer flex-col text-left"
      aria-label={`Edit ${color.name}`}
      aria-pressed={active}
    >
      {swatch}
    </button>
  );
}
