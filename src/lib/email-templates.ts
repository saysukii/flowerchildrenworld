/** Black wordmark from Brand Essence — served from /public/brand for email + web. */
export const EMAIL_LOGO_PATH = "/brand/fcw-logo-black.png";

export type EmailTemplateId =
  | "team-invite"
  | "volunteer-confirmation"
  | "partner-confirmation"
  | "enrollment-confirmation";

export type EmailTemplateMeta = {
  id: EmailTemplateId;
  label: string;
  description: string;
  subject: string;
  sampleVars: Record<string, string>;
};

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: "team-invite",
    label: "Team invite",
    description: "Sent when a team member is invited to Inside from Settings.",
    subject: "You're invited to Inside",
    sampleVars: {
      onboarding_url: "https://inside.flowerchildren.world/onboarding",
    },
  },
  {
    id: "volunteer-confirmation",
    label: "Volunteer confirmation",
    description: "Sent after someone submits the Join the Village form.",
    subject: "you're in the village",
    sampleVars: {
      first_name: "Alex",
    },
  },
  {
    id: "partner-confirmation",
    label: "Partner confirmation",
    description: "Sent after someone submits the Partner with Us form.",
    subject: "let's grow together",
    sampleVars: {
      contact_name: "Jordan",
    },
  },
  {
    id: "enrollment-confirmation",
    label: "Enrollment confirmation",
    description: "Sent after a guardian submits the Enroll a Child form.",
    subject: "enrollment received",
    sampleVars: {
      guardian_name: "Sam",
      child_name: "River",
    },
  },
];

export function getEmailTemplateMeta(id: EmailTemplateId) {
  const meta = EMAIL_TEMPLATES.find((template) => template.id === id);
  if (!meta) throw new Error(`Unknown email template: ${id}`);
  return meta;
}

export const FORM_CONFIRMATION_TEMPLATE: Record<
  "volunteer" | "partner" | "enrollment",
  EmailTemplateId
> = {
  volunteer: "volunteer-confirmation",
  partner: "partner-confirmation",
  enrollment: "enrollment-confirmation",
};
