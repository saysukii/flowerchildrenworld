import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { EmailTemplatesPanel } from "@/components/forms/email-templates-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadCommunityStore } from "@/lib/community";
import { liveEngagementGroup } from "@/lib/community-analytics";
import {
  loadFormQuestions,
  moveQuestion,
  saveFormQuestions,
  type FormQuestion,
  type IntakeFormId,
} from "@/lib/form-definitions";
import { WORKSPACE_HYDRATED_EVENT } from "@/lib/workspace-sync";
import { getPublicFormUrl, PUBLIC_FORM_PATHS } from "@/lib/public-forms";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({
    meta: [
      { title: "Forms — Flower Children World" },
      { name: "description", content: "Public intake forms, questions, and emails." },
    ],
  }),
  component: FormsPage,
});

const FORMS: {
  id: IntakeFormId | "donate";
  title: string;
  subtitle: string;
  path: string;
  submissionsUrl: string;
  metric: string;
}[] = [
  {
    id: "join",
    title: "Join the Village",
    subtitle: "Volunteer intake",
    path: PUBLIC_FORM_PATHS.join,
    submissionsUrl: "/community",
    metric: "Volunteer signups this month",
  },
  {
    id: "partner",
    title: "Partner with Us",
    subtitle: "Partner intake",
    path: PUBLIC_FORM_PATHS.partner,
    submissionsUrl: "/community",
    metric: "Partner inquiries this month",
  },
  {
    id: "enroll",
    title: "Enroll a Child",
    subtitle: "Child enrollment",
    path: PUBLIC_FORM_PATHS.enroll,
    submissionsUrl: "/community",
    metric: "Child enrollments this month",
  },
  {
    id: "donate",
    title: "Donate",
    subtitle: "Gifts through Stripe",
    path: PUBLIC_FORM_PATHS.donate,
    submissionsUrl: "/analytics",
    metric: "",
  },
];

