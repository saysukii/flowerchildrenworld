import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicFormFields } from "@/components/public-form-fields";
import { PublicFormLayout, SubmitButton, SuccessState } from "@/components/public-form-layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { submitPublicForm } from "@/lib/public-form-submit";

const POLICIES = {
  terms: {
    title: "Terms of service",
    body: "Enrollment is a request from a parent or guardian. Sending the form asks Flower Children World to be in touch. It does not by itself reserve a place in the program. The finished terms of service are not posted yet.",
  },
  privacy: {
    title: "Privacy policy",
    body: "Flower Children World uses the enrollment form to learn a child’s name, date of birth, and program, and to know which adult to call. That information is for welcoming the child and reaching their guardian or emergency contact. The finished privacy policy is not posted yet.",
  },
} as const;

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
  const [policy, setPolicy] = useState<keyof typeof POLICIES>("terms");
  const [policyOpen, setPolicyOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const data = new FormData(e.currentTarget);
    if (data.get("agree") !== "yes") {
      setError("Please agree to the terms of service and privacy policy.");
      setSubmitting(false);
      return;
    }

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
          <label className="flex items-start gap-3 text-sm font-light text-foreground/80">
            <input
              type="checkbox"
              name="agree"
              value="yes"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#3AB819]"
            />
            <span>
              I agree to the{" "}
              <button
                type="button"
                className="text-[#1f6b12] underline"
                onClick={() => {
                  setPolicy("terms");
                  setPolicyOpen(true);
                }}
              >
                terms of service
              </button>{" "}
              and{" "}
              <button
                type="button"
                className="text-[#1f6b12] underline"
                onClick={() => {
                  setPolicy("privacy");
                  setPolicyOpen(true);
                }}
              >
                privacy policy
              </button>.
            </span>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="pt-2">
            <SubmitButton disabled={submitting}>
              {submitting ? "Sending…" : "Enroll my child"}
            </SubmitButton>
          </div>
        </form>
      )}
      {policyOpen ? (
        <Dialog open onOpenChange={setPolicyOpen}>
          <DialogContent className="bg-[#FCFCFC]">
            <DialogHeader>
              <DialogTitle className="text-lg font-normal">{POLICIES[policy].title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm font-light leading-relaxed text-foreground/75">{POLICIES[policy].body}</p>
          </DialogContent>
        </Dialog>
      ) : null}
    </PublicFormLayout>
  );
}
