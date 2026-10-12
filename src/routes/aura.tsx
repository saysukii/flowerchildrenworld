import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react";
import fcwFullLogo from "@/assets/fcw-full-logo.png.asset.json";
import { MeadowGround } from "@/components/meadow-ground";
import { PageLabel } from "@/components/page-label";

export const Route = createFileRoute("/aura")({
  head: () => ({
    meta: [{ title: "Meadow — Flower Children World" }],
  }),
  component: MeadowPreview,
});

const NAV: { label: string; to: "/dashboard" | "/messages" | "/community" | "/brand-essence" | "/garden" | "/analytics"; icon: LucideIcon }[] = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "Messages", to: "/messages", icon: MessageCircle },
  { label: "Community", to: "/community", icon: Users },
  { label: "Brand Essence", to: "/brand-essence", icon: Sparkles },
  { label: "The Garden", to: "/garden", icon: Sprout },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
];

function MeadowPreview() {
  return (
    <MeadowGround className="flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-black/5 bg-[#FCFCFC]/55 px-4 py-6 backdrop-blur-md md:flex">
        <div className="mb-8 flex w-full items-center justify-center px-2">
          <img src={fcwFullLogo.url} alt="Flower Children World" className="h-auto w-auto max-w-[100px]" />
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/dashboard";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-light transition-colors",
                  active
                    ? "bg-[#020202] text-[#FCFCFC]"
                    : "text-[#020202]/70 hover:bg-black/5 hover:text-[#020202]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-black/5 px-2 pt-4">
          <p className="text-sm font-normal">Sukii</p>
          <p className="text-xs text-[#020202]/50">Admin</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="moss-card rounded-3xl px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-2xl font-normal leading-tight sm:text-3xl">Be well, Sukii</p>
            <p className="mt-2 text-sm text-[#020202]/60">Monday, October 12</p>
          </section>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <section className="moss-card rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
              <PageLabel>Today</PageLabel>
              <h2 className="mt-2 text-xl font-normal">What&apos;s happening</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#020202]/60">
                Garden club at 10:00 · watercolor and morning circle.
              </p>
            </section>
            <section className="moss-card rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
              <PageLabel>Routine Pulse</PageLabel>
              <h2 className="mt-2 text-xl font-normal">Moon Planning</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#020202]/60">
                Set intentions and map the week ahead.
              </p>
            </section>
          </div>

          <section className="moss-card rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
            <PageLabel>This Week</PageLabel>
            <h2 className="mt-2 text-xl font-normal">Upcoming programming</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#020202]/60">
              Sunday Funday · Juneteenth arts and community meal · nature day in the garden.
            </p>
          </section>
        </div>
      </main>
    </MeadowGround>
  );
}
