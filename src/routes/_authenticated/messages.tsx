import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MessageCircle, Search, Send, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/motion";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WASH_BUTTON_CLASS } from "@/lib/wash-button";
import { sendMentionEmails } from "@/lib/api/email.functions";
import { isDevMock, MOCK_TEAM_MEMBERS } from "@/lib/dev-mock-data";
import {
  caretOffset,
  composerHtml,
  placeCaret,
  readComposerText,
} from "@/lib/message-composer";
import {
  findOrCreateGroup,
  formatMessageTime,
  isGroupThread,
  lastMessagePreview,
  loadMessagesStore,
  markThreadRead,
  mentionSegments,
  parseMentions,
  messagesForThread,
  saveMessagesStore,
  sendMessage,
  subscribeMessagesChanged,
  threadPartnerName,
  threadsForUser,
  unreadCountForThread,
  type MessagesStore,
  type MessageThread,
} from "@/lib/messages";
import { DEFAULT_MEMBER_PAGES } from "@/lib/page-access";
import { loadTeamMembers, type TeamMember } from "@/lib/team-members";
import { getDisplayName, isAdmin } from "@/lib/user-role";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    thread: typeof search.thread === "string" ? search.thread : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — Flower Children World" },
      { name: "description", content: "Internal messages for the Flower Children World team." },
    ],
  }),
  component: MessagesPage,
});

const GREEN = "#3AB819";

