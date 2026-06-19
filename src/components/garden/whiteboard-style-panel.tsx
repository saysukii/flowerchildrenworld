import { useCallback, useEffect, useState, type RefObject } from "react";
import { ColorWheelPicker } from "@/components/brand-essence/color-wheel-picker";
import { GARDEN_BRAND_SWATCHES } from "@/lib/garden";
import { normalizeHex } from "@/lib/brand-colors";
import {
  applyWhiteboardStyle,
  isTransparentWhiteboardColor,
  toWhiteboardHex,
  WHITEBOARD_STROKE_WIDTHS,
  type WhiteboardStrokeWidth,
} from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";
import { cn } from "@/lib/utils";

const QUICK_SWATCHES = GARDEN_BRAND_SWATCHES.slice(0, 8);

type ColorTab = "stroke" | "fill";

type WhiteboardStylePanelProps = {
  apiRef: RefObject<ExcalidrawApi | null>;
  strokeColor: string;
  fillColor: string;
  strokeWidth: WhiteboardStrokeWidth;
  opacity: number;
  onStrokeColorChange: (hex: string) => void;
  onFillColorChange: (hex: string) => void;
  onStrokeWidthChange: (width: WhiteboardStrokeWidth) => void;
  onOpacityChange: (opacity: number) => void;
  colorTab?: ColorTab;
  onColorTabChange?: (tab: ColorTab) => void;
  onPreviewColorChange?: (hex: string | null) => void;
  compact?: boolean;
};

