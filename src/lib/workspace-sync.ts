import { supabase } from "@/integrations/supabase/client";
import { pushWorkspaceDocument, pullWorkspaceDocuments } from "@/lib/api/workspace.functions";
import { saveWorkspaceGoogleGrant } from "@/lib/api/google.functions";
import { adoptCommunityStore, readPersistedCommunity, type CommunityStore } from "@/lib/community";
import { adoptEmailCopy, readPersistedEmailCopy } from "@/lib/email-templates";
import { adoptFormQuestions, readPersistedFormQuestions } from "@/lib/form-definitions";
import { ensureGoogleAccessToken, readGoogleAccessToken, readGoogleRefreshToken, rememberGoogleSession } from "@/lib/google";
import { adoptMessagesStore, readPersistedMessages, type MessagesStore } from "@/lib/messages";
import { adoptTeamMembers, readPersistedTeam, type TeamMember } from "@/lib/team-members";
import { isAdmin } from "@/lib/user-role";
import {
  asCommunitySnapshot,
  asMessagesSnapshot,
  communityHasRecords,
  mergeCommunity,
  mergeMessages,
  messagesHaveRecords,
  unionByEmail,
  unionObjects,
  type CommunitySnapshot,
  type MessagesSnapshot,
} from "@/lib/workspace-merge";
import type { WorkspaceDocumentId } from "@/lib/workspace-documents.server";

export const WORKSPACE_HYDRATED_EVENT = "fcw-workspace-hydrated";

const DIRTY_KEY = "fcw-workspace-dirty";
const DOCUMENT_IDS: WorkspaceDocumentId[] = ["community", "team", "messages", "form-questions", "email-copy"];

let lastHydrate = 0;
let hydrating: Promise<void> | null = null;
let listening = false;

function readDirty(): Partial<Record<WorkspaceDocumentId, number>> {
  try {
    const parsed = JSON.parse(localStorage.getItem(DIRTY_KEY) || "{}") as Partial<Record<WorkspaceDocumentId, number>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markDirty(id: WorkspaceDocumentId) {
  const dirty = readDirty();
  dirty[id] = Date.now();
  localStorage.setItem(DIRTY_KEY, JSON.stringify(dirty));
}

function clearDirty(id: WorkspaceDocumentId) {
  const dirty = readDirty();
  delete dirty[id];
  localStorage.setItem(DIRTY_KEY, JSON.stringify(dirty));
}

const pushTimers = new Map<WorkspaceDocumentId, number>();

export function publishWorkspaceDocument(id: WorkspaceDocumentId, document: unknown) {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  markDirty(id);
  const pending = pushTimers.get(id);
  if (pending) window.clearTimeout(pending);
  pushTimers.set(
    id,
    window.setTimeout(() => {
      pushTimers.delete(id);
      void pushWorkspaceDocument({ data: { id, document: document as never } })
        .then((result) => {
          if (result.ok) clearDirty(id);
        })
        .catch(() => undefined);
    }, 500),
  );
}

function listenForFocus() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("focus", () => {
    void hydrateWorkspace();
  });
}

async function rememberWorkspaceGrant() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user || !isAdmin(session.user)) return;
  rememberGoogleSession(session);
  const refreshToken = session.provider_refresh_token || readGoogleRefreshToken();
  const accessToken = readGoogleAccessToken(session.provider_token);
  if (!refreshToken || !accessToken || import.meta.env.DEV) return;
  await saveWorkspaceGoogleGrant({ data: { accessToken, refreshToken } }).catch(() => undefined);
}

function localDocument(id: WorkspaceDocumentId): unknown | null {
  if (id === "community") return readPersistedCommunity();
  if (id === "team") return readPersistedTeam();
  if (id === "messages") return readPersistedMessages();
  if (id === "form-questions") return readPersistedFormQuestions();
  return readPersistedEmailCopy();
}

function hasContent(id: WorkspaceDocumentId, value: unknown) {
  if (value == null) return false;
  if (id === "community") {
    const store = asCommunitySnapshot(value);
    return Boolean(store && communityHasRecords(store));
  }
  if (id === "team") return Array.isArray(value) && value.length > 0;
  if (id === "messages") {
    const store = asMessagesSnapshot(value);
    return Boolean(store && messagesHaveRecords(store));
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).length > 0;
}

