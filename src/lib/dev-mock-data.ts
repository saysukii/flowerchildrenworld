import type { CommunityStore } from "@/lib/community";
import type { StripeDonationAnalytics } from "@/lib/stripe-analytics";

/** Mock data is only used when running `npm run dev`. Production builds are unaffected. */
export const isDevMock = import.meta.env.DEV;

export const MOCK_COMMUNITY_STORE: CommunityStore = {
  children: [
    {
      id: "mock-child-1",
      fullName: "Maya Chen",
      dateOfBirth: "2019-04-12",
      program: "Full-Time",
      status: "Active",
      enrollmentDate: "2025-09-01",
      guardianId: "mock-guardian-1",
      guardianLink: "Lin Chen",
      notes: "Loves watercolor and morning circle.",
    },
    {
      id: "mock-child-2",
      fullName: "Leo Rodriguez",
      dateOfBirth: "2020-11-03",
      program: "Drop-In",
      status: "Active",
      enrollmentDate: "2026-01-15",
      guardianId: "mock-guardian-2",
      guardianLink: "Elena Rodriguez",
      notes: "",
    },
    {
      id: "mock-child-3",
      fullName: "Amara Johnson",
      dateOfBirth: "2018-07-22",
      program: "Full-Time",
      status: "Active",
      enrollmentDate: "2024-08-20",
      guardianId: "mock-guardian-3",
      guardianLink: "James Johnson",
      notes: "Garden club on Thursdays.",
    },
  ],
  guardians: [
    {
      id: "mock-guardian-1",
      guardianName: "Lin Chen",
      email: "lin.chen@example.com",
      phone: "(555) 201-8841",
      emergencyContactName: "David Chen",
      emergencyContactPhone: "(555) 201-8842",
      linkedChildren: "Maya Chen",
    },
    {
      id: "mock-guardian-2",
      guardianName: "Elena Rodriguez",
      email: "elena.r@example.com",
      phone: "(555) 318-4402",
      emergencyContactName: "Marco Rodriguez",
      emergencyContactPhone: "(555) 318-4403",
      linkedChildren: "Leo Rodriguez",
    },
    {
      id: "mock-guardian-3",
      guardianName: "James Johnson",
      email: "j.johnson@example.com",
      phone: "(555) 902-7710",
      emergencyContactName: "Keisha Johnson",
      emergencyContactPhone: "(555) 902-7711",
      linkedChildren: "Amara Johnson",
    },
  ],
  volunteers: [
    {
      id: "mock-volunteer-1",
      fullName: "Sofia Martinez",
      email: "sofia.m@example.com",
      phone: "(555) 410-2290",
      skills: "Storytelling, Spanish, outdoor play",
      availability: "Mon, Wed, Fri",
      status: "Active",
      source: "Website form",
    },
    {
      id: "mock-volunteer-2",
      fullName: "Jordan Lee",
      email: "jordan.lee@example.com",
      phone: "(555) 667-1183",
      skills: "Music, gardening, event setup",
      availability: "Sat, Sun",
      status: "Active",
      source: "FCW event",
    },
    {
      id: "mock-volunteer-3",
      fullName: "Priya Patel",
      email: "priya.p@example.com",
      phone: "(555) 778-3301",
      skills: "Photography, social media",
      availability: "Tue, Thu",
      status: "Active",
      source: "Referral",
    },
  ],
  partners: [
    {
      id: "mock-partner-1",
      organizationName: "Greenfield Community Library",
      contactName: "Nora Whitfield",
      email: "nora@greenfieldlibrary.org",
      phone: "(555) 120-8890",
      partnershipType: "Community",
      notes: "Monthly story hour + summer reading list.",
      status: "Active",
    },
    {
      id: "mock-partner-2",
      organizationName: "Sunrise Pediatrics",
      contactName: "Dr. Alan Brooks",
      email: "alan.b@sunrisepeds.org",
      phone: "(555) 334-2200",
      partnershipType: "Corporate",
      notes: "Wellness workshops for families.",
      status: "Active",
    },
    {
      id: "mock-partner-3",
      organizationName: "Local Roots Farm Co-op",
      contactName: "Tessa Nguyen",
      email: "tessa@localroots.coop",
      phone: "(555) 881-0044",
      partnershipType: "Community",
      notes: "Seasonal produce for snack program.",
      status: "Prospect",
    },
  ],
};

