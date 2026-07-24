import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Reveal } from "@/components/motion";
import { PageLabel } from "@/components/page-label";
import {
  isDevMock,
  MOCK_TODAY_EVENTS,
  MOCK_UPCOMING_EVENTS,
  type DashboardEvent,
} from "@/lib/dev-mock-data";

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
  const todayEvents = isDevMock ? MOCK_TODAY_EVENTS : [];
  const upcomingEvents = isDevMock ? MOCK_UPCOMING_EVENTS : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <Reveal>
          <section
            className="rounded-3xl border border-black/5 px-6 py-8 sm:px-8 sm:py-10"
            style={{ background: "linear-gradient(135deg, rgba(58,184,25,0.10), rgba(252,252,252,1) 70%)" }}
          >
            <p className="text-2xl sm:text-3xl font-normal leading-tight">
              {greeting(now)} <span>{USER.firstName}</span>
            </p>
            <p className="mt-2 text-sm text-foreground/60">{dateLabel}</p>
          </section>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Reveal delayMs={60}>
            <Card>
              <Label>Today</Label>
              <h2 className="mt-2 text-xl font-normal">What&apos;s happening</h2>
              {todayEvents.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {todayEvents.map((event) => (
                    <EventRow key={`${event.title}-${event.time}`} event={event} />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-foreground/60">
                  Nothing scheduled today — a good day to rest or get ahead.
                </p>
              )}
            </Card>
          </Reveal>

          <Reveal delayMs={120}>
            <Card>
              <Label>Routine Pulse</Label>
              <h2 className="mt-2 text-xl font-normal">{ritual.name}</h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground/60">{ritual.description}</p>
              <Link
                to="/routine-pulse"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-normal"
                style={{ color: "#3AB819" }}
              >
                Manage rituals →
              </Link>
            </Card>
          </Reveal>
        </div>

        <Reveal delayMs={160}>
          <Card>
            <Label>This Week</Label>
            <h2 className="mt-2 text-xl font-normal">Upcoming programming</h2>
            {upcomingEvents.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {upcomingEvents.map((event) => (
                  <EventRow key={`${event.title}-${event.time}`} event={event} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-foreground/60">
                Nothing on the calendar yet.
              </p>
            )}
          </Card>
        </Reveal>
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

function EventRow({ event }: { event: DashboardEvent }) {
  return (
    <li className="text-sm leading-relaxed">
      <span className="font-normal">{event.title}</span>
      <span className="text-foreground/50"> · {event.time}</span>
      {event.detail ? <p className="mt-0.5 text-foreground/60">{event.detail}</p> : null}
    </li>
  );
}
