import teamInviteHtml from "@/emails/templates/team-invite.html?raw";
import volunteerConfirmationHtml from "@/emails/templates/volunteer-confirmation.html?raw";
import partnerConfirmationHtml from "@/emails/templates/partner-confirmation.html?raw";
import enrollmentConfirmationHtml from "@/emails/templates/enrollment-confirmation.html?raw";

import {
  EMAIL_LOGO_PATH,
  getEmailTemplateMeta,
  type EmailTemplateId,
} from "@/lib/email-templates";

const TEMPLATE_HTML: Record<EmailTemplateId, string> = {
  "team-invite": teamInviteHtml,
  "volunteer-confirmation": volunteerConfirmationHtml,
  "partner-confirmation": partnerConfirmationHtml,
  "enrollment-confirmation": enrollmentConfirmationHtml,
};

export function getAppOrigin(fallback?: string) {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configured) return configured;
  if (fallback) return fallback.replace(/\/$/, "");
  return "https://inside.flowerchildren.world";
}

export function getEmailLogoUrl(origin?: string) {
  return `${getAppOrigin(origin)}${EMAIL_LOGO_PATH}`;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function interpolateTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    html,
  );
}

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  vars: Record<string, string>,
  origin?: string,
) {
  const html = TEMPLATE_HTML[templateId];
  if (!html) throw new Error(`Missing email template: ${templateId}`);

  return interpolateTemplate(html, {
    logo_url: getEmailLogoUrl(origin),
    ...vars,
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[Email] Resend API error", response.status, body);
    throw new Error("Could not send email.");
  }

  return response.json() as Promise<{ id: string }>;
}

export async function sendTemplatedEmail({
  templateId,
  to,
  vars,
  origin,
}: {
  templateId: EmailTemplateId;
  to: string;
  vars: Record<string, string>;
  origin?: string;
}) {
  const meta = getEmailTemplateMeta(templateId);
  const html = renderEmailTemplate(templateId, vars, origin);
  return sendEmail({ to, subject: meta.subject, html });
}
