import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  AvailabilityPicker,
  Field,
  fieldInputCls,
} from "@/components/public-form-layout";
import { loadFormQuestions, type FormQuestion, type IntakeFormId } from "@/lib/form-definitions";

function QuestionField({ question }: { question: FormQuestion }) {
  if (question.type === "availability") {
    return <AvailabilityPicker label={question.label} />;
  }

  const input =
    question.type === "textarea" ? (
      <textarea
        name={question.name}
        rows={3}
        required={question.required}
        placeholder={question.placeholder}
        className={fieldInputCls}
      />
    ) : question.type === "select" ? (
      <div className="relative">
        <select
          name={question.name}
          required={question.required}
          className={`${fieldInputCls} h-14 appearance-none pr-10`}
          defaultValue=""
        >
          <option value="">— Select —</option>
          {(question.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
      </div>
    ) : (
      <input
        name={question.name}
        type={question.type}
        required={question.required}
        placeholder={question.placeholder}
        className={fieldInputCls}
      />
    );

  return <Field label={question.label}>{input}</Field>;
}

export function PublicFormFields({ formId }: { formId: IntakeFormId }) {
  const [questions] = useState(() => loadFormQuestions(formId));
  const rows: ReactNode[] = [];

  for (let index = 0; index < questions.length; ) {
    const question = questions[index];
    const next = questions[index + 1];
    if (question.width === "half" && next?.width === "half") {
      rows.push(
        <div key={question.id} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <QuestionField question={question} />
          <QuestionField question={next} />
        </div>,
      );
      index += 2;
      continue;
    }
    rows.push(<QuestionField key={question.id} question={question} />);
    index += 1;
  }

  return <>{rows}</>;
}
