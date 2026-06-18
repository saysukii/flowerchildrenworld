import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import { ensureNoteHtml } from "@/lib/garden";
import { cn } from "@/lib/utils";

export type RichTextEditorHandle = {
  exec: (cmd: string, value?: string) => void;
  saveSelection: () => void;
  restoreSelection: () => void;
  applyTextColor: (hex: string) => void;
  applyHighlightColor: (hex: string) => void;
  insertLink: () => void;
  focus: () => void;
};

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variant?: "default" | "document";
  hideToolbar?: boolean;
};

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, placeholder, variant = "default", hideToolbar = false },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastValue = useRef(value);
    const savedRangeRef = useRef<Range | null>(null);

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      const html = ensureNoteHtml(value);
      if (el.innerHTML === html) return;
      if (document.activeElement === el) return;
      el.innerHTML = html;
      lastValue.current = html;
    }, [value]);

    const emitChange = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const html = el.innerHTML;
      if (html !== lastValue.current) {
        lastValue.current = html;
        onChange(html);
      }
    }, [onChange]);

    const saveSelection = useCallback(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }, []);

    const restoreSelection = useCallback(() => {
      const range = savedRangeRef.current;
      if (!range) return;
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      editorRef.current?.focus();
    }, []);

    const exec = useCallback(
      (cmd: string, val?: string) => {
        restoreSelection();
        document.execCommand(cmd, false, val);
        editorRef.current?.focus();
        emitChange();
      },
      [emitChange, restoreSelection],
    );

    const applyTextColor = useCallback(
      (hex: string) => {
        restoreSelection();
        document.execCommand("foreColor", false, hex);
        editorRef.current?.focus();
        emitChange();
      },
      [emitChange, restoreSelection],
    );

    const applyHighlightColor = useCallback(
      (hex: string) => {
        restoreSelection();
        document.execCommand("hiliteColor", false, hex);
        if (!document.queryCommandState("hiliteColor")) {
          document.execCommand("backColor", false, hex);
        }
        editorRef.current?.focus();
        emitChange();
      },
      [emitChange, restoreSelection],
    );

    const insertLink = useCallback(() => {
      restoreSelection();
      const url = window.prompt("Enter link URL");
      if (!url?.trim()) return;
      document.execCommand("createLink", false, url.trim());
      editorRef.current?.focus();
      emitChange();
    }, [emitChange, restoreSelection]);

    useImperativeHandle(ref, () => ({
      exec,
      saveSelection,
      restoreSelection,
      applyTextColor,
      applyHighlightColor,
      insertLink,
      focus: () => editorRef.current?.focus(),
    }));

    const isDocument = variant === "document";

    return (
      <div className={cn("flex flex-col", isDocument ? "gap-0" : "gap-2")}>
        {!hideToolbar ? (
          <p className="text-xs text-foreground/50">
            Use the formatting panel to style your note.
          </p>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emitChange}
          onBlur={emitChange}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className={cn(
            "font-light leading-relaxed focus:outline-none",
            "empty:before:text-foreground/40 empty:before:content-[attr(data-placeholder)]",
            "[&_h1]:font-normal [&_h1]:text-foreground",
            "[&_h2]:font-normal [&_h2]:text-foreground/90",
            "[&_h3]:font-normal [&_h3]:text-foreground/85",
            "[&_p]:text-foreground/80",
            "[&_li]:text-foreground/75",
            "[&_ul]:list-disc [&_ol]:list-decimal",
            "[&_strong]:font-normal [&_strong]:text-foreground",
            "[&_a]:text-[#15AAD2] [&_a]:underline",
            "[&_blockquote]:border-l-2 [&_blockquote]:border-black/15 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-foreground/70",
            "[&_hr]:my-6 [&_hr]:border-black/10",
            isDocument
              ? [
                  "min-h-[240px] text-base sm:min-h-[320px]",
                  "[&_h1]:mb-4 [&_h1]:mt-6 [&_h1:first-child]:mt-0 [&_h1]:text-2xl",
                  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2:first-child]:mt-0 [&_h2]:text-xl",
                  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3:first-child]:mt-0 [&_h3]:text-lg",
                  "[&_p]:my-3",
                  "[&_li]:my-1.5",
                  "[&_ul]:my-3 [&_ul]:pl-5",
                  "[&_ol]:my-3 [&_ol]:pl-5",
                ]
              : [
                  "min-h-[280px] rounded-xl border border-black/10 bg-white px-4 py-3 text-sm",
                  "focus:border-foreground/30",
                  "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl",
                  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2:first-child]:mt-0 [&_h2]:text-base",
                  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm",
                  "[&_p]:my-2",
                  "[&_li]:my-1",
                  "[&_ul]:my-2 [&_ul]:pl-5",
                  "[&_ol]:my-2 [&_ol]:pl-5",
                ],
          )}
        />
      </div>
    );
  },
);

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-lg p-2 text-foreground/70 hover:bg-black/5 hover:text-foreground"
    >
      {children}
    </button>
  );
}
