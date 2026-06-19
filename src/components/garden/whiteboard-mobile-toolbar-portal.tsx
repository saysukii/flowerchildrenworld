import { useEffect, type RefObject } from "react";
import { findExcalidrawToolbarStack } from "@/components/garden/whiteboard-color-toolbar-portal";

const ACTIONS_MOUNT_CLASS = "fcw-mobile-toolbar-actions";
const LASER_BUTTON_CLASS = "fcw-laser-tool-button";

function hideExtraToolsMenu(root: HTMLElement) {
  root.querySelectorAll('[data-testid="toolbar-frame"]').forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
  root.querySelectorAll('[data-testid="toolbar-embeddable"]').forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  const dropdown = root.querySelector(".App-toolbar__extra-tools-dropdown");
  if (dropdown) {
    (dropdown as HTMLElement).style.display = "none";
  }

  const trigger = root.querySelector(".App-toolbar__extra-tools-trigger");
  if (trigger) {
    (trigger as HTMLElement).style.display = "none";
  }
}

function hideFooterEditButton(root: HTMLElement) {
  const footerContent = root.querySelector(
    ".App-bottom-bar footer.App-toolbar .App-toolbar-content",
  );
  if (!footerContent) return;

  const editButton = footerContent.querySelector("button.ToolIcon_type_button");
  if (editButton instanceof HTMLElement) {
    editButton.style.display = "none";
  }
}

function hideSidebarTrigger(root: HTMLElement) {
  root.querySelectorAll(".mobile-misc-tools-container").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
}

function syncCompactToolbar(root: HTMLElement) {
  const isCompact = Boolean(root.querySelector(".excalidraw--mobile"));
  if (!isCompact) return;

  hideExtraToolsMenu(root);
  hideFooterEditButton(root);
  hideSidebarTrigger(root);
  root.querySelectorAll(`.${LASER_BUTTON_CLASS}`).forEach((el) => el.remove());

  const topStack = findExcalidrawToolbarStack(root);
  topStack?.querySelector(`.${ACTIONS_MOUNT_CLASS}`)?.remove();
}

type WhiteboardMobileToolbarPortalProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

export function WhiteboardMobileToolbarPortal({
  containerRef,
}: WhiteboardMobileToolbarPortalProps) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sync = () => syncCompactToolbar(el);

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [containerRef]);

  return null;
}

export function hasWhiteboardSelection(appState: Record<string, unknown>): boolean {
  const selected = appState.selectedElementIds;
  if (selected instanceof Set) return selected.size > 0;
  if (selected && typeof selected === "object") {
    return Object.values(selected as Record<string, unknown>).some(Boolean);
  }
  return false;
}
