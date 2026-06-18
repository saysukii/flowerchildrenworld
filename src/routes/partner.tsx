import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicFormLayout,
  Field,
  fieldInputCls,
  SubmitButton,
  SuccessState,
} from "@/components/public-form-layout";

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

  return (
    <PublicFormLayout
      label="Partner with Us"
      title="Build with the village"
      subtitle="From corporate sponsors to community collaborators — we'd love to hear from you."
    >
      {submitted ? (
        <SuccessState message="Thank you for reaching out. We'll connect with you shortly." />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <Field label="Contact name"><input required className={fieldInputCls} /></Field>
          <Field label="Organization name"><input required className={fieldInputCls} /></Field>
          <Field label="Email"><input required type="email" className={fieldInputCls} /></Field>
          <Field label="Phone (optional)"><input type="tel" className={fieldInputCls} /></Field>
          <Field label="Partnership type">
            <select className={fieldInputCls}>
              <option>Corporate</option>
              <option>Community</option>
              <option>Media</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="How would you like to show up?">
            <textarea
              rows={3}
              placeholder="Funding, mentorship, venue, supplies, time..."
              className={fieldInputCls}
            />
          </Field>
          <Field label="Message (optional)">
            <textarea rows={3} className={fieldInputCls} />
          </Field>
          <div className="pt-2">
            <SubmitButton>Let's connect</SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
