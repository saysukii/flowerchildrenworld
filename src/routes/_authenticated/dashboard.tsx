import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLabel } from "@/components/page-label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flower Children World" },
      { name: "description", content: "Inside operations dashboard." },
    ],
  }),
  component: DashboardPage,
});

const USER = { firstName: "Sukii" };

const DAY_RITUALS: Record<number, { name: string; description: string }> = {
  0: { name: "Sun Rituals", description: "Rest, reflect, and journal the week" },
  1: { name: "Moon Planning", description: "Set intentions and map the week ahead" },
  2: { name: "Earth Building", description: "Deep work on what's growing" },
  3: { name: "Water Flow", description: "Connect with community and collaborators" },
  4: { name: "Fire Creation", description: "Make, ship, and share new work" },
  5: { name: "Sky Gathering", description: "Host, teach, and bring people together" },
  6: { name: "Soil Tending", description: "Care for systems, spaces, and yourself" },
};

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Rich rising,";
  if (h < 17) return "Be well,";
  return "Peace,";
}

function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const ritual = DAY_RITUALS[now.getDay()];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <section
          className="rounded-3xl border border-black/5 px-6 py-8 sm:px-8 sm:py-10"
          style={{ background: "linear-gradient(135deg, rgba(58,184,25,0.10), rgba(252,252,252,1) 70%)" }}
        >
          <p className="text-2xl sm:text-3xl font-normal leading-tight">
            {greeting(now)} <span>{USER.firstName}</span>
          </p>
          <p className="mt-2 text-sm text-foreground/60">{dateLabel}</p>
        </section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card>
            <Label>Today</Label>
            <h2 className="mt-2 text-xl font-normal">What's happening</h2>
            <p className="mt-4 text-sm text-foreground/60 leading-relaxed">
              Nothing scheduled today — a good day to rest or get ahead.
            </p>
          </Card>

          <Card>
            <Label>Routine Pulse</Label>
            <h2 className="mt-2 text-xl font-normal">{ritual.name}</h2>
            <p className="mt-4 text-sm text-foreground/60 leading-relaxed">{ritual.description}</p>
            <Link
              to="/routine-pulse"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-normal"
              style={{ color: "#3AB819" }}
            >
              Manage rituals →
            </Link>
          </Card>
        </div>

        <Card>
          <Label>This Week</Label>
          <h2 className="mt-2 text-xl font-normal">Upcoming programming</h2>
          <p className="mt-4 text-sm text-foreground/60 leading-relaxed">
            Nothing on the calendar yet.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white px-6 py-7 sm:px-8 sm:py-8">
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <PageLabel>{children}</PageLabel>;
}
