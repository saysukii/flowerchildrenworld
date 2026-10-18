import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/stripe-auth.server";

const communityStoreSchema = z.object({
  children: z.array(z.record(z.string(), z.unknown())),
  guardians: z.array(z.record(z.string(), z.unknown())),
  volunteers: z.array(z.record(z.string(), z.unknown())),
  partners: z.array(z.record(z.string(), z.unknown())),
});

export const refreshGoogleAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ refreshToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { exchangeGoogleRefreshToken } = await import("@/lib/google-oauth.server");
    return exchangeGoogleRefreshToken(data.refreshToken);
  });

export const saveWorkspaceGoogleGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await assertAdminUser(context.supabase, context.userId);
    const { saveWorkspaceGoogleGrant: saveGrant } = await import("@/lib/drive-workspace.server");
    return saveGrant({ ...data, connectedBy: context.userId });
  });

export const pullCommunityDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { readCommunityDirectory } = await import("@/lib/drive-workspace.server");
    const directory = await readCommunityDirectory();
    if (!directory) return null;
    const records = (value: unknown[] | undefined) =>
      (value ?? []).map((item) => {
        const record: Record<string, string> = {};
        if (item && typeof item === "object") {
          for (const [key, field] of Object.entries(item)) {
            if (typeof field === "string") record[key] = field;
          }
        }
        return record;
      });
    return {
      children: records(directory.children),
      guardians: records(directory.guardians),
      volunteers: records(directory.volunteers),
      partners: records(directory.partners),
    };
  });

export const pushCommunityDirectory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ store: communityStoreSchema }))
  .handler(async ({ data, context }) => {
    await assertAdminUser(context.supabase, context.userId);
    const { writeCommunityDirectory } = await import("@/lib/drive-workspace.server");
    return { ok: await writeCommunityDirectory(data.store) };
  });

export const uploadWorkspaceBrandFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().min(1),
      mimeType: z.string().min(1),
      dataUrl: z.string().min(1),
      category: z.string().min(1),
      assetId: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdminUser(context.supabase, context.userId);
    const { uploadBrandFile } = await import("@/lib/drive-workspace.server");
    return uploadBrandFile(data);
  });

export const listWorkspaceBrandFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listBrandFiles } = await import("@/lib/drive-workspace.server");
    return listBrandFiles();
  });

export const downloadWorkspaceBrandFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ fileId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { downloadBrandFile } = await import("@/lib/drive-workspace.server");
    return downloadBrandFile(data.fileId);
  });