export type AnalyticsMetric = {
  label: string;
  value: string;
  note: string;
  donors?: Array<{ name: string; amountCents: number; currency: string; date: string }>;
};

export type AnalyticsGroup = {
  key: string;
  label: string;
  color: string;
  metrics: AnalyticsMetric[];
};

export const GROWTH_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** First year analytics tracking began. Picker only includes this through the current calendar year. */
const ANALYTICS_START_YEAR = 2026;

/** Years available in the analytics year picker (through the current calendar year). */
export function getAnalyticsYears(now = new Date()) {
  const current = now.getFullYear();
  const start = Math.min(ANALYTICS_START_YEAR, current);
  const years: number[] = [];
  for (let year = start; year <= current; year += 1) years.push(year);
  return years;
}

const MOCK_ANALYTICS_BY_YEAR: Record<number, AnalyticsGroup[]> = {
  2024: [
    {
      key: "community",
      label: "Community",
      color: "#3AB819",
      metrics: [
        { label: "Total enrolled children", value: "142", note: "Active · all programs" },
        { label: "Active volunteers", value: "98", note: "Active status in directory" },
        { label: "Active partners", value: "31", note: "Active status · all types" },
        { label: "New contacts this month", value: "54", note: "All record types · Dec 2024" },
      ],
    },
    {
      key: "events",
      label: "Events",
      color: "#15AAD2",
      metrics: [
        { label: "Upcoming events", value: "0", note: "Year complete" },
        { label: "RSVPs this month", value: "210", note: "Dec 2024 · all events" },
        { label: "Most attended recent event", value: "186", note: "Harvest Festival · 2024" },
        { label: "Total events hosted", value: "74", note: "2024 total" },
      ],
    },
    {
      key: "donations",
      label: "Donations",
      color: "#EFB003",
      metrics: [
        { label: "Total donated this month", value: "$9,820", note: "Dec 2024 · mock data" },
        { label: "Total donated this year", value: "$96,440", note: "2024 cumulative · mock data" },
        { label: "Recurring vs one-time", value: "41 · 168", note: "recurring · one-time" },
        {
          label: "Recent donors",
          value: "5",
          note: "Last 10",
          donors: [
            { name: "C.D.", amountCents: 12_000, currency: "usd", date: "2024-12-18" },
            { name: "E.F.", amountCents: 8_000, currency: "usd", date: "2024-12-12" },
            { name: "G.H.", amountCents: 25_000, currency: "usd", date: "2024-12-08" },
            { name: "I.J.", amountCents: 5_000, currency: "usd", date: "2024-12-03" },
            { name: "K.L.", amountCents: 15_000, currency: "usd", date: "2024-11-28" },
          ],
        },
      ],
    },
    {
      key: "engagement",
      label: "Engagement",
      color: "#776BD9",
      metrics: [
        { label: "Volunteer signups this month", value: "22", note: "/join · Dec 2024" },
        { label: "Partner inquiries this month", value: "11", note: "/partner · Dec 2024" },
        { label: "Child enrollments this month", value: "18", note: "/enroll · Dec 2024" },
        { label: "Community growth", value: "+64%", note: "2024 year-over-year" },
      ],
    },
  ],
  2025: [
    {
      key: "community",
      label: "Community",
      color: "#3AB819",
      metrics: [
        { label: "Total enrolled children", value: "196", note: "Active · all programs" },
        { label: "Active volunteers", value: "138", note: "Active status in directory" },
        { label: "Active partners", value: "48", note: "Active status · all types" },
        { label: "New contacts this month", value: "88", note: "All record types · Dec 2025" },
      ],
    },
    {
      key: "events",
      label: "Events",
      color: "#15AAD2",
      metrics: [
        { label: "Upcoming events", value: "0", note: "Year complete" },
        { label: "RSVPs this month", value: "402", note: "Dec 2025 · all events" },
        { label: "Most attended recent event", value: "248", note: "Winter Circle · 2025" },
        { label: "Total events hosted", value: "102", note: "2025 total" },
      ],
    },
    {
      key: "donations",
      label: "Donations",
      color: "#EFB003",
      metrics: [
        { label: "Total donated this month", value: "$18,260", note: "Dec 2025 · mock data" },
        { label: "Total donated this year", value: "$154,320", note: "2025 cumulative · mock data" },
        { label: "Recurring vs one-time", value: "72 · 241", note: "recurring · one-time" },
        {
          label: "Recent donors",
          value: "6",
          note: "Last 10",
          donors: [
            { name: "A.B.", amountCents: 20_000, currency: "usd", date: "2025-12-20" },
            { name: "C.D.", amountCents: 10_000, currency: "usd", date: "2025-12-14" },
            { name: "E.F.", amountCents: 40_000, currency: "usd", date: "2025-12-09" },
            { name: "G.H.", amountCents: 7_500, currency: "usd", date: "2025-12-04" },
            { name: "I.J.", amountCents: 15_000, currency: "usd", date: "2025-11-29" },
            { name: "K.L.", amountCents: 12_000, currency: "usd", date: "2025-11-22" },
          ],
        },
      ],
    },
    {
      key: "engagement",
      label: "Engagement",
      color: "#776BD9",
      metrics: [
        { label: "Volunteer signups this month", value: "41", note: "/join · Dec 2025" },
        { label: "Partner inquiries this month", value: "19", note: "/partner · Dec 2025" },
        { label: "Child enrollments this month", value: "33", note: "/enroll · Dec 2025" },
        { label: "Community growth", value: "+88%", note: "2025 year-over-year" },
      ],
    },
  ],
  2026: [
    {
      key: "community",
      label: "Community",
      color: "#3AB819",
      metrics: [
        { label: "Total enrolled children", value: "248", note: "Active · all programs" },
        { label: "Active volunteers", value: "176", note: "Active status in directory" },
        { label: "Active partners", value: "64", note: "Active status · all types" },
        { label: "New contacts this month", value: "132", note: "All record types · added this month" },
      ],
    },
    {
      key: "events",
      label: "Events",
      color: "#15AAD2",
      metrics: [
        { label: "Upcoming events", value: "12", note: "Next 30 days" },
        { label: "RSVPs this month", value: "684", note: "Total across all events" },
        { label: "Most attended recent event", value: "312", note: "Summer Solstice Festival · last 30 days" },
        { label: "Total events hosted", value: "128", note: "All time through 2026" },
      ],
    },
    {
      key: "donations",
      label: "Donations",
      color: "#EFB003",
      metrics: [
        { label: "Total donated this month", value: "$28,450", note: "Confirmed charges · mock data" },
        { label: "Total donated this year", value: "$214,890", note: "2026 year to date · mock data" },
        { label: "Recurring vs one-time", value: "94 · 318", note: "recurring · one-time" },
        {
          label: "Recent donors",
          value: "8",
          note: "Last 10",
          donors: [
            { name: "M.K.", amountCents: 25_000, currency: "usd", date: "2026-06-28" },
            { name: "A.R.", amountCents: 15_000, currency: "usd", date: "2026-06-27" },
            { name: "J.L.", amountCents: 50_000, currency: "usd", date: "2026-06-25" },
            { name: "S.P.", amountCents: 10_000, currency: "usd", date: "2026-06-24" },
            { name: "N.W.", amountCents: 20_000, currency: "usd", date: "2026-06-22" },
            { name: "T.N.", amountCents: 7500, currency: "usd", date: "2026-06-20" },
            { name: "R.C.", amountCents: 30_000, currency: "usd", date: "2026-06-18" },
            { name: "L.B.", amountCents: 12_500, currency: "usd", date: "2026-06-16" },
          ],
        },
      ],
    },
    {
      key: "engagement",
      label: "Engagement",
      color: "#776BD9",
      metrics: [
        { label: "Volunteer signups this month", value: "68", note: "/join submissions" },
        { label: "Partner inquiries this month", value: "31", note: "/partner submissions" },
        { label: "Child enrollments this month", value: "47", note: "/enroll submissions" },
        { label: "Community growth", value: "+112%", note: "2026 year to date" },
      ],
    },
  ],
};

