import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicFormFields } from "@/components/public-form-fields";
import { PublicFormLayout, SubmitButton, SuccessState } from "@/components/public-form-layout";
import { submitPublicForm } from "@/lib/public-form-submit";

export const Route = createFileRoute("/enroll")({
  head: () => ({
    meta: [
      { title: "Enroll a Child — Flower Children World" },
      { name: "description", content: "Join the Flower Children World program." },
    ],
  }),
  component: EnrollPage,
});

function EnrollPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const data = new FormData(e.currentTarget);

    try {
      await submitPublicForm({
        type: "enrollment",
        child_name: String(data.get("child_name") ?? "").trim(),
        date_of_birth: String(data.get("date_of_birth") ?? "").trim(),
        program: String(data.get("program") ?? "").trim() || undefined,
        guardian_name: String(data.get("guardian_name") ?? "").trim(),
        guardian_email: String(data.get("guardian_email") ?? "").trim(),
        guardian_phone: String(data.get("guardian_phone") ?? "").trim() || undefined,
        emergency_contact_name: String(data.get("emergency_contact_name") ?? "").trim(),
        emergency_contact_phone: String(data.get("emergency_contact_phone") ?? "").trim(),
        notes: String(data.get("notes") ?? "").trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicFormLayout
      label="Enroll a Child"
      title="Join the program"
      subtitle="We'd love to welcome your child into the Flower Children World community."
    >
      {submitted ? (
        <SuccessState message="Thank you — check your email for confirmation. We'll be in touch with next steps." />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <PublicFormFields formId="enroll" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="pt-2">
            <SubmitButton disabled={submitting}>
              {submitting ? "Sending…" : "Enroll my child"}
            </SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
