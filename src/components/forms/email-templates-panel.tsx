import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getEmailTemplateCatalog,
  previewEmailTemplate,
  sendTestEmail,
} from "@/lib/api/email.functions";
import type { EmailTemplateId } from "@/lib/email-templates";

export function EmailTemplatesPanel() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof getEmailTemplateCatalog>>["templates"]
  >([]);
  const [activeId, setActiveId] = useState<EmailTemplateId>("team-invite");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getEmailTemplateCatalog();
        if (cancelled) return;
        setConfigured(catalog.configured);
        setLogoUrl(catalog.logoUrl);
        setTemplates(catalog.templates);
      } catch {
        if (!cancelled) toast.error("Could not load email templates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const preview = await previewEmailTemplate({
          data: { templateId: activeId, origin: window.location.origin },
        });
        if (cancelled) return;
        setPreviewHtml(preview.html);
        setPreviewSubject(preview.subject);
      } catch {
        if (!cancelled) toast.error("Could not render preview.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function handleSendTest() {
    setSendingTest(true);
    try {
      const result = await sendTestEmail({
        data: { templateId: activeId, origin: window.location.origin },
      });
      toast.success(`Test email sent to ${result.sentTo}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test email.");
    } finally {
      setSendingTest(false);
    }
  }

  const activeMeta = templates.find((template) => template.id === activeId);

  return (
    <section className="mt-10 rounded-3xl border border-black/5 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-label text-[11px] text-foreground/50">Email templates</span>
          <h2 className="mt-2 text-xl font-normal">Confirmation + invite emails</h2>
          <p className="mt-2 max-w-2xl text-sm font-light text-foreground/60">
            Branded emails use the black logo from Brand Essence. Preview each template here, then
            send a test to your inbox before going live.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs text-foreground/60">
          <Mail className="h-3.5 w-3.5" />
          {configured ? "Resend connected" : "Resend not configured"}
        </div>
      </div>

      {logoUrl ? (
        <p className="mt-4 text-xs font-light text-foreground/45">
          Logo URL in emails:{" "}
          <a href={logoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {logoUrl}
          </a>
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-foreground/50">Loading templates…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {templates.map((template) => (
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
                <p className="text-sm font-normal">{activeMeta?.label}</p>
                <p className="text-xs font-light text-foreground/50">
                  Subject: {previewSubject || activeMeta?.subject}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!configured || sendingTest || previewLoading}
                onClick={handleSendTest}
                className="rounded-full"
              >
                <Send className="mr-2 h-3.5 w-3.5" />
                {sendingTest ? "Sending…" : "Send test to me"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#FCFCFC]">
              {previewLoading ? (
                <p className="p-8 text-sm text-foreground/50">Rendering preview…</p>
              ) : (
                <iframe
                  title={`${activeMeta?.label ?? "Email"} preview`}
                  srcDoc={previewHtml}
                  className="h-[640px] w-full border-0 bg-white"
                  sandbox=""
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
