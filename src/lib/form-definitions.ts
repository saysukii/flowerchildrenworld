export type IntakeFormId = "join" | "partner" | "enroll";

export type FormQuestion = {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "textarea" | "select" | "availability";
  required: boolean;
  placeholder?: string;
  options?: string[];
  width?: "half";
  /** Names and emails that the directory needs. They can be renamed and moved, not removed. */
  locked?: boolean;
};

const FORM_KEY = "fcw-form-questions";

export const DEFAULT_FORM_QUESTIONS: Record<IntakeFormId, FormQuestion[]> = {
  join: [
    { id: "first_name", name: "first_name", label: "First name", type: "text", required: true, width: "half", locked: true },
    { id: "last_name", name: "last_name", label: "Last name", type: "text", required: true, width: "half", locked: true },
    { id: "email", name: "email", label: "Email", type: "email", required: true, locked: true },
    { id: "phone", name: "phone", label: "Phone", type: "tel", required: false },
    {
      id: "hear_about",
      name: "hear_about",
      label: "How did you hear about us?",
      type: "select",
      required: false,
      options: ["Instagram", "Word of mouth", "A FCW event", "Flyer", "Other"],
    },
    {
      id: "skills",
      name: "skills",
      label: "Skills / interests",
      type: "textarea",
      required: false,
      placeholder: "e.g. art, music, gardening, cooking, photography...",
    },
    { id: "availability", name: "availability", label: "Availability", type: "availability", required: false },
    { id: "notes", name: "notes", label: "Anything else?", type: "textarea", required: false },
  ],
  partner: [
    { id: "contact_name", name: "contact_name", label: "Contact name", type: "text", required: true, locked: true },
    { id: "organization_name", name: "organization_name", label: "Organization name", type: "text", required: true, locked: true },
    { id: "email", name: "email", label: "Email", type: "email", required: true, locked: true },
    { id: "phone", name: "phone", label: "Phone (optional)", type: "tel", required: false },
    {
      id: "partnership_type",
      name: "partnership_type",
      label: "Partnership type",
      type: "select",
      required: false,
      options: ["Corporate", "Community", "Media", "Other"],
    },
    {
      id: "show_up",
      name: "show_up",
      label: "How would you like to show up?",
      type: "textarea",
      required: false,
      placeholder: "Funding, mentorship, venue, supplies, time...",
    },
    { id: "message", name: "message", label: "Message (optional)", type: "textarea", required: false },
  ],
  enroll: [
    { id: "child_name", name: "child_name", label: "Child full name", type: "text", required: true, locked: true },
    { id: "date_of_birth", name: "date_of_birth", label: "Date of birth", type: "date", required: true, locked: true },
    {
      id: "program",
      name: "program",
      label: "Program interest",
      type: "select",
      required: false,
      options: ["Full-Time", "Drop-In", "Event"],
    },
    { id: "guardian_name", name: "guardian_name", label: "Guardian name", type: "text", required: true, locked: true },
    { id: "guardian_email", name: "guardian_email", label: "Guardian email", type: "email", required: true, width: "half", locked: true },
    { id: "guardian_phone", name: "guardian_phone", label: "Guardian phone", type: "tel", required: false, width: "half" },
    { id: "emergency_contact_name", name: "emergency_contact_name", label: "Emergency contact name", type: "text", required: true, width: "half", locked: true },
    { id: "emergency_contact_phone", name: "emergency_contact_phone", label: "Emergency contact phone", type: "tel", required: true, width: "half", locked: true },
    { id: "notes", name: "notes", label: "Notes (optional)", type: "textarea", required: false },
  ],
};

function mergeQuestions(id: IntakeFormId, saved: FormQuestion[] | undefined) {
  const defaults = DEFAULT_FORM_QUESTIONS[id];
  if (!saved?.length) return defaults.map((question) => ({ ...question }));
  const known = new Map(defaults.map((question) => [question.id, question]));
  const used = new Set<string>();
  const ordered: FormQuestion[] = [];
  for (const question of saved) {
    const base = known.get(question.id);
    if (!base) continue;
    used.add(question.id);
    ordered.push({
      ...base,
      label: question.label?.trim() || base.label,
      required: base.locked ? base.required || question.required : Boolean(question.required),
      placeholder: question.placeholder ?? base.placeholder,
      options: question.options?.length ? question.options : base.options,
    });
  }
  for (const question of defaults) {
    if (!used.has(question.id)) ordered.push({ ...question });
  }
  return ordered;
}

export function loadFormQuestions(id: IntakeFormId): FormQuestion[] {
  if (typeof window === "undefined") return DEFAULT_FORM_QUESTIONS[id].map((question) => ({ ...question }));
  try {
    const raw = window.localStorage.getItem(FORM_KEY);
    if (!raw) return DEFAULT_FORM_QUESTIONS[id].map((question) => ({ ...question }));
    const saved = JSON.parse(raw) as Partial<Record<IntakeFormId, FormQuestion[]>>;
    return mergeQuestions(id, saved[id]);
  } catch {
    return DEFAULT_FORM_QUESTIONS[id].map((question) => ({ ...question }));
  }
}

export function saveFormQuestions(id: IntakeFormId, questions: FormQuestion[]) {
  if (typeof window === "undefined") return;
  let saved: Partial<Record<IntakeFormId, FormQuestion[]>> = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(FORM_KEY) || "{}");
  } catch {
    saved = {};
  }
  saved[id] = questions;
  window.localStorage.setItem(FORM_KEY, JSON.stringify(saved));
}

export function moveQuestion(questions: FormQuestion[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= questions.length) return questions;
  const copy = questions.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}
