import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicFormLayout,
  Field,
  fieldInputCls,
  SubmitButton,
  SuccessState,
} from "@/components/public-form-layout";
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
          <Field label="Child full name">
            <input required name="child_name" className={fieldInputCls} />
          </Field>
          <Field label="Date of birth">
            <input required name="date_of_birth" type="date" className={fieldInputCls} />
          </Field>
          <Field label="Program interest">
            <select name="program" className={fieldInputCls}>
              <option>Full-Time</option>
              <option>Drop-In</option>
              <option>Event</option>
            </select>
          </Field>
          <Field label="Guardian name">
            <input required name="guardian_name" className={fieldInputCls} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardian email">
              <input required name="guardian_email" type="email" className={fieldInputCls} />
            </Field>
            <Field label="Guardian phone">
              <input name="guardian_phone" type="tel" className={fieldInputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Emergency contact name">
              <input required name="emergency_contact_name" className={fieldInputCls} />
            </Field>
            <Field label="Emergency contact phone">
              <input required name="emergency_contact_phone" type="tel" className={fieldInputCls} />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <textarea name="notes" rows={3} className={fieldInputCls} />
          </Field>
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
