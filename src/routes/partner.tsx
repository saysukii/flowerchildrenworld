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

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Partner with Us — Flower Children World" },
      { name: "description", content: "From corporate sponsors to community collaborators — partner with Flower Children World." },
    ],
  }),
  component: PartnerPage,
});

function PartnerPage() {
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
        type: "partner",
        contact_name: String(data.get("contact_name") ?? "").trim(),
        organization_name: String(data.get("organization_name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || undefined,
        partnership_type: String(data.get("partnership_type") ?? "").trim() || undefined,
        show_up: String(data.get("show_up") ?? "").trim() || undefined,
        message: String(data.get("message") ?? "").trim() || undefined,
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
      label="Partner with Us"
      title="Build with the village"
      subtitle="From corporate sponsors to community collaborators — we'd love to hear from you."
    >
      {submitted ? (
        <SuccessState message="Thank you for reaching out. Check your email for confirmation — we'll connect with you shortly." />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Contact name">
            <input required name="contact_name" className={fieldInputCls} />
          </Field>
          <Field label="Organization name">
            <input required name="organization_name" className={fieldInputCls} />
          </Field>
          <Field label="Email">
            <input required name="email" type="email" className={fieldInputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" type="tel" className={fieldInputCls} />
          </Field>
          <Field label="Partnership type">
            <select name="partnership_type" className={fieldInputCls}>
              <option>Corporate</option>
              <option>Community</option>
              <option>Media</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="How would you like to show up?">
            <textarea
              name="show_up"
              rows={3}
              placeholder="Funding, mentorship, venue, supplies, time..."
              className={fieldInputCls}
            />
          </Field>
          <Field label="Message (optional)">
            <textarea name="message" rows={3} className={fieldInputCls} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="pt-2">
            <SubmitButton disabled={submitting}>
              {submitting ? "Sending…" : "Let's connect"}
            </SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
