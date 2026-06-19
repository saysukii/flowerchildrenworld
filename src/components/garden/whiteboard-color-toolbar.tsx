import { useState, type RefObject } from "react";
import { WhiteboardStylePanel } from "@/components/garden/whiteboard-style-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  isTransparentWhiteboardColor,
  resolveWhiteboardToolbarColor,
  type WhiteboardStrokeWidth,
} from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

import { cn } from "@/lib/utils";

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
  touchFriendly?: boolean;
  embedded?: boolean;
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
  touchFriendly = false,
  embedded = false,
}: WhiteboardColorToolbarProps) {
  const [open, setOpen] = useState(false);
  const [colorTab, setColorTab] = useState<ColorTab>("fill");
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  const triggerColor = previewColor ?? resolveWhiteboardToolbarColor(strokeColor, fillColor);

  return (
    <Popover
      modal={embedded}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPreviewColor(null);
          return;
        }
        if (isTransparentWhiteboardColor(fillColor)) {
          setColorTab("stroke");
        }
      }}
    >
      <PopoverTrigger asChild>
        {embedded ? (
          <button
            type="button"
            aria-label="Color and style"
            title="Color and style"
            onMouseDown={(e) => e.preventDefault()}
            className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.04] data-[state=open]:bg-black/[0.06]"
          >
            <span
              aria-hidden
              style={{ background: triggerColor }}
              className="h-6 w-6 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]"
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Color and style"
            title="Color and style"
            onMouseDown={(e) => e.preventDefault()}
            style={{ background: triggerColor }}
            className={cn(
              "pointer-events-auto shrink-0 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08] transition-[transform,box-shadow] hover:scale-105 hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)] data-[state=open]:scale-105 data-[state=open]:ring-2 data-[state=open]:ring-primary/40",
              touchFriendly ? "h-8 w-8" : "h-6 w-6",
            )}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        className="z-[300] w-[258px] min-w-[258px] max-w-[min(258px,calc(100vw-2rem))] overflow-visible rounded-2xl border-black/[0.06] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        align={embedded ? "start" : "end"}
        side="bottom"
        sideOffset={10}
        collisionPadding={16}
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
