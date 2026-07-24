import { isDevMock, MOCK_MESSAGES, MOCK_MESSAGE_THREADS } from "@/lib/dev-mock-data";
import type { TeamMember } from "@/lib/team-members";

export type MessageMention = {
  memberId: string;
  name: string;
};

export type TeamMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  mentions: MessageMention[];
  createdAt: string;
};

export type MessageThread = {
  id: string;
  participantIds: string[];
  participantNames: string[];
  updatedAt: string;
};

export type MessagesStore = {
  threads: MessageThread[];
  messages: TeamMessage[];
};

const STORAGE_KEY = "fcw-messages";

const EMPTY_STORE: MessagesStore = { threads: [], messages: [] };

function readStore(): MessagesStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (isDevMock) {
        const seeded = { threads: [...MOCK_MESSAGE_THREADS], messages: [...MOCK_MESSAGES] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return EMPTY_STORE;
    }
    const parsed = JSON.parse(raw) as Partial<MessagesStore>;
    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(store: MessagesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadMessagesStore(): MessagesStore {
  return readStore();
}

export function saveMessagesStore(store: MessagesStore) {
  writeStore(store);
}

/** Match @Name against team members (longest names first so "Jordan Lee" wins over "Jordan"). */
export function parseMentions(body: string, members: TeamMember[]): MessageMention[] {
  if (!body.includes("@")) return [];
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const found: MessageMention[] = [];
  const seen = new Set<string>();

  for (const member of sorted) {
    const needle = `@${member.name}`;
    let from = 0;
    while (from < body.length) {
      const idx = body.toLowerCase().indexOf(needle.toLowerCase(), from);
      if (idx === -1) break;
      const before = body[idx - 1];
      const after = body[idx + needle.length];
      const boundaryBefore = idx === 0 || !/[A-Za-z0-9_]/.test(before ?? "");
      const boundaryAfter = after === undefined || !/[A-Za-z0-9_]/.test(after);
      if (boundaryBefore && boundaryAfter && !seen.has(member.id)) {
        seen.add(member.id);
        found.push({ memberId: member.id, name: member.name });
      }
      from = idx + needle.length;
    }
  }

  return found;
}

export function findOrCreateThread(
  store: MessagesStore,
  current: { id: string; name: string },
  other: { id: string; name: string },
): { store: MessagesStore; thread: MessageThread } {
  const existing = store.threads.find((thread) => {
    if (thread.participantIds.length !== 2) return false;
    const set = new Set(thread.participantIds);
    return set.has(current.id) && set.has(other.id);
  });

  if (existing) return { store, thread: existing };

  const thread: MessageThread = {
    id: crypto.randomUUID(),
    participantIds: [current.id, other.id],
    participantNames: [current.name, other.name],
    updatedAt: new Date().toISOString(),
  };

  const next = { ...store, threads: [thread, ...store.threads] };
  writeStore(next);
  return { store: next, thread };
}

export function sendMessage(
  store: MessagesStore,
  input: {
    threadId: string;
    senderId: string;
    senderName: string;
    body: string;
    members: TeamMember[];
  },
): MessagesStore {
  const body = input.body.trim();
  if (!body) return store;

  const message: TeamMessage = {
    id: crypto.randomUUID(),
    threadId: input.threadId,
    senderId: input.senderId,
    senderName: input.senderName,
    body,
    mentions: parseMentions(body, input.members),
    createdAt: new Date().toISOString(),
  };

  const threads = store.threads.map((thread) =>
    thread.id === input.threadId ? { ...thread, updatedAt: message.createdAt } : thread,
  );

  const next = {
    threads: [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    messages: [...store.messages, message],
  };
  writeStore(next);
  return next;
}

export function threadPartnerName(thread: MessageThread, currentId: string) {
  const idx = thread.participantIds.indexOf(currentId);
  if (idx === -1) return thread.participantNames[0] ?? "Team";
  const otherIdx = idx === 0 ? 1 : 0;
  return thread.participantNames[otherIdx] ?? thread.participantNames[0] ?? "Team";
}

export function threadsForUser(store: MessagesStore, userId: string) {
  return store.threads
    .filter((thread) => thread.participantIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function messagesForThread(store: MessagesStore, threadId: string) {
  return store.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function lastMessagePreview(store: MessagesStore, threadId: string) {
  const msgs = messagesForThread(store, threadId);
  const last = msgs[msgs.length - 1];
  return last?.body ?? "No messages yet";
}

/** Split body into text / mention segments for rendering. */
export function mentionSegments(
  body: string,
  mentions: MessageMention[],
): Array<{ type: "text" | "mention"; value: string }> {
  if (mentions.length === 0) return [{ type: "text", value: body }];

  const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(
    `(@(?:${sorted.map((m) => escapeRegExp(m.name)).join("|")}))`,
    "gi",
  );

  const parts = body.split(pattern);
  const nameSet = new Set(sorted.map((m) => m.name.toLowerCase()));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("@") && nameSet.has(part.slice(1).toLowerCase())) {
        return { type: "mention" as const, value: part };
      }
      return { type: "text" as const, value: part };
    });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
