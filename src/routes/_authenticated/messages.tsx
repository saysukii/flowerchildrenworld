import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Search, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDevMock, MOCK_TEAM_MEMBERS } from "@/lib/dev-mock-data";
import {
  findOrCreateThread,
  formatMessageTime,
  lastMessagePreview,
  loadMessagesStore,
  mentionSegments,
  messagesForThread,
  saveMessagesStore,
  sendMessage,
  threadPartnerName,
  threadsForUser,
  type MessagesStore,
  type MessageThread,
} from "@/lib/messages";
import { loadTeamMembers, type TeamMember } from "@/lib/team-members";
import { getDisplayName, isAdmin } from "@/lib/user-role";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
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
      role: admin ? "Admin" : "Member",
      status: "Active",
    });
  }

  if (isDevMock) {
    for (const mock of MOCK_TEAM_MEMBERS) {
      const existing = byEmail.get(mock.email.toLowerCase());
      // Prefer stable mock ids so seeded conversations stay linked.
      byEmail.set(mock.email.toLowerCase(), existing ? { ...existing, id: mock.id, name: existing.name || mock.name } : mock);
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
    role: "Member" as const,
    status: "Active" as const,
  };
}

function MessagesPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [current, setCurrent] = useState<TeamMember | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [store, setStore] = useState<MessagesStore>({ threads: [], messages: [] });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const directory = mergeTeamDirectory(user.email, name, userIsAdmin);
      const me = resolveCurrentMember(directory, user.email, name, user.id);

      setAdmin(userIsAdmin);
      setMembers(directory);
      setCurrent(me);
      setStore(loadMessagesStore());
      setReady(true);
    })();
  }, [navigate]);

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
    return members.filter((m) => m.id !== current.id && m.status === "Active");
  }, [members, current]);

  const mentionOptions = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return peopleToMessage.filter((m) => !q || m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionOpen, mentionQuery, peopleToMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeThreadId]);

  function persist(next: MessagesStore) {
    setStore(next);
    saveMessagesStore(next);
  }

  function openThread(thread: MessageThread) {
    setActiveThreadId(thread.id);
    setMobileShowThread(true);
    setDraft("");
    setMentionOpen(false);
  }

  function startConversation(member: TeamMember) {
    if (!current) return;
    const { store: next, thread } = findOrCreateThread(store, current, member);
    persist(next);
    openThread(thread);
  }

  function onDraftChange(value: string) {
    setDraft(value);
    const caret = composerRef.current?.selectionStart ?? value.length;
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
    const value = draft;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = before.replace(/@([^\s@]*)$/, `@${member.name} `);
    const next = replaced + after;
    setDraft(next);
    setMentionOpen(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
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
  }

  if (!ready || !current) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl py-12 text-center text-sm text-foreground/50">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-6xl flex-col md:h-[calc(100dvh-4rem)]">
        <header className="mb-4 shrink-0 sm:mb-6">
          <span className="font-label text-[11px] text-foreground/50">Messages</span>
          <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Team messages</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Talk with the team — use @ to mention who you&apos;re speaking to.
            {admin ? " Admins can message anyone." : ""}
          </p>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-3xl border border-black/5 bg-white md:grid-cols-[minmax(240px,300px)_1fr]">
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
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="rounded-full border-black/10 bg-background pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-black/5 px-4 py-3">
                <p className="font-label text-[10px] text-foreground/40">Start a conversation</p>
                <div className="mt-3 space-y-1">
                  {peopleToMessage.length === 0 ? (
                    <p className="text-xs font-light text-foreground/45">
                      Invite teammates in Settings to message them.
                    </p>
                  ) : (
                    peopleToMessage.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => startConversation(member)}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-black/[0.03]"
                      >
                        <ProfileAvatar name={member.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-normal">{member.name}</p>
                          <p className="truncate text-[11px] font-light text-foreground/45">
                            {member.role}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {filteredThreads.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-foreground/20" />
                  <p className="mt-3 text-sm font-light text-foreground/45">No conversations yet</p>
                </div>
              ) : (
                <ul className="p-2">
                  {filteredThreads.map((thread) => {
                    const partner = threadPartnerName(thread, current.id);
                    const active = thread.id === activeThreadId;
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
                              <p className="truncate text-sm font-normal">{partner}</p>
                              <span
                                className={cn(
                                  "shrink-0 text-[10px] font-light",
                                  active ? "text-background/60" : "text-foreground/40",
                                )}
                              >
                                {formatMessageTime(thread.updatedAt)}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "mt-0.5 line-clamp-1 text-xs font-light",
                                active ? "text-background/70" : "text-foreground/50",
                              )}
                            >
                              {lastMessagePreview(store, thread.id)}
                            </p>
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
                    <p className="text-[11px] font-light text-foreground/45">Direct message</p>
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
                  {mentionOpen && mentionOptions.length > 0 ? (
                    <div className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md sm:left-5 sm:right-5">
                      {mentionOptions.map((member, index) => (
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
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(e) => onDraftChange(e.target.value)}
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={2}
                      placeholder={`Message ${threadPartnerName(activeThread, current.id)}… Type @ to mention`}
                      className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-black/10 bg-background px-4 py-3 text-sm font-light outline-none ring-offset-background placeholder:text-foreground/35 focus-visible:ring-2 focus-visible:ring-ring"
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
        </div>
      </div>
    </AppShell>
  );
}
