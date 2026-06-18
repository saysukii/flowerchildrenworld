import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo,
} from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";
import { ColorWheelPicker } from "@/components/brand-essence/color-wheel-picker";
import type { RichTextEditorHandle } from "@/components/garden/rich-text-editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GARDEN_BRAND_SWATCHES } from "@/lib/garden";
import { cn } from "@/lib/utils";

type NoteFormatToolbarProps = {
  editorRef: RefObject<RichTextEditorHandle | null>;
};

export function NoteFormatToolbar({ editorRef }: NoteFormatToolbarProps) {
  const [textColor, setTextColor] = useState("#020202");
  const [highlightColor, setHighlightColor] = useState("#FAEAB8");

  function editor() {
    return editorRef.current;
  }

  function exec(cmd: string, value?: string) {
    editor()?.saveSelection();
    editor()?.exec(cmd, value);
  }

  function applyTextColor(hex: string) {
    setTextColor(hex);
    editor()?.saveSelection();
    editor()?.applyTextColor(hex);
  }

  function applyHighlightColor(hex: string) {
    setHighlightColor(hex);
    editor()?.saveSelection();
    editor()?.applyHighlightColor(hex);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <FormatButton label="Bold" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("bold")}>
        <Bold className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Italic" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("italic")}>
        <Italic className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Underline" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("underline")}>
        <Underline className="h-4 w-4" />
      </FormatButton>
      <FormatButton
        label="Strikethrough"
        onPointerDown={() => editor()?.saveSelection()}
        onClick={() => exec("strikeThrough")}
      >
        <Strikethrough className="h-4 w-4" />
      </FormatButton>

      <ToolbarDivider />

      <FormatButton label="Heading 1" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("formatBlock", "h1")}>
        <Heading1 className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Heading 2" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("formatBlock", "h2")}>
        <Heading2 className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Heading 3" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("formatBlock", "h3")}>
        <Heading3 className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Body text" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("formatBlock", "p")}>
        <Pilcrow className="h-4 w-4" />
      </FormatButton>

      <ToolbarDivider />

      <FormatButton label="Align left" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("justifyLeft")}>
        <AlignLeft className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Align center" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("justifyCenter")}>
        <AlignCenter className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Align right" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("justifyRight")}>
        <AlignRight className="h-4 w-4" />
      </FormatButton>

      <ToolbarDivider />

      <FormatButton label="Bullet list" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("insertUnorderedList")}>
        <List className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Numbered list" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("insertOrderedList")}>
        <ListOrdered className="h-4 w-4" />
      </FormatButton>

      <ToolbarDivider />

      <ColorPickerPopover
        label="Text color"
        icon={<Palette className="h-4 w-4" />}
        swatch={textColor}
        value={textColor}
        onOpen={() => editor()?.saveSelection()}
        onChange={applyTextColor}
      />
      <ColorPickerPopover
        label="Highlight"
        icon={<Highlighter className="h-4 w-4" />}
        swatch={highlightColor}
        value={highlightColor}
        onOpen={() => editor()?.saveSelection()}
        onChange={applyHighlightColor}
      />

      <ToolbarDivider />

      <FormatButton label="Link" onPointerDown={() => editor()?.saveSelection()} onClick={() => editor()?.insertLink()}>
        <Link className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Quote" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("formatBlock", "blockquote")}>
        <Quote className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Divider" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("insertHorizontalRule")}>
        <Minus className="h-4 w-4" />
      </FormatButton>

      <ToolbarDivider />

      <FormatButton label="Clear formatting" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("removeFormat")}>
        <RemoveFormatting className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Undo" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("undo")}>
        <Undo className="h-4 w-4" />
      </FormatButton>
      <FormatButton label="Redo" onPointerDown={() => editor()?.saveSelection()} onClick={() => exec("redo")}>
        <Redo className="h-4 w-4" />
      </FormatButton>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-black/10" aria-hidden />;
}

function ColorPickerPopover({
  label,
  icon,
  swatch,
  value,
  onOpen,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  swatch: string;
  value: string;
  onOpen: () => void;
  onChange: (hex: string) => void;
}) {
  return (
    <Popover
      onOpenChange={(open) => {
        if (open) onOpen();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/8 bg-[#FCFCFC] text-foreground/70 transition-colors hover:border-black/15 hover:bg-white hover:text-foreground"
        >
          {icon}
          <span
            className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white shadow-sm"
            style={{ background: swatch }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto rounded-2xl border-black/10 p-4"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="mb-3 text-xs font-normal text-foreground/80">{label}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {GARDEN_BRAND_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(color)}
              className={cn(
                "h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110",
                value.toUpperCase() === color.toUpperCase() && "ring-2 ring-foreground/30 ring-offset-1",
              )}
              style={{ background: color }}
            />
          ))}
        </div>
        <ColorWheelPicker size="compact" value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function FormatButton({
  label,
  onClick,
  onPointerDown,
  children,
}: {
  label: string;
  onClick: () => void;
  onPointerDown?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown?.();
      }}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/8 bg-[#FCFCFC] text-foreground/70 transition-colors hover:border-black/15 hover:bg-white hover:text-foreground"
    >
      {children}
    </button>
  );
}