/** Monthly community record totals by year (Jan–Dec). */
const MOCK_GROWTH_BY_YEAR: Record<number, number[]> = {
  2024: [62, 78, 95, 118, 142, 168, 196, 224, 258, 292, 328, 364],
  2025: [88, 112, 138, 172, 208, 248, 292, 336, 384, 428, 472, 518],
  2026: [118, 164, 221, 298, 372, 486, 542, 601, 668, 734, 812, 896],
};

export function getMockAnalyticsGroups(year: number): AnalyticsGroup[] {
  return MOCK_ANALYTICS_BY_YEAR[year] ?? MOCK_ANALYTICS_BY_YEAR[2026]!;
}

export function getMockGrowthPoints(year: number): number[] {
  return MOCK_GROWTH_BY_YEAR[year] ?? MOCK_GROWTH_BY_YEAR[2026]!;
}

export const MOCK_ANALYTICS_GROUPS = getMockAnalyticsGroups(2026);
export const MOCK_GROWTH_POINTS = getMockGrowthPoints(2026);

export const MOCK_STRIPE_DONATIONS: StripeDonationAnalytics = {
  connected: true,
  accountName: "Flower Children World (mock)",
  monthTotalCents: 2_845_000,
  allTimeTotalCents: 21_489_000,
  recurringCount: 94,
  oneTimeCount: 318,
  recentDonors: [
    { name: "M.K.", amountCents: 25_000, currency: "usd", date: "2026-06-28" },
    { name: "A.R.", amountCents: 15_000, currency: "usd", date: "2026-06-27" },
    { name: "J.L.", amountCents: 50_000, currency: "usd", date: "2026-06-25" },
    { name: "S.P.", amountCents: 10_000, currency: "usd", date: "2026-06-24" },
    { name: "N.W.", amountCents: 20_000, currency: "usd", date: "2026-06-22" },
    { name: "T.N.", amountCents: 7500, currency: "usd", date: "2026-06-20" },
    { name: "R.C.", amountCents: 30_000, currency: "usd", date: "2026-06-18" },
    { name: "L.B.", amountCents: 12_500, currency: "usd", date: "2026-06-16" },
  ],
  currency: "usd",
};