export function WhiteboardStylePanel({
  apiRef,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  colorTab,
  onColorTabChange,
  onPreviewColorChange,
  compact = false,
}: WhiteboardStylePanelProps) {
  const [internalTab, setInternalTab] = useState<ColorTab>("fill");
  const tab = colorTab ?? internalTab;
  const setTab = onColorTabChange ?? setInternalTab;
  const [dragPreview, setDragPreview] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState("");
  const [hexFocused, setHexFocused] = useState(false);
  const rawColor = tab === "stroke" ? strokeColor : fillColor;
  const isTransparent = isTransparentWhiteboardColor(rawColor);
  const pickerColor = toWhiteboardHex(
    rawColor,
    tab === "stroke" ? "#1E1E1E" : "#FFC9C9",
  );
  const shownColor = dragPreview ?? (isTransparent ? pickerColor : rawColor);

  useEffect(() => {
    if (!hexFocused) {
      if (isTransparent) {
        setHexInput("");
      } else {
        setHexInput(toWhiteboardHex(rawColor, "#000000").replace(/^#/, ""));
      }
    }
  }, [rawColor, isTransparent, hexFocused]);

  const liveApplyColor = useCallback(
    (hex: string) => {
      const api = apiRef.current;
      if (!api) return;
      setDragPreview(hex);
      onPreviewColorChange?.(hex);
      if (tab === "stroke") {
        applyWhiteboardStyle(api, { currentItemStrokeColor: hex }, { live: true });
        return;
      }
      applyWhiteboardStyle(api, { currentItemBackgroundColor: hex }, { live: true });
    },
    [apiRef, tab, onPreviewColorChange],
  );

  const commitColor = useCallback(
    (hex: string) => {
      setDragPreview(null);
      onPreviewColorChange?.(null);
      if (tab === "stroke") {
        onStrokeColorChange(hex);
      } else {
        onFillColorChange(hex);
      }
      const api = apiRef.current;
      if (!api) return;
      if (tab === "stroke") {
        applyWhiteboardStyle(api, { currentItemStrokeColor: hex });
        return;
      }
      applyWhiteboardStyle(api, { currentItemBackgroundColor: hex });
    },
    [tab, onStrokeColorChange, onFillColorChange, apiRef, onPreviewColorChange],
  );

  const applyColor = useCallback(
    (hex: string) => {
      setDragPreview(null);
      onPreviewColorChange?.(null);
      if (tab === "stroke") {
        onStrokeColorChange(hex);
      } else {
        onFillColorChange(hex);
      }
      const api = apiRef.current;
      if (!api) return;
      if (tab === "stroke") {
        applyWhiteboardStyle(api, { currentItemStrokeColor: hex });
        return;
      }
      applyWhiteboardStyle(api, { currentItemBackgroundColor: hex });
    },
    [tab, onStrokeColorChange, onFillColorChange, apiRef, onPreviewColorChange],
  );

  const commitHexInput = useCallback(() => {
    const normalized = normalizeHex(hexInput.startsWith("#") ? hexInput : `#${hexInput}`);
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      applyColor(normalized);
    } else {
      setHexInput(shownColor.replace(/^#/, "").toUpperCase());
    }
    setHexFocused(false);
  }, [applyColor, hexInput, shownColor]);

  const applyWidth = (width: WhiteboardStrokeWidth) => {
    onStrokeWidthChange(width);
    const api = apiRef.current;
    if (!api) return;
    applyWhiteboardStyle(api, { currentItemStrokeWidth: width });
  };

  const applyOpacity = (value: number) => {
    onOpacityChange(value);
    const api = apiRef.current;
    if (!api) return;
    applyWhiteboardStyle(api, { currentItemOpacity: value });
  };

  return (
    <div className={cn("select-none touch-manipulation", compact ? "space-y-3" : "space-y-4")}>
      <div className="flex gap-5 border-b border-black/[0.06]">
        {(["fill", "stroke"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setDragPreview(null);
              onPreviewColorChange?.(null);
              setTab(key);
            }}
            className={cn(
              "relative text-xs font-medium capitalize transition-colors",
              compact ? "pb-3 pt-1" : "pb-2.5",
              tab === key ? "text-foreground" : "text-foreground/35 hover:text-foreground/55",
            )}
          >
            {key}
            {tab === key ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] tracking-wide text-foreground/70">
        <span className="shrink-0">HEX CODE</span>
        <div className="ml-auto flex items-center justify-end">
          <span className="text-foreground/30">#</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            value={hexInput}
            onChange={(e) =>
              setHexInput(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6))
            }
            onFocus={() => setHexFocused(true)}
            onBlur={commitHexInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setHexInput(
                  isTransparent ? "" : toWhiteboardHex(rawColor, "#000000").replace(/^#/, ""),
                );
                e.currentTarget.blur();
              }
            }}
            placeholder={isTransparent ? "None" : undefined}
            className="w-[3.5rem] bg-transparent text-right outline-none selection:bg-primary/15 placeholder:text-foreground/30"
            aria-label="Hex color"
          />
        </div>
      </div>

      <div className={cn("flex flex-nowrap", compact ? "gap-2" : "gap-1.5")}>
        {QUICK_SWATCHES.map((color) => {
          const selected =
            !isTransparent &&
            toWhiteboardHex(rawColor, color).toUpperCase() === color.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColor(color)}
              className={cn(
                "shrink-0 rounded-full transition-all duration-150",
                compact ? "h-9 w-9" : "h-6 w-6",
                selected
                  ? "scale-110 ring-2 ring-foreground/20 ring-offset-2"
                  : "ring-1 ring-black/[0.08] hover:scale-105 hover:ring-black/15",
              )}
              style={{ background: color }}
            />
          );
        })}
      </div>

      <ColorWheelPicker
        variant="field"
        size="mini"
        value={pickerColor}
        onChange={commitColor}
        onLiveChange={liveApplyColor}
        commitOnRelease
        showValues={false}
      />

      <div className="space-y-3 rounded-2xl bg-black/[0.025] p-3">
        {tab === "stroke" ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-foreground/45">Stroke width</p>
            <div className="flex gap-2">
              {WHITEBOARD_STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  type="button"
                  aria-label={`Stroke width ${width}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyWidth(width)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-xl transition-all duration-150",
                    compact ? "h-11" : "h-9",
                    strokeWidth === width
                      ? "bg-white shadow-sm ring-1 ring-black/[0.08]"
                      : "bg-transparent hover:bg-white/60",
                  )}
                >
                  <span
                    className="rounded-full bg-foreground/80"
                    style={{ width: 20, height: width }}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground/45">Opacity</p>
            <span className="text-[11px] tabular-nums text-foreground/35">{opacity}%</span>
          </div>
          <div className={cn("relative", compact ? "h-9" : "h-7")}>
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full"
              style={{
                background: `linear-gradient(to right, transparent, ${shownColor})`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={opacity}
              onChange={(e) => applyOpacity(Number(e.target.value))}
              className={cn(
                "absolute inset-0 w-full cursor-pointer appearance-none bg-transparent",
                compact
                  ? "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5"
                  : "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-foreground/80 [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.2)]",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