function mergeTeamDirectory(email: string, name: string, admin: boolean): TeamMember[] {
  const stored = loadTeamMembers();
  const byEmail = new Map(stored.map((m) => [m.email.toLowerCase(), m]));

  if (email && !byEmail.has(email.toLowerCase())) {
    byEmail.set(email.toLowerCase(), {
      id: crypto.randomUUID(),
      name,
      email,
      phone: "",
      role: admin ? "Admin" : "Member",
      status: "Active",
      pages: [...DEFAULT_MEMBER_PAGES],
    });
  }

  if (isDevMock) {
    for (const mock of MOCK_TEAM_MEMBERS) {
      const existing = byEmail.get(mock.email.toLowerCase());
      // Prefer stable mock ids so seeded conversations stay linked.
      byEmail.set(
        mock.email.toLowerCase(),
        existing
          ? { ...existing, id: mock.id, name: existing.name || mock.name }
          : { ...mock },
      );
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function resolveCurrentMember(members: TeamMember[], email: string, name: string, userId: string) {
  const byEmail = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (byEmail) return byEmail;
  if (isDevMock) {
    const mock = MOCK_TEAM_MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (mock) return mock;
  }
  return {
    id: userId,
    name,
    email,
    phone: "",
    role: "Member" as const,
    status: "Active" as const,
    pages: [...DEFAULT_MEMBER_PAGES],
  };
}

function MessagesPage() {
  const navigate = useNavigate();
  const { thread: threadFromSearch } = Route.useSearch();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [current, setCurrent] = useState<TeamMember | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [store, setStore] = useState<MessagesStore>({
    threads: [],
    messages: [],
    notifications: [],
    threadReads: {},
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [personQuery, setPersonQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const focusComposer = useRef(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const paintedHtmlRef = useRef("");
  const mentionNamesRef = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const identityRef = useRef<{ email: string; name: string; admin: boolean; userId: string } | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user?.email) {
        navigate({ to: "/auth" });
        return;
      }

      const userIsAdmin = isAdmin(user);
      const name = getDisplayName(user);
      identityRef.current = { email: user.email, name, admin: userIsAdmin, userId: user.id };
      const directory = mergeTeamDirectory(user.email, name, userIsAdmin);
      const me = resolveCurrentMember(directory, user.email, name, user.id);

      setAdmin(userIsAdmin);
      setMembers(directory);
      setCurrent(me);
      setStore(loadMessagesStore());
      setReady(true);
    })();
  }, [navigate]);

  useEffect(() => {
    return subscribeMessagesChanged(() => setStore(loadMessagesStore()));
  }, []);

  function reloadDirectory() {
    const identity = identityRef.current;
    if (!identity) return;
    const directory = mergeTeamDirectory(identity.email, identity.name, identity.admin);
    setMembers(directory);
    setCurrent(resolveCurrentMember(directory, identity.email, identity.name, identity.userId));
  }

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key && event.key !== "fcw-team-members") return;
      reloadDirectory();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("fcw-page-access-changed", reloadDirectory);
    window.addEventListener("focus", reloadDirectory);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fcw-page-access-changed", reloadDirectory);
      window.removeEventListener("focus", reloadDirectory);
    };
  }, []);

  useEffect(() => {
    if (!ready || !current || !threadFromSearch) return;
    const latest = loadMessagesStore();
    if (!latest.threads.some((t) => t.id === threadFromSearch)) return;
    setActiveThreadId(threadFromSearch);
    setMobileShowThread(true);
    setStore(markThreadRead(latest, current.id, threadFromSearch));
  }, [ready, current, threadFromSearch]);

  const myThreads = useMemo(() => {
    if (!current) return [];
    return threadsForUser(store, current.id);
  }, [store, current]);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !current) return myThreads;
    return myThreads.filter((thread) => {
      const partner = threadPartnerName(thread, current.id).toLowerCase();
      const preview = lastMessagePreview(store, thread.id).toLowerCase();
      return partner.includes(q) || preview.includes(q);
    });
  }, [myThreads, query, current, store]);

  const activeThread = useMemo(
    () => store.threads.find((t) => t.id === activeThreadId) ?? null,
    [store.threads, activeThreadId],
  );

  const activeMessages = useMemo(
    () => (activeThreadId ? messagesForThread(store, activeThreadId) : []),
    [store, activeThreadId],
  );

  const peopleToMessage = useMemo(() => {
    if (!current) return [];
    return members.filter((m) => m.id !== current.id && m.status !== "Inactive");
  }, [members, current]);

  mentionNamesRef.current = peopleToMessage.map((member) => member.name);

  const peopleMatchingQuery = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return peopleToMessage;
    return peopleToMessage.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q),
    );
  }, [peopleToMessage, personQuery]);

  const peopleFromSearch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && !searchFocused) return [];
    if (!q) return peopleToMessage;
    return peopleToMessage.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q),
    );
  }, [peopleToMessage, query, searchFocused]);

  const mentionOptions = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return peopleToMessage.filter((m) => !q || m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionOpen, mentionQuery, peopleToMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeThreadId]);

  useEffect(() => {
    if (!focusComposer.current || !activeThread) return;
    focusComposer.current = false;
    composerRef.current?.focus();
  }, [activeThread]);

  function persist(next: MessagesStore) {
    setStore(next);
    saveMessagesStore(next);
  }

  function openThread(thread: MessageThread) {
    setActiveThreadId(thread.id);
    setMobileShowThread(true);
    setDraft("");
    setMentionOpen(false);
    if (current) {
      setStore(markThreadRead(loadMessagesStore(), current.id, thread.id));
    }
    void navigate({
      to: "/messages",
      search: { thread: thread.id },
      replace: true,
    });
  }

  function startConversation(people: TeamMember[]) {
    if (!current || people.length === 0) return;
    const { store: next, thread } = findOrCreateGroup(store, current, people);
    persist(next);
    setComposeOpen(false);
    setPersonQuery("");
    setSelectedPeople([]);
    focusComposer.current = true;
    openThread(thread);
  }

  function togglePerson(memberId: string) {
    setSelectedPeople((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    );
  }

  function paintComposer(value: string, caret: number | null) {
    const el = composerRef.current;
    if (!el) return;
    const html = composerHtml(value, mentionNamesRef.current);
    el.dataset.empty = value ? "false" : "true";
    if (paintedHtmlRef.current === html) {
      if (caret != null) placeCaret(el, caret);
      return;
    }
    paintedHtmlRef.current = html;
    el.innerHTML = html;
    if (caret != null) placeCaret(el, caret);
  }

  function onDraftChange(value: string, caret = value.length) {
    setDraft(value);
    const before = value.slice(0, caret);
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1] ?? "");
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }

  function insertMention(member: TeamMember) {
    const el = composerRef.current;
    const value = el ? readComposerText(el) : draft;
    const caret = el ? caretOffset(el) : value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = before.replace(/@([^\s@]*)$/, `@${member.name} `);
    const next = replaced + after;
    setMentionOpen(false);
    setMentionQuery("");
    setDraft(next);
    paintComposer(next, replaced.length);
    el?.focus();
  }

  function handleComposerInput() {
    const el = composerRef.current;
    if (!el) return;
    const caret = caretOffset(el);
    const text = readComposerText(el);
    paintComposer(text, caret);
    onDraftChange(text, caret);
  }

  function insertComposerText(text: string) {
    const el = composerRef.current;
    if (!el) return;
    const caret = caretOffset(el);
    const current = readComposerText(el);
    const next = current.slice(0, caret) + text + current.slice(caret);
    paintComposer(next, caret + text.length);
    onDraftChange(next, caret + text.length);
  }

  function handleSend() {
    if (!current || !activeThreadId) return;
    const body = draft.trim();
    if (!body) return;
    const next = sendMessage(store, {
      threadId: activeThreadId,
      senderId: current.id,
      senderName: current.name,
      body,
      members,
    });
    persist(next);
    setDraft("");
    setMentionOpen(false);
    paintComposer("", 0);

    const recipients = parseMentions(body, members)
      .map((mention) => members.find((member) => member.id === mention.memberId))
      .filter((member): member is TeamMember => {
        if (!member || member.id === current.id) return false;
        const email = member.email.trim().toLowerCase();
        return email.includes("@") && !email.endsWith("@example.com");
      });
    if (recipients.length === 0) return;

    void sendMentionEmails({
      data: {
        senderName: current.name,
        body,
        origin: window.location.origin,
        mentions: recipients.map((member) => ({
          email: member.email.trim(),
          name: member.name,
        })),
      },
    }).then(
      (result) => {
        if (result.skipped === "not-configured") {
          toast.message("Mention saved here. Email isn’t set up yet.");
        }
      },
      () => {
        toast.error("The message is here. The mention email could not be sent.");
      },
    );
  }

  if (!ready || !current) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-center text-sm text-foreground/50">Loading…</div>
    );
  }

  return (
    <>
      <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-6xl flex-col md:h-[calc(100dvh-4rem)]">
        <Reveal className="mb-4 shrink-0 sm:mb-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <span className="font-label text-[11px] text-foreground/50">Messages</span>
              <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Team messages</h1>
              <p className="mt-2 text-sm text-foreground/60">
                Talk with the team — use @ to mention who you&apos;re speaking to.
                {admin ? " Admins can message anyone." : ""}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setComposeOpen(true)}
              className={`mt-1 shrink-0 ${WASH_BUTTON_CLASS}`}
            >
              <SquarePen className="h-4 w-4" />
              New message
            </Button>
          </header>
        </Reveal>

        <Reveal
          delayMs={80}
          className="moss-card grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-[minmax(240px,300px)_1fr]"
        >
          {/* Conversation list */}
          <aside
            className={cn(
              "flex min-h-0 flex-col border-black/5 md:border-r",
              mobileShowThread ? "hidden md:flex" : "flex",
            )}
          >
            <div className="border-b border-black/5 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setSearchFocused(true);
                    reloadDirectory();
                  }}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search people"
                  className="moss-card h-10 w-full rounded-full pl-9 pr-3 text-sm font-light placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {peopleFromSearch.length > 0 ? (
                <ul className="border-b border-black/5 p-2">
                  {peopleFromSearch.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          startConversation([member]);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                      >
                        <ProfileAvatar name={member.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-normal">{member.name}</p>
                          <p className="truncate text-[11px] font-light text-foreground/45">
                            {member.status === "Pending" ? "Pending · " : ""}
                            {member.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {filteredThreads.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-foreground/20" />
                  <p className="mt-3 text-sm font-light text-foreground/45">No conversations yet</p>
                  <Button
                    type="button"
                    onClick={() => setComposeOpen(true)}
                    className={`mt-4 ${WASH_BUTTON_CLASS}`}
                  >
                    <SquarePen className="h-4 w-4" />
                    New message
                  </Button>
                </div>
              ) : (
                <ul className="p-2">
                  {filteredThreads.map((thread) => {
                    const partner = threadPartnerName(thread, current.id);
                    const active = thread.id === activeThreadId;
                    const unread = unreadCountForThread(store, current.id, thread.id);
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => openThread(thread)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                            active ? "bg-foreground text-background" : "hover:bg-black/[0.03]",
                          )}
                        >
                          <ProfileAvatar name={partner} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  unread > 0 && !active ? "font-medium" : "font-normal",
                                )}
                              >
                                {partner}
                              </p>
                              <span
                                className={cn(
                                  "shrink-0 text-[10px] font-light",
                                  active ? "text-background/60" : "text-foreground/40",
                                )}
                              >
                                {formatMessageTime(thread.updatedAt)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <p
                                className={cn(
                                  "min-w-0 flex-1 line-clamp-1 text-xs font-light",
                                  active
                                    ? "text-background/70"
                                    : unread > 0
                                      ? "text-foreground/70"
                                      : "text-foreground/50",
                                )}
                              >
                                {lastMessagePreview(store, thread.id)}
                              </p>
                              {unread > 0 && !active ? (
                                <span
                                  className="moss-unread"
                                  aria-label={`${unread} unread`}
                                />
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Thread */}
          <section
            className={cn(
              "flex min-h-0 flex-col",
              mobileShowThread ? "flex" : "hidden md:flex",
            )}
          >
            {!activeThread ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="h-10 w-10 text-foreground/15" />
                <p className="mt-4 text-sm font-light text-foreground/45">
                  Choose a teammate to start messaging
                </p>
                <Button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className={`mt-4 ${WASH_BUTTON_CLASS}`}
                >
                  <SquarePen className="h-4 w-4" />
                  New message
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-xs font-light text-foreground/50 hover:bg-black/5 md:hidden"
                    onClick={() => setMobileShowThread(false)}
                  >
                    Back
                  </button>
                  <ProfileAvatar name={threadPartnerName(activeThread, current.id)} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-normal">
                      {threadPartnerName(activeThread, current.id)}
                    </p>
                    <p className="text-[11px] font-light text-foreground/45">
                      {isGroupThread(activeThread) ? "Group" : "Direct message"}
                    </p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                  {activeMessages.map((message) => {
                    const mine = message.senderId === current.id;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex gap-3", mine ? "flex-row-reverse" : "flex-row")}
                      >
                        {!mine ? <ProfileAvatar name={message.senderName} size="sm" /> : null}
                        <div className={cn("max-w-[85%] sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                          <div className={cn("mb-1 flex items-baseline gap-2", mine && "justify-end")}>
                            {!mine ? (
                              <span className="text-xs font-normal">{message.senderName}</span>
                            ) : null}
                            <span className="text-[10px] font-light text-foreground/40">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "rounded-3xl px-4 py-3 text-sm font-light leading-relaxed",
                              mine
                                ? "rounded-br-lg text-white"
                                : "rounded-bl-lg border border-black/5 bg-background text-foreground",
                            )}
                            style={mine ? { background: GREEN } : undefined}
                          >
                            {mentionSegments(message.body, message.mentions).map((seg, i) =>
                              seg.type === "mention" ? (
                                <span
                                  key={`${message.id}-${i}`}
                                  className={cn(
                                    "font-normal",
                                    mine ? "text-white" : "text-[#3AB819]",
                                  )}
                                >
                                  {seg.value}
                                </span>
                              ) : (
                                <span key={`${message.id}-${i}`}>{seg.value}</span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="relative border-t border-black/5 p-4 sm:p-5">
                  {mentionOpen ? (
                    <div className="moss-dialog absolute bottom-full left-4 right-4 z-10 mb-2 overflow-hidden rounded-2xl sm:left-5 sm:right-5">
                      {mentionOptions.length === 0 ? (
                        <p className="px-3 py-3 text-sm font-light text-foreground/50">
                          No teammates match that name.
                        </p>
                      ) : (
                        mentionOptions.map((member, index) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => insertMention(member)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            index === mentionIndex ? "bg-black/[0.04]" : "hover:bg-black/[0.03]",
                          )}
                        >
                          <ProfileAvatar name={member.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-normal">{member.name}</p>
                            <p className="truncate text-[11px] font-light text-foreground/45">
                              {member.email}
                            </p>
                          </div>
                        </button>
                        ))
                      )}
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2">
                    <div
                      ref={composerRef}
                      role="textbox"
                      aria-multiline="true"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Type your message"
                      data-empty={draft ? "false" : "true"}
                      onInput={handleComposerInput}
                      onPaste={(event) => {
                        event.preventDefault();
                        insertComposerText(event.clipboardData.getData("text/plain"));
                      }}
                      onKeyDown={(e) => {
                        if (mentionOpen && mentionOptions.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setMentionIndex((i) => (i + 1) % mentionOptions.length);
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
                            return;
                          }
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            insertMention(mentionOptions[mentionIndex]!);
                            return;
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setMentionOpen(false);
                            return;
                          }
                        }
                        if (e.key === "Enter" && e.shiftKey) {
                          e.preventDefault();
                          insertComposerText("\n");
                          return;
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="composer-input max-h-40 min-h-[2.75rem] min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-sm font-light leading-relaxed text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="button"
                      onClick={handleSend}
                      disabled={!draft.trim()}
                      className="h-11 w-11 shrink-0 rounded-full p-0 text-white hover:opacity-90"
                      style={{ background: GREEN }}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] font-light text-foreground/40">
                    Enter to send · Shift+Enter for a new line · @ to mention
                  </p>
                </div>
              </>
            )}
          </section>
        </Reveal>
      </div>

      <Dialog
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (open) reloadDirectory();
          if (!open) {
            setPersonQuery("");
            setSelectedPeople([]);
          }
        }}
      >
        <DialogContent className="moss-dialog max-w-md gap-0 p-0">
          <DialogHeader className="px-5 pb-3 pt-5">
            <DialogTitle className="text-lg font-normal">New message</DialogTitle>
            <DialogDescription className="font-light">
              Pick one person, or several to start a group.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
              <Input
                autoFocus
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
                placeholder="Search people"
                className="rounded-full border-black/10 bg-[#FCFCFC]/80 pl-9"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {peopleMatchingQuery.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm font-light text-foreground/50">
                {peopleToMessage.length === 0
                  ? "Invite teammates in Settings to message them."
                  : "No one matches that search."}
              </p>
            ) : (
              peopleMatchingQuery.map((member) => {
                const selected = selectedPeople.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => togglePerson(member.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04]"
                  >
                    <ProfileAvatar name={member.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-normal">{member.name}</p>
                      <p className="truncate text-[11px] font-light text-foreground/45">
                        {member.role}
                        {member.email ? ` · ${member.email}` : ""}
                        {member.status === "Pending" ? " · Pending" : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                        selected
                          ? "border-[#3AB819] bg-[#3AB819]/15 text-[#1f6b12]"
                          : "border-black/15 text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end border-t border-black/5 px-5 py-3">
            <button
              type="button"
              disabled={selectedPeople.length === 0}
              onClick={() =>
                startConversation(
                  peopleToMessage.filter((member) => selectedPeople.includes(member.id)),
                )
              }
              className={WASH_BUTTON_CLASS}
            >
              {selectedPeople.length > 1
                ? `Start group (${selectedPeople.length})`
                : "Start message"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
