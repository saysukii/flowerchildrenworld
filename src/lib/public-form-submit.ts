const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

export type VolunteerSubmission = {
  type: "volunteer";
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hear_about?: string;
  skills?: string;
  availability?: string;
  notes?: string;
};

export type PartnerSubmission = {
  type: "partner";
  contact_name: string;
  organization_name: string;
  email: string;
  phone?: string;
  partnership_type?: string;
  show_up?: string;
  message?: string;
};

export type EnrollmentSubmission = {
  type: "enrollment";
  child_name: string;
  date_of_birth: string;
  program?: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes?: string;
};

export type FormSubmission = VolunteerSubmission | PartnerSubmission | EnrollmentSubmission;

export async function submitPublicForm(payload: FormSubmission) {
  const response = await fetch(`${API_BASE}/api/forms/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { ok?: boolean; error?: string; emailSent?: boolean };

  if (!response.ok) {
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }

  return data;
}
