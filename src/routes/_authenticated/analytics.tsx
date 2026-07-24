import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchStripeDonationAnalytics } from "@/lib/api/stripe.functions";
import {
  getAnalyticsYears,
  getMockAnalyticsGroups,
  getMockGrowthPoints,
  GROWTH_MONTH_LABELS,
  isDevMock,
  MOCK_STRIPE_DONATIONS,
} from "@/lib/dev-mock-data";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  EMPTY_STRIPE_DONATIONS,
  formatStripeMoney,
  type StripeDonationAnalytics,
  type StripeDonor,
} from "@/lib/stripe-analytics";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/user-role";
import { cn } from "@/lib/utils";

const GROWTH_GREEN = "#3AB819";

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
  donors?: StripeDonor[];
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
        value: formatRecurringSplitValue(stripe.recurringCount, stripe.oneTimeCount),
        note: "recurring · one-time",
      },
      {
        label: "Recent donors",
        value: stripe.recentDonors.length > 0 ? String(stripe.recentDonors.length) : "—",
        note:
          stripe.recentDonors.length > 0
            ? "Last 10"
            : "Last 10 · name · amount · date",
        donors: stripe.recentDonors.length > 0 ? stripe.recentDonors : undefined,
      },
    ],
  };
}

function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => getAnalyticsYears(), [currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1] ?? currentYear);
    }
  }, [years, selectedYear, currentYear]);
  const [admin, setAdmin] = useState(false);
  const [stripe, setStripe] = useState<StripeDonationAnalytics>(
    isDevMock ? MOCK_STRIPE_DONATIONS : EMPTY_STRIPE_DONATIONS,
  );
  const [loadingStripe, setLoadingStripe] = useState(!isDevMock);

  useEffect(() => {
    if (isDevMock) return;

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
    if (isDevMock) return getMockAnalyticsGroups(selectedYear);
    const donations = donationsGroup(stripe, admin && loadingStripe);
    return [
      STATIC_GROUPS[0],
      STATIC_GROUPS[1],
      donations,
      STATIC_GROUPS[2],
    ];
  }, [admin, loadingStripe, selectedYear, stripe]);

  const growthPoints = useMemo(
    () => (isDevMock ? getMockGrowthPoints(selectedYear) : []),
    [selectedYear],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <span className="font-label text-[11px] text-foreground/50">Analytics</span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">How we&apos;re growing</h1>
              <p className="mt-2 text-sm text-foreground/60">
                Community, events, donations, and engagement — all in one place.
              </p>
            </div>
            <YearSelector years={years} value={selectedYear} onChange={setSelectedYear} />
          </div>
        </header>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={`${selectedYear}-${group.key}`}>
              <h2
                className="font-label text-[11px] mb-4"
                style={{ color: group.color }}
              >
                {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:h-full">
                {group.metrics.map((m, index) => (
                  <MetricCard
                    key={`${selectedYear}-${m.label}`}
                    metric={m}
                    fadeDelayMs={index * 70}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-black/5 bg-white px-5 py-7 sm:px-8 sm:py-10">
          {isDevMock ? (
            <GrowthChart
              key={selectedYear}
              year={selectedYear}
              points={growthPoints}
              labels={[...GROWTH_MONTH_LABELS]}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-lg font-normal">Community growth over time</h3>
                <p className="text-xs font-light text-foreground/45">
                  {selectedYear} · total community records by month
                </p>
              </div>
              <div className="relative mt-6 flex h-56 items-center justify-center rounded-2xl border border-dashed border-black/10">
                <p className="px-4 text-center text-sm text-foreground/40">
                  Data will appear as your community grows.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function YearSelector({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) {
  const options = [...years].reverse();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select analytics year"
          className="inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-full border border-foreground/20 px-3 text-sm font-normal tabular-nums text-foreground transition-colors hover:bg-black/[0.03]"
        >
          {value}
          <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[5.5rem] rounded-xl border-black/5 bg-white p-1 shadow-md"
      >
        {options.map((year) => (
          <DropdownMenuItem
            key={year}
            onClick={() => onChange(year)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-sm tabular-nums",
              year === value ? "font-normal text-foreground" : "font-light text-foreground/55",
            )}
          >
            {year}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FadeInNumber({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.45, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
        className,
      )}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </span>
  );
}

function MetricCard({ metric, fadeDelayMs = 0 }: { metric: Metric; fadeDelayMs?: number }) {
  if (metric.donors && metric.donors.length > 0) {
    return (
      <RecentDonorsCard metric={metric} donors={metric.donors} fadeDelayMs={fadeDelayMs} />
    );
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-black/5 bg-white px-5 py-5 sm:px-6 sm:py-6">
      <p className="min-h-8 text-xs font-light leading-snug text-foreground/60">{metric.label}</p>
      <p className="mt-2 flex-1 text-2xl font-normal leading-none tabular-nums">
        <FadeInNumber delayMs={fadeDelayMs}>{metric.value}</FadeInNumber>
      </p>
      <div className="mt-4 flex min-h-10 shrink-0 items-end border-t border-black/5 pt-3">
        <p className="text-[11px] font-light leading-snug text-foreground/40">{metric.note}</p>
      </div>
    </div>
  );
}

function RecentDonorsCard({
  metric,
  donors,
  fadeDelayMs = 0,
}: {
  metric: Metric;
  donors: StripeDonor[];
  fadeDelayMs?: number;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => {
        if (!isMobile) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setOpen(false);
      }}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-3xl border border-black/5 bg-white px-5 py-5 sm:px-6 sm:py-6",
          open && "invisible",
        )}
      >
        <p className="min-h-8 text-xs font-light leading-snug text-foreground/60">{metric.label}</p>
        <FadeInNumber delayMs={fadeDelayMs} className="mt-2 flex-1 self-start">
          <button
            type="button"
            className="text-left text-2xl font-normal leading-none tabular-nums underline decoration-foreground/20 underline-offset-4 transition-colors hover:decoration-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={open}
            aria-label="Show recent donors"
            onClick={() => {
              if (isMobile) setOpen((prev) => !prev);
            }}
          >
            {metric.value}
          </button>
        </FadeInNumber>
        <div className="mt-4 flex min-h-10 shrink-0 items-end border-t border-black/5 pt-3">
          <p className="text-[11px] font-light leading-snug text-foreground/40">{metric.note}</p>
        </div>
      </div>

      {open ? (
        <div className="absolute inset-0 z-10 flex flex-col rounded-3xl border border-black/5 bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <p className="min-h-8 text-xs font-light leading-snug text-foreground/60">{metric.label}</p>
            {isMobile ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-[11px] font-light text-foreground/45 hover:text-foreground"
              >
                Close
              </button>
            ) : null}
          </div>
          <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {donors.map((donor, index) => (
              <li
                key={`${donor.name}-${donor.date}-${index}`}
                className="flex items-baseline justify-between gap-3 border-b border-black/5 pb-2 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-normal">{donor.name}</p>
                  <p className="text-[11px] font-light text-foreground/45">
                    {formatDonorDate(donor.date)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-normal tabular-nums">
                  {formatStripeMoney(donor.amountCents, donor.currency)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function formatDonorDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatRecurringSplitValue(recurringCount: number, oneTimeCount: number) {
  if (recurringCount === 0 && oneTimeCount === 0) return "—";
  return `${recurringCount} · ${oneTimeCount}`;
}

function GrowthChart({
  year,
  points,
  labels,
}: {
  year: number;
  points: number[];
  labels: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const [inView, setInView] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isNarrow = width > 0 && width < 520;

  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const throughIndex = Math.min(
    isCurrentYear ? now.getMonth() : labels.length - 1,
    labels.length - 1,
    points.length - 1,
  );
  const yearPoints = labels.map((_, index) => (index <= throughIndex ? (points[index] ?? 0) : null));
  const series = yearPoints
    .map((value, index) => ({ value, index, label: labels[index] ?? "" }))
    .filter((item): item is { value: number; index: number; label: string } => item.value !== null);

  const currentLabel = labels[throughIndex] ?? "Now";
  const currentValue = points[throughIndex] ?? 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => setWidth(el.clientWidth);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = isNarrow ? 220 : 280;
  const pad = {
    top: 28,
    right: isNarrow ? 12 : 20,
    bottom: isNarrow ? 40 : 44,
    left: isNarrow ? 36 : 48,
  };
  const innerW = Math.max(width - pad.left - pad.right, 0);
  const innerH = height - pad.top - pad.bottom;

  const maxValue = Math.max(...series.map((s) => s.value), 0);
  const yMax = niceCeil(maxValue);
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));

  const xForIndex = (index: number) =>
    pad.left + (index / Math.max(labels.length - 1, 1)) * innerW;
  const yForValue = (value: number) => pad.top + innerH - (value / yMax) * innerH;

  const coords = series.map((item) => ({
    ...item,
    x: xForIndex(item.index),
    y: yForValue(item.value),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1]!.x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} L ${coords[0]!.x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`
      : "";

  useLayoutEffect(() => {
    if (!lineRef.current || !linePath) return;
    setPathLength(lineRef.current.getTotalLength());
    setDrawn(false);
  }, [linePath, width]);

  useEffect(() => {
    if (!inView || pathLength === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDrawn(true);
      return;
    }

    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [inView, pathLength, linePath]);

  const hover = activeIndex !== null ? coords.find((c) => c.index === activeIndex) ?? null : null;
  const end = coords[coords.length - 1] ?? null;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-normal">Community growth over time</h3>
          <p className="mt-1 text-xs font-light text-foreground/45">
            {isCurrentYear
              ? `${year} · year to date through ${currentLabel}`
              : `${year} · full year`}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] font-light uppercase tracking-wider text-foreground/40">
            {isCurrentYear ? `${currentLabel} total` : "Year end"}
          </p>
          <p className="mt-0.5 text-2xl font-normal tabular-nums" style={{ color: GROWTH_GREEN }}>
            <FadeInNumber>{currentValue.toLocaleString()}</FadeInNumber>
          </p>
        </div>
      </div>

      <div className="relative mt-5 w-full">
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block w-full"
            role="img"
            aria-label={`Community growth for ${year}, January through ${currentLabel}`}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GROWTH_GREEN} stopOpacity="0.22" />
                <stop offset="100%" stopColor={GROWTH_GREEN} stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = yForValue(tick);
              return (
                <g key={tick}>
                  <line
                    x1={pad.left}
                    x2={pad.left + innerW}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-black/[0.06]"
                  />
                  <text
                    x={pad.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-foreground/40"
                    style={{ fontSize: isNarrow ? 9 : 10 }}
                  >
                    {isNarrow && tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Remaining year after the current month */}
            {throughIndex < labels.length - 1 ? (
              <rect
                x={xForIndex(throughIndex)}
                y={pad.top}
                width={Math.max(pad.left + innerW - xForIndex(throughIndex), 0)}
                height={innerH}
                fill="currentColor"
                className="text-black/[0.025]"
              />
            ) : null}

            <line
              x1={xForIndex(throughIndex)}
              x2={xForIndex(throughIndex)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke={GROWTH_GREEN}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.45"
            />

            <path
              d={areaPath}
              fill="url(#growth-area)"
              opacity={drawn ? 1 : 0}
              style={{
                transition: drawn ? "opacity 0.7s ease 1.1s" : undefined,
              }}
            />
            <path
              ref={lineRef}
              d={linePath}
              fill="none"
              stroke={GROWTH_GREEN}
              strokeWidth={isNarrow ? 2.25 : 2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pathLength > 0 ? 1 : 0}
              strokeDasharray={pathLength > 0 ? pathLength : undefined}
              strokeDashoffset={pathLength > 0 && !drawn ? pathLength : 0}
              style={{
                transition: drawn ? "stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
              }}
            />

            {coords.map((c, i) => {
              const isCurrent = c.index === throughIndex;
              const isActive = activeIndex === c.index;
              return (
                <g
                  key={c.label}
                  opacity={drawn ? 1 : 0}
                  style={{
                    transition: `opacity 0.35s ease ${0.18 * i + 0.9}s`,
                  }}
                >
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="14"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIndex(c.index)}
                    onClick={() => setActiveIndex((prev) => (prev === c.index ? null : c.index))}
                  />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isCurrent || isActive ? 5.5 : 3.5}
                    fill="#fff"
                    stroke={GROWTH_GREEN}
                    strokeWidth={isCurrent || isActive ? 2.5 : 2}
                    className="pointer-events-none"
                  />
                </g>
              );
            })}

            {labels.map((label, index) => {
              const future = index > throughIndex;
              const show =
                !isNarrow ||
                index === 0 ||
                index === throughIndex ||
                index === labels.length - 1 ||
                index % 2 === 0;
              if (!show) return null;
              return (
                <text
                  key={label}
                  x={xForIndex(index)}
                  y={height - (isNarrow ? 12 : 14)}
                  textAnchor="middle"
                  className={future ? "fill-foreground/25" : "fill-foreground/45"}
                  style={{ fontSize: isNarrow ? 9 : 10, letterSpacing: "0.06em" }}
                >
                  {isNarrow ? label.slice(0, 1) : label.toUpperCase()}
                </text>
              );
            })}

            {end && drawn ? (
              <g>
                <text
                  x={Math.min(end.x + 8, pad.left + innerW)}
                  y={end.y - 12}
                  textAnchor={end.x > pad.left + innerW * 0.75 ? "end" : "start"}
                  className="fill-foreground/70"
                  style={{ fontSize: 11 }}
                >
                  {isCurrentYear ? "Now" : "Dec"}
                </text>
              </g>
            ) : null}

            {hover ? (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={Math.min(Math.max(hover.x - 36, 4), width - 76)}
                  y={Math.max(hover.y - 42, 4)}
                  width="72"
                  height="28"
                  rx="8"
                  fill="#020202"
                />
                <text
                  x={Math.min(Math.max(hover.x, 40), width - 40)}
                  y={Math.max(hover.y - 24, 22)}
                  textAnchor="middle"
                  fill="#fff"
                  style={{ fontSize: 11 }}
                >
                  {hover.value.toLocaleString()}
                </text>
              </g>
            ) : null}
          </svg>
        ) : (
          <div className="h-[220px] w-full sm:h-[280px]" />
        )}
      </div>
    </div>
  );
}

/** Round up to a readable chart ceiling (e.g. 896 → 1000). */
function niceCeil(value: number) {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude >= 100 ? magnitude / 2 : magnitude;
  return Math.ceil(value / step) * step;
}
