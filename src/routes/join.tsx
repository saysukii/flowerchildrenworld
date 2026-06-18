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

  return (
    <PublicFormLayout
      label="Join the Village"
      title="Volunteer with us"
      subtitle="Bring your time, your craft, or your heart. We meet you where you are."
    >
      {submitted ? (
        <SuccessState message="You're in the village. We'll be in touch soon. 🌱" />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name"><input required className={fieldInputCls} /></Field>
            <Field label="Last name"><input required className={fieldInputCls} /></Field>
          </div>
          <Field label="Email"><input required type="email" className={fieldInputCls} /></Field>
          <Field label="Phone"><input type="tel" className={fieldInputCls} /></Field>
          <Field label="How did you hear about us?">
            <select className={fieldInputCls}>
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
              rows={3}
              placeholder="e.g. art, music, gardening, cooking, photography..."
              className={fieldInputCls}
            />
          </Field>
          <AvailabilityPicker />
          <Field label="Anything else?">
            <textarea rows={3} className={fieldInputCls} />
          </Field>
          <div className="pt-2">
            <SubmitButton>Send my sign-up</SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
