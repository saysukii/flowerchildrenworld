import { createClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/integrations/supabase/types";

export const WORKSPACE_DOCUMENT_IDS = [
  "community",
  "team",
  "messages",
  "form-questions",
  "email-copy",
] as const;

export type WorkspaceDocumentId = (typeof WORKSPACE_DOCUMENT_IDS)[number];

export type WorkspaceDocument = {
  id: WorkspaceDocumentId;
  document: unknown;
  updatedAt: string;
};

function adminClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /workspace_documents/.test(error.message ?? "");
}

export async function readWorkspaceDocument(id: WorkspaceDocumentId): Promise<WorkspaceDocument | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspace_documents")
    .select("id, document, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (!missingTable(error)) console.error("[Workspace] Could not read", id, error.code);
    return null;
  }
  if (!data) return null;
  return { id, document: data.document, updatedAt: data.updated_at };
}

export async function readWorkspaceDocuments(): Promise<WorkspaceDocument[] | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("workspace_documents").select("id, document, updated_at");
  if (error) {
    if (!missingTable(error)) console.error("[Workspace] Could not read documents", error.code);
    return null;
  }
  return (data ?? []).flatMap((row) => {
    if (!WORKSPACE_DOCUMENT_IDS.includes(row.id as WorkspaceDocumentId)) return [];
    return [{ id: row.id as WorkspaceDocumentId, document: row.document, updatedAt: row.updated_at }];
  });
}

export async function writeWorkspaceDocument(id: WorkspaceDocumentId, document: unknown) {
  const supabase = adminClient();
  if (!supabase) return false;
  const serialized = JSON.stringify(document);
  if (serialized.length > 1_500_000) return false;
  const { error } = await supabase.from("workspace_documents").upsert(
    {
      id,
      document: JSON.parse(serialized) as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    if (!missingTable(error)) console.error("[Workspace] Could not save", id, error.code);
    return false;
  }
  return true;
}
