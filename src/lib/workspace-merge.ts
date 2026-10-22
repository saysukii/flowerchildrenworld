export type IdRecord = { id: string };

export function unionById<T extends IdRecord>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of primary) {
    if (!item?.id) continue;
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return [...map.values()];
}

export function unionByEmail<T extends { email?: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  const keyOf = (item: T) => (typeof item?.email === "string" ? item.email.trim().toLowerCase() : "");
  for (const item of secondary) {
    const key = keyOf(item);
    if (key) map.set(key, item);
  }
  for (const item of primary) {
    const key = keyOf(item);
    if (!key) continue;
    const previous = map.get(key);
    map.set(key, previous ? { ...previous, ...item } : item);
  }
  return [...map.values()];
}

export function unionObjects(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>,
): Record<string, unknown> {
  return { ...secondary, ...primary };
}

export type CommunitySnapshot = {
  children: IdRecord[];
  guardians: IdRecord[];
  volunteers: IdRecord[];
  partners: IdRecord[];
};

function asList(value: unknown): IdRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is IdRecord =>
      Boolean(item) && typeof item === "object" && typeof (item as { id?: unknown }).id === "string",
  );
}

export function asCommunitySnapshot(value: unknown): CommunitySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    children: asList(record.children),
    guardians: asList(record.guardians),
    volunteers: asList(record.volunteers),
    partners: asList(record.partners),
  };
}

export function communityHasRecords(store: CommunitySnapshot) {
  return (
    store.children.length + store.guardians.length + store.volunteers.length + store.partners.length > 0
  );
}

export function mergeCommunity(primary: CommunitySnapshot, secondary: CommunitySnapshot): CommunitySnapshot {
  return {
    children: unionById(primary.children, secondary.children),
    guardians: unionById(primary.guardians, secondary.guardians),
    volunteers: unionById(primary.volunteers, secondary.volunteers),
    partners: unionById(primary.partners, secondary.partners),
  };
}

export type MessagesSnapshot = {
  threads: IdRecord[];
  messages: IdRecord[];
  notifications: IdRecord[];
  threadReads: Record<string, string>;
};

export function asMessagesSnapshot(value: unknown): MessagesSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const reads: Record<string, string> = {};
  if (record.threadReads && typeof record.threadReads === "object" && !Array.isArray(record.threadReads)) {
    for (const [key, item] of Object.entries(record.threadReads)) {
      if (typeof item === "string") reads[key] = item;
    }
  }
  return {
    threads: asList(record.threads),
    messages: asList(record.messages),
    notifications: asList(record.notifications),
    threadReads: reads,
  };
}

export function messagesHaveRecords(store: MessagesSnapshot) {
  return store.threads.length + store.messages.length > 0;
}

export function mergeMessages(primary: MessagesSnapshot, secondary: MessagesSnapshot): MessagesSnapshot {
  return {
    threads: unionById(primary.threads, secondary.threads),
    messages: unionById(primary.messages, secondary.messages),
    notifications: unionById(primary.notifications, secondary.notifications),
    threadReads: { ...secondary.threadReads, ...primary.threadReads },
  };
}
