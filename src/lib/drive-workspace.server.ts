import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { exchangeGoogleRefreshToken } from "@/lib/google-oauth.server";

export const WORKSPACE_GOOGLE_EMAIL = "info@flowerchildren.world";

const ROOT_NAME = "Flower Children World";
const COMMUNITY_FOLDER = "Community";
const BRAND_FOLDER = "Brand Essence";
const DIRECTORY_NAME = "directory.json";

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  modifiedTime?: string;
  appProperties?: { category?: string };
};

type WorkspaceGrant = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string | null;
  rootFolderId: string | null;
  communityFolderId: string | null;
  brandFolderId: string | null;
};

export type WorkspaceDriveFolders = {
  accessToken: string;
  communityFolderId: string;
  brandFolderId: string;
};

function adminClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function googleEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { email?: string };
  return body.email?.trim().toLowerCase() ?? null;
}

export async function saveWorkspaceGoogleGrant(input: {
  accessToken: string;
  refreshToken: string;
  connectedBy: string;
}) {
  const email = await googleEmail(input.accessToken);
  if (email !== WORKSPACE_GOOGLE_EMAIL) return { saved: false as const };
  const supabase = adminClient();
  if (!supabase) return { saved: false as const };

  const { error } = await supabase.from("workspace_google_connection").upsert(
    {
      id: "default",
      account_email: WORKSPACE_GOOGLE_EMAIL,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      access_expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      connected_by: input.connectedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[Drive] Could not save the workspace grant", error);
    return { saved: false as const };
  }
  return { saved: true as const };
}

async function loadGrant(): Promise<WorkspaceGrant | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspace_google_connection")
    .select(
      "access_token, refresh_token, access_expires_at, root_folder_id, community_folder_id, brand_folder_id",
    )
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessExpiresAt: data.access_expires_at,
    rootFolderId: data.root_folder_id,
    communityFolderId: data.community_folder_id,
    brandFolderId: data.brand_folder_id,
  };
}

async function liveAccessToken(grant: WorkspaceGrant) {
  const expires = grant.accessExpiresAt ? Date.parse(grant.accessExpiresAt) : 0;
  if (grant.accessToken && expires > Date.now() + 60_000) return grant.accessToken;
  const refreshed = await exchangeGoogleRefreshToken(grant.refreshToken);
  if (!refreshed.ok) return grant.accessToken;
  const supabase = adminClient();
  const accessExpiresAt = new Date(Date.now() + Math.max(refreshed.expiresIn - 120, 30) * 1000).toISOString();
  await supabase
    ?.from("workspace_google_connection")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken ?? grant.refreshToken,
      access_expires_at: accessExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");
  return refreshed.accessToken;
}

