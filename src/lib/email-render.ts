import teamInviteHtml from "@/emails/templates/team-invite.html?raw";
import volunteerConfirmationHtml from "@/emails/templates/volunteer-confirmation.html?raw";
import partnerConfirmationHtml from "@/emails/templates/partner-confirmation.html?raw";
import enrollmentConfirmationHtml from "@/emails/templates/enrollment-confirmation.html?raw";
import messageMentionHtml from "@/emails/templates/message-mention.html?raw";
import passwordResetHtml from "@/emails/templates/password-reset.html?raw";

import { EMAIL_LANGUAGE, EMAIL_LOGO_PATH, type EmailLanguage, type EmailTemplateId } from "@/lib/email-templates";

const TEMPLATE_HTML: Record<EmailTemplateId, string> = {
  "team-invite": teamInviteHtml,
  "volunteer-confirmation": volunteerConfirmationHtml,
  "partner-confirmation": partnerConfirmationHtml,
  "enrollment-confirmation": enrollmentConfirmationHtml,
  "message-mention": messageMentionHtml,
  "password-reset": passwordResetHtml,
};

function interpolateTemplate(html: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    html,
  );
}

function escapeEmailText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function emailBody(value: string) {
  return escapeEmailText(value).replace(/\n/g, "<br>");
}

/** Renders a template in the browser or on the server. `origin` is the site the logo is loaded from. */
export function renderEmailTemplate(
  templateId: EmailTemplateId,
  vars: Record<string, string>,
  origin?: string,
  language?: Partial<EmailLanguage>,
) {
  const html = TEMPLATE_HTML[templateId];
  if (!html) throw new Error(`Missing email template: ${templateId}`);

  const copy = { ...EMAIL_LANGUAGE[templateId], ...language };
  const base = (origin || "https://inside.flowerchildren.world").replace(/\/$/, "");
  const withCopy = interpolateTemplate(html, {
    logo_url: `${base}${EMAIL_LOGO_PATH}`,
    eyebrow: escapeEmailText(copy.eyebrow),
    headline: escapeEmailText(copy.headline),
    body: emailBody(copy.body),
    button_label: escapeEmailText(copy.button),
    note: emailBody(copy.note),
    ...vars,
  });
  return interpolateTemplate(withCopy, vars);
}
