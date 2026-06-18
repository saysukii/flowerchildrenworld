import { useState, type RefObject } from "react";
import { WhiteboardStylePanel } from "@/components/garden/whiteboard-style-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { WhiteboardStrokeWidth } from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

type ColorTab = "stroke" | "fill";

type WhiteboardColorToolbarProps = {
  apiRef: RefObject<ExcalidrawApi | null>;
  strokeColor: string;
  fillColor: string;
  strokeWidth: WhiteboardStrokeWidth;
  opacity: number;
  onStrokeColorChange: (hex: string) => void;
  onFillColorChange: (hex: string) => void;
  onStrokeWidthChange: (width: WhiteboardStrokeWidth) => void;
  onOpacityChange: (opacity: number) => void;
};

export function WhiteboardColorToolbar({
  apiRef,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
}: WhiteboardColorToolbarProps) {
  const [open, setOpen] = useState(false);
  const [colorTab, setColorTab] = useState<ColorTab>("fill");
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  const activeColor = colorTab === "stroke" ? strokeColor : fillColor;
  const triggerColor = previewColor ?? activeColor;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPreviewColor(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Color and style"
          title="Color and style"
          onMouseDown={(e) => e.preventDefault()}
          style={{ background: triggerColor }}
          className="pointer-events-auto h-6 w-6 shrink-0 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08] transition-[transform,box-shadow] hover:scale-105 hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)] data-[state=open]:scale-105 data-[state=open]:ring-2 data-[state=open]:ring-primary/40"
        />
      </PopoverTrigger>
      <PopoverContent
        className="z-[200] w-[258px] rounded-2xl border-black/[0.06] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
        align="end"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <WhiteboardStylePanel
          apiRef={apiRef}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
          onStrokeColorChange={onStrokeColorChange}
          onFillColorChange={onFillColorChange}
          onStrokeWidthChange={onStrokeWidthChange}
          onOpacityChange={onOpacityChange}
          colorTab={colorTab}
          onColorTabChange={setColorTab}
          onPreviewColorChange={setPreviewColor}
          compact
        />
      </PopoverContent>
    </Popover>
  );
}
