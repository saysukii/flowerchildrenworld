import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ColorWheelPicker } from "@/components/brand-essence/color-wheel-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBrandColor,
  DEFAULT_BRAND_COLORS,
  loadBrandColors,
  normalizeHex,
  saveBrandColors,
  type BrandColor,
} from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-light placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none";

export function ColorPaletteCard({ admin }: { admin: boolean }) {
  const containerRef = useRef<HTMLElement>(null);
  const [colors, setColors] = useState<BrandColor[]>(DEFAULT_BRAND_COLORS);
  const [draft, setDraft] = useState<BrandColor | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);

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
      } else if (isNewDraft) {
        persist(colors.filter((color) => color.id !== draft.id));
      }

      setDraft(null);
      setIsNewDraft(false);
    },
    [colors, draft, isNewDraft, persist],
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

      if (draft && isNewDraft) {
        persist(colors.filter((c) => c.id !== draft.id));
      }

      setDraft({ ...color });
      setIsNewDraft(false);
    },
    [admin, closeEdit, colors, draft, isNewDraft, persist],
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

  function addColor() {
    if (!admin) return;
    if (draft) closeEdit(false);
    const newColor = createBrandColor();
    persist([...colors, newColor]);
    setDraft({ ...newColor });
    setIsNewDraft(true);
  }

  function removeColor(id: string) {
    if (colors.length <= 1) return;
    persist(colors.filter((color) => color.id !== id));
    if (draft?.id === id) {
      setDraft(null);
      setIsNewDraft(false);
    }
  }

  return (
    <section
      ref={containerRef}
      className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-7 sm:py-8"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-normal">Color Palette</h2>
        {admin ? (
          <button
            type="button"
            onClick={addColor}
            aria-label="Add color"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 p-2 text-xs font-light text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground sm:px-3 sm:py-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add color</span>
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {colors.map((color) => (
          <ColorSwatch
            key={color.id}
            color={color}
            active={admin && draft?.id === color.id}
            editable={admin}
            onSelect={() => selectColor(color.id)}
          />
        ))}
      </div>

      {admin ? (
        <Dialog
          open={draft !== null}
          onOpenChange={(open) => {
            if (!open) closeEdit(false);
          }}
        >
          <DialogContent
            className="max-h-[85dvh] max-w-md overflow-y-auto rounded-3xl border-black/5 p-5 sm:max-w-lg sm:p-6"
            onPointerDownOutside={(e) => {
              if (containerRef.current?.contains(e.target as Node)) {
                e.preventDefault();
              }
            }}
            onInteractOutside={(e) => {
              if (containerRef.current?.contains(e.target as Node)) {
                e.preventDefault();
              }
            }}
          >
            {draft ? (
              <>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-lg font-normal">Edit color</DialogTitle>
                  <DialogDescription className="text-xs font-light text-foreground/60">
                    Pick a color, then click Done to save.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  <ColorWheelPicker value={draft.hex} onChange={(hex) => updateDraft({ hex })} />
                  <div className="w-full flex-1 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-10 w-10 shrink-0 rounded-xl border border-black/10 shadow-sm"
                        style={{ background: draft.hex }}
                      />
                      <input
                        className={inputCls}
                        value={draft.hex}
                        onChange={(e) => updateDraft({ hex: e.target.value })}
                        placeholder="#3AB819"
                      />
                    </div>
                    <input
                      className={inputCls}
                      value={draft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="Color name"
                    />
                    <input
                      className={inputCls}
                      value={draft.usage}
                      onChange={(e) => updateDraft({ usage: e.target.value })}
                      placeholder="What it's for"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => closeEdit(true)}
                        className="rounded-full px-3 py-1.5 text-xs font-normal text-white hover:opacity-90"
                        style={{ background: "#3AB819" }}
                      >
                        Done
                      </button>
                      {colors.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeColor(draft.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-light text-foreground/50 hover:text-[#C53D3D]"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
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
