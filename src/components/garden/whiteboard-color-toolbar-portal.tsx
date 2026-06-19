import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { WhiteboardColorToolbar } from "@/components/garden/whiteboard-color-toolbar";
import type { WhiteboardStrokeWidth } from "@/lib/garden-whiteboard-scene";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

export const COLOR_TOOLBAR_MOUNT_CLASS = "fcw-color-toolbar-mount";

export function findExcalidrawToolbarStack(root: HTMLElement): Element | null {
  const mobileToolbar = root.querySelector(".App-toolbar--mobile");
  if (mobileToolbar) {
    return mobileToolbar.querySelector(":scope > .Stack.Stack_horizontal");
  }

  const desktopToolbar = root.querySelector(".App-toolbar:not(.App-toolbar--mobile)");
  if (desktopToolbar) {
    return (
      desktopToolbar.querySelector(":scope > .Stack.Stack_horizontal") ??
      desktopToolbar.querySelector(".Stack.Stack_horizontal")
    );
  }

  return root.querySelector(".App-top-bar .Stack.Stack_horizontal");
}

type WhiteboardColorToolbarPortalProps = {
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
  touchFriendly?: boolean;
};

export function WhiteboardColorToolbarPortal({
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
  touchFriendly = false,
}: WhiteboardColorToolbarPortalProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const sync = () => {
      const stack = findExcalidrawToolbarStack(root);
      if (!stack) {
        setMount(null);
        return;
      }

      const isMobile = Boolean(root.querySelector(".excalidraw--mobile"));

      let anchor = stack.querySelector(`.${COLOR_TOOLBAR_MOUNT_CLASS}`) as HTMLElement | null;
      if (!anchor) {
        anchor = document.createElement("div");
        anchor.className = `${COLOR_TOOLBAR_MOUNT_CLASS} flex items-center justify-center shrink-0`;
        if (isMobile) {
          stack.appendChild(anchor);
        } else {
          stack.prepend(anchor);
        }
      } else if (isMobile) {
        if (anchor.parentElement !== stack || stack.lastElementChild !== anchor) {
          stack.appendChild(anchor);
        }
      } else if (anchor.parentElement !== stack || stack.firstElementChild !== anchor) {
        stack.prepend(anchor);
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
    <WhiteboardColorToolbar
      apiRef={apiRef}
      strokeColor={strokeColor}
      fillColor={fillColor}
      strokeWidth={strokeWidth}
      opacity={opacity}
      onStrokeColorChange={onStrokeColorChange}
      onFillColorChange={onFillColorChange}
      onStrokeWidthChange={onStrokeWidthChange}
      onOpacityChange={onOpacityChange}
      touchFriendly={touchFriendly}
      embedded
    />,
    mount,
  );
}

/** @deprecated Use WhiteboardColorToolbarPortal */
export const WhiteboardMobileColorToolbarPortal = WhiteboardColorToolbarPortal;
