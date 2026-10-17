import { composerHighlights } from "@/lib/messages";

const MENTION_STYLE =
  "color:#1f6b12;background-color:rgba(58,184,25,0.15);border-radius:0.375rem;font-weight:400;-webkit-text-stroke:0;paint-order:normal";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Mention styling lives in the editable text, so the caret stays on the letters. */
export function composerHtml(body: string, names: string[]) {
  if (!body) return "";
  return composerHighlights(body, names)
    .map((part) => {
      const html = escapeHtml(part.value).replace(/\n/g, "<br>");
      if (part.type !== "mention") return html;
      return `<span data-mention="true" style="${MENTION_STYLE}">${html}</span>`;
    })
    .join("");
}

export function readComposerText(root: HTMLElement) {
  let text = "";
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? "").replace(/\u00a0/g, " ");
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") {
      text += "\n";
      return;
    }
    node.childNodes.forEach(walk);
  }
  root.childNodes.forEach(walk);
  return text;
}

export function caretOffset(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return readComposerText(root).length;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.endContainer)) return readComposerText(root).length;

  let offset = 0;
  let found = false;
  function walk(node: Node) {
    if (found) return;
    if (node === range.endContainer) {
      if (node.nodeType === Node.TEXT_NODE) offset += range.endOffset;
      else {
        const children = node.childNodes;
        for (let index = 0; index < range.endOffset; index += 1) walk(children[index]!);
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") {
      offset += 1;
      return;
    }
    node.childNodes.forEach(walk);
  }
  walk(root);
  return offset;
}

export function placeCaret(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  let remaining = offset;

  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        return true;
      }
      remaining -= length;
      return false;
    }
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") {
      if (remaining === 0) {
        range.setStartBefore(node);
        range.collapse(true);
        return true;
      }
      remaining -= 1;
      return false;
    }
    for (const child of node.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  }

  if (!root.firstChild || !walk(root)) {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}
