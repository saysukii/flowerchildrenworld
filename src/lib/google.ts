import type { Session, User } from "@supabase/supabase-js";
import type { OAuthIntegration } from "@/lib/integrations-config";

/** Sign-in, Calendar, and Drive — the Google features Inside uses. */
export const GOOGLE_INTEGRATION_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

export type GoogleSpreadsheet = {
  id: string;
  name: string;
  modifiedTime: string;
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
};

export function googleIdentity(user: User | null | undefined) {
  return user?.identities?.find((identity) => identity.provider === "google") ?? null;
}

export function googleAccountLabel(user: User | null | undefined, session: Session | null) {
  const identity = googleIdentity(user);
  const identityEmail = (identity?.identity_data as { email?: string } | undefined)?.email;
  return (
    identityEmail ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    session?.user?.email ||
    ""
  );
}

export function googleIntegrationFromSession(session: Session | null): OAuthIntegration & {
  hasApiAccess: boolean;
} {
  const user = session?.user ?? null;
  const token = readGoogleAccessToken(session?.provider_token);
  const hasApiAccess = Boolean(token);
  const connected = hasApiAccess;

  return {
    connected,
    accountName: connected ? googleAccountLabel(user, session) : "",
    hasApiAccess,
  };
}

const GOOGLE_TOKEN_KEY = "fcw-google-access-token";
const GOOGLE_TOKEN_EXPIRY_KEY = "fcw-google-access-expires";
const GOOGLE_TOKEN_TTL_MS = 50 * 60 * 1000;

export function rememberGoogleAccessToken(token: string | null | undefined) {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
  sessionStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(Date.now() + GOOGLE_TOKEN_TTL_MS));
}

export function clearGoogleAccessToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
  sessionStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
}

/** A Google identity alone is not enough. Calendar and Sheets need the access token from Connect. */
export function readGoogleAccessToken(freshToken?: string | null) {
  if (freshToken) {
    rememberGoogleAccessToken(freshToken);
    return freshToken;
  }
  if (typeof sessionStorage === "undefined") return null;
  const expires = Number(sessionStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY) || 0);
  const stored = sessionStorage.getItem(GOOGLE_TOKEN_KEY);
  if (!stored || !expires || Date.now() > expires) {
    clearGoogleAccessToken();
    return null;
  }
  return stored;
}

export type GoogleCalendarListing = {
  id: string;
  title: string;
  time: string;
  detail?: string;
  day: "today" | "upcoming";
};

export async function fetchPrimaryCalendarEvents(accessToken: string): Promise<GoogleCalendarListing[]> {
  const calendars = await listSelectedCalendars(accessToken);
  const batches = await Promise.all(calendars.map((calendar) => listCalendarEvents(accessToken, calendar)));
  return batches
    .flat()
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _sortKey, ...event }) => event);
}

async function listSelectedCalendars(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&showHidden=false",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 401) {
    clearGoogleAccessToken();
    throw new GoogleAccessError("Google access expired. Connect Google again in Settings.");
  }
  if (!response.ok) {
    return [{ id: "primary", name: "" }];
  }
  const payload = (await response.json()) as {
    items?: Array<{ id?: string; summary?: string; selected?: boolean; primary?: boolean }>;
  };
  const calendars = (payload.items ?? [])
    .filter((calendar) => calendar.id && calendar.selected !== false)
    .map((calendar) => ({ id: calendar.id as string, name: calendar.primary ? "" : calendar.summary ?? "" }));
  return calendars.length > 0 ? calendars : [{ id: "primary", name: "" }];
}

async function listCalendarEvents(accessToken: string, calendar: { id: string; name: string }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "40",
  });
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 401) {
    clearGoogleAccessToken();
    throw new GoogleAccessError("Google access expired. Connect Google again in Settings.");
  }
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      location?: string;
      description?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
    }>;
  };

  const today = new Date();
  return (payload.items ?? []).flatMap((item) => {
    if (item.status === "cancelled") return [];
    const when = item.start?.dateTime || item.start?.date;
    if (!when) return [];
    const startDate = item.start?.dateTime
      ? new Date(item.start.dateTime)
      : localDateFromIso(item.start?.date ?? "");
    if (!startDate || Number.isNaN(startDate.getTime())) return [];
    const sameDay =
      startDate.getFullYear() === today.getFullYear() &&
      startDate.getMonth() === today.getMonth() &&
      startDate.getDate() === today.getDate();
    const place = item.location?.trim() || item.description?.split("\n")[0]?.trim() || "";
    const detail = [calendar.name, place].filter(Boolean).join(" · ") || undefined;
    return [
      {
        id: `${calendar.id}:${item.id || when}`,
        title: item.summary?.trim() || "(No title)",
        time: item.start?.dateTime
          ? startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
          : "All day",
        detail,
        day: sameDay ? ("today" as const) : ("upcoming" as const),
        sortKey: startDate.getTime(),
      },
    ];
  });
}

export class GoogleAccessError extends Error {}

function localDateFromIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;
  return null;
}

export async function fetchUserSpreadsheets(accessToken: string): Promise<GoogleSpreadsheet[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
  });
  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = body?.error?.message ?? `Could not list spreadsheets (${response.status})`;
    throw new Error(message);
  }

  const payload = (await response.json()) as {
    files?: { id?: string; name?: string; modifiedTime?: string }[];
  };
  return (payload.files ?? [])
    .filter((file): file is { id: string; name: string; modifiedTime: string } =>
      Boolean(file.id && file.name && file.modifiedTime),
    )
    .map((file) => ({
      id: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime,
    }));
}

export async function fetchDriveAssets(accessToken: string): Promise<GoogleDriveFile[]> {
  const q = [
    "trashed=false",
    "mimeType!='application/vnd.google-apps.folder'",
    "(",
    "mimeType contains 'image/'",
    "or mimeType='application/pdf'",
    "or mimeType contains 'font/'",
    "or mimeType='application/vnd.google-apps.document'",
    "or mimeType='application/vnd.google-apps.presentation'",
    ")",
  ].join(" ");
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,modifiedTime,thumbnailLink,webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Could not list Drive files (${response.status})`);
  }

  const payload = (await response.json()) as {
    files?: {
      id?: string;
      name?: string;
      mimeType?: string;
      modifiedTime?: string;
      thumbnailLink?: string;
      webViewLink?: string;
    }[];
  };

  return (payload.files ?? [])
    .filter(
      (file): file is GoogleDriveFile =>
        Boolean(file.id && file.name && file.mimeType && file.modifiedTime),
    )
    .map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      thumbnailLink: file.thumbnailLink,
      webViewLink: file.webViewLink,
    }));
}

export async function downloadDriveFile(file: GoogleDriveFile, accessToken: string): Promise<Blob> {
  const isGoogleDoc = file.mimeType.startsWith("application/vnd.google-apps.");
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Could not download file (${response.status})`);
  }

  const blob = await response.blob();
  if (isGoogleDoc) {
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}

export async function fetchSpreadsheetValues(
  spreadsheetId: string,
  range: string,
  accessToken: string,
): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = body?.error?.message ?? `Google Sheets request failed (${response.status})`;
    throw new Error(message);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

export async function fetchSpreadsheetTabs(
  spreadsheetId: string,
  accessToken: string,
): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = body?.error?.message ?? `Could not read spreadsheet (${response.status})`;
    throw new Error(message);
  }

  const payload = (await response.json()) as {
    sheets?: { properties?: { title?: string } }[];
  };
  return (payload.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((title): title is string => Boolean(title));
}

export function sheetValuesToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(","),
    )
    .join("\n");
}
