import { isDevMock, MOCK_MESSAGES, MOCK_MESSAGE_THREADS } from "@/lib/dev-mock-data";
import { supabase } from "@/integrations/supabase/client";
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
  participantEmails?: string[];
  updatedAt: string;
};

export type MessageNotification = {
  id: string;
  recipientId: string;
  recipientEmail?: string;
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

export function readPersistedMessages(): MessagesStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeStore(JSON.parse(raw) as Partial<MessagesStore>);
  } catch {
    return null;
  }
}

export function adoptMessagesStore(store: MessagesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStore(store)));
  notifyMessagesChanged();
}

function writeStore(store: MessagesStore, syncRemote = true) {
  adoptMessagesStore(store);
  if (!syncRemote) return;
  void pushDirectedMessages(store);
  void import("@/lib/workspace-sync")
    .then(({ publishWorkspaceDocument }) => publishWorkspaceDocument("messages", store))
    .catch(() => undefined);
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
  current: { id: string; name: string; email: string },
  other: { id: string; name: string; email: string },
): { store: MessagesStore; thread: MessageThread } {
  return findOrCreateGroup(store, current, [other]);
}

/** Open the conversation with this exact set of people, or start one. */
export function findOrCreateGroup(
  store: MessagesStore,
  current: { id: string; name: string; email: string },
  others: { id: string; name: string; email: string }[],
): { store: MessagesStore; thread: MessageThread } {
  const uniqueOthers = others.filter(
    (person, index, list) =>
      person.id !== current.id && list.findIndex((item) => item.id === person.id) === index,
  );
  const ids = [current.id, ...uniqueOthers.map((person) => person.id)].sort();
  const emails = [current.email, ...uniqueOthers.map((person) => person.email)].map((email) =>
    email.trim().toLowerCase(),
  );
  const existing = store.threads.find((thread) => {
    const threadEmails = (thread.participantEmails ?? []).map((email) => email.toLowerCase()).sort();
    const wanted = [...emails].sort();
    if (threadEmails.length > 0 && threadEmails.length === wanted.length) {
      return threadEmails.every((email, index) => email === wanted[index]);
    }
    if (thread.participantIds.length !== ids.length) return false;
    const sorted = [...thread.participantIds].sort();
    return sorted.every((id, index) => id === ids[index]);
  });
  if (existing) return { store, thread: existing };

  const thread: MessageThread = {
    id: crypto.randomUUID(),
    participantIds: [current.id, ...uniqueOthers.map((person) => person.id)],
    participantNames: [current.name, ...uniqueOthers.map((person) => person.name)],
    participantEmails: emails,
    updatedAt: new Date().toISOString(),
  };
  const next = { ...store, threads: [thread, ...store.threads] };
  writeStore(next);
  return { store: next, thread };
}

export function isGroupThread(thread: MessageThread) {
  return thread.participantIds.length > 2;
}

