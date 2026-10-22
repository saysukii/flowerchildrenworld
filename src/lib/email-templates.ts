/** Black wordmark from Brand Essence — served from /public/brand for email + web. */
export const EMAIL_LOGO_PATH = "/brand/fcw-logo-black.png";

export type EmailTemplateId =
  | "team-invite"
  | "volunteer-confirmation"
  | "partner-confirmation"
  | "enrollment-confirmation"
  | "message-mention"
  | "password-reset";

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
    subject: "you're invited",
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
  {
    id: "password-reset",
    label: "Password reset",
    description: "Sent when you ask for a new password from Settings.",
    subject: "set a new password",
    sampleVars: {
      reset_url: "https://inside.flowerchildren.world/auth",
    },
  },
  {
    id: "message-mention",
    label: "Message mention",
    description: "Sent when a teammate @mentions you in Messages.",
    subject: "Sukii mentioned you",
    sampleVars: {
      recipient_name: "Priya",
      sender_name: "Sukii",
      message_body: "Garden beds are ready for Saturday — @Priya can you bring the cups?",
      messages_url: "https://inside.flowerchildren.world/messages",
    },
  },
];

export type EmailLanguage = {
  subject: string;
  eyebrow: string;
  headline: string;
  body: string;
  button: string;
  note: string;
};

export const EMAIL_LANGUAGE: Record<EmailTemplateId, EmailLanguage> = {
  "team-invite": {
    subject: "you're invited",
    eyebrow: "team invite",
    headline: "you're invited",
    body: "thank you for saying yes to this work. inside is a home base — a place to stay organized, stay connected, and keep showing up for the children and families we serve.",
    button: "set up your account",
    note: "this link expires in 7 days. if you weren't expecting this, you can ignore it.",
  },
  "volunteer-confirmation": {
    subject: "you're in the village",
    eyebrow: "join the village",
    headline: "you're in the village 🌱",
    body: "hi {{first_name}},\n\nthank you for signing up to volunteer with flower children world. we've received your information and will be in touch soon.\n\nour programs only happen because people like you show up — with time, presence, and gifts to share.",
    button: "visit flowerchildren.world",
    note: "",
  },
  "partner-confirmation": {
    subject: "let's grow together",
    eyebrow: "partner with us",
    headline: "thanks for reaching out",
    body: "hi {{contact_name}},\n\nthank you for your interest in partnering with flower children world. we'd love to connect and explore how we can grow together.\n\nwe'll be in touch shortly.",
    button: "visit flowerchildren.world",
    note: "",
  },
  "enrollment-confirmation": {
    subject: "enrollment received",
    eyebrow: "enroll a child",
    headline: "enrollment received 🌻",
    body: "hi {{guardian_name}},\n\nthank you for enrolling {{child_name}} in flower children world. we've received your information and will follow up with next steps soon.\n\nwe can't wait to welcome your flower child into the village.",
    button: "visit flowerchildren.world",
    note: "",
  },
  "password-reset": {
    subject: "set a new password",
    eyebrow: "inside",
    headline: "set a new password",
    body: "use this link to choose a new password for your inside account.",
    button: "set a new password",
    note: "this link expires in 1 hour. if you didn't ask for this, you can ignore it.",
  },
  "message-mention": {
    subject: "Sukii mentioned you",
    eyebrow: "message",
    headline: "{{sender_name}} mentioned you",
    body: "{{recipient_name}}, this was left for you in team messages.",
    button: "open the message",
    note: "",
  },
};

const EMAIL_COPY_KEY = "fcw-email-copy";

export function loadEmailLanguage(id: EmailTemplateId): EmailLanguage {
  const defaults = EMAIL_LANGUAGE[id];
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(EMAIL_COPY_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<Record<EmailTemplateId, Partial<EmailLanguage>>>;
    return { ...defaults, ...saved[id] };
  } catch {
    return defaults;
  }
}

export function readPersistedEmailCopy(): Partial<Record<EmailTemplateId, EmailLanguage>> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EMAIL_COPY_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Record<EmailTemplateId, EmailLanguage>>;
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

export function adoptEmailCopy(document: unknown) {
  if (!document || typeof document !== "object" || Array.isArray(document)) return;
  window.localStorage.setItem(EMAIL_COPY_KEY, JSON.stringify(document));
}

export function saveEmailLanguage(id: EmailTemplateId, language: EmailLanguage) {
  if (typeof window === "undefined") return;
  const saved = readPersistedEmailCopy() ?? {};
  saved[id] = language;
  window.localStorage.setItem(EMAIL_COPY_KEY, JSON.stringify(saved));
  void import("@/lib/workspace-sync")
    .then(({ publishWorkspaceDocument }) => publishWorkspaceDocument("email-copy", saved))
    .catch(() => undefined);
}

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
