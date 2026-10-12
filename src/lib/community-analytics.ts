import type { CommunityStore } from "@/lib/community";
import type { AnalyticsGroup } from "@/lib/dev-mock-data";

type Dated = { addedAt?: string; enrollmentDate?: string; status?: string };

function calendarDay(record: Dated) {
  const raw = record.addedAt || record.enrollmentDate || "";
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function isActive(status: string | undefined) {
  return (status ?? "").trim().toLowerCase() === "active";
}

function existedByYear(record: Dated, year: number, includeUndated: boolean) {
  const day = calendarDay(record);
  if (!day) return includeUndated;
  return Number(day.slice(0, 4)) <= year;
}

function addedInFocus(record: Dated, year: number, now: Date) {
  const day = calendarDay(record);
  if (!day) return false;
  if (year === now.getFullYear()) {
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return day.startsWith(`${year}-${month}`);
  }
  return day.startsWith(String(year));
}

function addedInYear(record: Dated, year: number) {
  const day = calendarDay(record);
  return !!day && day.startsWith(String(year));
}

function focusNote(year: number, now: Date, suffix: string) {
  if (year !== now.getFullYear()) return `${suffix} · ${year}`;
  const month = now.toLocaleString("en-US", { month: "short" });
  return `${suffix} · ${month} ${year}`;
}

function allRecords(store: CommunityStore): Dated[] {
  return [...store.children, ...store.guardians, ...store.volunteers, ...store.partners];
}

export function liveCommunityGroup(store: CommunityStore, year: number, now = new Date()): AnalyticsGroup {
  const includeUndated = year === now.getFullYear();
  const children = store.children.filter(
    (child) => isActive(child.status) && existedByYear(child, year, includeUndated),
  ).length;
  const volunteers = store.volunteers.filter(
    (volunteer) => isActive(volunteer.status) && existedByYear(volunteer, year, includeUndated),
  ).length;
  const partners = store.partners.filter(
    (partner) => isActive(partner.status) && existedByYear(partner, year, includeUndated),
  ).length;
  const contacts = allRecords(store).filter((record) => addedInFocus(record, year, now)).length;

  return {
    key: "community",
    label: "Community",
    color: "#3AB819",
    metrics: [
      { label: "Total enrolled children", value: String(children), note: "Active · all programs" },
      { label: "Active volunteers", value: String(volunteers), note: "Active status in directory" },
      { label: "Active partners", value: String(partners), note: "Active status · all types" },
      {
        label: "New contacts this month",
        value: String(contacts),
        note: focusNote(year, now, "All record types"),
      },
    ],
  };
}

export function liveEngagementGroup(store: CommunityStore, year: number, now = new Date()): AnalyticsGroup {
  const volunteers = store.volunteers.filter((record) => addedInFocus(record, year, now)).length;
  const partners = store.partners.filter((record) => addedInFocus(record, year, now)).length;
  const children = store.children.filter((record) => addedInFocus(record, year, now)).length;
  const added = allRecords(store).filter((record) => addedInYear(record, year)).length;

  return {
    key: "engagement",
    label: "Engagement",
    color: "#776BD9",
    metrics: [
      {
        label: "Volunteer signups this month",
        value: String(volunteers),
        note: focusNote(year, now, "/join submissions"),
      },
      {
        label: "Partner inquiries this month",
        value: String(partners),
        note: focusNote(year, now, "/partner submissions"),
      },
      {
        label: "Child enrollments this month",
        value: String(children),
        note: focusNote(year, now, "/enroll submissions"),
      },
      {
        label: "Community growth",
        value: added > 0 ? `+${added}` : "0",
        note: `Records added in ${year}`,
      },
    ],
  };
}

/** Cumulative community records through each month of the selected year. */
export function liveGrowthPoints(store: CommunityStore, year: number, now = new Date()) {
  const includeUndated = year === now.getFullYear();
  const records = allRecords(store);
  const undated = includeUndated ? records.filter((record) => !calendarDay(record)).length : 0;

  return Array.from({ length: 12 }, (_, month) => {
    const end = `${year}-${String(month + 1).padStart(2, "0")}-31`;
    const dated = records.filter((record) => {
      const day = calendarDay(record);
      return !!day && day <= end;
    }).length;
    return dated + undated;
  });
}
