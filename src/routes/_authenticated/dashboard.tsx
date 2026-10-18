import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Reveal } from "@/components/motion";
import { PageLabel } from "@/components/page-label";
import {
  isDevMock,
  MOCK_TEAM_MEMBERS,
} from "@/lib/dev-mock-data";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureGoogleAccessToken,
  fetchPrimaryCalendarEvents,
  GoogleAccessError,
  type GoogleCalendarListing,
} from "@/lib/google";
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
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toLocaleUpperCase() + first.slice(1);
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
  const [calendarLinked, setCalendarLinked] = useState(false);
  const [todayEvents, setTodayEvents] = useState<GoogleCalendarListing[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GoogleCalendarListing[]>([]);

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

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
      const { data } = await supabase.auth.getSession();
      const token = await ensureGoogleAccessToken(data.session);
      if (!token) {
        if (!active) return;
        setCalendarLinked(false);
        setTodayEvents([]);
        setUpcomingEvents([]);
        return;
      }
      try {
        const events = await fetchPrimaryCalendarEvents(token);
        if (!active) return;
        setCalendarLinked(true);
        setTodayEvents(events.filter((event) => event.day === "today"));
        setUpcomingEvents(events.filter((event) => event.day === "upcoming"));
      } catch (error) {
        if (!active) return;
        if (error instanceof GoogleAccessError) {
          setCalendarLinked(false);
          setTodayEvents([]);
          setUpcomingEvents([]);
          return;
        }
        console.error(error);
      }
    }

    void loadCalendar();
    const interval = window.setInterval(() => void loadCalendar(), 20_000);
    function onVisible() {
      if (document.visibilityState === "visible") void loadCalendar();
    }
    document.addEventListener("visibilitychange", onVisible);
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadCalendar();
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
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
                  <AgendaList events={todayEvents} />
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/60">
                    {calendarLinked
                      ? "Nothing scheduled today."
                      : "Connect Google in Settings to show today’s calendar."}
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
              <div className="mt-4">
                <DaysList events={upcomingEvents} />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-foreground/60">
                {calendarLinked
                  ? "Nothing on the calendar this week."
                  : "Connect Google in Settings to show the calendar."}
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

function dayGroups(events: GoogleCalendarListing[]) {
  const groups: { key: string; dayNum: string; weekday: string; events: GoogleCalendarListing[] }[] = [];
  for (const event of events) {
    const date = new Date(event.startsAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = {
        key,
        dayNum: String(date.getDate()),
        weekday: date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
        events: [],
      };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

function AgendaList({ events }: { events: GoogleCalendarListing[] }) {
  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-4">
          <p className="w-[4.5rem] shrink-0 text-sm tabular-nums text-foreground/55">{event.time}</p>
          <div className="min-w-0 border-l border-black/10 pl-4">
            <p className="text-sm font-normal">{event.title}</p>
            {event.detail ? <p className="mt-0.5 text-sm text-foreground/55">{event.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DaysList({ events }: { events: GoogleCalendarListing[] }) {
  return (
    <div className="space-y-5">
      {dayGroups(events).map((group) => (
        <div key={group.key} className="flex gap-4">
          <div className="w-10 shrink-0">
            <p className="text-lg font-normal leading-none tabular-nums">{group.dayNum}</p>
            <p className="mt-1 text-[11px] text-foreground/45">{group.weekday}</p>
          </div>
          <ul className="min-w-0 flex-1 space-y-3">
            {group.events.map((event) => (
              <li key={event.id} className="flex gap-4">
                <p className="w-[4.5rem] shrink-0 text-sm tabular-nums text-foreground/55">{event.time}</p>
                <div className="min-w-0">
                  <p className="text-sm font-normal">{event.title}</p>
                  {event.detail ? <p className="mt-0.5 text-sm text-foreground/55">{event.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
