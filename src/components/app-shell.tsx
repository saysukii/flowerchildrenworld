import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  BarChart3,
  Sprout,
  MessageCircle,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import fcwLogo from "@/assets/fcw-flower.png.asset.json";
import fcwFullLogo from "@/assets/fcw-full-logo.png.asset.json";
import {
  MessageInboxProvider,
  MessageNotificationsBell,
  useMessageInbox,
} from "@/components/message-notifications";
import { PageEnter } from "@/components/motion";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getDisplayName, getRoleLabel, isAdmin } from "@/lib/user-role";
import { PROFILE_UPDATED_EVENT, resolveAvatarUrl } from "@/lib/user-profile";
import {
  CONTROLLABLE_PAGES,
  onPageAccessChanged,
  type PageKey,
} from "@/lib/page-access";
import { getMemberPagesForEmail } from "@/lib/team-members";

const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  messages: MessageCircle,
  community: Users,
  "brand-essence": Sparkles,
  garden: Sprout,
  analytics: BarChart3,
};

function FcwFlowerLogo({ size, alt = "FCW" }: { size: number; alt?: string }) {
  return (
    <Link
      to="/dashboard"
      aria-label="Home"
      className="relative block shrink-0 overflow-hidden rounded-md transition-opacity hover:opacity-80"
      style={{ width: size, height: size }}
    >
      <img
        src={fcwLogo.url}
        alt={alt}
        className="fcw-flower-spin absolute inset-0 h-full w-full object-contain"
      />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <MessageInboxProvider>
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/5 bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden sm:px-6">
          <FcwFlowerLogo size={26} />
          <div className="flex items-center gap-0.5">
            <MessageNotificationsBell />
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2.5 hover:bg-black/5"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-black/5 bg-background px-4 py-6 md:flex">
            <SidebarInner variant="desktop" onNavigate={() => {}} onSignOut={signOut} />
          </aside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="bottom"
              overlayClassName="bg-black/30 md:hidden"
              className="flex max-h-[88dvh] flex-col gap-0 overflow-y-auto rounded-t-2xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden"
            >
              <SidebarInner variant="sheet-bottom" onNavigate={() => setMobileOpen(false)} onSignOut={signOut} />
            </SheetContent>
          </Sheet>

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
            <PageEnter key={pathname}>{children}</PageEnter>
          </main>
        </div>
      </div>
    </MessageInboxProvider>
  );
}

function SidebarInner({
  variant = "desktop",
  onNavigate,
  onSignOut,
}: {
  variant?: "desktop" | "sheet-right" | "sheet-bottom";
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSheetRight = variant === "sheet-right";
  const pinUserToBottom = variant === "desktop" || isSheetRight;
  const [displayName, setDisplayName] = useState("Member");
  const [roleLabel, setRoleLabel] = useState("Member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberPages, setMemberPages] = useState<PageKey[]>([]);
  const { unread: messageUnread } = useMessageInbox();

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active || !user) return;

      setDisplayName(getDisplayName(user));
      setRoleLabel(getRoleLabel(user));
      setAvatarUrl(resolveAvatarUrl(user.id, user));
      setAdmin(isAdmin(user));
      setUserEmail(user.email ?? null);
      setMemberPages(getMemberPagesForEmail(user.email));
    }

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) return;
      setDisplayName(getDisplayName(user));
      setRoleLabel(getRoleLabel(user));
      setAvatarUrl(resolveAvatarUrl(user.id, user));
      setAdmin(isAdmin(user));
      setUserEmail(user.email ?? null);
      setMemberPages(getMemberPagesForEmail(user.email));
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function refreshAccess() {
      setMemberPages(getMemberPagesForEmail(userEmail));
    }
    return onPageAccessChanged(refreshAccess);
  }, [userEmail]);

  useEffect(() => {
    function onProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{ userId: string }>).detail;
      if (!detail?.userId) return;
      void supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (user?.id === detail.userId) {
          setAvatarUrl(resolveAvatarUrl(detail.userId, user));
        }
      });
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, []);

  const navItems = useMemo(() => {
    return CONTROLLABLE_PAGES.filter((page) => {
      if (!page.inNav) return false;
      if (admin) return true;
      return memberPages.includes(page.key);
    }).map((page) => ({
      to: page.path,
      label: page.label,
      icon: NAV_ICONS[page.key] ?? LayoutDashboard,
    }));
  }, [admin, memberPages]);

  return (
    <div className={cn("flex min-h-0 flex-col", pinUserToBottom && "h-full")}>
      <div className="mb-8 flex w-full items-center justify-center px-2">
        <Link to="/dashboard" onClick={onNavigate} aria-label="Home" className="transition-opacity hover:opacity-80">
          <img
            src={fcwFullLogo.url}
            alt="Flower Children World"
            className="h-auto max-w-[100px] w-auto"
          />
        </Link>
      </div>

      <nav className={cn("space-y-1", pinUserToBottom && "flex-1")}>
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          const showUnread = item.to === "/messages" && messageUnread > 0;
          return (
            <a
              key={item.to}
              href={item.to}
              onClick={onNavigate}
              className={[
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-light transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-black/5 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {showUnread ? (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none",
                    active ? "bg-background text-foreground" : "bg-[#3AB819] text-white",
                  )}
                >
                  {messageUnread > 9 ? "9+" : messageUnread}
                </span>
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className={cn("border-t border-black/5 px-2 pt-4", pinUserToBottom ? "mt-auto" : "mt-6")}>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            onClick={onNavigate}
            className="shrink-0 transition-opacity hover:opacity-90"
            aria-label="Settings"
          >
            <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />
          </Link>
          <div className="min-w-0 flex-1 -my-1 py-1">
            <p className="truncate text-sm font-normal leading-tight">{displayName}</p>
            <p className="text-xs text-foreground/50">{roleLabel}</p>
          </div>
          <MessageNotificationsBell className="hidden p-2 md:inline-flex" align="end" />
          <button
            aria-label="Sign out"
            onClick={onSignOut}
            className="rounded-md p-2 text-foreground/60 hover:bg-black/5 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
