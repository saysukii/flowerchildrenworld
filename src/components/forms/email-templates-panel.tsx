import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEmailTemplateCatalog, sendTestEmail } from "@/lib/api/email.functions";
import {
  EMAIL_TEMPLATES,
  loadEmailLanguage,
  saveEmailLanguage,
  type EmailLanguage,
  type EmailTemplateId,
} from "@/lib/email-templates";
import { renderEmailTemplate } from "@/lib/email-render";
import { WORKSPACE_HYDRATED_EVENT } from "@/lib/workspace-sync";

const TEST_INBOX = "info@flowerchildren.world";

export function EmailTemplatesPanel() {
  const [configured, setConfigured] = useState(false);
  const [activeId, setActiveId] = useState<EmailTemplateId>("team-invite");
  const [language, setLanguage] = useState<EmailLanguage>(() => loadEmailLanguage("team-invite"));
  const [previewHtml, setPreviewHtml] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getEmailTemplateCatalog()
      .then((catalog) => {
        if (!cancelled) setConfigured(catalog.configured);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLanguage(loadEmailLanguage(activeId));
    setEditing(false);
  }, [activeId]);

  useEffect(() => {
    const reload = () => {
      if (editing) return;
      setLanguage(loadEmailLanguage(activeId));
    };
    window.addEventListener(WORKSPACE_HYDRATED_EVENT, reload);
    return () => window.removeEventListener(WORKSPACE_HYDRATED_EVENT, reload);
  }, [activeId, editing]);

  useEffect(() => {
    const meta = EMAIL_TEMPLATES.find((template) => template.id === activeId);
    if (!meta) return;
    setPreviewHtml(renderEmailTemplate(activeId, meta.sampleVars, window.location.origin, language));
  }, [activeId, language]);

  function updateLanguage(patch: Partial<EmailLanguage>) {
    const next = { ...language, ...patch };
    setLanguage(next);
    saveEmailLanguage(activeId, next);
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      const result = await sendTestEmail({
        data: {
          templateId: activeId,
          origin: window.location.origin,
          subject: language.subject,
          language: {
            eyebrow: language.eyebrow,
            headline: language.headline,
            body: language.body,
            button: language.button,
            note: language.note,
          },
        },
      });
      toast.success(`Test email sent to ${result.sentTo}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test email.");
    } finally {
      setSendingTest(false);
    }
  }

  const active = EMAIL_TEMPLATES.find((template) => template.id === activeId);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          {EMAIL_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setActiveId(template.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                activeId === template.id
                  ? "border-black/15 bg-black/[0.03]"
                  : "border-black/5 hover:bg-black/[0.02]"
              }`}
            >
              <p className="text-sm font-normal">{template.label}</p>
              <p className="mt-1 text-xs font-light text-foreground/50">{template.description}</p>
            </button>
          ))}
        </div>

        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-normal">{active?.label}</p>
              <p className="text-xs font-light text-foreground/50">Subject: {language.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-2 text-sm font-normal text-foreground/70 hover:text-foreground"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!configured || sendingTest}
                onClick={() => void handleSendTest()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-normal text-foreground/80 hover:bg-black/5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingTest ? "Sending…" : "Send test"}
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs font-light text-foreground/50">Tests send to {TEST_INBOX}.</p>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#FCFCFC]">
            <iframe
              title={`${active?.label ?? "Email"} preview`}
              srcDoc={previewHtml}
              className="h-[640px] w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-normal">{active?.label}</DialogTitle>
          </DialogHeader>
          <label className="block">
            <span className="mb-1.5 block text-xs font-light text-foreground/55">Subject</span>
            <input
              value={language.subject}
              onChange={(event) => updateLanguage({ subject: event.target.value })}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm font-light focus:border-[#3AB819] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-light text-foreground/55">First line</span>
            <input
              value={language.headline}
              onChange={(event) => updateLanguage({ headline: event.target.value })}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm font-light focus:border-[#3AB819] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-light text-foreground/55">Message</span>
            <textarea
              value={language.body}
              rows={6}
              onChange={(event) => updateLanguage({ body: event.target.value })}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm font-light focus:border-[#3AB819] focus:outline-none"
            />
          </label>
        </DialogContent>
      </Dialog>
    </>
  );
}
