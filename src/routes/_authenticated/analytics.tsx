import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { fetchStripeDonationAnalytics } from "@/lib/api/stripe.functions";
import {
  EMPTY_STRIPE_DONATIONS,
  formatRecentDonors,
  formatRecurringSplit,
  formatStripeMoney,
  type StripeDonationAnalytics,
} from "@/lib/stripe-analytics";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Flower Children World" },
      { name: "description", content: "Community, events, donations, and engagement metrics." },
    ],
  }),
  component: AnalyticsPage,
});

type Metric = {
  label: string;
  value: string;
  note: string;
};

type Group = {
  key: string;
  label: string;
  color: string;
  metrics: Metric[];
};

const STATIC_GROUPS: Group[] = [
  {
    key: "community",
    label: "Community",
    color: "#3AB819",
    metrics: [
      { label: "Total enrolled children", value: "0", note: "Active · all programs" },
      { label: "Active volunteers", value: "0", note: "Active status in directory" },
      { label: "Active partners", value: "0", note: "Active status · all types" },
      { label: "New contacts this month", value: "0", note: "All record types · added this month" },
    ],
  },
  {
    key: "events",
    label: "Events",
    color: "#15AAD2",
    metrics: [
      { label: "Upcoming events", value: "0", note: "Next 30 days" },
      { label: "RSVPs this month", value: "0", note: "Total across all events" },
      { label: "Most attended recent event", value: "—", note: "Highest RSVP count · last 30 days" },
      { label: "Total events hosted", value: "0", note: "All time" },
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    color: "#776BD9",
    metrics: [
      { label: "Volunteer signups this month", value: "0", note: "/join submissions" },
      { label: "Partner inquiries this month", value: "0", note: "/partner submissions" },
      { label: "Child enrollments this month", value: "0", note: "/enroll submissions" },
      { label: "Community growth", value: "—", note: "Total records by month · all time" },
    ],
  },
];

function donationsGroup(stripe: StripeDonationAnalytics, loading: boolean): Group {
  if (loading) {
    return {
      key: "donations",
      label: "Donations",
      color: "#EFB003",
      metrics: [
        { label: "Total donated this month", value: "…", note: "Loading from Stripe" },
        { label: "Total donated all-time", value: "…", note: "Loading from Stripe" },
        { label: "Recurring vs one-time", value: "…", note: "Loading from Stripe" },
        { label: "Recent donors", value: "…", note: "Loading from Stripe" },
      ],
    };
  }

  if (!stripe.connected) {
    return {
      key: "donations",
      label: "Donations",
      color: "#EFB003",
      metrics: [
        { label: "Total donated this month", value: "$0", note: "Connect Stripe in Settings" },
        { label: "Total donated all-time", value: "$0", note: "Connect Stripe in Settings" },
        { label: "Recurring vs one-time", value: "—", note: "Connect Stripe in Settings" },
        { label: "Recent donors", value: "—", note: "Connect Stripe in Settings" },
      ],
    };
  }

  return {
    key: "donations",
    label: "Donations",
    color: "#EFB003",
    metrics: [
      {
        label: "Total donated this month",
        value: formatStripeMoney(stripe.monthTotalCents, stripe.currency),
        note: "Confirmed charges · Stripe",
      },
      {
        label: "Total donated all-time",
        value: formatStripeMoney(stripe.allTimeTotalCents, stripe.currency),
        note: "Cumulative · Stripe",
      },
      {
        label: "Recurring vs one-time",
        value: formatRecurringSplit(stripe.recurringCount, stripe.oneTimeCount),
        note: "Active subscriptions vs one-time charges",
      },
      {
        label: "Recent donors",
        value: formatRecentDonors(stripe.recentDonors),
        note: "Last 10 · name · amount · date",
      },
    ],
  };
}

function AnalyticsPage() {
  const [admin, setAdmin] = useState(false);
  const [stripe, setStripe] = useState<StripeDonationAnalytics>(EMPTY_STRIPE_DONATIONS);
  const [loadingStripe, setLoadingStripe] = useState(true);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const userIsAdmin = isAdmin(data.user);
      setAdmin(userIsAdmin);
      if (!userIsAdmin) {
        setLoadingStripe(false);
        return;
      }

      fetchStripeDonationAnalytics()
        .then(setStripe)
        .catch((error) => {
          console.error(error);
          setStripe(EMPTY_STRIPE_DONATIONS);
        })
        .finally(() => setLoadingStripe(false));
    });
  }, []);

  const groups = useMemo(() => {
    const donations = donationsGroup(stripe, admin && loadingStripe);
    return [
      STATIC_GROUPS[0],
      STATIC_GROUPS[1],
      donations,
      STATIC_GROUPS[2],
    ];
  }, [admin, loadingStripe, stripe]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 sm:mb-8">
          <span className="font-label text-[11px] text-foreground/50">Analytics</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">How we&apos;re growing</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Community, events, donations, and engagement — all in one place.
          </p>
        </header>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <h2
                className="font-label text-[11px] mb-4"
                style={{ color: group.color }}
              >
                {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.metrics.map((m) => (
                  <MetricCard key={m.label} metric={m} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-black/5 bg-white px-6 py-8 sm:px-8 sm:py-10">
          <h3 className="text-lg font-normal">Community growth over time</h3>
          <div className="mt-6 relative h-48 sm:h-56 w-full">
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-px w-full bg-black/5" />
              ))}
            </div>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <polyline
                points="0,90% 20%,85% 40%,88% 60%,80% 80%,82% 100%,75%"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground/10"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-foreground/40 text-center">
                Data will appear as your community grows.
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-light text-foreground/40 uppercase tracking-wider">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white px-5 py-6 sm:px-6 sm:py-7">
      <p className="text-xs font-light text-foreground/60 leading-snug">{metric.label}</p>
      <p className="mt-3 text-3xl sm:text-4xl font-normal leading-none">{metric.value}</p>
      <p className="mt-3 text-[11px] font-light text-foreground/40 leading-snug">{metric.note}</p>
    </div>
  );
}
