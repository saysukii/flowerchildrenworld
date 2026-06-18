import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Inbox } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({
    meta: [
      { title: "Forms — Flower Children World" },
      { name: "description", content: "Public intake and enrollment forms." },
    ],
  }),
  component: FormsPage,
});

const FORMS = [
  {
    title: "Join the Village",
    url: "/join",
    subtitle: "Volunteer intake",
    submissionsUrl: "/community",
    accent: "#3AB819",
  },
  {
    title: "Partner with Us",
    url: "/partner",
    subtitle: "Partner intake",
    submissionsUrl: "/community",
    accent: "#15AAD2",
  },
  {
    title: "Enroll a Child",
    url: "/enroll",
    subtitle: "Child enrollment",
    submissionsUrl: "/community",
    accent: "#EFB003",
  },
];

function FormsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <span className="font-label text-[11px] text-foreground/50">Forms</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-normal leading-tight">Intake + enrollment</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Three forms — volunteer, partner, and child enrollment. Submissions flow directly into Community.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FORMS.map((f) => (
            <section
              key={f.url}
              className="flex flex-col rounded-3xl border border-black/5 bg-white px-6 py-7"
            >
              <div
                className="mb-5 grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${f.accent}1a`, color: f.accent }}
              >
                <Inbox className="h-5 w-5" />
              </div>

              <h2 className="text-lg font-normal">{f.title}</h2>
              <p className="mt-1 text-xs font-light text-foreground/50">{f.subtitle}</p>
              <p className="mt-1 text-xs font-light text-foreground/40">{f.url}</p>

              <p className="mt-5 text-sm font-light text-foreground/70">
                <span className="text-2xl font-normal text-foreground">0</span>
                <span className="ml-2">submissions this month</span>
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
                  style={{ background: "#3AB819" }}
                >
                  View form
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={f.submissionsUrl}
                  className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-light text-foreground/80 hover:bg-black/5"
                >
                  View submissions
                </a>
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