function mergeDocument(id: WorkspaceDocumentId, primary: unknown, secondary: unknown) {
  if (id === "community") {
    const first = asCommunitySnapshot(primary) ?? emptyCommunity();
    const second = asCommunitySnapshot(secondary) ?? emptyCommunity();
    return mergeCommunity(first, second);
  }
  if (id === "team") {
    const first = Array.isArray(primary) ? (primary as TeamMember[]) : [];
    const second = Array.isArray(secondary) ? (secondary as TeamMember[]) : [];
    return unionByEmail(first, second);
  }
  if (id === "messages") {
    const first = asMessagesSnapshot(primary) ?? emptyMessages();
    const second = asMessagesSnapshot(secondary) ?? emptyMessages();
    return mergeMessages(first, second);
  }
  const first = primary && typeof primary === "object" && !Array.isArray(primary) ? (primary as Record<string, unknown>) : {};
  const second = secondary && typeof secondary === "object" && !Array.isArray(secondary) ? (secondary as Record<string, unknown>) : {};
  return unionObjects(first, second);
}

function emptyCommunity(): CommunitySnapshot {
  return { children: [], guardians: [], volunteers: [], partners: [] };
}

function emptyMessages(): MessagesSnapshot {
  return { threads: [], messages: [], notifications: [], threadReads: {} };
}

function adopt(id: WorkspaceDocumentId, document: unknown) {
  if (id === "community") {
    const store = asCommunitySnapshot(document);
    if (store) adoptCommunityStore(store as CommunityStore);
    return;
  }
  if (id === "team") {
    if (Array.isArray(document)) adoptTeamMembers(document as TeamMember[]);
    return;
  }
  if (id === "messages") {
    const store = asMessagesSnapshot(document);
    if (store) adoptMessagesStore(store as MessagesStore);
    return;
  }
  if (id === "form-questions") {
    adoptFormQuestions(document);
    return;
  }
  adoptEmailCopy(document);
}

async function pushDocument(id: WorkspaceDocumentId, document: unknown) {
  const result = await pushWorkspaceDocument({ data: { id, document: document as never } });
  return result.ok;
}

async function reconcile(id: WorkspaceDocumentId, remote: unknown | null, dirty: boolean) {
  const local = localDocument(id);
  const localContent = hasContent(id, local);
  const remoteContent = hasContent(id, remote);

  if (!localContent && !remoteContent) {
    clearDirty(id);
    return false;
  }

  if (!localContent && remoteContent) {
    if (dirty && !import.meta.env.DEV) {
      const ok = await pushDocument(id, local ?? (id === "team" ? [] : id === "community" ? emptyCommunity() : id === "messages" ? emptyMessages() : {}));
      if (ok) clearDirty(id);
      return false;
    }
    adopt(id, remote);
    clearDirty(id);
    return true;
  }

  if (localContent && !remoteContent) {
    if (!import.meta.env.DEV) {
      const ok = await pushDocument(id, local);
      if (ok) clearDirty(id);
    }
    return false;
  }

  const merged = mergeDocument(id, dirty ? local : remote, dirty ? remote : local);
  const changed = JSON.stringify(local) !== JSON.stringify(merged);
  if (changed) adopt(id, merged);
  if (!import.meta.env.DEV && JSON.stringify(merged) !== JSON.stringify(remote)) {
    const ok = await pushDocument(id, merged);
    if (ok) clearDirty(id);
  } else {
    clearDirty(id);
  }
  return changed;
}

export async function hydrateWorkspace() {
  if (typeof window === "undefined") return;
  listenForFocus();
  const now = Date.now();
  if (hydrating) return hydrating;
  if (now - lastHydrate < 15_000) return;
  lastHydrate = now;
  hydrating = runHydrate().finally(() => {
    hydrating = null;
  });
  return hydrating;
}

async function runHydrate() {
  try {
    await rememberWorkspaceGrant().catch(() => undefined);
    let documents: { id: string; document: unknown }[] | null = null;
    try {
      const pulled = await pullWorkspaceDocuments();
      if (!pulled) return;
      documents = pulled.documents;
    } catch {
      return;
    }

    const dirty = readDirty();
    const remoteById = new Map(documents.map((item) => [item.id, item.document]));
    let changed = false;
    for (const id of DOCUMENT_IDS) {
      try {
        const didChange = await reconcile(id, remoteById.get(id) ?? null, Boolean(dirty[id]));
        changed = changed || didChange;
      } catch (error) {
        console.error(error);
      }
    }
    if (changed) window.dispatchEvent(new Event(WORKSPACE_HYDRATED_EVENT));
  } finally {
    await ensureGoogleAccessToken().catch(() => undefined);
  }
}
