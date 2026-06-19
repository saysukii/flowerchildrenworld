export type StripeDonor = {
  name: string;
  amountCents: number;
  currency: string;
  date: string;
};

export type StripeDonationAnalytics = {
  connected: boolean;
  accountName: string;
  monthTotalCents: number;
  allTimeTotalCents: number;
  recurringCount: number;
  oneTimeCount: number;
  recentDonors: StripeDonor[];
  currency: string;
};

export type StripeIntegrationStatus = {
  connected: boolean;
  configured: boolean;
  accountName: string;
  setupIssues: string[];
};

export function formatStripeMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatRecurringSplit(recurringCount: number, oneTimeCount: number) {
  if (recurringCount === 0 && oneTimeCount === 0) return "—";
  return `${recurringCount} recurring · ${oneTimeCount} one-time`;
}

export function formatRecentDonors(donors: StripeDonor[]) {
  if (donors.length === 0) return "—";
  return donors
    .slice(0, 3)
    .map((donor) => `${donor.name} · ${formatStripeMoney(donor.amountCents, donor.currency)}`)
    .join(" · ");
}

export const EMPTY_STRIPE_DONATIONS: StripeDonationAnalytics = {
  connected: false,
  accountName: "",
  monthTotalCents: 0,
  allTimeTotalCents: 0,
  recurringCount: 0,
  oneTimeCount: 0,
  recentDonors: [],
  currency: "usd",
};
