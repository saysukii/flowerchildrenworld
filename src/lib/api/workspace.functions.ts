import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/stripe-auth.server";
import { WORKSPACE_DOCUMENT_IDS } from "@/lib/workspace-documents.server";

const documentId = z.enum(WORKSPACE_DOCUMENT_IDS);

type JsonData = string | number | boolean | null | JsonData[] | { [key: string]: JsonData };

function asJsonData(value: unknown): JsonData {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonData;
}

export const pullWorkspaceDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { readWorkspaceDocuments } = await import("@/lib/workspace-documents.server");
    const documents = await readWorkspaceDocuments();
    if (!documents) return null;
    return {
      documents: documents.map((item) => ({
        id: item.id,
        updatedAt: item.updatedAt,
        document: asJsonData(item.document),
      })),
    };
  });

export const pushWorkspaceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: documentId,
      document: z.union([z.record(z.string(), z.any()), z.array(z.any())]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdminUser(context.supabase, context.userId);
    const { writeWorkspaceDocument } = await import("@/lib/workspace-documents.server");
    return { ok: await writeWorkspaceDocument(data.id, data.document) };
  });

/** Form questions and email wording are not private. Public pages read them without a sign-in. */
export const pullPublicFormCopy = createServerFn({ method: "GET" }).handler(async () => {
  const { readWorkspaceDocument } = await import("@/lib/workspace-documents.server");
  const [forms, emails] = await Promise.all([
    readWorkspaceDocument("form-questions"),
    readWorkspaceDocument("email-copy"),
  ]);
  return {
    formQuestions: forms?.document == null ? null : asJsonData(forms.document),
    emailCopy: emails?.document == null ? null : asJsonData(emails.document),
  };
});
