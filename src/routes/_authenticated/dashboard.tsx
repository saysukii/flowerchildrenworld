import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "@/components/motion";
import { PageLabel } from "@/components/page-label";
import {
  isDevMock,
  MOCK_TEAM_MEMBERS,
  MOCK_TODAY_EVENTS,
  MOCK_UPCOMING_EVENTS,
  type DashboardEvent,
} from "@/lib/dev-mock-data";
import { supabase } from "@/integrations/supabase/client";
import { loadTeamMembers } from "@/lib/team-members";
import { getDisplayName } from "@/lib/user-role";
import {
  DAYS,
  DEFAULT_RITUALS,
  loadRituals,
  ritualForDay,
  type DayKey,
  type Ritual,
} from "@/lib/routine-pulse";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flower Children World" },
      { name: "description", content: "Inside operations dashboard." },
    ],
  }),
  component: DashboardPage,
});

const WEEKDAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function firstNameOf(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first || "";
}

function nameForSignedInUser(email: string, authName: string) {
  const stored = loadTeamMembers().find((member) => member.email.toLowerCase() === email.toLowerCase());
  if (stored?.name.trim()) return stored.name;
  if (isDevMock) {
    const mock = MOCK_TEAM_MEMBERS.find((member) => member.email.toLowerCase() === email.toLowerCase());
    if (mock?.name.trim()) return mock.name;
  }
  return authName;
}

const PAIR_CARD =
  "moss-card flex h-[249px] flex-col overflow-hidden rounded-3xl px-6 py-7 sm:px-8 sm:py-8";

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Rich rising,";
  if (h < 17) return "Be well,";
  return "Peace,";
}

function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const dayKey = WEEKDAY_KEYS[now.getDay()];
  const [rituals, setRituals] = useState<Ritual[]>(DEFAULT_RITUALS);
  const [firstName, setFirstName] = useState("");
  const todayEvents = isDevMock ? MOCK_TODAY_EVENTS : [];
  const upcomingEvents = isDevMock ? MOCK_UPCOMING_EVENTS : [];

  useEffect(() => {
    setRituals(loadRituals());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadName() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active || !user?.email) return;
      const fullName = nameForSignedInUser(user.email, getDisplayName(user));
      setFirstName(firstNameOf(fullName));
    }

    void loadName();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadName();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const ritual = ritualForDay(rituals, dayKey);
  const dayLabel = DAYS.find((day) => day.key === dayKey)?.label ?? "Today";

  return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Reveal>
          <section className="moss-card rounded-3xl px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-2xl sm:text-3xl font-normal leading-tight">
              {greeting(now)}
              {firstName ? <span> {firstName}</span> : null}
            </p>
            <p className="mt-2 text-sm text-foreground/60">{dateLabel}</p>
          </section>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Reveal delayMs={60} className="min-h-0">
            <section className={PAIR_CARD}>
              <Label>Today</Label>
              <h2 className="mt-2 shrink-0 text-xl font-normal">What&apos;s happening</h2>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                {todayEvents.length > 0 ? (
                  <ul className="space-y-3">
                    {todayEvents.map((event) => (
                      <EventRow key={`${event.title}-${event.time}`} event={event} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/60">
                    Nothing scheduled today — a good day to rest or get ahead.
                  </p>
                )}
              </div>
            </section>
          </Reveal>

          <Reveal delayMs={120} className="min-h-0">
            <section className={PAIR_CARD}>
              <Label>Routine Pulse</Label>
              <h2 className="mt-2 shrink-0 text-xl font-normal">{dayLabel}</h2>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <p className="text-sm leading-relaxed text-foreground/60">
                  {ritual?.active ? ritual.prompt : "No ritual set for today."}
                </p>
              </div>
              <Link
                to="/routine-pulse"
                className="mt-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-normal"
                style={{ color: "#3AB819" }}
              >
                Manage rituals →
              </Link>
            </section>
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
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="moss-card rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
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
