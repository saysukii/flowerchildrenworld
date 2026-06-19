import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicFormLayout,
  Field,
  fieldInputCls,
  SubmitButton,
  SuccessState,
  AvailabilityPicker,
} from "@/components/public-form-layout";
import { submitPublicForm } from "@/lib/public-form-submit";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join the Village — Flower Children World" },
      { name: "description", content: "Volunteer with Flower Children World. Bring your time, your craft, or your heart." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const availability = data
      .getAll("availability")
      .map(String)
      .join(", ");

    try {
      await submitPublicForm({
        type: "volunteer",
        first_name: String(data.get("first_name") ?? "").trim(),
        last_name: String(data.get("last_name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || undefined,
        hear_about: String(data.get("hear_about") ?? "").trim() || undefined,
        skills: String(data.get("skills") ?? "").trim() || undefined,
        availability: availability || undefined,
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
      label="Join the Village"
      title="Volunteer with us"
      subtitle="Bring your time, your craft, or your heart. We meet you where you are."
    >
      {submitted ? (
        <SuccessState message="You're in the village. Check your email for confirmation — we'll be in touch soon. 🌱" />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <input required name="first_name" className={fieldInputCls} />
            </Field>
            <Field label="Last name">
              <input required name="last_name" className={fieldInputCls} />
            </Field>
          </div>
          <Field label="Email">
            <input required name="email" type="email" className={fieldInputCls} />
          </Field>
          <Field label="Phone">
            <input name="phone" type="tel" className={fieldInputCls} />
          </Field>
          <Field label="How did you hear about us?">
            <select name="hear_about" className={fieldInputCls}>
              <option value="">— Select —</option>
              <option>Instagram</option>
              <option>Word of mouth</option>
              <option>A FCW event</option>
              <option>Flyer</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Skills / interests">
            <textarea
              name="skills"
              rows={3}
              placeholder="e.g. art, music, gardening, cooking, photography..."
              className={fieldInputCls}
            />
          </Field>
          <AvailabilityPicker />
          <Field label="Anything else?">
            <textarea name="notes" rows={3} className={fieldInputCls} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="pt-2">
            <SubmitButton disabled={submitting}>
              {submitting ? "Sending…" : "Send my sign-up"}
            </SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
