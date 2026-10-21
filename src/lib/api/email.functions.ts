import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMAIL_LANGUAGE, EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email-templates";
import {
  getAppOrigin,
  getEmailLogoUrl,
  isEmailConfigured,
  renderEmailTemplate,
  sendEmail,
  sendTemplatedEmail,
} from "@/lib/email.server";

const templateIdSchema = z.enum([
  "team-invite",
  "volunteer-confirmation",
  "partner-confirmation",
  "enrollment-confirmation",
  "message-mention",
  "password-reset",
]);

function escapeEmailText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

const TEST_INBOX = "info@flowerchildren.world";

const languageSchema = z
  .object({
    subject: z.string().max(200).optional(),
    eyebrow: z.string().max(80),
    headline: z.string().max(200),
    body: z.string().max(4000),
    button: z.string().max(80),
    note: z.string().max(400),
  })
  .optional();

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateId: templateIdSchema,
      origin: z.string().optional(),
      subject: z.string().trim().min(1).max(200).optional(),
      language: languageSchema,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    if (!isEmailConfigured()) {
      throw new Error("Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM in Railway.");
    }

    const meta = EMAIL_TEMPLATES.find((template) => template.id === data.templateId);
    if (!meta) throw new Error("Unknown template");

    const html = renderEmailTemplate(
      data.templateId as EmailTemplateId,
      meta.sampleVars,
      data.origin,
      data.language,
    );
    await sendEmail({
      to: TEST_INBOX,
      subject: data.subject?.trim() || meta.subject,
      html,
    });

    return { sentTo: TEST_INBOX };
  });

export const sendTeamInviteEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      origin: z.string().min(1),
      language: languageSchema,
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
      language: data.language,
    });

    return { email };
  });

export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      origin: z.string().min(1),
      language: languageSchema,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    if (!isEmailConfigured()) {
      throw new Error("Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM in Railway.");
    }

    const { data: userData, error } = await context.supabase.auth.getUser();
    const email = userData.user?.email?.trim().toLowerCase();
    if (error || !email) {
      throw new Error("Could not resolve your account email.");
    }

    const appOrigin = getAppOrigin(data.origin);
    const redirectTo = `${appOrigin}/auth`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    const actionLink = result.data?.properties?.action_link;
    if (result.error || !actionLink) {
      console.error("[Email] Supabase recovery link failed", result.error);
      throw new Error(result.error?.message ?? "Could not create a reset link.");
    }

    await sendTemplatedEmail({
      templateId: "password-reset",
      to: email,
      vars: { reset_url: actionLink },
      origin: data.origin,
      language: data.language,
    });

    return { email };
  });

export const sendMentionEmails = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      senderName: z.string().trim().min(1).max(120),
      body: z.string().trim().min(1).max(4000),
      origin: z.string().url(),
      mentions: z
        .array(
          z.object({
            email: z.string().email(),
            name: z.string().trim().min(1).max(120),
          }),
        )
        .max(20),
      language: languageSchema,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    if (!isEmailConfigured()) return { sent: 0, skipped: "not-configured" as const };

    const { data: userData } = await context.supabase.auth.getUser();
    const self = userData.user?.email?.toLowerCase() ?? "";
    const seen = new Set<string>();
    const recipients = data.mentions.filter((mention) => {
      const email = mention.email.trim().toLowerCase();
      if (!email || email === self || seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    const appOrigin = getAppOrigin(data.origin);
    const senderName = data.senderName.replace(/[\r\n]+/g, " ").trim();
    let sent = 0;

    const savedSubject = data.language?.subject?.trim();
    const subjectTemplate =
      savedSubject && savedSubject !== EMAIL_LANGUAGE["message-mention"].subject
        ? savedSubject
        : "{{sender_name}} mentioned you";

    for (const mention of recipients) {
      const vars = {
        recipient_name: escapeEmailText(mention.name),
        sender_name: escapeEmailText(senderName),
        message_body: escapeEmailText(data.body).replace(/\n/g, "<br>"),
        messages_url: `${appOrigin}/messages`,
      };
      const html = renderEmailTemplate("message-mention", vars, data.origin, data.language);
      const subject = subjectTemplate
        .replaceAll("{{sender_name}}", senderName)
        .replaceAll("{{recipient_name}}", mention.name);
      await sendEmail({
        to: mention.email.trim(),
        subject,
        html,
      });
      sent += 1;
    }

    return { sent, skipped: null };
  });
