import {
  appendRecordsForTab,
  loadCommunityStore,
  saveChildWithGuardian,
  saveCommunityStore,
  todayAddedAt,
  type ChildRecord,
  type GuardianRecord,
  type PartnerRecord,
  type VolunteerRecord,
} from "@/lib/community";

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

export function applyFormSubmission(store: ReturnType<typeof loadCommunityStore>, payload: FormSubmission) {
  const today = todayAddedAt();

  if (payload.type === "volunteer") {
    const volunteer: VolunteerRecord = {
      id: crypto.randomUUID(),
      fullName: `${payload.first_name} ${payload.last_name}`.trim(),
      email: payload.email,
      phone: payload.phone ?? "",
      skills: [payload.skills, payload.notes].filter(Boolean).join(" — "),
      availability: payload.availability ?? "",
      status: "Active",
      source: payload.hear_about || "Website form",
      addedAt: today,
    };
    return appendRecordsForTab(store, "volunteers", [volunteer]);
  }

  if (payload.type === "partner") {
    const partner: PartnerRecord = {
      id: crypto.randomUUID(),
      organizationName: payload.organization_name,
      contactName: payload.contact_name,
      email: payload.email,
      phone: payload.phone ?? "",
      partnershipType: payload.partnership_type || "Community",
      notes: [payload.show_up, payload.message].filter(Boolean).join("\n"),
      status: "Active",
      addedAt: today,
    };
    return appendRecordsForTab(store, "partners", [partner]);
  }

  const guardian: GuardianRecord = {
    id: crypto.randomUUID(),
    guardianName: payload.guardian_name,
    email: payload.guardian_email,
    phone: payload.guardian_phone ?? "",
    emergencyContactName: payload.emergency_contact_name,
    emergencyContactPhone: payload.emergency_contact_phone,
    linkedChildren: "",
    status: "Active",
    addedAt: today,
  };
  const child: ChildRecord = {
    id: crypto.randomUUID(),
    fullName: payload.child_name,
    dateOfBirth: payload.date_of_birth,
    program: payload.program || "Full-Time",
    status: "Active",
    enrollmentDate: today,
    addedAt: today,
    guardianId: "",
    guardianLink: "",
    notes: payload.notes ?? "",
  };
  return saveChildWithGuardian(store, child, guardian, true);
}

function recordFormSubmission(payload: FormSubmission) {
  saveCommunityStore(applyFormSubmission(loadCommunityStore(), payload));
}

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

  recordFormSubmission(payload);
  return data;
}
