import type { Session, User } from "@supabase/supabase-js";
import type { OAuthIntegration } from "@/lib/integrations-config";

export const GOOGLE_INTEGRATION_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
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
