import { useEffect, type RefObject } from "react";

const ACTIONS_MOUNT_CLASS = "fcw-mobile-toolbar-actions";
const LASER_BUTTON_CLASS = "fcw-laser-tool-button";

function getFooterToolButtons(footerContent: Element) {
  return [...footerContent.querySelectorAll(":scope > button.ToolIcon_type_button")];
}

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

function syncMobileToolbar(root: HTMLElement) {
  if (!root.querySelector(".excalidraw--mobile")) return;

  hideExtraToolsMenu(root);

  root.querySelectorAll(`.${LASER_BUTTON_CLASS}`).forEach((el) => el.remove());

  const footerContent = root.querySelector(
    ".App-bottom-bar footer.App-toolbar .App-toolbar-content",
  );
  const topStack = root.querySelector(
    ".App-toolbar--mobile .Stack.Stack_horizontal",
  );

  if (!footerContent || !topStack) return;

  const [editButton, duplicateButton, deleteButton] = getFooterToolButtons(footerContent);

  if (editButton) {
    editButton.style.display = "none";
  }

  if (!duplicateButton && !deleteButton) return;

  let mount = topStack.querySelector(`.${ACTIONS_MOUNT_CLASS}`) as HTMLElement | null;
  if (!mount) {
    mount = document.createElement("div");
    mount.className = `${ACTIONS_MOUNT_CLASS} Stack Stack_horizontal`;
    mount.style.setProperty("--gap", "1");
    topStack.appendChild(mount);
  }

  for (const button of [duplicateButton, deleteButton]) {
    if (button && button.parentElement !== mount) {
      mount.appendChild(button);
    }
  }
}

type WhiteboardMobileToolbarPortalProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

export function WhiteboardMobileToolbarPortal({
  containerRef,
}: WhiteboardMobileToolbarPortalProps) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    syncMobileToolbar(root);

    const observer = new MutationObserver(() => {
      syncMobileToolbar(root);
    });

    observer.observe(root, {
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