function FormsPage() {
  const [section, setSection] = useState<"forms" | "emails">("forms");
  const [formId, setFormId] = useState<(typeof FORMS)[number]["id"]>("join");
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const metrics = liveEngagementGroup(loadCommunityStore(), new Date().getFullYear());
    const next: Record<string, string> = {};
    for (const metric of metrics.metrics) next[metric.label] = metric.value;
    setCounts(next);
  }, []);

  useEffect(() => {
    if (formId === "donate") {
      setQuestions([]);
      return;
    }
    setQuestions(loadFormQuestions(formId));
  }, [formId]);

  useEffect(() => {
    const reload = () => {
      if (editing || formId === "donate") return;
      setQuestions(loadFormQuestions(formId));
    };
    window.addEventListener(WORKSPACE_HYDRATED_EVENT, reload);
    return () => window.removeEventListener(WORKSPACE_HYDRATED_EVENT, reload);
  }, [formId, editing]);

  function updateQuestions(next: FormQuestion[]) {
    if (formId === "donate") return;
    setQuestions(next);
    saveFormQuestions(formId, next);
  }

  const selected = FORMS.find((form) => form.id === formId) ?? FORMS[0];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-label text-[11px] text-foreground/50">Forms</span>
          <h1 className="mt-2 text-2xl font-normal leading-tight sm:text-3xl">Forms and emails</h1>
          <p className="mt-2 max-w-xl text-sm text-foreground/60">
            See this month, edit the questions, and preview the emails.
          </p>
        </div>
        <div className="flex gap-1">
          {(["forms", "emails"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`rounded-full px-3 py-1 text-sm font-normal ${
                section === item ? "bg-[#3AB819]/15 text-[#1f6b12]" : "text-foreground/45 hover:bg-black/5"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {section === "emails" ? (
        <section className="moss-card rounded-3xl px-6 py-7 sm:px-8">
          <h2 className="text-xl font-normal">Emails</h2>
          <p className="mt-2 text-sm text-foreground/60">Preview each email, edit the language, then send a test.</p>
          <div className="mt-6">
            <EmailTemplatesPanel />
          </div>
        </section>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FORMS.map((form) => {
              const count = form.metric ? counts[form.metric] ?? "0" : null;
              const active = form.id === formId;
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => {
                    setFormId(form.id);
                    setEditing(false);
                  }}
                  className={`moss-card rounded-3xl px-5 py-5 text-left ${
                    active ? "ring-1 ring-[#3AB819]/40" : ""
                  }`}
                >
                  <p className="text-sm font-normal">{form.title}</p>
                  <p className="mt-1 text-xs font-light text-foreground/50">{form.subtitle}</p>
                  <p className="mt-4 text-2xl font-normal">{count ?? "—"}</p>
                  <p className="text-xs font-light text-foreground/45">
                    {count ? "this month" : "see analytics"}
                  </p>
                </button>
              );
            })}
          </div>

          <section className="moss-card rounded-3xl px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-normal">{selected.title}</h2>
                <p className="mt-1 text-sm text-foreground/55">{getPublicFormUrl(selected.path)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selected.id === "donate" ? null : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="px-2 text-sm font-normal text-foreground/70 hover:text-foreground"
                  >
                    Edit
                  </button>
                )}
                <a
                  href={getPublicFormUrl(selected.path)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-normal text-white"
                  style={{ background: "#3AB819" }}
                >
                  {selected.id === "donate" ? "View page" : "View form"}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={selected.submissionsUrl}
                  className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-sm font-light text-foreground/80 hover:bg-black/5"
                >
                  {selected.id === "donate" ? "View analytics" : "View submissions"}
                </a>
              </div>
            </div>

            {selected.id === "donate" ? (
              <p className="mt-6 text-sm text-foreground/60">Gifts are counted on the analytics page.</p>
            ) : null}
          </section>

          {selected.id === "donate" ? null : (
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-normal">{selected.title}</DialogTitle>
                </DialogHeader>
                <ol className="space-y-3">
                  {questions.map((question, index) => (
                    <li key={question.id} className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => updateQuestions(moveQuestion(questions, index, -1))}
                            className="rounded-full p-1 text-foreground/40 hover:bg-black/5 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={index === questions.length - 1}
                            onClick={() => updateQuestions(moveQuestion(questions, index, 1))}
                            className="rounded-full p-1 text-foreground/40 hover:bg-black/5 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                              value={question.label}
                              aria-label="Question"
                              onChange={(event) =>
                                updateQuestions(
                                  questions.map((item) =>
                                    item.id === question.id ? { ...item, label: event.target.value } : item,
                                  ),
                                )
                              }
                              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-light focus:border-[#3AB819] focus:outline-none"
                            />
                            <label className="flex items-center gap-2 text-xs text-foreground/55">
                              <input
                                type="checkbox"
                                checked={question.required}
                                disabled={question.locked && question.required}
                                onChange={(event) =>
                                  updateQuestions(
                                    questions.map((item) =>
                                      item.id === question.id ? { ...item, required: event.target.checked } : item,
                                    ),
                                  )
                                }
                                className="accent-[#3AB819]"
                              />
                              Required
                            </label>
                          </div>
                          {question.type === "select" ? (
                            <label className="block">
                              <span className="mb-1 block text-xs font-light text-foreground/45">Choices, one per line</span>
                              <textarea
                                value={(question.options ?? []).join("\n")}
                                rows={3}
                                onChange={(event) =>
                                  updateQuestions(
                                    questions.map((item) =>
                                      item.id === question.id
                                        ? {
                                            ...item,
                                            options: event.target.value
                                              .split("\n")
                                              .map((line) => line.trim())
                                              .filter(Boolean),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-light focus:border-[#3AB819] focus:outline-none"
                              />
                            </label>
                          ) : null}
                          {question.type === "textarea" ? (
                            <input
                              value={question.placeholder ?? ""}
                              placeholder="Placeholder"
                              onChange={(event) =>
                                updateQuestions(
                                  questions.map((item) =>
                                    item.id === question.id ? { ...item, placeholder: event.target.value } : item,
                                  ),
                                )
                              }
                              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-light focus:border-[#3AB819] focus:outline-none"
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
