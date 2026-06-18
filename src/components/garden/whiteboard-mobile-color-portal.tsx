import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { WhiteboardStylePanel } from "@/components/garden/whiteboard-style-panel";
import type { WhiteboardStrokeWidth } from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

const MOUNT_CLASS = "fcw-whiteboard-color-mount";

function hideNativePanelSections(panel: Element) {
  panel.querySelectorAll(".color-picker-container").forEach((el) => {
    const wrapper = el.parentElement as HTMLElement | null;
    if (wrapper) wrapper.style.display = "none";
  });

  panel.querySelectorAll("h3").forEach((h3) => {
    const label = h3.textContent?.trim().toLowerCase() ?? "";
    if (label === "stroke" || label === "background") {
      const wrapper = h3.closest("div");
      if (wrapper) wrapper.style.display = "none";
    }
  });

  panel.querySelectorAll("fieldset").forEach((fieldset) => {
    const legend = fieldset.querySelector("legend")?.textContent?.trim().toLowerCase() ?? "";
    if (
      legend.includes("stroke width") ||
      legend.includes("layers") ||
      legend.includes("actions")
    ) {
      (fieldset as HTMLElement).style.display = "none";
    }
  });

  panel.querySelectorAll("label.control-label").forEach((label) => {
    if (label.textContent?.trim().toLowerCase().includes("opacity")) {
      (label as HTMLElement).style.display = "none";
    }
  });
}

type WhiteboardMobileColorPortalProps = {
  containerRef: RefObject<HTMLDivElement | null>;
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

export function WhiteboardMobileColorPortal({
  containerRef,
  apiRef,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
}: WhiteboardMobileColorPortalProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const sync = () => {
      const panel = root.querySelector(".App-mobile-menu .panelColumn");
      if (!panel) {
        setMount(null);
        return;
      }

      hideNativePanelSections(panel);

      let anchor = panel.querySelector(`.${MOUNT_CLASS}`) as HTMLElement | null;
      if (!anchor) {
        anchor = document.createElement("div");
        anchor.className = MOUNT_CLASS;
        panel.prepend(anchor);
      }
      setMount(anchor);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [containerRef]);

  if (!mount) return null;

  return createPortal(
    <div className="fcw-whiteboard-mobile-colors mb-2 pb-1">
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
        compact
      />
    </div>,
    mount,
  );
}