export type DashboardEvent = {
  title: string;
  time: string;
  detail?: string;
};

export const MOCK_TODAY_EVENTS: DashboardEvent[] = [
  { title: "Morning circle", time: "9:00 AM", detail: "Main studio · all ages" },
  { title: "Garden club", time: "2:30 PM", detail: "Backyard beds · ages 4–7" },
];

export const MOCK_UPCOMING_EVENTS: DashboardEvent[] = [
  { title: "Family potluck", time: "Sat · 11:00 AM", detail: "Bring a dish to share" },
  { title: "Volunteer orientation", time: "Mon · 6:00 PM", detail: "New helpers welcome" },
  { title: "Summer solstice celebration", time: "Fri · 4:00 PM", detail: "Music, crafts, and fire pit" },
];

export type MockTeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Admin" | "Member";
  status: "Active" | "Pending";
  pages: Array<
    | "dashboard"
    | "community"
    | "brand-essence"
    | "garden"
    | "analytics"
    | "messages"
    | "forms"
    | "routine-pulse"
  >;
};

export const MOCK_TEAM_MEMBERS: MockTeamMember[] = [
  {
    id: "mock-member-sukii",
    name: "Sukii",
    email: "info@flowerchildren.world",
    phone: "",
    role: "Admin",
    status: "Active",
    pages: ["dashboard", "messages", "community", "garden", "brand-essence", "analytics", "forms", "routine-pulse"],
  },
  {
    id: "mock-member-sofia",
    name: "Sofia Martinez",
    email: "sofia.m@example.com",
    phone: "(512) 555-0142",
    role: "Member",
    status: "Active",
    pages: ["dashboard", "messages", "community", "garden"],
  },
  {
    id: "mock-member-jordan",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "(512) 555-0198",
    role: "Member",
    status: "Active",
    pages: ["dashboard", "messages", "community", "garden", "analytics"],
  },
  {
    id: "mock-member-priya",
    name: "Priya Patel",
    email: "priya.p@example.com",
    phone: "(512) 555-0177",
    role: "Member",
    status: "Active",
    pages: ["dashboard", "messages", "community", "garden", "brand-essence"],
  },
];

