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

export type MessageNotification = {
  id: string;
  recipientId: string;
  threadId: string;
  messageId: string;
  kind: "message" | "mention";
  actorName: string;
  preview: string;
  createdAt: string;
  read: boolean;
};

export type MessagesStore = {
  threads: MessageThread[];
  messages: TeamMessage[];
  notifications: MessageNotification[];
  /** `${userId}:${threadId}` → ISO last-read timestamp */
  threadReads: Record<string, string>;
};

const STORAGE_KEY = "fcw-messages";
const CHANGED_EVENT = "fcw-messages-changed";

const EMPTY_STORE: MessagesStore = {
  threads: [],
  messages: [],
  notifications: [],
  threadReads: {},
};

function normalizeStore(parsed: Partial<MessagesStore>): MessagesStore {
  return {
    threads: Array.isArray(parsed.threads) ? parsed.threads : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    threadReads:
      parsed.threadReads && typeof parsed.threadReads === "object" ? parsed.threadReads : {},
  };
}

function seedStore(): MessagesStore {
  const seeded = normalizeStore({
    threads: [...MOCK_MESSAGE_THREADS],
    messages: [...MOCK_MESSAGES],
  });
  return {
    ...seeded,
    notifications: buildSeedNotifications(seeded),
  };
}

/** Demo inbox items from seeded mock messages (mentions + latest inbound). */
function buildSeedNotifications(store: MessagesStore): MessageNotification[] {
  const notifications: MessageNotification[] = [];

  for (const message of store.messages) {
    const thread = store.threads.find((t) => t.id === message.threadId);
    if (!thread) continue;

    const mentionIds = new Set(message.mentions.map((m) => m.memberId));
    for (const mention of message.mentions) {
      if (mention.memberId === message.senderId) continue;
      notifications.push({
        id: `mock-notif-${message.id}-mention-${mention.memberId}`,
        recipientId: mention.memberId,
        threadId: message.threadId,
        messageId: message.id,
        kind: "mention",
        actorName: message.senderName,
        preview: message.body,
        createdAt: message.createdAt,
        read: false,
      });
    }

    for (const participantId of thread.participantIds) {
      if (participantId === message.senderId || mentionIds.has(participantId)) continue;
      notifications.push({
        id: `mock-notif-${message.id}-message-${participantId}`,
        recipientId: participantId,
        threadId: message.threadId,
        messageId: message.id,
        kind: "message",
        actorName: message.senderName,
        preview: message.body,
        createdAt: message.createdAt,
        read: false,
      });
    }
  }

  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function readStore(): MessagesStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (isDevMock) {
        const seeded = seedStore();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return EMPTY_STORE;
    }
    const store = normalizeStore(JSON.parse(raw) as Partial<MessagesStore>);
    // Migrate older local stores that predate notifications.
    if (store.notifications.length === 0 && store.messages.length > 0) {
      const migrated = { ...store, notifications: buildSeedNotifications(store) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return store;
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(store: MessagesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  notifyMessagesChanged();
}

export function notifyMessagesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Subscribe to same-tab + cross-tab message store updates. */
export function subscribeMessagesChanged(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function loadMessagesStore(): MessagesStore {
  return readStore();
}

export function saveMessagesStore(store: MessagesStore) {
  writeStore(store);
}

export function threadReadKey(userId: string, threadId: string) {
  return `${userId}:${threadId}`;
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

function previewText(body: string, max = 90) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function notificationsForMessage(
  message: TeamMessage,
  thread: MessageThread,
): MessageNotification[] {
  const mentionIds = new Set(message.mentions.map((m) => m.memberId));
  const items: MessageNotification[] = [];

  for (const mention of message.mentions) {
    if (mention.memberId === message.senderId) continue;
    items.push({
      id: crypto.randomUUID(),
      recipientId: mention.memberId,
      threadId: message.threadId,
      messageId: message.id,
      kind: "mention",
      actorName: message.senderName,
      preview: previewText(message.body),
      createdAt: message.createdAt,
      read: false,
    });
  }

  for (const participantId of thread.participantIds) {
    if (participantId === message.senderId || mentionIds.has(participantId)) continue;
    items.push({
      id: crypto.randomUUID(),
      recipientId: participantId,
      threadId: message.threadId,
      messageId: message.id,
      kind: "message",
      actorName: message.senderName,
      preview: previewText(message.body),
      createdAt: message.createdAt,
      read: false,
    });
  }

  return items;
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

  const thread = store.threads.find((t) => t.id === input.threadId);
  if (!thread) return store;

  const message: TeamMessage = {
    id: crypto.randomUUID(),
    threadId: input.threadId,
    senderId: input.senderId,
    senderName: input.senderName,
    body,
    mentions: parseMentions(body, input.members),
    createdAt: new Date().toISOString(),
  };

  const threads = store.threads.map((t) =>
    t.id === input.threadId ? { ...t, updatedAt: message.createdAt } : t,
  );

  const next: MessagesStore = {
    ...store,
    threads: [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    messages: [...store.messages, message],
    notifications: [
      ...notificationsForMessage(message, thread),
      ...store.notifications,
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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

export function unreadCountForThread(store: MessagesStore, userId: string, threadId: string) {
  const lastRead = store.threadReads[threadReadKey(userId, threadId)];
  return messagesForThread(store, threadId).filter((message) => {
    if (message.senderId === userId) return false;
    if (!lastRead) return true;
    return message.createdAt > lastRead;
  }).length;
}

export function totalUnreadMessageCount(store: MessagesStore, userId: string) {
  return threadsForUser(store, userId).reduce(
    (sum, thread) => sum + unreadCountForThread(store, userId, thread.id),
    0,
  );
}

export function notificationsForUser(store: MessagesStore, userId: string) {
  return store.notifications
    .filter((n) => n.recipientId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(store: MessagesStore, userId: string) {
  return notificationsForUser(store, userId).filter((n) => !n.read).length;
}

export function markThreadRead(
  store: MessagesStore,
  userId: string,
  threadId: string,
): MessagesStore {
  const now = new Date().toISOString();
  const next: MessagesStore = {
    ...store,
    threadReads: {
      ...store.threadReads,
      [threadReadKey(userId, threadId)]: now,
    },
    notifications: store.notifications.map((n) =>
      n.recipientId === userId && n.threadId === threadId && !n.read ? { ...n, read: true } : n,
    ),
  };
  writeStore(next);
  return next;
}

export function markNotificationRead(store: MessagesStore, notificationId: string): MessagesStore {
  const target = store.notifications.find((n) => n.id === notificationId);
  if (!target || target.read) return store;

  const next: MessagesStore = {
    ...store,
    notifications: store.notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    ),
    threadReads: {
      ...store.threadReads,
      [threadReadKey(target.recipientId, target.threadId)]:
        store.threadReads[threadReadKey(target.recipientId, target.threadId)] ?? target.createdAt,
    },
  };
  writeStore(next);
  return next;
}

export function markAllNotificationsRead(store: MessagesStore, userId: string): MessagesStore {
  const now = new Date().toISOString();
  const threadReads = { ...store.threadReads };
  for (const n of store.notifications) {
    if (n.recipientId !== userId) continue;
    const key = threadReadKey(userId, n.threadId);
    if (!threadReads[key] || threadReads[key]! < n.createdAt) {
      threadReads[key] = now;
    }
  }

  const next: MessagesStore = {
    ...store,
    threadReads,
    notifications: store.notifications.map((n) =>
      n.recipientId === userId && !n.read ? { ...n, read: true } : n,
    ),
  };
  writeStore(next);
  return next;
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
