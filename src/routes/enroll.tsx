import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PublicFormLayout,
  Field,
  fieldInputCls,
  SubmitButton,
  SuccessState,
} from "@/components/public-form-layout";

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

  return (
    <PublicFormLayout
      label="Enroll a Child"
      title="Join the program"
      subtitle="We'd love to welcome your child into the Flower Children World community."
    >
      {submitted ? (
        <SuccessState message="Thank you — we'll be in touch with next steps." />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <Field label="Child full name"><input required className={fieldInputCls} /></Field>
          <Field label="Date of birth"><input required type="date" className={fieldInputCls} /></Field>
          <Field label="Program interest">
            <select className={fieldInputCls}>
              <option>Full-Time</option>
              <option>Drop-In</option>
              <option>Event</option>
            </select>
          </Field>
          <Field label="Guardian name"><input required className={fieldInputCls} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardian email"><input required type="email" className={fieldInputCls} /></Field>
            <Field label="Guardian phone"><input required type="tel" className={fieldInputCls} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Emergency contact name"><input required className={fieldInputCls} /></Field>
            <Field label="Emergency contact phone"><input required type="tel" className={fieldInputCls} /></Field>
          </div>
          <Field label="Notes (optional)">
            <textarea rows={3} className={fieldInputCls} />
          </Field>
          <div className="pt-2">
            <SubmitButton>Enroll my child</SubmitButton>
          </div>
        </form>
      )}
    </PublicFormLayout>
  );
}