export const MOCK_MESSAGE_THREADS = [
  {
    id: "mock-thread-1",
    participantIds: ["mock-member-sukii", "mock-member-sofia"],
    participantNames: ["Sukii", "Sofia Martinez"],
    updatedAt: "2026-07-24T14:20:00.000Z",
  },
  {
    id: "mock-thread-2",
    participantIds: ["mock-member-jordan", "mock-member-priya"],
    participantNames: ["Jordan Lee", "Priya Patel"],
    updatedAt: "2026-07-24T11:05:00.000Z",
  },
  {
    id: "mock-thread-3",
    participantIds: ["mock-member-sukii", "mock-member-jordan"],
    participantNames: ["Sukii", "Jordan Lee"],
    updatedAt: "2026-07-23T18:40:00.000Z",
  },
];

export const MOCK_MESSAGES = [
  {
    id: "mock-msg-1",
    threadId: "mock-thread-1",
    senderId: "mock-member-sukii",
    senderName: "Sukii",
    body: "Hey @Sofia Martinez — can you cover morning circle tomorrow?",
    mentions: [{ memberId: "mock-member-sofia", name: "Sofia Martinez" }],
    createdAt: "2026-07-24T13:58:00.000Z",
  },
  {
    id: "mock-msg-2",
    threadId: "mock-thread-1",
    senderId: "mock-member-sofia",
    senderName: "Sofia Martinez",
    body: "Yes! I'll be there at 8:45. Want me to bring the welcome cards?",
    mentions: [],
    createdAt: "2026-07-24T14:06:00.000Z",
  },
  {
    id: "mock-msg-3",
    threadId: "mock-thread-1",
    senderId: "mock-member-sukii",
    senderName: "Sukii",
    body: "Perfect — thank you @Sofia Martinez 💚",
    mentions: [{ memberId: "mock-member-sofia", name: "Sofia Martinez" }],
    createdAt: "2026-07-24T14:20:00.000Z",
  },
  {
    id: "mock-msg-4",
    threadId: "mock-thread-2",
    senderId: "mock-member-jordan",
    senderName: "Jordan Lee",
    body: "@Priya Patel do we still need photos for the solstice recap?",
    mentions: [{ memberId: "mock-member-priya", name: "Priya Patel" }],
    createdAt: "2026-07-24T10:40:00.000Z",
  },
  {
    id: "mock-msg-5",
    threadId: "mock-thread-2",
    senderId: "mock-member-priya",
    senderName: "Priya Patel",
    body: "Yes — uploading the gallery tonight. @Jordan Lee can you add captions?",
    mentions: [{ memberId: "mock-member-jordan", name: "Jordan Lee" }],
    createdAt: "2026-07-24T11:05:00.000Z",
  },
  {
    id: "mock-msg-6",
    threadId: "mock-thread-3",
    senderId: "mock-member-jordan",
    senderName: "Jordan Lee",
    body: "@Sukii garden beds are ready for Saturday's family visit.",
    mentions: [{ memberId: "mock-member-sukii", name: "Sukii" }],
    createdAt: "2026-07-23T18:40:00.000Z",
  },
];
