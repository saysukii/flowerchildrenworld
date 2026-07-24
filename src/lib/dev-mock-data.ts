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
};

export type AnalyticsGroup = {
  key: string;
  label: string;
  color: string;
  metrics: AnalyticsMetric[];
};

export const MOCK_ANALYTICS_GROUPS: AnalyticsGroup[] = [
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
      { label: "Total events hosted", value: "128", note: "All time" },
    ],
  },
  {
    key: "donations",
    label: "Donations",
    color: "#EFB003",
    metrics: [
      { label: "Total donated this month", value: "$28,450", note: "Confirmed charges · mock data" },
      { label: "Total donated all-time", value: "$214,890", note: "Cumulative · mock data" },
      { label: "Recurring vs one-time", value: "94 · 318", note: "recurring · one-time" },
      {
        label: "Recent donors",
        value: "8",
        note: "M.K. · $250 · A.R. · $150 · J.L. · $500 · S.P. · $100 · N.W. · $200 · T.N. · $75 · R.C. · $300 · L.B. · $125",
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
      { label: "Community growth", value: "+112%", note: "Total records by month · all time" },
    ],
  },
];

/** Monthly community record totals for the growth chart (Jan–Jun). */
export const MOCK_GROWTH_POINTS = [118, 164, 221, 298, 372, 486];

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
  role: "Admin" | "Member";
  status: "Active" | "Pending";
};

export const MOCK_TEAM_MEMBERS: MockTeamMember[] = [
  {
    id: "mock-member-sukii",
    name: "Sukii",
    email: "info@flowerchildren.world",
    role: "Admin",
    status: "Active",
  },
  {
    id: "mock-member-sofia",
    name: "Sofia Martinez",
    email: "sofia.m@example.com",
    role: "Member",
    status: "Active",
  },
  {
    id: "mock-member-jordan",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    role: "Member",
    status: "Active",
  },
  {
    id: "mock-member-priya",
    name: "Priya Patel",
    email: "priya.p@example.com",
    role: "Member",
    status: "Active",
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
