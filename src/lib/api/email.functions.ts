import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email-templates";
import {
  getAppOrigin,
  getEmailLogoUrl,
  isEmailConfigured,
  renderEmailTemplate,
  sendTemplatedEmail,
} from "@/lib/email.server";

const templateIdSchema = z.enum([
  "team-invite",
  "volunteer-confirmation",
  "partner-confirmation",
  "enrollment-confirmation",
]);

export const getEmailTemplateCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return {
    configured: isEmailConfigured(),
    logoUrl: getEmailLogoUrl(),
    templates: EMAIL_TEMPLATES,
  };
});

export const previewEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateId: templateIdSchema,
      origin: z.string().optional(),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const meta = EMAIL_TEMPLATES.find((template) => template.id === data.templateId);
    if (!meta) throw new Error("Unknown template");

    return {
      subject: meta.subject,
      html: renderEmailTemplate(data.templateId as EmailTemplateId, meta.sampleVars, data.origin),
      logoUrl: getEmailLogoUrl(data.origin),
    };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateId: templateIdSchema,
      origin: z.string().optional(),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: userData, error } = await context.supabase.auth.getUser();
    if (error || !userData.user?.email) {
      throw new Error("Could not resolve your account email.");
    }

    const meta = EMAIL_TEMPLATES.find((template) => template.id === data.templateId);
    if (!meta) throw new Error("Unknown template");

    await sendTemplatedEmail({
      templateId: data.templateId as EmailTemplateId,
      to: userData.user.email,
      vars: meta.sampleVars,
      origin: data.origin,
    });

    return { sentTo: userData.user.email };
  });

export const sendTeamInviteEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      origin: z.string().min(1),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    if (!isEmailConfigured()) {
      throw new Error("Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM in Railway.");
    }

    const email = data.email.trim().toLowerCase();
    const appOrigin = getAppOrigin(data.origin);
    const redirectTo = `${appOrigin}/onboarding`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let actionLink: string | undefined;

    const inviteResult = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (inviteResult.data?.properties?.action_link) {
      actionLink = inviteResult.data.properties.action_link;
    } else {
      const magicResult = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (magicResult.error || !magicResult.data?.properties?.action_link) {
        console.error("[Email] Supabase invite link failed", inviteResult.error, magicResult.error);
        throw new Error(magicResult.error?.message ?? inviteResult.error?.message ?? "Could not create invite link.");
      }
      actionLink = magicResult.data.properties.action_link;
    }

    await sendTemplatedEmail({
      templateId: "team-invite",
      to: email,
      vars: { onboarding_url: actionLink },
      origin: data.origin,
    });

    return { email };
  });
