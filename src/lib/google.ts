import type { Session, User } from "@supabase/supabase-js";
import type { OAuthIntegration } from "@/lib/integrations-config";

export const GOOGLE_INTEGRATION_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

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
  const identity = googleIdentity(user);
  const hasApiAccess = Boolean(session?.provider_token);
  const connected = Boolean(identity || hasApiAccess);

  return {
    connected,
    accountName: connected ? googleAccountLabel(user, session) : "",
    hasApiAccess,
  };
}

export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;
  return null;
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