function previewText(body: string, max = 90) {
  const trimmed = body.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function emailForMember(members: TeamMember[], memberId: string, thread: MessageThread) {
  const fromDirectory = members.find((member) => member.id === memberId)?.email;
  if (fromDirectory) return fromDirectory.trim().toLowerCase();
  const index = thread.participantIds.indexOf(memberId);
  const fromThread = index >= 0 ? thread.participantEmails?.[index] : undefined;
  return fromThread?.trim().toLowerCase();
}

function notificationsForMessage(
  message: TeamMessage,
  thread: MessageThread,
  members: TeamMember[] = [],
): MessageNotification[] {
  const mentionIds = new Set(message.mentions.map((m) => m.memberId));
  const items: MessageNotification[] = [];

  for (const mention of message.mentions) {
    if (mention.memberId === message.senderId) continue;
    items.push({
      id: crypto.randomUUID(),
      recipientId: mention.memberId,
      recipientEmail: emailForMember(members, mention.memberId, thread),
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
      recipientEmail: emailForMember(members, participantId, thread),
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
      ...notificationsForMessage(message, thread, input.members),
      ...store.notifications,
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
  writeStore(next);
  return next;
}

export function threadPartnerName(thread: MessageThread, currentId: string) {
  const others = thread.participantIds
    .map((id, index) => ({ id, name: thread.participantNames[index] || "Teammate" }))
    .filter((person) => person.id !== currentId);
  if (others.length === 0) return thread.participantNames[0] ?? "Team";
  if (others.length === 1) return others[0]!.name;
  if (others.length === 2) return `${others[0]!.name}, ${others[1]!.name}`;
  return `${others[0]!.name}, ${others[1]!.name} +${others.length - 2}`;
}

export function threadIncludesUser(thread: MessageThread, userId: string, email?: string) {
  if (thread.participantIds.includes(userId)) return true;
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return (thread.participantEmails ?? []).some((item) => item.toLowerCase() === normalized);
}

export function threadsForUser(store: MessagesStore, userId: string, email?: string) {
  return store.threads
    .filter((thread) => threadIncludesUser(thread, userId, email))
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

export function totalUnreadMessageCount(store: MessagesStore, userId: string, email?: string) {
  return threadsForUser(store, userId, email).reduce(
    (sum, thread) => sum + unreadCountForThread(store, userId, thread.id),
    0,
  );
}

export function notificationForUser(notification: MessageNotification, userId: string, email?: string) {
  if (notification.recipientId === userId) return true;
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && notification.recipientEmail?.toLowerCase() === normalized);
}

export function notificationsForUser(store: MessagesStore, userId: string, email?: string) {
  return store.notifications
    .filter((notification) => notificationForUser(notification, userId, email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(store: MessagesStore, userId: string, email?: string) {
  return notificationsForUser(store, userId, email).filter((n) => !n.read).length;
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

/** Highlight saved mentions and the @name still being typed. */
export function composerHighlights(
  body: string,
  names: string[],
): Array<{ type: "text" | "mention"; value: string }> {
  if (!body) return [];
  const sorted = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
  const namePattern = sorted.map((name) => escapeRegExp(name)).join("|");
  const pattern = namePattern
    ? new RegExp(`(@(?:${namePattern})(?![\\w])|@[^\\s@]*$)`, "gi")
    : /(@[^\s@]*$)/g;
  const parts = body.split(pattern);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      type: part.startsWith("@") ? ("mention" as const) : ("text" as const),
      value: part,
    }));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function senderEmailFor(message: TeamMessage, thread: MessageThread | undefined) {
  if (!thread) return "";
  const index = thread.participantIds.indexOf(message.senderId);
  return thread.participantEmails?.[index]?.trim().toLowerCase() ?? "";
}

async function pushDirectedMessages(store: MessagesStore) {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email?.trim().toLowerCase();
  if (!email) return;

  const threads = store.threads.filter((thread) =>
    (thread.participantEmails ?? []).some((item) => item.toLowerCase() === email),
  );
  if (threads.length === 0) return;

  const { error: threadError } = await supabase.from("message_threads").upsert(
    threads.map((thread) => ({
      id: thread.id,
      participant_emails: (thread.participantEmails ?? []).map((item) => item.toLowerCase()),
      participant_names: thread.participantNames,
      updated_at: thread.updatedAt,
    })),
  );
  if (threadError) return;

  const threadIds = new Set(threads.map((thread) => thread.id));
  const messages = store.messages.flatMap((message) => {
    if (!threadIds.has(message.threadId)) return [];
    const thread = threads.find((item) => item.id === message.threadId);
    const senderEmail = senderEmailFor(message, thread);
    if (!senderEmail) return [];
    return [
      {
        id: message.id,
        thread_id: message.threadId,
        sender_email: senderEmail,
        sender_name: message.senderName,
        body: message.body,
        mentions: message.mentions as unknown as import("@/integrations/supabase/types").Json,
        created_at: message.createdAt,
      },
    ];
  });
  if (messages.length === 0) return;
  await supabase.from("direct_messages").upsert(messages);
}

/** Load messages this signed-in person is part of, from the shared store. */
export async function pullDirectedMessages(
  current: { id: string; email: string },
  members: TeamMember[],
): Promise<MessagesStore | null> {
  const email = current.email.trim().toLowerCase();
  if (!email) return null;

  const { data: threadRows, error } = await supabase
    .from("message_threads")
    .select("id, participant_emails, participant_names, updated_at");
  if (error || !threadRows) return null;

  const { data: messageRows, error: messageError } = await supabase
    .from("direct_messages")
    .select("id, thread_id, sender_email, sender_name, body, mentions, created_at");
  if (messageError || !messageRows) return null;

  const local = readStore();
  const serverThreadIds = new Set(threadRows.map((row) => row.id));
  const remappedThreads: MessageThread[] = threadRows.map((row) => {
    const emails = row.participant_emails.map((item) => item.toLowerCase());
    const participantIds = emails.map((item) => {
      if (item === email) return current.id;
      return members.find((member) => member.email.toLowerCase() === item)?.id ?? item;
    });
    return {
      id: row.id,
      participantIds,
      participantNames: row.participant_names,
      participantEmails: emails,
      updatedAt: row.updated_at,
    };
  });

  const remappedMessages: TeamMessage[] = messageRows.map((row) => {
    const thread = remappedThreads.find((item) => item.id === row.thread_id);
    const senderIndex = thread?.participantEmails?.indexOf(row.sender_email.toLowerCase()) ?? -1;
    const mentions = Array.isArray(row.mentions) ? (row.mentions as MessageMention[]) : [];
    return {
      id: row.id,
      threadId: row.thread_id,
      senderId: senderIndex >= 0 ? thread!.participantIds[senderIndex]! : row.sender_email,
      senderName: row.sender_name,
      body: row.body,
      mentions,
      createdAt: row.created_at,
    };
  });

  const next: MessagesStore = {
    ...local,
    threads: [...remappedThreads, ...local.threads.filter((thread) => !serverThreadIds.has(thread.id))].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    ),
    messages: [
      ...remappedMessages,
      ...local.messages.filter((message) => !serverThreadIds.has(message.threadId)),
    ],
  };
  writeStore(next, false);
  return next;
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
