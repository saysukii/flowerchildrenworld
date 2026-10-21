import { renderEmailTemplate as renderEmailHtml } from "@/lib/email-render";
import {
  EMAIL_LOGO_PATH,
  getEmailTemplateMeta,
  type EmailLanguage,
  type EmailTemplateId,
} from "@/lib/email-templates";

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

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  vars: Record<string, string>,
  origin?: string,
  language?: Partial<EmailLanguage>,
) {
  return renderEmailHtml(templateId, vars, getAppOrigin(origin), language);
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
  language,
}: {
  templateId: EmailTemplateId;
  to: string;
  vars: Record<string, string>;
  origin?: string;
  language?: Partial<EmailLanguage>;
}) {
  const meta = getEmailTemplateMeta(templateId);
  const html = renderEmailTemplate(templateId, vars, origin, language);
  const subject = language?.subject?.trim() || meta.subject;
  return sendEmail({ to, subject, html });
}
