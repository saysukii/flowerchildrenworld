import { exportToBlob, getTextFromElements } from "@excalidraw/excalidraw";
import type { ExcalidrawApi } from "@/lib/garden-whiteboard-types";

export async function whiteboardSceneToNoteBody(api: ExcalidrawApi) {
  const elements = api.getSceneElements();
  const appState = api.getAppState();
  const files = api.getFiles();

  const blob = await exportToBlob({
    elements: elements as never,
    appState: {
      ...appState,
      exportBackground: true,
    },
    files: files as never,
    mimeType: "image/png",
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const text = getTextFromElements(elements as never).trim();
  const parts = [
    "<p>Exported from the Garden whiteboard.</p>",
    text ? `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>` : "",
    `<p><img src="${dataUrl}" alt="Whiteboard sketch" style="max-width: 100%; border-radius: 12px;" /></p>`,
  ];

  return parts.filter(Boolean).join("\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
