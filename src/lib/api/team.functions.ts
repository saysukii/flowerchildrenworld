import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Emails that have signed in, so a Pending invite can become Active. */
export const listAcceptedTeamEmails = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      emails: z.array(z.string().email()).max(200),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const wanted = new Set(data.emails.map((email) => email.toLowerCase()));
    if (wanted.size === 0) return { emails: [] as string[] };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });
      if (error || !listData?.users) return { emails: [] as string[] };

      const emails = listData.users
        .filter((user) => {
          const email = user.email?.toLowerCase();
          return !!email && wanted.has(email) && !!user.last_sign_in_at;
        })
        .map((user) => user.email!.toLowerCase());

      return { emails };
    } catch (error) {
      console.error("[Team] Could not check which invites were accepted", error);
      return { emails: [] as string[] };
    }
  });
