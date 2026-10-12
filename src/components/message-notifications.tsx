import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isDevMock, MOCK_TEAM_MEMBERS } from "@/lib/dev-mock-data";
import {
  formatMessageTime,
  loadMessagesStore,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsForUser,
  subscribeMessagesChanged,
  unreadNotificationCount,
  type MessageNotification,
  type MessagesStore,
} from "@/lib/messages";
import { DEFAULT_MEMBER_PAGES } from "@/lib/page-access";
import { loadTeamMembers, type TeamMember } from "@/lib/team-members";
import { getDisplayName, isAdmin } from "@/lib/user-role";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type InboxContextValue = {
  memberId: string | null;
  store: MessagesStore;
  setStore: (store: MessagesStore) => void;
  unread: number;
  items: MessageNotification[];
};

const MessageInboxContext = createContext<InboxContextValue | null>(null);

function resolveCurrentMember(email: string, name: string, userId: string, admin: boolean): TeamMember {
  const stored = loadTeamMembers();
  const byEmail = stored.find((m) => m.email.toLowerCase() === email.toLowerCase());
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
    role: admin ? "Admin" : "Member",
    status: "Active",
    pages: [...DEFAULT_MEMBER_PAGES],
  };
}

export function MessageInboxProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [store, setStore] = useState<MessagesStore>(() =>
    typeof window === "undefined"
      ? { threads: [], messages: [], notifications: [], threadReads: {} }
      : loadMessagesStore(),
  );

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active || !user?.email) {
        setMemberId(null);
        return;
      }
      const member = resolveCurrentMember(
        user.email,
        getDisplayName(user),
        user.id,
        isAdmin(user),
      );
      setMemberId(member.id);
      setStore(loadMessagesStore());
    }

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return subscribeMessagesChanged(() => setStore(loadMessagesStore()));
  }, []);

  const unread = memberId ? unreadNotificationCount(store, memberId) : 0;
  const items = useMemo(
    () => (memberId ? notificationsForUser(store, memberId).slice(0, 20) : []),
    [store, memberId],
  );

  const value = useMemo(
    () => ({ memberId, store, setStore, unread, items }),
    [memberId, store, unread, items],
  );

  return <MessageInboxContext.Provider value={value}>{children}</MessageInboxContext.Provider>;
}

export function useMessageInbox() {
  const ctx = useContext(MessageInboxContext);
  if (!ctx) {
    throw new Error("useMessageInbox must be used within MessageInboxProvider");
  }
  return ctx;
}

function UnreadGlow({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span className={cn("moss-unread", className)} aria-hidden="true" />;
}

export function MessageNotificationsBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { memberId, store, setStore, unread, items } = useMessageInbox();
  const [open, setOpen] = useState(false);

  if (!memberId) return null;

  function openNotification(notification: MessageNotification) {
    const next = markNotificationRead(store, notification.id);
    setStore(next);
    setOpen(false);
    void navigate({
      to: "/messages",
      search: { thread: notification.threadId },
    });
  }

  function markAllRead() {
    const next = markAllNotificationsRead(store, memberId!);
    setStore(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `${unread} unread message notifications` : "Message notifications"}
          className={cn(
            "relative rounded-md p-2.5 text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground",
            className,
          )}
        >
          <Bell className="h-5 w-5" />
          <UnreadGlow count={unread} className="absolute right-2 top-2" />
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="moss-dialog w-[min(100vw-2rem,22rem)] max-w-[22rem] gap-0 overflow-hidden p-0 shadow-none"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 pr-12">
          <DialogTitle className="text-sm font-normal">Notifications</DialogTitle>
          {unread > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-light text-[#3AB819] hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="mx-auto h-7 w-7 text-foreground/20" />
            <p className="mt-3 text-sm font-light text-foreground/45">No message notifications yet</p>
          </div>
        ) : (
          <ul className="max-h-[min(60vh,22rem)] overflow-y-auto">
            {items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03]",
                    !notification.read && "bg-[#3AB819]/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      notification.read ? "bg-transparent" : "bg-[#3AB819]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-normal">
                        {notification.kind === "mention"
                          ? `${notification.actorName} mentioned you`
                          : `${notification.actorName} sent a message`}
                      </p>
                      <span className="shrink-0 text-[10px] font-light text-foreground/40">
                        {formatMessageTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs font-light text-foreground/55">
                      {notification.preview}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-black/5 px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/messages", search: { thread: undefined } });
            }}
            className="text-xs font-light text-foreground/55 hover:text-foreground"
          >
            Open messages
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
