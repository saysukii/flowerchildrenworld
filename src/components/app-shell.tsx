import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  BarChart3,
  Sprout,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import fcwLogo from "@/assets/fcw-flower.png.asset.json";
import fcwFullLogo from "@/assets/fcw-full-logo.png.asset.json";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/community", label: "Community", icon: Users },
  { to: "/brand-essence", label: "Brand Essence", icon: Sparkles },
  { to: "/garden", label: "The Garden", icon: Sprout },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const USER = { firstName: "Sukii", role: "Admin" };

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
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/5 bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden sm:px-6">
        <FcwFlowerLogo size={26} />
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2.5 hover:bg-black/5"
        >
          <Menu className="h-5 w-5" />
        </button>
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
          {children}
        </main>
      </div>
    </div>
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
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
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
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className={cn("border-t border-black/5 px-2 pt-4", pinUserToBottom ? "mt-auto" : "mt-6")}>
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            onClick={onNavigate}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-normal text-white transition-opacity hover:opacity-90"
            style={{ background: "#3AB819" }}
            aria-label="Settings"
          >
            {USER.firstName.charAt(0)}
          </Link>
          <div className="min-w-0 flex-1 -my-1 py-1">
            <p className="truncate text-sm font-normal leading-tight">{USER.firstName}</p>
            <p className="text-xs text-foreground/50">{USER.role}</p>
          </div>
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