async function driveJson<T>(token: string, url: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function findFolder(token: string, name: string, parentId: string) {
  const q = [
    `name='${name.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `'${parentId}' in parents`,
  ].join(" and ");
  const params = new URLSearchParams({ q, fields: "files(id)", pageSize: "1" });
  const payload = await driveJson<{ files?: DriveFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?${params}`,
  );
  return payload?.files?.[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId: string) {
  const created = await driveJson<DriveFile>(token, "https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  return created?.id ?? null;
}

async function ensureFolder(token: string, name: string, parentId: string) {
  return (await findFolder(token, name, parentId)) ?? (await createFolder(token, name, parentId));
}

export async function workspaceDrive(): Promise<WorkspaceDriveFolders | null> {
  const grant = await loadGrant();
  if (!grant?.refreshToken) return null;
  const accessToken = await liveAccessToken(grant);
  if (!accessToken) return null;

  const rootFolderId = grant.rootFolderId ?? (await ensureFolder(accessToken, ROOT_NAME, "root"));
  if (!rootFolderId) return null;
  const communityFolderId =
    grant.communityFolderId ?? (await ensureFolder(accessToken, COMMUNITY_FOLDER, rootFolderId));
  const brandFolderId = grant.brandFolderId ?? (await ensureFolder(accessToken, BRAND_FOLDER, rootFolderId));
  if (!communityFolderId || !brandFolderId) return null;

  if (
    rootFolderId !== grant.rootFolderId ||
    communityFolderId !== grant.communityFolderId ||
    brandFolderId !== grant.brandFolderId
  ) {
    await adminClient()
      ?.from("workspace_google_connection")
      .update({
        root_folder_id: rootFolderId,
        community_folder_id: communityFolderId,
        brand_folder_id: brandFolderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");
  }

  return { accessToken, communityFolderId, brandFolderId };
}

async function findChild(token: string, name: string, parentId: string) {
  const q = [`name='${name.replace(/'/g, "\\'")}'`, "trashed=false", `'${parentId}' in parents`].join(" and ");
  const params = new URLSearchParams({ q, fields: "files(id)", pageSize: "1" });
  const payload = await driveJson<{ files?: DriveFile[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?${params}`,
  );
  return payload?.files?.[0]?.id ?? null;
}

export async function readCommunityDirectory() {
  const drive = await workspaceDrive();
  if (!drive) return null;
  const fileId = await findChild(drive.accessToken, DIRECTORY_NAME, drive.communityFolderId);
  if (!fileId) {
    return { children: [], guardians: [], volunteers: [], partners: [] };
  }
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${drive.accessToken}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    children?: unknown[];
    guardians?: unknown[];
    volunteers?: unknown[];
    partners?: unknown[];
  };
}

export async function writeCommunityDirectory(store: unknown) {
  const drive = await workspaceDrive();
  if (!drive) return false;
  const media = JSON.stringify(store);
  const existing = await findChild(drive.accessToken, DIRECTORY_NAME, drive.communityFolderId);
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=media`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  if (existing) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${drive.accessToken}`,
        "Content-Type": "application/json",
      },
      body: media,
    });
    return response.ok;
  }

  const boundary = "fcw-directory";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({
      name: DIRECTORY_NAME,
      parents: [drive.communityFolderId],
      mimeType: "application/json",
    }),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    media,
    `--${boundary}--`,
  ].join("\r\n");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${drive.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  return response.ok;
}

function dataUrlBytes(dataUrl: string) {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const payload = match[2] ?? "";
  if (dataUrl.includes(";base64,")) {
    return { mimeType, bytes: Buffer.from(payload, "base64") };
  }
  return { mimeType, bytes: Buffer.from(decodeURIComponent(payload)) };
}

export async function uploadBrandFile(input: {
  name: string;
  mimeType: string;
  dataUrl: string;
  category: string;
  assetId: string;
}) {
  const drive = await workspaceDrive();
  if (!drive) return null;
  const parsed = dataUrlBytes(input.dataUrl);
  if (!parsed || parsed.bytes.byteLength > 8_000_000) return null;

  const boundary = "fcw-brand-file";
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify({
          name: input.name,
          parents: [drive.brandFolderId],
          mimeType: input.mimeType || parsed.mimeType,
          appProperties: { category: input.category, assetId: input.assetId },
        }),
        `--${boundary}`,
        `Content-Type: ${input.mimeType || parsed.mimeType}`,
        "",
        "",
      ].join("\r\n"),
    ),
    parsed.bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${drive.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) return null;
  const file = (await response.json()) as DriveFile;
  if (!file.id) return null;
  return { id: file.id, name: file.name ?? input.name, webViewLink: file.webViewLink ?? "" };
}

export async function listBrandFiles() {
  const drive = await workspaceDrive();
  if (!drive) return [];
  const q = `'${drive.brandFolderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,appProperties)",
    pageSize: "100",
  });
  const payload = await driveJson<{ files?: DriveFile[] }>(
    drive.accessToken,
    `https://www.googleapis.com/drive/v3/files?${params}`,
  );
  return (payload?.files ?? []).flatMap((file) => {
    if (!file.id || !file.name || !file.mimeType) return [];
    return [
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink ?? "",
        modifiedTime: file.modifiedTime ?? "",
        category: file.appProperties?.category ?? "documents",
      },
    ];
  });
}

export async function downloadBrandFile(fileId: string) {
  const drive = await workspaceDrive();
  if (!drive) return null;
  const meta = await driveJson<DriveFile>(
    drive.accessToken,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
  );
  if (!meta?.id || !meta.mimeType) return null;
  const media = await fetch(`https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`, {
    headers: { Authorization: `Bearer ${drive.accessToken}` },
  });
  if (!media.ok) return null;
  const bytes = Buffer.from(await media.arrayBuffer());
  if (bytes.byteLength > 8_000_000) return null;
  return {
    name: meta.name ?? "file",
    mimeType: meta.mimeType,
    dataUrl: `data:${meta.mimeType};base64,${bytes.toString("base64")}`,
  };
}
